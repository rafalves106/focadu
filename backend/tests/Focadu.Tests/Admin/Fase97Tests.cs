using Focadu.Application.Seed;
using Focadu.Domain.Courses;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Users;
using Xunit;

namespace Focadu.Tests.Admin;

/// <summary>Fase 97: regras de dominio da gestao de usuario e curso pelo Painel (casos de uso dependem de repositorio e nao tem fake aqui).</summary>
public class Fase97Tests
{
    private static readonly DateTime Now = new(2026, 10, 14, 12, 0, 0, DateTimeKind.Utc);

    private static User NewUser() => User.Create("aluno@example.com", "hash", "Aluno");

    [Fact]
    public void Disable_MarksTheAccountAndKeepsTheFirstDate()
    {
        var user = NewUser();
        Assert.False(user.IsDisabled);

        user.Disable(Now);
        user.Disable(Now.AddDays(3));

        Assert.True(user.IsDisabled);
        Assert.Equal(Now, user.DisabledAt);
    }

    [Fact]
    public void Enable_BringsTheAccountBack()
    {
        var user = NewUser();
        user.Disable(Now);

        user.Enable();

        Assert.False(user.IsDisabled);
        Assert.Null(user.DisabledAt);
    }

    [Fact]
    public void ChangeEmail_NormalizesAndForcesANewConfirmation()
    {
        var user = NewUser();
        user.MarkEmailVerified(Now);

        user.ChangeEmail("  Novo@Example.COM ");

        Assert.Equal("novo@example.com", user.Email);
        Assert.Null(user.EmailVerifiedAt);
    }

    [Fact]
    public void ChangeEmail_ToTheSameAddressKeepsTheConfirmation()
    {
        var user = NewUser();
        user.MarkEmailVerified(Now);

        user.ChangeEmail("ALUNO@example.com");

        Assert.Equal(Now, user.EmailVerifiedAt);
    }

    [Theory]
    [InlineData("")]
    [InlineData("sem-arroba")]
    public void ChangeEmail_RejectsInvalidAddress(string email) =>
        Assert.Equal("email_invalido", Assert.Throws<DomainException>(() => NewUser().ChangeEmail(email)).Code);

    [Fact]
    public void ChangeDisplayName_TrimsAndRejectsEmpty()
    {
        var user = NewUser();
        user.ChangeDisplayName("  Maria  ");
        Assert.Equal("Maria", user.DisplayName);

        Assert.Equal("nome_obrigatorio", Assert.Throws<DomainException>(() => user.ChangeDisplayName("   ")).Code);
    }

    [Fact]
    public void EditCatalog_StampsTheEditAndClearCatalogEditRemovesIt()
    {
        var course = new Course("Linux");

        course.EditCatalog("  Aprenda terminal  ", ["Nada"], ["Outro", "Linux"], " prepara ", Now);

        Assert.Equal("Aprenda terminal", course.Description);
        Assert.Equal(["Nada"], course.Requirements);
        Assert.Equal(["Outro"], course.RecommendedBefore); // nunca recomenda o proprio curso
        Assert.Equal("prepara", course.PreparesText);
        Assert.True(course.CatalogEditedByAdmin);

        course.ClearCatalogEdit();
        Assert.False(course.CatalogEditedByAdmin);
    }

    [Fact]
    public void SyncApply_DoesNotOverwriteACourseEditedInThePanel()
    {
        var course = new Course("Linux");
        course.EditCatalog(null, ["Do painel"], [], null, Now);
        var json = SyncCourseRecommendationsUseCase.Parse("""{ "requisitos": ["Do curso.json"], "recomendadoAntes": [], "preparaTexto": null }""");

        SyncCourseRecommendationsUseCase.Apply(course, json);

        Assert.Equal(["Do painel"], course.Requirements);
    }

    [Fact]
    public void ManifestMayPublishADraftCourseUntilTheAdminDecidesTheStatus()
    {
        var course = new Course("Linux");
        Assert.True(course.CanAutoPublish);

        course.PublishByAdmin(Now);
        Assert.Equal(CourseStatus.Active, course.Status);

        course.UnpublishByAdmin(Now);
        Assert.Equal(CourseStatus.Draft, course.Status);
        Assert.False(course.CanAutoPublish); // o importador nao reativa um curso arquivado no Painel
    }
}
