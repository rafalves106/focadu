namespace Focadu.Application.Ports;

/// <summary>
/// Abstrai a data "de hoje" usada pelas regras de acesso a Daily (Weekly.EvaluateDailyAccess).
/// Existe como port para permitir testar casos de uso de aplicacao com datas fixas/controladas,
/// sem depender de DateTime.Now espalhado pelo codigo.
/// </summary>
public interface IClock
{
    DateOnly Today();
}
