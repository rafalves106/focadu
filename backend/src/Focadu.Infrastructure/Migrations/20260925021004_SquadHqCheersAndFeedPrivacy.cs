using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SquadHqCheersAndFeedPrivacy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HideScoresInSquadFeed",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "SquadCheers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SquadId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityKey = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    FromUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SquadCheers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SquadCheers_Squads_SquadId",
                        column: x => x.SquadId,
                        principalTable: "Squads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SquadCheers_Users_FromUserId",
                        column: x => x.FromUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SquadCheers_FromUserId",
                table: "SquadCheers",
                column: "FromUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SquadCheers_SquadId_ActivityKey_FromUserId",
                table: "SquadCheers",
                columns: new[] { "SquadId", "ActivityKey", "FromUserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SquadCheers");

            migrationBuilder.DropColumn(
                name: "HideScoresInSquadFeed",
                table: "Users");
        }
    }
}
