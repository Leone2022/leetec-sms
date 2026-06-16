using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeeTec.API.Data;
using LeeTec.API.Models;
using LeeTec.API.DTOs;

namespace LeeTec.API.Controllers
{
    [ApiController]
    [Route("api/subjects")]
    public class SubjectsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SubjectsController(AppDbContext context)
        {
            _context = context;
        }

        // ── Default subject definitions from official school PDFs ─────────────

        private static readonly List<(string Name, string Code, string Level, string Curriculum, string Campus)> DefaultSubjects =
        [
            // AHJ — Cambridge Primary
            ("Mathematics",                 "MAT",  "Primary", "Cambridge", "AHJ"),
            ("English",                     "ENG",  "Primary", "Cambridge", "AHJ"),
            ("Science",                     "SCI",  "Primary", "Cambridge", "AHJ"),
            ("Shona",                       "SHO",  "Primary", "Cambridge", "AHJ"),
            ("Agriculture",                 "AGR",  "Primary", "Cambridge", "AHJ"),
            ("ICT",                         "ICT",  "Primary", "Cambridge", "AHJ"),
            ("Music",                       "MUS",  "Primary", "Cambridge", "AHJ"),
            ("Robotics",                    "ROB",  "Primary", "Cambridge", "AHJ"),

            // AHA — ZIMSEC O-Level
            ("Computer Science",            "4021", "O-Level", "ZIMSEC",    "AHA"),
            ("Chemistry",                   "4024", "O-Level", "ZIMSEC",    "AHA"),
            ("Physics",                     "4023", "O-Level", "ZIMSEC",    "AHA"),
            ("Biology",                     "4025", "O-Level", "ZIMSEC",    "AHA"),
            ("Mathematics",                 "4004", "O-Level", "ZIMSEC",    "AHA"),
            ("Combined Science",            "4003", "O-Level", "ZIMSEC",    "AHA"),
            ("Heritage",                    "4006", "O-Level", "ZIMSEC",    "AHA"),
            ("Family & Religious Studies",  "4047", "O-Level", "ZIMSEC",    "AHA"),
            ("Principles of Accounts",      "4051", "O-Level", "ZIMSEC",    "AHA"),
            ("English Language",            "4005", "O-Level", "ZIMSEC",    "AHA"),
            ("Shona Language",              "4007", "O-Level", "ZIMSEC",    "AHA"),
            ("History",                     "4044", "O-Level", "ZIMSEC",    "AHA"),
            ("Commerce",                    "4049", "O-Level", "ZIMSEC",    "AHA"),
            ("Business Enterprise Skills",  "4048", "O-Level", "ZIMSEC",    "AHA"),
            ("Geography",                   "4022", "O-Level", "ZIMSEC",    "AHA"),

            // AHA — Cambridge IGCSE
            ("English Language",            "1123", "O-Level", "Cambridge", "AHA"),
            ("Biblical Studies",            "2035", "O-Level", "Cambridge", "AHA"),
            ("History",                     "2147", "O-Level", "Cambridge", "AHA"),
            ("Mathematics",                 "4024", "O-Level", "Cambridge", "AHA"),
            ("Commerce",                    "7100", "O-Level", "Cambridge", "AHA"),
            ("Computer Science",            "2210", "O-Level", "Cambridge", "AHA"),
            ("Combined Science",            "5129", "O-Level", "Cambridge", "AHA"),
            ("Accounting",                  "7707", "O-Level", "Cambridge", "AHA"),
            ("Chemistry",                   "5070", "O-Level", "Cambridge", "AHA"),
            ("Physics",                     "5054", "O-Level", "Cambridge", "AHA"),
            ("Biology",                     "5090", "O-Level", "Cambridge", "AHA"),
            ("Geography",                   "2217", "O-Level", "Cambridge", "AHA"),
            ("Literature in English",       "2010", "O-Level", "Cambridge", "AHA"),
            ("Business Studies",            "7115", "O-Level", "Cambridge", "AHA"),
            ("Economics",                   "2281", "O-Level", "Cambridge", "AHA"),

            // AHS — ZIMSEC A-Level
            ("Chemistry",                   "6031", "A-Level", "ZIMSEC",    "AHS"),
            ("Sociology",                   "6043", "A-Level", "ZIMSEC",    "AHS"),
            ("Heritage",                    "6081", "A-Level", "ZIMSEC",    "AHS"),
            ("History",                     "6006", "A-Level", "ZIMSEC",    "AHS"),
            ("English Literature",          "6039", "A-Level", "ZIMSEC",    "AHS"),
            ("Accounts",                    "6001", "A-Level", "ZIMSEC",    "AHS"),
            ("Business Studies",            "6025", "A-Level", "ZIMSEC",    "AHS"),
            ("Economics",                   "6073", "A-Level", "ZIMSEC",    "AHS"),
            ("Geography",                   "6037", "A-Level", "ZIMSEC",    "AHS"),
            ("Computer Science",            "6023", "A-Level", "ZIMSEC",    "AHS"),
            ("Physics",                     "6032", "A-Level", "ZIMSEC",    "AHS"),
            ("Biology",                     "6030", "A-Level", "ZIMSEC",    "AHS"),
            ("Pure Mathematics",            "6042", "A-Level", "ZIMSEC",    "AHS"),
            ("FRS",                         "6074", "A-Level", "ZIMSEC",    "AHS"),
            ("Statistics",                  "6073", "A-Level", "ZIMSEC",    "AHS"),

            // AHS — Cambridge A-Level
            ("Literature in English",       "9695", "A-Level", "Cambridge", "AHS"),
            ("Biblical Studies",            "9484", "A-Level", "Cambridge", "AHS"),
            ("History",                     "9489", "A-Level", "Cambridge", "AHS"),
            ("Sociology",                   "9699", "A-Level", "Cambridge", "AHS"),
            ("Geography",                   "9696", "A-Level", "Cambridge", "AHS"),
            ("Biology",                     "9700", "A-Level", "Cambridge", "AHS"),
            ("Physics",                     "9702", "A-Level", "Cambridge", "AHS"),
            ("Accounting",                  "9706", "A-Level", "Cambridge", "AHS"),
            ("Business Studies",            "9609", "A-Level", "Cambridge", "AHS"),
            ("Computer Science",            "9618", "A-Level", "Cambridge", "AHS"),
            ("Chemistry",                   "9701", "A-Level", "Cambridge", "AHS"),
            ("Economics",                   "9708", "A-Level", "Cambridge", "AHS"),
            ("Mathematics",                 "9709", "A-Level", "Cambridge", "AHS"),
        ];

        [HttpGet("defaults")]
        public IActionResult GetDefaultSubjects([FromQuery] string? campus, [FromQuery] string? curriculumType)
        {
            var list = DefaultSubjects.AsEnumerable();
            if (!string.IsNullOrEmpty(campus))
                list = list.Where(s => s.Campus.Equals(campus, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrEmpty(curriculumType) && !curriculumType.Equals("All", StringComparison.OrdinalIgnoreCase))
                list = list.Where(s => s.Curriculum.Equals(curriculumType, StringComparison.OrdinalIgnoreCase));

            return Ok(list.Select(s => new { s.Name, s.Code, s.Level, s.Curriculum, s.Campus }));
        }

        [HttpGet("school/{schoolId}")]
        public async Task<IActionResult> GetSubjects(int schoolId, [FromQuery] string? campus, [FromQuery] string? curriculumType)
        {
            var query = _context.Subjects.Where(s => s.SchoolId == schoolId && s.IsActive);
            if (!string.IsNullOrEmpty(campus))
                query = query.Where(s => s.Campus == campus);
            if (!string.IsNullOrEmpty(curriculumType) && curriculumType != "All")
                query = query.Where(s => s.CurriculumType == curriculumType);

            var subjects = await query.OrderBy(s => s.Campus).ThenBy(s => s.CurriculumType).ThenBy(s => s.Name).ToListAsync();
            return Ok(subjects);
        }

        [HttpPost("seed")]
        public async Task<IActionResult> SeedSubjects([FromBody] SeedSubjectsDTO dto)
        {
            var toSeed = DefaultSubjects.AsEnumerable();

            if (!string.IsNullOrEmpty(dto.Campus))
                toSeed = toSeed.Where(s => s.Campus.Equals(dto.Campus, StringComparison.OrdinalIgnoreCase));

            if (!dto.CurriculumType.Equals("All", StringComparison.OrdinalIgnoreCase))
                toSeed = toSeed.Where(s => s.Curriculum.Equals(dto.CurriculumType, StringComparison.OrdinalIgnoreCase));

            int added = 0;
            int skipped = 0;

            foreach (var (name, code, level, curriculum, campus) in toSeed)
            {
                var exists = await _context.Subjects.AnyAsync(s =>
                    s.SchoolId == dto.SchoolId &&
                    s.Campus == campus &&
                    s.Code == code &&
                    s.CurriculumType == curriculum);

                if (exists) { skipped++; continue; }

                _context.Subjects.Add(new Subject
                {
                    SchoolId = dto.SchoolId,
                    Name = name,
                    Code = code,
                    Campus = campus,
                    Level = level,
                    CurriculumType = curriculum,
                    IsActive = true,
                });
                added++;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"{added} subjects seeded, {skipped} already existed", added, skipped });
        }

        [HttpPost]
        public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectDTO dto)
        {
            var subject = new Subject
            {
                SchoolId = dto.SchoolId,
                Name = dto.Name,
                Code = dto.Code,
                Campus = dto.Campus,
                Level = dto.Level,
                CurriculumType = dto.CurriculumType,
                IsActive = true,
            };
            _context.Subjects.Add(subject);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Subject created", subject });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSubject(int id, [FromBody] UpdateSubjectDTO dto)
        {
            var subject = await _context.Subjects.FindAsync(id);
            if (subject == null) return NotFound(new { message = "Subject not found" });

            subject.Name = dto.Name;
            subject.Code = dto.Code;
            subject.Campus = dto.Campus;
            subject.Level = dto.Level;
            subject.CurriculumType = dto.CurriculumType;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Subject updated", subject });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            var subject = await _context.Subjects.FindAsync(id);
            if (subject == null) return NotFound(new { message = "Subject not found" });
            subject.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Subject removed" });
        }
    }
}
