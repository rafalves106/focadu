using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSquadCoLeader : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CoLeaderUserId",
                table: "Squads",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Squads_CoLeaderUserId",
                table: "Squads",
                column: "CoLeaderUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Squads_Users_CoLeaderUserId",
                table: "Squads",
                column: "CoLeaderUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Squads_Users_CoLeaderUserId",
                table: "Squads");

            migrationBuilder.DropIndex(
                name: "IX_Squads_CoLeaderUserId",
                table: "Squads");

            migrationBuilder.DropColumn(
                name: "CoLeaderUserId",
                table: "Squads");
        }
    }
}
