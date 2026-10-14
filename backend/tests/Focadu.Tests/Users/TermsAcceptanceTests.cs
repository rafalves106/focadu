using Focadu.Application.Shared;
using Focadu.Application.Users;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Users;

namespace Focadu.Tests.Users;

public class TermsAcceptanceTests
{
    private static readonly DateTime Now = new(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);

    private static User NewUser() => User.Create("a@b.com", "hash", "Ana");

    [Fact]
    public void Conta_nova_sem_aceite_fica_pendente()
    {
        var dto = UserDto.From(NewUser());

        Assert.True(dto.TermsAcceptancePending);
    }

    [Fact]
    public void Aceitar_a_versao_vigente_tira_a_pendencia()
    {
        var user = NewUser();

        user.AcceptTerms(LegalDocuments.CurrentVersion, Now);

        Assert.False(UserDto.From(user).TermsAcceptancePending);
        Assert.Equal(Now, user.TermsAcceptedAt);
    }

    [Fact]
    public void Versao_antiga_aceita_volta_a_ficar_pendente()
    {
        var user = NewUser();
        user.AcceptTerms("2020-01-01", Now);

        Assert.True(UserDto.From(user).TermsAcceptancePending);
    }

    [Fact]
    public void Aceitar_a_mesma_versao_de_novo_nao_muda_a_data()
    {
        var user = NewUser();
        user.AcceptTerms(LegalDocuments.CurrentVersion, Now);

        user.AcceptTerms(LegalDocuments.CurrentVersion, Now.AddDays(3));

        Assert.Equal(Now, user.TermsAcceptedAt);
    }

    [Fact]
    public void Versao_vazia_e_recusada()
    {
        var ex = Assert.Throws<DomainException>(() => NewUser().AcceptTerms(" ", Now));

        Assert.Equal("termos_versao_obrigatoria", ex.Code);
    }
}
