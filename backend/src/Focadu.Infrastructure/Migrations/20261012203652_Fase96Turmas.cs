using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase96Turmas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CohortId",
                table: "Users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CohortId",
                table: "SignupInvites",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "OnlyForCohorts",
                table: "Courses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Cohorts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    CourseIds = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ArchivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cohorts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_CohortId",
                table: "Users",
                column: "CohortId");

            migrationBuilder.CreateIndex(
                name: "IX_SignupInvites_CohortId",
                table: "SignupInvites",
                column: "CohortId");

            migrationBuilder.AddForeignKey(
                name: "FK_SignupInvites_Cohorts_CohortId",
                table: "SignupInvites",
                column: "CohortId",
                principalTable: "Cohorts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Cohorts_CohortId",
                table: "Users",
                column: "CohortId",
                principalTable: "Cohorts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SignupInvites_Cohorts_CohortId",
                table: "SignupInvites");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Cohorts_CohortId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Cohorts");

            migrationBuilder.DropIndex(
                name: "IX_Users_CohortId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_SignupInvites_CohortId",
                table: "SignupInvites");

            migrationBuilder.DropColumn(
                name: "CohortId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CohortId",
                table: "SignupInvites");

            migrationBuilder.DropColumn(
                name: "OnlyForCohorts",
                table: "Courses");
        }
    }
}
