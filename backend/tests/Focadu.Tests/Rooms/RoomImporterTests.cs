using Focadu.Application.Rooms;
using Focadu.Domain.Rooms;
using Xunit;

namespace Focadu.Tests.Rooms;

/// <summary>Fase 110: leitura e validação do sala.json (o importador faz as vezes de linter das salas).</summary>
public class RoomImporterTests
{
    private const string Valid = """
        {
          "titulo": "LojaServ", "tipo": "semana", "semana": 1, "ordem": 1, "dificuldade": "Fácil", "minutos": 45,
          "resumo": "r", "cenario": "c", "maquina": "Kali + LojaServ", "prerequisitos": [],
          "fechamento": { "pergunta": "Como corrigiria?", "respostaCorreta": "curada" },
          "tarefas": [
            { "chave": "portas", "titulo": "Portas", "teoria": "t", "pergunta": "Quais portas?", "formatoResposta": "porta, porta",
              "flag": "8080, 8443", "dicas": ["use o nmap"], "audio": { "pergunta": "Explique", "respostaCorreta": "curada" } }
          ]
        }
        """;

    [Fact]
    public void ValidFile_BecomesSpec_WithTheFlagOnlyAsHash()
    {
        var (room, errors) = RoomImporter.TryParse(Valid, "lojaserv", "web-security", roomFolder: null);

        Assert.Empty(errors);
        Assert.NotNull(room);
        Assert.Equal(RoomKind.Week, room!.Spec.Kind);
        Assert.Equal(RoomFlag.Hash("8080, 8443"), room.Tasks[0].FlagHash);
        Assert.DoesNotContain("8443", room.Tasks[0].FlagHash);
    }

    [Fact]
    public void MissingFields_AreListed()
    {
        var (room, errors) = RoomImporter.TryParse("""{ "tipo": "desafio", "tarefas": [ { "chave": "a" } ] }""", "x", "web-security", null);

        Assert.Null(room);
        Assert.Contains(errors, e => e.StartsWith("titulo"));
        Assert.Contains(errors, e => e.StartsWith("fechamento"));
        Assert.Contains(errors, e => e.StartsWith("tarefas[1].flag"));
        Assert.Contains(errors, e => e.StartsWith("tarefas[1].elo"));
    }

    [Fact]
    public void RoomFolder_NeedsComposeAndStartScript()
    {
        var folder = Directory.CreateTempSubdirectory().FullName;
        try
        {
            var (_, errors) = RoomImporter.TryParse(Valid, "lojaserv", "web-security", folder);
            Assert.Contains("ambiente/compose.yml: arquivo obrigatório", errors);
            Assert.Contains("ambiente/iniciar.sh: arquivo obrigatório", errors);
        }
        finally
        {
            Directory.Delete(folder, recursive: true);
        }
    }
}
