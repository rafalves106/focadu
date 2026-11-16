using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase110SalasPraticas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Rooms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WeekNumber = table.Column<int>(type: "integer", nullable: true),
                    Difficulty = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    EstimatedMinutes = table.Column<int>(type: "integer", nullable: false),
                    Summary = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                    Scenario = table.Column<string>(type: "text", nullable: false),
                    MachineLabel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Prerequisites = table.Column<string[]>(type: "text[]", nullable: false),
                    FinalPrompt = table.Column<string>(type: "text", nullable: false),
                    FinalReferenceAnswer = table.Column<string>(type: "text", nullable: false),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    ContentHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ContentFolder = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rooms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Rooms_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoomProgresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoomId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MachineOn = table.Column<bool>(type: "boolean", nullable: false),
                    FinalAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FinalScore = table.Column<int>(type: "integer", nullable: true),
                    FinalTranscript = table.Column<string>(type: "text", nullable: true),
                    FinalCorrectedTranscript = table.Column<string>(type: "text", nullable: true),
                    FinalImprovementPoints = table.Column<string>(type: "text", nullable: true),
                    FinalAttempts = table.Column<DateTime[]>(type: "timestamp with time zone[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomProgresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoomProgresses_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RoomProgresses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoomTasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ChainLabel = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    Theory = table.Column<string>(type: "text", nullable: false),
                    Question = table.Column<string>(type: "text", nullable: false),
                    AnswerFormat = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    FlagHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Hints = table.Column<string[]>(type: "text[]", nullable: false),
                    VoicePrompt = table.Column<string>(type: "text", nullable: false),
                    VoiceReferenceAnswer = table.Column<string>(type: "text", nullable: false),
                    RoomId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoomTasks_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoomTaskResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    FlagSolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VoiceAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VoiceScore = table.Column<int>(type: "integer", nullable: true),
                    Transcript = table.Column<string>(type: "text", nullable: true),
                    CorrectedTranscript = table.Column<string>(type: "text", nullable: true),
                    ImprovementPoints = table.Column<string>(type: "text", nullable: true),
                    VoiceAttempts = table.Column<DateTime[]>(type: "timestamp with time zone[]", nullable: false),
                    RoomProgressId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomTaskResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoomTaskResults_RoomProgresses_RoomProgressId",
                        column: x => x.RoomProgressId,
                        principalTable: "RoomProgresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoomProgresses_RoomId",
                table: "RoomProgresses",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_RoomProgresses_UserId_RoomId",
                table: "RoomProgresses",
                columns: new[] { "UserId", "RoomId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_CourseId_Slug",
                table: "Rooms",
                columns: new[] { "CourseId", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoomTaskResults_RoomProgressId_TaskId",
                table: "RoomTaskResults",
                columns: new[] { "RoomProgressId", "TaskId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoomTasks_RoomId",
                table: "RoomTasks",
                column: "RoomId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoomTaskResults");

            migrationBuilder.DropTable(
                name: "RoomTasks");

            migrationBuilder.DropTable(
                name: "RoomProgresses");

            migrationBuilder.DropTable(
                name: "Rooms");
        }
    }
}
