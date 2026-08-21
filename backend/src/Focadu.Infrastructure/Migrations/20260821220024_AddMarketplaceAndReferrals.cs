using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketplaceAndReferrals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReferralCode",
                table: "Users",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CosmeticItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Slot = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Rarity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PriceGems = table.Column<int>(type: "integer", nullable: false),
                    AssetUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IsAnimated = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CosmeticItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Referrals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReferrerUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReferredUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Referrals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Referrals_Users_ReferredUserId",
                        column: x => x.ReferredUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Referrals_Users_ReferrerUserId",
                        column: x => x.ReferrerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserCosmeticInventories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CosmeticItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcquiredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserCosmeticInventories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserCosmeticInventories_CosmeticItems_CosmeticItemId",
                        column: x => x.CosmeticItemId,
                        principalTable: "CosmeticItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserCosmeticInventories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserEquippedCosmetics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EquippedFrameId = table.Column<Guid>(type: "uuid", nullable: true),
                    EquippedNameColorId = table.Column<Guid>(type: "uuid", nullable: true),
                    EquippedBannerId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserEquippedCosmetics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedBannerId",
                        column: x => x.EquippedBannerId,
                        principalTable: "CosmeticItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedFrameId",
                        column: x => x.EquippedFrameId,
                        principalTable: "CosmeticItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserEquippedCosmetics_CosmeticItems_EquippedNameColorId",
                        column: x => x.EquippedNameColorId,
                        principalTable: "CosmeticItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserEquippedCosmetics_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_ReferralCode",
                table: "Users",
                column: "ReferralCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferredUserId",
                table: "Referrals",
                column: "ReferredUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferrerUserId",
                table: "Referrals",
                column: "ReferrerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserCosmeticInventories_CosmeticItemId",
                table: "UserCosmeticInventories",
                column: "CosmeticItemId");

            migrationBuilder.CreateIndex(
                name: "IX_UserCosmeticInventories_UserId_CosmeticItemId",
                table: "UserCosmeticInventories",
                columns: new[] { "UserId", "CosmeticItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserEquippedCosmetics_EquippedBannerId",
                table: "UserEquippedCosmetics",
                column: "EquippedBannerId");

            migrationBuilder.CreateIndex(
                name: "IX_UserEquippedCosmetics_EquippedFrameId",
                table: "UserEquippedCosmetics",
                column: "EquippedFrameId");

            migrationBuilder.CreateIndex(
                name: "IX_UserEquippedCosmetics_EquippedNameColorId",
                table: "UserEquippedCosmetics",
                column: "EquippedNameColorId");

            migrationBuilder.CreateIndex(
                name: "IX_UserEquippedCosmetics_UserId",
                table: "UserEquippedCosmetics",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Referrals");

            migrationBuilder.DropTable(
                name: "UserCosmeticInventories");

            migrationBuilder.DropTable(
                name: "UserEquippedCosmetics");

            migrationBuilder.DropTable(
                name: "CosmeticItems");

            migrationBuilder.DropIndex(
                name: "IX_Users_ReferralCode",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ReferralCode",
                table: "Users");
        }
    }
}
