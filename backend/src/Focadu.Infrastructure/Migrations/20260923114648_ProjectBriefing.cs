using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProjectBriefing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string[]>(
                name: "WeeklyProjectBriefing",
                table: "WeeklyTemplates",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            migrationBuilder.AddColumn<string>(
                name: "WeeklyProjectStateLines",
                table: "WeeklyTemplates",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'{}'::jsonb");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WeeklyProjectBriefing",
                table: "WeeklyTemplates");

            migrationBuilder.DropColumn(
                name: "WeeklyProjectStateLines",
                table: "WeeklyTemplates");
        }
    }
}
