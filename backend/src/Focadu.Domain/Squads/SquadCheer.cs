using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Squads;

/// <summary>
/// Um "GG" (Fase 72, QG do Squad): reacao de um toque de um membro a uma atividade de outro membro no
/// feed. Sem comentario livre de proposito (decisao do Figma "Perfil + Squad — v2": evita moderacao).
///
/// As atividades do feed nao sao persistidas - sao derivadas na leitura de datas que ja existem
/// (Daily.CompletedAt, WeeklyProject.EvaluatedAt, compras na loja, entrada no squad; ver
/// GetSquadHqUseCase). Por isso o GG aponta pra atividade por uma chave estavel em texto
/// (<see cref="ActivityKey"/>, "tipo:autor:id"), nao por FK. 1 GG por usuario por atividade (indice
/// unico); dar de novo tira (toggle, ver ToggleSquadCheerUseCase). Sair do squad nao apaga os GGs -
/// eles so deixam de aparecer porque o feed so mostra atividade de quem esta no squad agora.
/// </summary>
public class SquadCheer : Entity
{
    public const int MaxActivityKeyLength = 120;

    public Guid SquadId { get; private set; }
    public string ActivityKey { get; private set; }
    public Guid FromUserId { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private SquadCheer()
    {
        ActivityKey = string.Empty;
    }

    public SquadCheer(Guid squadId, string activityKey, Guid fromUserId)
    {
        if (string.IsNullOrWhiteSpace(activityKey) || activityKey.Length > MaxActivityKeyLength)
            throw new DomainException("Atividade invalida.", "atividade_invalida");

        SquadId = squadId;
        ActivityKey = activityKey;
        FromUserId = fromUserId;
        CreatedAt = DateTime.UtcNow;
    }
}
