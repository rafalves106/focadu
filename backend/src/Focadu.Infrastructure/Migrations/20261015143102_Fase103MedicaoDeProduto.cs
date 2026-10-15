using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase103MedicaoDeProduto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ScreenVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Day = table.Column<DateOnly>(type: "date", nullable: false),
                    Screen = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Device = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FirstSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScreenVisits", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScreenVisits_Day",
                table: "ScreenVisits",
                column: "Day");

            migrationBuilder.CreateIndex(
                name: "IX_ScreenVisits_UserId_Day_Screen_Device",
                table: "ScreenVisits",
                columns: new[] { "UserId", "Day", "Screen", "Device" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScreenVisits");
        }
    }
}
