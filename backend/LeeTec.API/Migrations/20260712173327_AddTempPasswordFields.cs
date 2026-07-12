using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeeTec.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTempPasswordFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                table: "Users",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TempPassword",
                table: "Users",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "TempPasswordExpiry",
                table: "Users",
                type: "datetime(6)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MustChangePassword",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TempPassword",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TempPasswordExpiry",
                table: "Users");
        }
    }
}
