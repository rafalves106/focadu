using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NotesForWeeklyProject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "DailyId",
                table: "Notes",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "WeeklyProjectId",
                table: "Notes",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notes_UserId_WeeklyProjectId",
                table: "Notes",
                columns: new[] { "UserId", "WeeklyProjectId" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Notes_ExactlyOneContext",
                table: "Notes",
                sql: "(\"DailyId\" IS NULL) <> (\"WeeklyProjectId\" IS NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notes_UserId_WeeklyProjectId",
                table: "Notes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Notes_ExactlyOneContext",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "WeeklyProjectId",
                table: "Notes");

            migrationBuilder.AlterColumn<Guid>(
                name: "DailyId",
                table: "Notes",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
