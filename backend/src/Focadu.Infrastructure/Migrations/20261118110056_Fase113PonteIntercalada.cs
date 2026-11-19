using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase113PonteIntercalada : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "InterleavedBridge",
                table: "DailyTemplates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CodeCheckJson",
                table: "DailyActivities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodeMarksJson",
                table: "DailyActivities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ParsonsJson",
                table: "DailyActivities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ReplacesPreviousCode",
                table: "DailyActivities",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InterleavedBridge",
                table: "DailyTemplates");

            migrationBuilder.DropColumn(
                name: "CodeCheckJson",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "CodeMarksJson",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "ParsonsJson",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "ReplacesPreviousCode",
                table: "DailyActivities");
        }
    }
}
