using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Rooms;

/// <summary>Conteúdo de uma tarefa como vem da curadoria (sala.json); a flag já chega em hash.</summary>
public record RoomTaskSpec(
    string Key, string Title, string? ChainLabel, string Theory, string Question, string AnswerFormat, string FlagHash,
    IReadOnlyList<string> Hints, string VoicePrompt, string VoiceReferenceAnswer);

/// <summary>
/// Tarefa de uma Sala (Fase 110): teoria curta, pergunta cuja resposta só aparece no alvo (a flag) e o áudio da entrega,
/// avaliado contra <see cref="VoiceReferenceAnswer"/> (mesma conversa por voz do molde v1). <see cref="Key"/> é a
/// identidade estável vinda da curadoria: reimportar a sala atualiza a tarefa no lugar e preserva o progresso do aluno.
/// </summary>
public class RoomTask : Entity
{
    public const int MaxHints = 3;

    public string Key { get; private set; }
    public int OrderIndex { get; private set; }
    public string Title { get; private set; }
    /// <summary>Nome do elo na Sala-desafio ("Reconhecimento", "Acesso"...); nulo nas outras.</summary>
    public string? ChainLabel { get; private set; }
    public string Theory { get; private set; }
    public string Question { get; private set; }
    /// <summary>Como a resposta se parece, mostrado no campo vazio (ex.: "FOCADU{...}", "nome/versão").</summary>
    public string AnswerFormat { get; private set; }
    public string FlagHash { get; private set; }
    private List<string> _hints = new();
    public IReadOnlyList<string> Hints => _hints.AsReadOnly();
    public string VoicePrompt { get; private set; }
    public string VoiceReferenceAnswer { get; private set; }

    private RoomTask()
    {
        Key = Title = Theory = Question = AnswerFormat = FlagHash = VoicePrompt = VoiceReferenceAnswer = string.Empty;
    }

    internal RoomTask(int orderIndex, RoomTaskSpec spec) : this()
    {
        Key = Required(spec.Key, "chave");
        Apply(orderIndex, spec);
    }

    internal void Apply(int orderIndex, RoomTaskSpec spec)
    {
        if (spec.Hints.Count > MaxHints)
            throw new DomainException($"Tarefa '{spec.Key}': no máximo {MaxHints} dicas.");

        OrderIndex = orderIndex;
        Title = Required(spec.Title, "titulo");
        ChainLabel = string.IsNullOrWhiteSpace(spec.ChainLabel) ? null : spec.ChainLabel.Trim();
        Theory = Required(spec.Theory, "teoria");
        Question = Required(spec.Question, "pergunta");
        AnswerFormat = spec.AnswerFormat?.Trim() ?? string.Empty;
        FlagHash = Required(spec.FlagHash, "flag");
        _hints = spec.Hints.Select(h => Required(h, "dica")).ToList();
        VoicePrompt = Required(spec.VoicePrompt, "audio.pergunta");
        VoiceReferenceAnswer = Required(spec.VoiceReferenceAnswer, "audio.respostaCorreta");
    }

    private string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new DomainException($"Tarefa '{Key}': campo '{field}' é obrigatório.")
            : value.Trim();
}
