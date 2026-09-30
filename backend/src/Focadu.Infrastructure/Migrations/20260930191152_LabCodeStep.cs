using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class LabCodeStep : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LabConfig",
                table: "DailyTemplates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodeStarter",
                table: "DailyActivities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "LabDisabled",
                table: "DailyActivities",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "CodeStepHints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Number = table.Column<int>(type: "integer", nullable: false),
                    Right = table.Column<string>(type: "text", nullable: false),
                    Wrong = table.Column<string>(type: "text", nullable: false),
                    Improve = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DailyId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodeStepHints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodeStepHints_Dailies_DailyId",
                        column: x => x.DailyId,
                        principalTable: "Dailies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CodeStepHints_DailyId_ActivityId_Number",
                table: "CodeStepHints",
                columns: new[] { "DailyId", "ActivityId", "Number" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CodeStepHints");

            migrationBuilder.DropColumn(
                name: "LabConfig",
                table: "DailyTemplates");

            migrationBuilder.DropColumn(
                name: "CodeStarter",
                table: "DailyActivities");

            migrationBuilder.DropColumn(
                name: "LabDisabled",
                table: "DailyActivities");
        }
    }
}
