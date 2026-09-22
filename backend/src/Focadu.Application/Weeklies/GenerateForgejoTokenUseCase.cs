using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>Fase 60: token recem-gerado - o unico momento em que o valor inteiro sai da API.</summary>
public record ForgejoTokenDto(string ForgejoUsername, string AccessToken, DateTime GeneratedAt);

/// <summary>
/// Caso de uso (Fase 60): gera um token novo do Forgejo pro aluno, revogando o anterior. A Focadu
/// nao guarda o valor (antes ficava em texto puro no Postgres, lido de volta a cada GET da semana) -
/// devolve uma vez so e grava o final dele (UserForgejoAccount.RegisterGeneratedToken), mesmo modelo
/// de token do GitHub: perdeu, gera outro.
/// So pra quem ja tem conta no Forgejo (criada no 1o fork) - sem repositorio, token nao serve pra nada.
/// </summary>
public class GenerateForgejoTokenUseCase
{
    private readonly IUserForgejoAccountRepository _userForgejoAccountRepository;
    private readonly IForgejoService _forgejoService;
    private readonly IUnitOfWork _unitOfWork;

    public GenerateForgejoTokenUseCase(
        IUserForgejoAccountRepository userForgejoAccountRepository, IForgejoService forgejoService, IUnitOfWork unitOfWork)
    {
        _userForgejoAccountRepository = userForgejoAccountRepository;
        _forgejoService = forgejoService;
        _unitOfWork = unitOfWork;
    }

    public async Task<ForgejoTokenDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var account = await _userForgejoAccountRepository.GetByUserIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("conta_git_inexistente", "Voce ainda nao tem repositorio de projeto - escolha a linguagem do projeto primeiro.");

        var token = await _forgejoService.RegenerateAccessTokenAsync(account.ForgejoUsername, cancellationToken);
        account.RegisterGeneratedToken(token);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ForgejoTokenDto(account.ForgejoUsername, token, account.TokenGeneratedAt!.Value);
    }
}
