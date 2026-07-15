using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeeTec.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusToStudent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Campus",
                table: "Students",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            // Backfill existing students from their StudentNumber prefix (e.g. "AHJ/2026/0001" -> "AHJ")
            migrationBuilder.Sql("UPDATE Students SET Campus = SUBSTRING_INDEX(StudentNumber, '/', 1) WHERE Campus = '' OR Campus IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Campus",
                table: "Students");
        }
    }
}
