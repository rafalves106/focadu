using Focadu.Domain.Exceptions;
using Focadu.Domain.Users;
using Xunit;

namespace Focadu.Tests.Users;

public class UserTests
{
    [Fact]
    public void Create_WithValidData_SetsFieldsAndCreatedAt()
    {
        var before = DateTime.UtcNow;

        var user = User.Create("Falves@Example.com", "hash123", "  Falves  ");

        Assert.Equal("falves@example.com", user.Email); // normalizado: trim + lowercase
        Assert.Equal("Falves", user.DisplayName); // so trim, sem mudar caixa
        Assert.Equal("hash123", user.PasswordHash);
        Assert.InRange(user.CreatedAt, before, DateTime.UtcNow);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("nao-e-email")]
    [InlineData("falta-arroba.com")]
    [InlineData("sem-dominio@")]
    public void Create_WithInvalidEmail_Throws(string email)
    {
        var ex = Assert.Throws<DomainException>(() => User.Create(email, "hash123", "Falves"));
        Assert.Equal("email_invalido", ex.Code);
    }

    [Fact]
    public void Create_WithEmptyDisplayName_Throws()
    {
        var ex = Assert.Throws<DomainException>(() => User.Create("falves@example.com", "hash123", "   "));
        Assert.Equal("nome_obrigatorio", ex.Code);
    }

    [Fact]
    public void Create_WithEmptyPasswordHash_Throws()
    {
        Assert.Throws<DomainException>(() => User.Create("falves@example.com", "", "Falves"));
    }
}
