using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSquads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Squads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    OwnerUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    JoinCode = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Squads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Squads_Users_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SquadMemberships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SquadId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SquadMemberships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SquadMemberships_Squads_SquadId",
                        column: x => x.SquadId,
                        principalTable: "Squads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SquadMemberships_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SquadMemberships_SquadId",
                table: "SquadMemberships",
                column: "SquadId");

            migrationBuilder.CreateIndex(
                name: "IX_SquadMemberships_UserId",
                table: "SquadMemberships",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Squads_JoinCode",
                table: "Squads",
                column: "JoinCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Squads_OwnerUserId",
                table: "Squads",
                column: "OwnerUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SquadMemberships");

            migrationBuilder.DropTable(
                name: "Squads");
        }
    }
}
