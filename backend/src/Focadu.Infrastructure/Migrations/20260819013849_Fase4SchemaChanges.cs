using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase4SchemaChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReinforcementDailyId",
                table: "Dailies",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Justification",
                table: "ActivityResponses",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Dailies_ReinforcementDailyId",
                table: "Dailies",
                column: "ReinforcementDailyId");

            migrationBuilder.AddForeignKey(
                name: "FK_Dailies_Dailies_ReinforcementDailyId",
                table: "Dailies",
                column: "ReinforcementDailyId",
                principalTable: "Dailies",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Dailies_Dailies_ReinforcementDailyId",
                table: "Dailies");

            migrationBuilder.DropIndex(
                name: "IX_Dailies_ReinforcementDailyId",
                table: "Dailies");

            migrationBuilder.DropColumn(
                name: "ReinforcementDailyId",
                table: "Dailies");

            migrationBuilder.DropColumn(
                name: "Justification",
                table: "ActivityResponses");
        }
    }
}
