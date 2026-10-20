using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeeTec.API.Migrations
{
    /// <inheritdoc />
    public partial class AddReportCardViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DownloadedAt",
                table: "ReportCardRecords",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FirstViewedAt",
                table: "ReportCardRecords",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastViewedAt",
                table: "ReportCardRecords",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ViewCount",
                table: "ReportCardRecords",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DownloadedAt",
                table: "ReportCardRecords");

            migrationBuilder.DropColumn(
                name: "FirstViewedAt",
                table: "ReportCardRecords");

            migrationBuilder.DropColumn(
                name: "LastViewedAt",
                table: "ReportCardRecords");

            migrationBuilder.DropColumn(
                name: "ViewCount",
                table: "ReportCardRecords");
        }
    }
}
