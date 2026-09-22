using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectLanguages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "WeeklyProjects",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "PreferredLanguages",
                table: "Users",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.CreateTable(
                name: "WeeklyTemplateLanguages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyTemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Language = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ForgejoTemplateSlug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyTemplateLanguages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyTemplateLanguages_WeeklyTemplates_WeeklyTemplateId",
                        column: x => x.WeeklyTemplateId,
                        principalTable: "WeeklyTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyTemplateReferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyTemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Language = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Documents = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    LastVerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyTemplateReferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyTemplateReferences_WeeklyTemplates_WeeklyTemplateId",
                        column: x => x.WeeklyTemplateId,
                        principalTable: "WeeklyTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyTemplateLanguages_WeeklyTemplateId_Language",
                table: "WeeklyTemplateLanguages",
                columns: new[] { "WeeklyTemplateId", "Language" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyTemplateReferences_WeeklyTemplateId_Position",
                table: "WeeklyTemplateReferences",
                columns: new[] { "WeeklyTemplateId", "Position" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WeeklyTemplateLanguages");

            migrationBuilder.DropTable(
                name: "WeeklyTemplateReferences");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "WeeklyProjects");

            migrationBuilder.DropColumn(
                name: "PreferredLanguages",
                table: "Users");
        }
    }
}
