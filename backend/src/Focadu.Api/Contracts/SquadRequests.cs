namespace Focadu.Api.Contracts;

public record CreateSquadRequest(string? Name);

public record JoinSquadRequest(string? JoinCode);

/// <summary>Fase 72: chave da atividade do feed ("tipo:autor:id", vem do proprio GET /squads/me/hq).</summary>
public record SquadCheerRequest(string? ActivityKey);
