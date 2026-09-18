using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCertificationCoverages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CertificationCoverages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MonthlyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CertificationCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CertificationName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Certifier = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CoveredDomains = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CertificationCoverages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CertificationCoverages_Monthlies_MonthlyId",
                        column: x => x.MonthlyId,
                        principalTable: "Monthlies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CertificationCoverages_MonthlyId_CertificationCode",
                table: "CertificationCoverages",
                columns: new[] { "MonthlyId", "CertificationCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CertificationCoverages");
        }
    }
}
