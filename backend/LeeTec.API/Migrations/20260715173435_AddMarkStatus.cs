using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeeTec.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMarkStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "Marks",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                table: "Marks",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Marks",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAt",
                table: "Marks",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubmittedBy",
                table: "Marks",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            // Existing marks predate the workflow — treat them as Draft rather than ''
            migrationBuilder.Sql("UPDATE Marks SET Status = 'Draft' WHERE Status = '' OR Status IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "SubmittedBy",
                table: "Marks");
        }
    }
}
