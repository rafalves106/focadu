using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Fase 105: o repositorio do Projeto Semanal nasce quando o projeto abre (as Dailies da semana
/// concluidas), nao na matricula. Na matricula o fork saia do modelo da epoca, e o modelo muda depois
/// (conteudo novo, semanas ainda nao curadas): o aluno ficava com repositorio velho ou sem nenhum.
/// Idempotente (so age com o projeto Pending e sem URL) e nunca derruba quem chamou: falha do Forgejo
/// deixa o projeto sem URL e a proxima abertura tenta de novo. Semana com variantes de linguagem
/// continua no ChooseWeeklyProjectLanguageUseCase.
/// </summary>
public class WeeklyProjectRepositoryProvisioner
{
    private readonly ForgejoAccountProvisioner _forgejoAccountProvisioner;
    private readonly IForgejoService _forgejoService;
    private readonly IUnitOfWork _unitOfWork;

    public WeeklyProjectRepositoryProvisioner(
        ForgejoAccountProvisioner forgejoAccountProvisioner, IForgejoService forgejoService, IUnitOfWork unitOfWork)
    {
        _forgejoAccountProvisioner = forgejoAccountProvisioner;
        _forgejoService = forgejoService;
        _unitOfWork = unitOfWork;
    }

    /// <summary>Devolve a conta Forgejo usada (para o DTO), ou a que ja existia quando nada foi provisionado.</summary>
    public async Task<Domain.GitHosting.UserForgejoAccount?> EnsureAsync(
        Guid userId, Weekly weekly, Domain.GitHosting.UserForgejoAccount? existingAccount, CancellationToken cancellationToken)
    {
        var project = weekly.Project;
        if (project is null
            || project.Status != WeeklyProjectStatus.Pending
            || project.SubmissionUrl is not null
            || weekly.Template.HasLanguageVariants
            || weekly.Template.ForgejoTemplateSlug is not { } slug
            || !weekly.AreDailiesComplete())
        {
            return existingAccount;
        }

        try
        {
            var account = await _forgejoAccountProvisioner.GetOrCreateAsync(userId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var repositoryUrl = await _forgejoService.ForkTemplateAsync(slug, account.ForgejoUsername, cancellationToken);
            project.AttachRepository(repositoryUrl);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return account;
        }
        catch (ExternalServiceException)
        {
            // Bonus, nunca core (mesmo espirito da matricula antiga): segue sem repositorio, tenta na proxima abertura.
            return existingAccount;
        }
    }
}
