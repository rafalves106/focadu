using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MoldeV1DayInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContentHash",
                table: "DailyTemplates",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MoldeVersion",
                table: "DailyTemplates",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetsJson",
                table: "DailyTemplates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Hint",
                table: "DailyActivities",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFinalQuestion",
                table: "DailyActivities",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ReferenceAnswer",
                table: "DailyActivities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Target",
                table: "DailyActivities",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TopicsJson",
                table: "DailyActivities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "CuratedContents",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContentHash",
                table: "DailyTemplates");

            migrationBuilder.DropColumn(
                name: "MoldeVersion",
                table: "DailyTemplates");

            migrationBuilder.DropColumn(
                name: "TargetsJson",
                table: "DailyTemplates");

            migrationBuilder.DropColumn(
                name: "Hint",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "IsFinalQuestion",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "ReferenceAnswer",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "Target",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "TopicsJson",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "CuratedContents");
        }
    }
}
