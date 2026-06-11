using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using LeeTec.API.Data;

#nullable disable

namespace LeeTec.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260604095500_MakeInvoiceFeePackageNullable")]
    public partial class MakeInvoiceFeePackageNullable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_FeePackages_FeePackageId",
                table: "Invoices");

            migrationBuilder.AlterColumn<int>(
                name: "FeePackageId",
                table: "Invoices",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_FeePackages_FeePackageId",
                table: "Invoices",
                column: "FeePackageId",
                principalTable: "FeePackages",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_FeePackages_FeePackageId",
                table: "Invoices");

            migrationBuilder.AlterColumn<int>(
                name: "FeePackageId",
                table: "Invoices",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_FeePackages_FeePackageId",
                table: "Invoices",
                column: "FeePackageId",
                principalTable: "FeePackages",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
