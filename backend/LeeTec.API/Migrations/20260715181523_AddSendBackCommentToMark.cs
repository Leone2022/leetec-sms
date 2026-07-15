using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeeTec.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSendBackCommentToMark : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SendBackComment",
                table: "Marks",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SendBackComment",
                table: "Marks");
        }
    }
}
