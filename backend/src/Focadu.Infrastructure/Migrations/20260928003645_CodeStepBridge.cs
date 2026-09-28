using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CodeStepBridge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CodeExpectedOutput",
                table: "DailyActivities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodeRubric",
                table: "DailyActivities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodeSolution",
                table: "DailyActivities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodeRepositoryUrl",
                table: "Dailies",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CodeExpectedOutput",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "CodeRubric",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "CodeSolution",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "CodeRepositoryUrl",
                table: "Dailies");
        }
    }
}
