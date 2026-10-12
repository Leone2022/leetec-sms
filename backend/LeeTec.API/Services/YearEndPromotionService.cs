using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;

namespace LeeTec.API.Services
{
    public class PromotionOption
    {
        public string Key { get; set; } = string.Empty;   // promote | graduate | repeat | transferred | withdrawn | move:{campus}:{form}
        public string Label { get; set; } = string.Empty;
        public string? ToCampus { get; set; }
        public string? ToForm { get; set; }
        public string ToStatus { get; set; } = StudentLifecycle.Active;
    }

    public class PromotionPreviewRow
    {
        public int StudentId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string Campus { get; set; } = string.Empty;
        public string Form { get; set; } = string.Empty;
        public string Curriculum { get; set; } = string.Empty;
        public string DefaultKey { get; set; } = string.Empty;
        public List<PromotionOption> Options { get; set; } = new();
    }

    public class PromotionDecision
    {
        public int StudentId { get; set; }
        public string FromCampus { get; set; } = string.Empty;
        public string FromForm { get; set; } = string.Empty;
        public string OptionKey { get; set; } = string.Empty;
    }

    public class PromotionApplyRequest
    {
        public int SchoolId { get; set; } = 1;
        public int NumberYear { get; set; }                       // year for new student numbers on campus change
        public int ExpectedCount { get; set; }                    // number of decisions shown in the preview
        public bool AcknowledgeIncompleteTerm { get; set; }       // required while the current term's marks/report cards are unfinished
        public List<PromotionDecision> Decisions { get; set; } = new();
    }

    // Year-end class promotion. Moves each current (Active) student to their next class,
    // graduates leavers, or records a transfer/withdrawal, in one transaction. It changes
    // Student.Form/Campus/Status (and Curriculum + student number on a campus change) and
    // nothing else: past terms' registrations, subjects, marks and invoices are untouched.
    public class YearEndPromotionService
    {
        private static readonly Dictionary<string, string[]> Ladders = new()
        {
            ["AHJ"] = new[] { "Nursery", "ECD A", "ECD B", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7" },
            ["AHA"] = new[] { "Form 1", "Form 2", "Form 3", "Form 4" },
            ["AHS"] = new[] { "Lower 6", "Upper 6" },
        };

        private readonly AppDbContext _context;

        public YearEndPromotionService(AppDbContext context)
        {
            _context = context;
        }

        public static List<PromotionOption> OptionsFor(string campus, string form, out string defaultKey)
        {
            var options = new List<PromotionOption>();
            var ladder = Ladders.TryGetValue(campus ?? "", out var l) ? l : Array.Empty<string>();
            var idx = Array.IndexOf(ladder, form);

            PromotionOption Move(string toCampus, string toForm) => new()
            {
                Key = $"move:{toCampus}:{toForm}", Label = $"Move to {toCampus} {toForm}", ToCampus = toCampus, ToForm = toForm,
            };
            var graduate = new PromotionOption { Key = "graduate", Label = "Graduate (leaves school)", ToStatus = StudentLifecycle.Graduated };

            if (idx >= 0 && idx < ladder.Length - 1)
            {
                options.Add(new PromotionOption { Key = "promote", Label = $"Promote to {ladder[idx + 1]}", ToCampus = campus, ToForm = ladder[idx + 1] });
                defaultKey = "promote";
            }
            else if (campus == "AHJ" && form == "Grade 7")
            {
                options.Add(Move("AHA", "Form 1"));
                options.Add(graduate);
                defaultKey = "move:AHA:Form 1";
            }
            else if (campus == "AHA" && form == "Form 4")
            {
                options.Add(graduate);
                options.Add(Move("AHS", "Lower 6"));
                defaultKey = "graduate";
            }
            else if (campus == "AHS" && form == "Upper 6")
            {
                options.Add(graduate);
                defaultKey = "graduate";
            }
            else
            {
                defaultKey = "repeat"; // class not on a ladder: leave it for the admin to decide
            }

            options.Add(new PromotionOption { Key = "repeat", Label = $"Repeat {form} (no change)", ToCampus = campus, ToForm = form });
            options.Add(new PromotionOption { Key = "transferred", Label = "Transferred out", ToStatus = StudentLifecycle.Transferred });
            options.Add(new PromotionOption { Key = "withdrawn", Label = "Withdrawn", ToStatus = StudentLifecycle.Withdrawn });
            return options;
        }

        public static string CurriculumFor(string toCampus, string current)
        {
            var zimsec = (current ?? "").StartsWith("ZIMSEC", StringComparison.OrdinalIgnoreCase);
            return toCampus switch
            {
                "AHS" => zimsec ? "ZIMSEC A-Level" : "Cambridge A-Level",
                "AHA" => zimsec ? "ZIMSEC O-Level" : "Cambridge IGCSE",
                "AHJ" => "Cambridge Checkpoint",
                _ => current ?? "",
            };
        }

        // Warnings about the current (active) term: promoting changes the class every
        // teacher sheet and report card reads, so it belongs after report cards are done.
        public async Task<List<string>> CurrentTermWarningsAsync(int schoolId)
        {
            var warnings = new List<string>();
            var active = await _context.Terms.FirstOrDefaultAsync(t => t.SchoolId == schoolId && t.IsActive);
            if (active == null) return warnings;

            var unapproved = await _context.Marks.CountAsync(m => m.SchoolId == schoolId && m.TermId == active.Id && m.Status != "Approved");
            if (unapproved > 0)
                warnings.Add($"{active.Name}: {unapproved} mark(s) are not approved yet.");

            var registered = await _context.TermRegistrations
                .Where(r => r.TermId == active.Id && r.SchoolId == schoolId && r.Status == "Active")
                .Join(_context.Students.Where(s => s.Status == StudentLifecycle.Active), r => r.StudentId, s => s.Id, (r, s) => s.Id)
                .Distinct()
                .CountAsync();
            var published = await _context.ReportCardRecords
                .Where(r => r.TermId == active.Id && r.Status == "Published")
                .Select(r => r.StudentId).Distinct().CountAsync();
            if (registered > 0 && published < registered)
                warnings.Add($"{active.Name}: report cards published for {published} of {registered} students.");

            return warnings;
        }

        public async Task<object> PreviewAsync(int schoolId)
        {
            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Status == StudentLifecycle.Active)
                .OrderBy(s => s.Campus).ThenBy(s => s.Form).ThenBy(s => s.Surname).ThenBy(s => s.FirstName)
                .ToListAsync();

            var rows = students.Select(s =>
            {
                var options = OptionsFor(s.Campus, s.Form, out var defaultKey);
                return new PromotionPreviewRow
                {
                    StudentId = s.Id,
                    Name = $"{s.FirstName} {s.Surname}",
                    StudentNumber = s.StudentNumber,
                    Campus = s.Campus,
                    Form = s.Form,
                    Curriculum = s.Curriculum,
                    DefaultKey = defaultKey,
                    Options = options,
                };
            }).ToList();

            return new
            {
                students = rows,
                warnings = await CurrentTermWarningsAsync(schoolId),
                suggestedNumberYear = DateTime.Now.Month >= 9 ? DateTime.Now.Year + 1 : DateTime.Now.Year,
            };
        }

        public async Task<(bool Ok, object Result)> ApplyAsync(PromotionApplyRequest req)
        {
            var now = DateTime.Now;
            if (req.NumberYear < now.Year || req.NumberYear > now.Year + 1)
                return (false, new { ok = false, message = $"Student-number year must be {now.Year} or {now.Year + 1}." });
            if (req.Decisions.Count == 0 || req.Decisions.Count != req.ExpectedCount)
                return (false, new { ok = false, message = "The list changed since the preview. Reload the preview and try again." });
            if (req.Decisions.Select(d => d.StudentId).Distinct().Count() != req.Decisions.Count)
                return (false, new { ok = false, message = "A student appears more than once." });

            var warnings = await CurrentTermWarningsAsync(req.SchoolId);
            if (warnings.Count > 0 && !req.AcknowledgeIncompleteTerm)
                return (false, new { ok = false, message = "The current term is not finished. Confirm you want to promote anyway.", warnings });

            var ids = req.Decisions.Select(d => d.StudentId).ToList();
            var students = await _context.Students
                .Where(s => ids.Contains(s.Id) && s.SchoolId == req.SchoolId)
                .ToDictionaryAsync(s => s.Id);

            // Next free number per campus for the chosen year, tracked in memory so several
            // campus moves in this batch get consecutive numbers.
            var nextNumber = new Dictionary<string, int>();
            async Task<string> NewNumberAsync(string campus)
            {
                if (!nextNumber.TryGetValue(campus, out var n))
                {
                    var prefix = $"{campus}/{req.NumberYear}/";
                    var last = await _context.Students
                        .Where(s => s.StudentNumber.StartsWith(prefix))
                        .OrderByDescending(s => s.StudentNumber)
                        .Select(s => s.StudentNumber)
                        .FirstOrDefaultAsync();
                    n = 1;
                    if (last != null && int.TryParse(last.Split('/').Last(), out var lastN)) n = lastN + 1;
                }
                nextNumber[campus] = n + 1;
                return $"{campus}/{req.NumberYear}/{n:D4}";
            }

            var counts = new Dictionary<string, int>();
            var skipped = new List<object>();
            var numberChanges = new List<object>();

            await using var tx = await _context.Database.BeginTransactionAsync();
            foreach (var d in req.Decisions)
            {
                if (!students.TryGetValue(d.StudentId, out var s) || s.Status != StudentLifecycle.Active
                    || s.Campus != d.FromCampus || s.Form != d.FromForm)
                {
                    skipped.Add(new { d.StudentId, reason = "Changed since the preview (already promoted, status or class changed)." });
                    continue;
                }

                var option = OptionsFor(s.Campus, s.Form, out _).FirstOrDefault(o => o.Key == d.OptionKey);
                if (option == null)
                {
                    skipped.Add(new { d.StudentId, reason = $"'{d.OptionKey}' is not a valid choice for {s.Campus} {s.Form}." });
                    continue;
                }

                if (option.ToStatus != StudentLifecycle.Active)
                {
                    s.Status = option.ToStatus;
                }
                else if (option.ToCampus != null && option.ToForm != null)
                {
                    if (option.ToCampus != s.Campus)
                    {
                        var oldNumber = s.StudentNumber;
                        s.StudentNumber = await NewNumberAsync(option.ToCampus);
                        s.Curriculum = CurriculumFor(option.ToCampus, s.Curriculum);
                        s.Campus = option.ToCampus;
                        numberChanges.Add(new { s.Id, name = $"{s.FirstName} {s.Surname}", oldNumber, newNumber = s.StudentNumber });
                    }
                    s.Form = option.ToForm;
                }

                var bucket = option.Key.StartsWith("move:") ? "moved" : option.Key;
                counts[bucket] = counts.GetValueOrDefault(bucket) + 1;
            }

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return (true, new
            {
                ok = true,
                message = $"Done: {counts.GetValueOrDefault("promote")} promoted, {counts.GetValueOrDefault("moved")} moved campus, "
                    + $"{counts.GetValueOrDefault("graduate")} graduated, {counts.GetValueOrDefault("repeat")} repeating, "
                    + $"{counts.GetValueOrDefault("transferred") + counts.GetValueOrDefault("withdrawn")} left. {skipped.Count} skipped.",
                counts,
                skipped,
                numberChanges,
            });
        }
    }
}
