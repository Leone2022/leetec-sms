using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeeTec.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMarkAmendmentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AmendmentReason",
                table: "Marks",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "AmendmentRequested",
                table: "Marks",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "AmendmentRequestedAt",
                table: "Marks",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AmendmentRequestedBy",
                table: "Marks",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "MeetingDate",
                table: "Marks",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "MinuteReference",
                table: "Marks",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AmendmentReason",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "AmendmentRequested",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "AmendmentRequestedAt",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "AmendmentRequestedBy",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "MeetingDate",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "MinuteReference",
                table: "Marks");
        }
    }
}
