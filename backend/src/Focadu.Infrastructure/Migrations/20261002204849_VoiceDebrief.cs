using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Focadu.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class VoiceDebrief : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CorrectAnswer",
                table: "ActivityResponses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImprovementPoints",
                table: "ActivityResponses",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CorrectAnswer",
                table: "ActivityResponses");

            migrationBuilder.DropColumn(
                name: "ImprovementPoints",
                table: "ActivityResponses");
        }
    }
}
