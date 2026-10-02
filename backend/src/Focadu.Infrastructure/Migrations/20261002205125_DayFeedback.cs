using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DayFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DayFeedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyId = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyTemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Clarity = table.Column<int>(type: "integer", nullable: false),
                    StuckActivityId = table.Column<Guid>(type: "uuid", nullable: true),
                    StuckActivityType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    StuckActivityOrder = table.Column<int>(type: "integer", nullable: true),
                    Comment = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DayFeedbacks", x => x.Id);
                    table.CheckConstraint("CK_DayFeedbacks_Clarity", "\"Clarity\" BETWEEN 1 AND 5");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DayFeedbacks_DailyTemplateId",
                table: "DayFeedbacks",
                column: "DailyTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_DayFeedbacks_UserId_DailyId",
                table: "DayFeedbacks",
                columns: new[] { "UserId", "DailyId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DayFeedbacks");
        }
    }
}
