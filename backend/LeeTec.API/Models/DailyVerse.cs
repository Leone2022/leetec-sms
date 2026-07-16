using System;

namespace LeeTec.API.Models
{
    public class DailyVerse
    {
        public int Id { get; set; }
        public int SchoolId { get; set; }
        public string Type { get; set; } = "Bible Verse"; // "Bible Verse" | "Quote of the Day" | "Word"
        public string Text { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string PostedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
        public DateTime? DisplayUntil { get; set; } // null = until replaced

        // Word of the Day
        public string? Definition { get; set; } // the word's definition
        public string? UsageExample { get; set; } // example sentence using the word
        public string? PartOfSpeech { get; set; } // Noun | Verb | Adjective | Adverb | Other
    }
}
