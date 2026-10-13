using Focadu.Domain.Courses;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Users;
using Xunit;

namespace Focadu.Tests.Users;

/// <summary>Fase 96: turma, aluno de turma, convite de turma e a regra unica de quem ve cada curso (CourseViewer).</summary>
public class CohortTests
{
    private static readonly Guid Bd = Guid.NewGuid();
    private static readonly Guid Gqs = Guid.NewGuid();
    private static readonly Guid Linux = Guid.NewGuid();

    [Fact]
    public void Create_TrimsTheName_AndDropsRepeatedCourses()
    {
        var cohort = Cohort.Create("  UNA BD 2026/2 ", [Bd, Gqs, Bd, Guid.Empty]);

        Assert.Equal("UNA BD 2026/2", cohort.Name);
        Assert.Equal([Bd, Gqs], cohort.CourseIds);
        Assert.False(cohort.IsArchived);
    }

    [Theory]
    [InlineData(" ", "turma_sem_nome")]
    [InlineData(null, "turma_sem_nome")]
    public void Create_RequiresAName(string? name, string code) =>
        Assert.Equal(code, Assert.Throws<DomainException>(() => Cohort.Create(name, [Bd])).Code);

    [Fact]
    public void Create_RequiresACourse_AndAShortName()
    {
        Assert.Equal("turma_sem_curso", Assert.Throws<DomainException>(() => Cohort.Create("Turma", [])).Code);
        Assert.Equal("turma_nome_longo", Assert.Throws<DomainException>(() => Cohort.Create(new string('x', 81), [Bd])).Code);
    }

    [Fact]
    public void Update_ReturnsOnlyTheCoursesThatCameIn()
    {
        var cohort = Cohort.Create("UNA", [Bd, Gqs]);

        var added = cohort.Update("UNA BD", [Bd, Linux]);

        Assert.Equal([Linux], added);
        Assert.Equal([Bd, Linux], cohort.CourseIds);
        Assert.Equal("UNA BD", cohort.Name);
    }

    [Fact]
    public void ArchivedCohort_DoesNotChange_AndKeepsTheFirstArchiveDate()
    {
        var cohort = Cohort.Create("UNA", [Bd]);
        var first = new DateTime(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc);
        cohort.Archive(first);
        cohort.Archive(first.AddDays(1));

        Assert.Equal(first, cohort.ArchivedAt);
        Assert.Equal("turma_arquivada", Assert.Throws<DomainException>(() => cohort.Update("X", [Bd])).Code);
    }

    [Fact]
    public void User_StaysInOneCohort()
    {
        var user = User.Create("aluno@una.br", "hash", "Aluno");
        var cohort = Guid.NewGuid();
        user.JoinCohort(cohort);
        user.JoinCohort(cohort); // de novo na mesma: nada muda

        Assert.Equal(cohort, user.CohortId);
        Assert.Equal("aluno_em_outra_turma", Assert.Throws<DomainException>(() => user.JoinCohort(Guid.NewGuid())).Code);
    }

    [Fact]
    public void Invite_CarriesTheCohort()
    {
        var cohort = Guid.NewGuid();
        Assert.Equal(cohort, SignupInvite.Create("ABCD2345", "Turma toda", 20, null, cohort).CohortId);
        Assert.Null(SignupInvite.Create("ABCD2346", "Fulano", 1, null).CohortId);
    }

    private static CourseRef Course(Guid id, CourseStatus status = CourseStatus.Active, bool onlyForCohorts = false) => new(id, status, onlyForCohorts);

    private static CourseViewer Viewer(bool inCohort = false, Guid[]? cohortCourses = null, Guid[]? enrolled = null, bool preview = false) =>
        new(inCohort, (cohortCourses ?? []).ToHashSet(), (enrolled ?? []).ToHashSet(), preview);

    [Fact]
    public void StudentWithoutCohort_SeesPublicCourses_NotDraftsNorCohortOnly()
    {
        var viewer = Viewer();

        Assert.True(viewer.CanSee(Course(Linux)));
        Assert.False(viewer.CanSee(Course(Bd, CourseStatus.Draft)));
        Assert.False(viewer.CanSee(Course(Bd, onlyForCohorts: true)));
    }

    [Fact]
    public void CohortStudent_SeesOnlyTheCohortCourses_EvenDraftOrCohortOnly()
    {
        var viewer = Viewer(inCohort: true, cohortCourses: [Bd]);

        Assert.True(viewer.CanSee(Course(Bd, CourseStatus.Draft, onlyForCohorts: true)));
        Assert.False(viewer.CanSee(Course(Linux)));          // curso publico de fora da turma
        Assert.False(viewer.CanSee(Course(Gqs, onlyForCohorts: true)));
    }

    [Fact]
    public void Enrolled_AlwaysSeesTheCourse_AndPreviewSeesEverything()
    {
        Assert.True(Viewer(inCohort: true, cohortCourses: [Bd], enrolled: [Linux]).CanSee(Course(Linux)));
        Assert.True(Viewer(preview: true).CanSee(Course(Bd, CourseStatus.Draft, onlyForCohorts: true)));
    }

    [Fact]
    public void ArchivedCourse_CanStillBeRead_ButNotEnrolled()
    {
        var viewer = Viewer(inCohort: true, cohortCourses: [Bd]);
        var archived = Course(Bd, CourseStatus.Archived);

        Assert.True(viewer.CanSee(archived));
        Assert.False(viewer.CanEnroll(archived));
        Assert.True(viewer.CanEnroll(Course(Bd, CourseStatus.Draft)));
    }
}
