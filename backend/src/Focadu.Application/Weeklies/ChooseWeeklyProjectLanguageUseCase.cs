using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso (Fase 59, piloto da Semana 1): o aluno escolhe em qual linguagem vai realizar o
/// Projeto Semanal - e so ai o projeto e disponibilizado pra ele. Faz o fork do
/// repositorio-modelo DAQUELA linguagem na conta dele no Forgejo (antes da Fase 59 o fork saia
/// na matricula, sem linguagem) e grava a escolha, que e definitiva: e o repositorio da linguagem
/// que a plataforma disponibiliza, e a avaliacao por IA le esse repositorio
/// (WeeklyTemplate.ResolveForgejoTemplateSlug), entao trocar no meio do projeto deixaria a
/// avaliacao lendo o repositorio errado.
///
/// Ordem dos passos, pensada pra a escolha poder ser refeita se algo falhar no meio:
/// 1. Todas as checagens de estado ANTES de qualquer chamada externa (bloqueado, ja escolhido,
///    linguagem que a semana nao tem, linguagem que o aluno nao marcou no perfil).
/// 2. Conta do aluno no Forgejo, ja persistida antes do fork - o Forgejo so devolve o token na
///    criacao, e uma conta criada la e perdida aqui se o fork falhar em seguida.
/// 3. Fork. Falha do Forgejo propaga (o aluno precisa saber que nao deu certo) e nada da escolha
///    foi gravado: ele pode tentar de novo.
/// 4. So depois do fork a linguagem e gravada, junto com a URL dele.
/// </summary>
public class ChooseWeeklyProjectLanguageUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserRepository _userRepository;
    private readonly ForgejoAccountProvisioner _forgejoAccountProvisioner;
    private readonly IForgejoService _forgejoService;
    private readonly IUnitOfWork _unitOfWork;

    public ChooseWeeklyProjectLanguageUseCase(
        IWeeklyRepository weeklyRepository, IUserRepository userRepository, ForgejoAccountProvisioner forgejoAccountProvisioner,
        IForgejoService forgejoService, IUnitOfWork unitOfWork)
    {
        _weeklyRepository = weeklyRepository;
        _userRepository = userRepository;
        _forgejoAccountProvisioner = forgejoAccountProvisioner;
        _forgejoService = forgejoService;
        _unitOfWork = unitOfWork;
    }

    public async Task<WeeklyProjectDto> ExecuteAsync(
        Guid userId, Guid weeklyId, ProjectLanguage language, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var project = weekly.Project
            ?? throw new NotFoundException("projeto_nao_encontrado", "Esta semana nao tem projeto definido.");

        weekly.EnsureProjectLanguageCanBeChosen();

        var variant = weekly.Template.FindLanguageVariant(language)
            ?? throw new ValidationException("linguagem_indisponivel", "Esta semana nao tem o projeto nessa linguagem.");

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Usuario nao encontrado.");
        if (!user.PreferredLanguages.Contains(language))
        {
            throw new ValidationException(
                "linguagem_nao_preferida", "Marque essa linguagem no seu perfil antes de escolhe-la pro projeto.");
        }

        var account = await _forgejoAccountProvisioner.GetOrCreateAsync(userId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var repositoryUrl = await _forgejoService.ForkTemplateAsync(variant.ForgejoTemplateSlug, account.ForgejoUsername, cancellationToken);

        weekly.ChooseProjectLanguage(language, repositoryUrl);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return WeeklyProjectDtoMapper.Build(weekly, project, account, user.PreferredLanguages);
    }
}
