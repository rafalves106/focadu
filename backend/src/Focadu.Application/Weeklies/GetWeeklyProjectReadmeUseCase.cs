using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>Fase 100b: texto do README.md do repositorio do aluno (o enunciado do Projeto Semanal).</summary>
public record WeeklyProjectReadmeDto(string Text);

/// <summary>
/// Caso de uso (Fase 100b): serve o README do fork do aluno pelo proprio app. Com o fork privado e
/// login obrigatorio no Forgejo o aluno nao consegue abrir a pagina do repositorio (a senha dele e
/// aleatoria, ele so tem token), entao a Focadu le o arquivo com o token administrativo e entrega o
/// texto. So o dono do projeto le: a Weekly e buscada pelo userId, e o repositorio e sempre o do
/// proprio aluno (ForgejoUsername + slug do modelo da linguagem), nunca um caminho vindo do cliente.
/// </summary>
public class GetWeeklyProjectReadmeUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserForgejoAccountRepository _userForgejoAccountRepository;
    private readonly IForgejoService _forgejoService;

    public GetWeeklyProjectReadmeUseCase(
        IWeeklyRepository weeklyRepository, IUserForgejoAccountRepository userForgejoAccountRepository, IForgejoService forgejoService)
    {
        _weeklyRepository = weeklyRepository;
        _userForgejoAccountRepository = userForgejoAccountRepository;
        _forgejoService = forgejoService;
    }

    public async Task<WeeklyProjectReadmeDto> ExecuteAsync(Guid userId, Guid weeklyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var project = weekly.Project
            ?? throw new NotFoundException("projeto_nao_encontrado", "Esta semana nao tem projeto definido.");

        // Sem fork ainda (linguagem nao escolhida) nao ha README do aluno pra mostrar.
        if (project.SubmissionUrl is null || weekly.Template.ResolveForgejoTemplateSlug(project.Language) is not { } templateSlug)
            throw new NotFoundException("readme_indisponivel", "O repositorio deste projeto ainda nao foi criado - escolha a linguagem primeiro.");

        var account = await _userForgejoAccountRepository.GetByUserIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("readme_indisponivel", "O repositorio deste projeto ainda nao foi criado - escolha a linguagem primeiro.");

        var text = await _forgejoService.GetReadmeAsync(account.ForgejoUsername, templateSlug, cancellationToken)
            ?? throw new NotFoundException("readme_indisponivel", "O repositorio nao tem README.md.");

        return new WeeklyProjectReadmeDto(text);
    }
}
