using Focadu.Application.Exceptions;
using Focadu.Application.Users;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Users;

namespace Focadu.Application.Admin;

/// <summary>
/// Gestao de usuario pelo Painel (Fase 97, aba Alunos): editar nome/e-mail, mandar o e-mail de redefinicao de senha,
/// desativar/reativar (soft delete) e promover/rebaixar admin. O admin nunca define nem ve a senha de ninguem.
/// </summary>
public class AdminUserManagementUseCase
{
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _unitOfWork;
    private readonly RequestPasswordResetUseCase _passwordReset;
    private readonly AdminStudentsUseCase _students;

    public AdminUserManagementUseCase(
        IUserRepository users, IUnitOfWork unitOfWork, RequestPasswordResetUseCase passwordReset, AdminStudentsUseCase students)
    {
        _users = users;
        _unitOfWork = unitOfWork;
        _passwordReset = passwordReset;
        _students = students;
    }

    public async Task<AdminUpdateStudentResultDto> UpdateAsync(
        Guid userId, string? displayName, string? email, CancellationToken cancellationToken = default)
    {
        var user = await FindAsync(userId, cancellationToken);

        user.ChangeDisplayName(displayName ?? string.Empty);

        var newEmail = (email ?? string.Empty).Trim().ToLowerInvariant();
        var emailChanged = newEmail != user.Email;
        if (emailChanged)
        {
            var existing = await _users.GetByEmailAsync(newEmail, cancellationToken);
            if (existing is not null && existing.Id != user.Id)
                throw new ConflictException("email_ja_cadastrado", "Este email ja esta cadastrado.");
            user.ChangeEmail(newEmail);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new AdminUpdateStudentResultDto(await _students.GetAsync(userId, cancellationToken), emailChanged);
    }

    /// <summary>Reaproveita o fluxo normal de "esqueci a senha": o aluno recebe o link por e-mail e define a nova senha.</summary>
    public async Task SendPasswordResetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await FindAsync(userId, cancellationToken);
        if (user.IsDisabled)
            throw new ValidationException("conta_desativada", "Reative a conta antes de enviar a redefinicao de senha.");
        await _passwordReset.ExecuteAsync(user.Email, cancellationToken);
    }

    /// <param name="confirmation">Tem que ser o e-mail do aluno (mesma confirmacao digitada do reset de curso).</param>
    public async Task<AdminStudentDto> DisableAsync(Guid adminId, Guid userId, string? confirmation, DateTime now, CancellationToken cancellationToken = default)
    {
        if (adminId == userId)
            throw new ValidationException("nao_pode_desativar_a_si_mesmo", "Voce nao pode desativar a propria conta.");

        var user = await FindAsync(userId, cancellationToken);
        if (!AdminConfirmation.Matches(confirmation, user.Email))
            throw new ValidationException("confirmacao_invalida", "Digite o e-mail do aluno exatamente como aparece pra confirmar.");
        if (user.IsAdmin)
            throw new ValidationException("nao_pode_desativar_admin", "Tire o papel de admin antes de desativar essa conta.");

        user.Disable(now);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await _students.GetAsync(userId, cancellationToken);
    }

    public async Task<AdminStudentDto> EnableAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await FindAsync(userId, cancellationToken);
        user.Enable();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await _students.GetAsync(userId, cancellationToken);
    }

    /// <summary>Promove ou rebaixa. Nao rebaixa a si mesmo nem o ultimo admin (o comando `admin` da Api segue como plano B).</summary>
    public async Task<AdminStudentDto> SetRoleAsync(Guid adminId, Guid userId, bool admin, CancellationToken cancellationToken = default)
    {
        var user = await FindAsync(userId, cancellationToken);

        if (!admin)
        {
            if (adminId == userId)
                throw new ValidationException("nao_pode_rebaixar_a_si_mesmo", "Voce nao pode tirar o proprio papel de admin.");
            if (user.IsAdmin && (await _users.ListByRoleAsync(UserRole.Admin, cancellationToken)).Count <= 1)
                throw new ValidationException("ultimo_admin", "Precisa existir pelo menos um admin.");
        }
        else if (user.IsDisabled)
            throw new ValidationException("conta_desativada", "Reative a conta antes de torna-la admin.");

        user.SetRole(admin ? UserRole.Admin : UserRole.Student);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await _students.GetAsync(userId, cancellationToken);
    }

    private async Task<User> FindAsync(Guid userId, CancellationToken cancellationToken) =>
        await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("usuario_nao_encontrado", "Aluno nao encontrado.");
}
