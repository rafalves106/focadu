using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Courses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Courses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Monthlies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Number = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Monthlies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Monthlies_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Weeklies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MonthlyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Number = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Theme = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Weeklies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Weeklies_Monthlies_MonthlyId",
                        column: x => x.MonthlyId,
                        principalTable: "Monthlies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CuratedContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ExternalUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    BodyText = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CuratedContents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CuratedContents_Weeklies_WeeklyId",
                        column: x => x.WeeklyId,
                        principalTable: "Weeklies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Dailies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayNumber = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsReinforcement = table.Column<bool>(type: "boolean", nullable: false),
                    PenaltyPoints = table.Column<int>(type: "integer", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReinforcementTriggered = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dailies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Dailies_Weeklies_WeeklyId",
                        column: x => x.WeeklyId,
                        principalTable: "Weeklies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyProjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyId = table.Column<Guid>(type: "uuid", nullable: false),
                    SpecText = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SubmissionUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyProjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyProjects_Weeklies_WeeklyId",
                        column: x => x.WeeklyId,
                        principalTable: "Weeklies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReinforcements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyId = table.Column<Guid>(type: "uuid", nullable: false),
                    TriggeredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReinforcements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyReinforcements_Weeklies_WeeklyId",
                        column: x => x.WeeklyId,
                        principalTable: "Weeklies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DailyActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    ContentId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ExpectedAnswer = table.Column<string>(type: "text", nullable: true),
                    AnswerMode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyActivities_CuratedContents_ContentId",
                        column: x => x.ContentId,
                        principalTable: "CuratedContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DailyActivities_Dailies_DailyId",
                        column: x => x.DailyId,
                        principalTable: "Dailies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReinforcementWeakDailies",
                columns: table => new
                {
                    DailyId = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyReinforcementId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReinforcementWeakDailies", x => new { x.WeeklyReinforcementId, x.DailyId });
                    table.ForeignKey(
                        name: "FK_WeeklyReinforcementWeakDailies_Dailies_DailyId",
                        column: x => x.DailyId,
                        principalTable: "Dailies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WeeklyReinforcementWeakDailies_WeeklyReinforcements_WeeklyR~",
                        column: x => x.WeeklyReinforcementId,
                        principalTable: "WeeklyReinforcements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ActivityResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttemptNumber = table.Column<int>(type: "integer", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    Passed = table.Column<bool>(type: "boolean", nullable: false),
                    Transcript = table.Column<string>(type: "text", nullable: true),
                    AiFeedback = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActivityResponses_DailyActivities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "DailyActivities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuizOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizOptions_DailyActivities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "DailyActivities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoleplayNodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    NodeKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    IsTerminal = table.Column<bool>(type: "boolean", nullable: false),
                    TerminalQuality = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleplayNodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoleplayNodes_DailyActivities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "DailyActivities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoleplayOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    NextNodeId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleplayOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoleplayOptions_RoleplayNodes_NextNodeId",
                        column: x => x.NextNodeId,
                        principalTable: "RoleplayNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RoleplayOptions_RoleplayNodes_NodeId",
                        column: x => x.NodeId,
                        principalTable: "RoleplayNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActivityResponses_ActivityId_AttemptNumber",
                table: "ActivityResponses",
                columns: new[] { "ActivityId", "AttemptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CuratedContents_WeeklyId",
                table: "CuratedContents",
                column: "WeeklyId");

            migrationBuilder.CreateIndex(
                name: "IX_Dailies_WeeklyId_DayNumber",
                table: "Dailies",
                columns: new[] { "WeeklyId", "DayNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyActivities_ContentId",
                table: "DailyActivities",
                column: "ContentId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyActivities_DailyId",
                table: "DailyActivities",
                column: "DailyId");

            migrationBuilder.CreateIndex(
                name: "IX_Monthlies_CourseId_Number",
                table: "Monthlies",
                columns: new[] { "CourseId", "Number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuizOptions_ActivityId",
                table: "QuizOptions",
                column: "ActivityId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleplayNodes_ActivityId_NodeKey",
                table: "RoleplayNodes",
                columns: new[] { "ActivityId", "NodeKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoleplayOptions_NextNodeId",
                table: "RoleplayOptions",
                column: "NextNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleplayOptions_NodeId",
                table: "RoleplayOptions",
                column: "NodeId");

            migrationBuilder.CreateIndex(
                name: "IX_Weeklies_MonthlyId_Number",
                table: "Weeklies",
                columns: new[] { "MonthlyId", "Number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyProjects_WeeklyId",
                table: "WeeklyProjects",
                column: "WeeklyId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReinforcements_WeeklyId",
                table: "WeeklyReinforcements",
                column: "WeeklyId");

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReinforcementWeakDailies_DailyId",
                table: "WeeklyReinforcementWeakDailies",
                column: "DailyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityResponses");

            migrationBuilder.DropTable(
                name: "QuizOptions");

            migrationBuilder.DropTable(
                name: "RoleplayOptions");

            migrationBuilder.DropTable(
                name: "WeeklyProjects");

            migrationBuilder.DropTable(
                name: "WeeklyReinforcementWeakDailies");

            migrationBuilder.DropTable(
                name: "RoleplayNodes");

            migrationBuilder.DropTable(
                name: "WeeklyReinforcements");

            migrationBuilder.DropTable(
                name: "DailyActivities");

            migrationBuilder.DropTable(
                name: "CuratedContents");

            migrationBuilder.DropTable(
                name: "Dailies");

            migrationBuilder.DropTable(
                name: "Weeklies");

            migrationBuilder.DropTable(
                name: "Monthlies");

            migrationBuilder.DropTable(
                name: "Courses");
        }
    }
}
