using Focadu.Application.Exceptions;
using Focadu.Application.Users;
using Xunit;

namespace Focadu.Tests.Users;

/// <summary>
/// So a parte pura de RegisterUserUseCase (ValidatePassword, internal static) - o resto do caso
/// de uso depende de IUserRepository/IUnitOfWork/IPasswordHasher/IJwtTokenService, e este projeto
/// nao tem fakes de repositorio (ver docs/ARQUITETURA.md, "Focadu.Tests so testa dominio puro").
/// </summary>
public class RegisterUserUseCaseTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("1234567")] // 7 chars - abaixo do minimo
    public void ValidatePassword_TooShort_Throws(string? password)
    {
        var ex = Assert.Throws<ValidationException>(() => RegisterUserUseCase.ValidatePassword(password));
        Assert.Equal("senha_muito_curta", ex.Code);
    }

    [Fact]
    public void ValidatePassword_WithEightCharsOrMore_DoesNotThrow()
    {
        RegisterUserUseCase.ValidatePassword("12345678");
    }
}
