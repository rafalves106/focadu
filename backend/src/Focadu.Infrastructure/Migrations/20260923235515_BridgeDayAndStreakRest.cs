using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BridgeDayAndStreakRest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DailyTemplates_WeeklyTemplateId_DayNumber",
                table: "DailyTemplates");

            migrationBuilder.AddColumn<DateTime>(
                name: "EvaluatedAt",
                table: "WeeklyProjects",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "LastRestDate",
                table: "UserStreaks",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "DailyTemplates",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyTemplates_WeeklyTemplateId_DayNumber_Language",
                table: "DailyTemplates",
                columns: new[] { "WeeklyTemplateId", "DayNumber", "Language" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DailyTemplates_WeeklyTemplateId_DayNumber_Language",
                table: "DailyTemplates");

            migrationBuilder.DropColumn(
                name: "EvaluatedAt",
                table: "WeeklyProjects");

            migrationBuilder.DropColumn(
                name: "LastRestDate",
                table: "UserStreaks");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "DailyTemplates");

            migrationBuilder.CreateIndex(
                name: "IX_DailyTemplates_WeeklyTemplateId_DayNumber",
                table: "DailyTemplates",
                columns: new[] { "WeeklyTemplateId", "DayNumber" },
                unique: true);
        }
    }
}
