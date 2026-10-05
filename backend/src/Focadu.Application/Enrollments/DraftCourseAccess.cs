using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Enrollments;

/// <summary>
/// Curso em rascunho (Draft) so aparece pra quem esta em CoursePreview:Emails - a mesma regra da matricula
/// (EnrollUserInCourseUseCase), agora tambem nas rotas de leitura do curriculo, da semana-modelo e do conteudo curado,
/// que antes devolviam o texto de um curso em rascunho a qualquer usuario logado.
/// </summary>
internal static class DraftCourseAccess
{
    public static async Task<bool> CanSeeAsync(
        CourseStatus? status, Guid userId, IUserRepository users, CoursePreviewOptions preview, CancellationToken cancellationToken) =>
        status != CourseStatus.Draft || preview.CanPreview((await users.GetByIdAsync(userId, cancellationToken))?.Email);
}
