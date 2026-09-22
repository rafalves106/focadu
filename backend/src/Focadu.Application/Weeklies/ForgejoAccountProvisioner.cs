using Focadu.Application.Ports;
using Focadu.Domain.GitHosting;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Conta do aluno no Forgejo interno - lazy, so criada quando de fato precisa dar um fork pela 1a
/// vez (mesmo padrao de GamificationCreditor.GetOrCreateGemBalanceAsync). Extraido de
/// EnrollUserInCourseUseCase na Fase 59, porque o fork do projeto agora tambem acontece na escolha
/// da linguagem (ChooseWeeklyProjectLanguageUseCase), nao so na matricula.
///
/// Username/email derivados deterministicamente do userId (nunca do email real do aluno - conta
/// interna, o login no Forgejo em si nao e usado, so o access token, ver "Credencial git" em
/// secret/rascunhos/repositorios-gerenciados-projeto-semanal.md).
/// </summary>
public class ForgejoAccountProvisioner
{
    private readonly IUserForgejoAccountRepository _userForgejoAccountRepository;
    private readonly IForgejoService _forgejoService;

    public ForgejoAccountProvisioner(IUserForgejoAccountRepository userForgejoAccountRepository, IForgejoService forgejoService)
    {
        _userForgejoAccountRepository = userForgejoAccountRepository;
        _forgejoService = forgejoService;
    }

    /// <summary>
    /// Devolve a conta existente ou cria uma nova no Forgejo e a adiciona ao repositorio (quem
    /// chama e quem faz o SaveChanges) - persistir antes de qualquer passo que possa falhar, senao
    /// a proxima tentativa tenta criar a mesma conta de novo no Forgejo.
    /// </summary>
    public async Task<UserForgejoAccount> GetOrCreateAsync(Guid userId, CancellationToken cancellationToken)
    {
        var existing = await _userForgejoAccountRepository.GetByUserIdAsync(userId, cancellationToken);
        if (existing is not null) return existing;

        var slug = userId.ToString("N");
        var username = $"aluno-{slug}";
        await _forgejoService.CreateUserAccountAsync(username, $"{slug}@focadu.internal", cancellationToken);

        var account = new UserForgejoAccount(userId, username);
        await _userForgejoAccountRepository.AddAsync(account, cancellationToken);
        return account;
    }
}
