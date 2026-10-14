using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase101TravasDeIa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DailyBudgetUsd",
                table: "AiUsageSettings",
                type: "numeric(12,4)",
                precision: 12,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FallbackModel",
                table: "AiUsageSettings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // Padroes da Fase 101. Medicao de 14/10/2026: 15 chamadas, ~US$ 0,006 no total, entao US$ 0,50 por aluno por dia
            // e ~25x o uso normal (so pega abuso ou loop) e US$ 30 por mes cobre os 15 testadores com folga. Ambos editaveis na
            // aba Uso de IA; o teto mensal so e posto se ainda estiver vazio (nao sobrescreve valor do dono).
            // Preco do modelo reserva: referencia publica da Groq (out/2026), conferir na pagina de precos.
            migrationBuilder.Sql("""
                UPDATE "AiUsageSettings" SET
                  "DailyBudgetUsd" = 0.50,
                  "MonthlyCapUsd" = COALESCE("MonthlyCapUsd", 30),
                  "FallbackModel" = 'openai/gpt-oss-20b';
                INSERT INTO "AiModelPrices" ("Id", "Model", "InputPerMillionUsd", "OutputPerMillionUsd", "AudioPerHourUsd", "UpdatedAt", "UpdatedBy", "Source")
                VALUES ('9a4b2c1d-0000-4000-8000-000000000003', 'openai/gpt-oss-20b', 0.075, 0.30, NULL, now(), 'migration Fase 101', 'pagina de precos da Groq (conferir)')
                ON CONFLICT DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DailyBudgetUsd",
                table: "AiUsageSettings");

            migrationBuilder.DropColumn(
                name: "FallbackModel",
                table: "AiUsageSettings");
        }
    }
}
