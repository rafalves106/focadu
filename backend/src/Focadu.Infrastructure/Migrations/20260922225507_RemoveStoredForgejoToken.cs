using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveStoredForgejoToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "TokenGeneratedAt",
                table: "UserForgejoAccounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TokenLastEight",
                table: "UserForgejoAccounts",
                type: "character varying(8)",
                maxLength: 8,
                nullable: true);

            // Fase 60: o token atual continua valendo no Forgejo (o aluno pode ja ter ele salvo no
            // git) - guarda so o final dele antes de apagar o valor inteiro, pra tela continuar
            // dizendo qual token esta valendo. TokenGeneratedAt fica nulo (data desconhecida).
            migrationBuilder.Sql(
                """UPDATE "UserForgejoAccounts" SET "TokenLastEight" = right("AccessToken", 8) WHERE length("AccessToken") >= 8;""");

            migrationBuilder.DropColumn(
                name: "AccessToken",
                table: "UserForgejoAccounts");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TokenGeneratedAt",
                table: "UserForgejoAccounts");

            migrationBuilder.DropColumn(
                name: "TokenLastEight",
                table: "UserForgejoAccounts");

            migrationBuilder.AddColumn<string>(
                name: "AccessToken",
                table: "UserForgejoAccounts",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
