using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NotesReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotesReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyId = table.Column<Guid>(type: "uuid", nullable: false),
                    NotesHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    NoteCount = table.Column<int>(type: "integer", nullable: false),
                    Strengths = table.Column<string>(type: "character varying(1200)", maxLength: 1200, nullable: false),
                    Missing = table.Column<string>(type: "character varying(1200)", maxLength: 1200, nullable: false),
                    MaterialCheck = table.Column<string>(type: "character varying(1200)", maxLength: 1200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotesReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotesReviews_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotesReviews_UserId_CreatedAt",
                table: "NotesReviews",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NotesReviews_UserId_DailyId",
                table: "NotesReviews",
                columns: new[] { "UserId", "DailyId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotesReviews");
        }
    }
}
