using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeeTec.API.Migrations
{
    /// <inheritdoc />
    public partial class RemovePostedById : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Users_PostedById",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_PostedById",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PostedById",
                table: "Payments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PostedById",
                table: "Payments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_PostedById",
                table: "Payments",
                column: "PostedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_Users_PostedById",
                table: "Payments",
                column: "PostedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
