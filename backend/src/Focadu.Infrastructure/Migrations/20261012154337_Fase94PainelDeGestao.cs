using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase94PainelDeGestao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Student");

            migrationBuilder.CreateTable(
                name: "AiModelPrices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InputPerMillionUsd = table.Column<decimal>(type: "numeric(12,6)", precision: 12, scale: 6, nullable: true),
                    OutputPerMillionUsd = table.Column<decimal>(type: "numeric(12,6)", precision: 12, scale: 6, nullable: true),
                    AudioPerHourUsd = table.Column<decimal>(type: "numeric(12,6)", precision: 12, scale: 6, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Source = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiModelPrices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AiUsageRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CallType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: true),
                    CourseDay = table.Column<int>(type: "integer", nullable: true),
                    InputTokens = table.Column<int>(type: "integer", nullable: false),
                    OutputTokens = table.Column<int>(type: "integer", nullable: false),
                    AudioSeconds = table.Column<double>(type: "double precision", nullable: false),
                    Succeeded = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiUsageRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AiUsageSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MeasuringSince = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MonthlyCapUsd = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiUsageSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiModelPrices_Model",
                table: "AiModelPrices",
                column: "Model",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiUsageRecords_OccurredAt",
                table: "AiUsageRecords",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiUsageRecords_UserId_OccurredAt",
                table: "AiUsageRecords",
                columns: new[] { "UserId", "OccurredAt" });

            // Medicao ligada no deploy desta migration (o uso de antes nao existe) e precos iniciais de referencia
            // publica da Groq (out/2026) - o admin corrige na gaveta "Tabela de precos" se mudarem.
            migrationBuilder.Sql("""
                INSERT INTO "AiUsageSettings" ("Id", "MeasuringSince", "MonthlyCapUsd")
                VALUES ('9a4b2c1d-0000-4000-8000-000000000094', now(), NULL);
                INSERT INTO "AiModelPrices" ("Id", "Model", "InputPerMillionUsd", "OutputPerMillionUsd", "AudioPerHourUsd", "UpdatedAt", "UpdatedBy", "Source")
                VALUES
                  ('9a4b2c1d-0000-4000-8000-000000000001', 'openai/gpt-oss-120b', 0.15, 0.60, NULL, now(), 'migration Fase 94', 'pagina de precos da Groq'),
                  ('9a4b2c1d-0000-4000-8000-000000000002', 'whisper-large-v3', NULL, NULL, 0.111, now(), 'migration Fase 94', 'pagina de precos da Groq');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiModelPrices");

            migrationBuilder.DropTable(
                name: "AiUsageRecords");

            migrationBuilder.DropTable(
                name: "AiUsageSettings");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Users");
        }
    }
}
