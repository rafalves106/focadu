using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AgentPixelArtAndShowcase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "EquippedBottomId",
                table: "UserEquippedCosmetics",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EquippedHairId",
                table: "UserEquippedCosmetics",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EquippedShoesId",
                table: "UserEquippedCosmetics",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EquippedTopId",
                table: "UserEquippedCosmetics",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SkinTone",
                table: "UserEquippedCosmetics",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "CosmeticItems",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsStarter",
                table: "CosmeticItems",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_UserEquippedCosmetics_EquippedBottomId",
                table: "UserEquippedCosmetics",
                column: "EquippedBottomId");

            migrationBuilder.CreateIndex(
                name: "IX_UserEquippedCosmetics_EquippedHairId",
                table: "UserEquippedCosmetics",
                column: "EquippedHairId");

            migrationBuilder.CreateIndex(
                name: "IX_UserEquippedCosmetics_EquippedShoesId",
                table: "UserEquippedCosmetics",
                column: "EquippedShoesId");

            migrationBuilder.CreateIndex(
                name: "IX_UserEquippedCosmetics_EquippedTopId",
                table: "UserEquippedCosmetics",
                column: "EquippedTopId");

            migrationBuilder.CreateIndex(
                name: "IX_CosmeticItems_Code",
                table: "CosmeticItems",
                column: "Code",
                unique: true,
                filter: "\"Code\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedBottomId",
                table: "UserEquippedCosmetics",
                column: "EquippedBottomId",
                principalTable: "CosmeticItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedHairId",
                table: "UserEquippedCosmetics",
                column: "EquippedHairId",
                principalTable: "CosmeticItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedShoesId",
                table: "UserEquippedCosmetics",
                column: "EquippedShoesId",
                principalTable: "CosmeticItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedTopId",
                table: "UserEquippedCosmetics",
                column: "EquippedTopId",
                principalTable: "CosmeticItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedBottomId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropForeignKey(
                name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedHairId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropForeignKey(
                name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedShoesId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropForeignKey(
                name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedTopId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropIndex(
                name: "IX_UserEquippedCosmetics_EquippedBottomId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropIndex(
                name: "IX_UserEquippedCosmetics_EquippedHairId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropIndex(
                name: "IX_UserEquippedCosmetics_EquippedShoesId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropIndex(
                name: "IX_UserEquippedCosmetics_EquippedTopId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropIndex(
                name: "IX_CosmeticItems_Code",
                table: "CosmeticItems");

            migrationBuilder.DropColumn(
                name: "EquippedBottomId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropColumn(
                name: "EquippedHairId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropColumn(
                name: "EquippedShoesId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropColumn(
                name: "EquippedTopId",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropColumn(
                name: "SkinTone",
                table: "UserEquippedCosmetics");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "CosmeticItems");

            migrationBuilder.DropColumn(
                name: "IsStarter",
                table: "CosmeticItems");
        }
    }
}
