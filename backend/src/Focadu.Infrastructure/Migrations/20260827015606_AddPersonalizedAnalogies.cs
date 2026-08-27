using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonalizedAnalogies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PersonalizedAnalogies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CuratedContentId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonalizedAnalogies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PersonalizedAnalogies_CuratedContents_CuratedContentId",
                        column: x => x.CuratedContentId,
                        principalTable: "CuratedContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PersonalizedAnalogies_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PersonalizedAnalogySections",
                columns: table => new
                {
                    SectionIndex = table.Column<int>(type: "integer", nullable: false),
                    PersonalizedAnalogyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonalizedAnalogySections", x => new { x.PersonalizedAnalogyId, x.SectionIndex });
                    table.ForeignKey(
                        name: "FK_PersonalizedAnalogySections_PersonalizedAnalogies_Personali~",
                        column: x => x.PersonalizedAnalogyId,
                        principalTable: "PersonalizedAnalogies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PersonalizedAnalogies_CuratedContentId",
                table: "PersonalizedAnalogies",
                column: "CuratedContentId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalizedAnalogies_UserId_CuratedContentId",
                table: "PersonalizedAnalogies",
                columns: new[] { "UserId", "CuratedContentId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PersonalizedAnalogySections");

            migrationBuilder.DropTable(
                name: "PersonalizedAnalogies");
        }
    }
}
