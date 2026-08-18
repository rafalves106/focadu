using Focadu.Domain.Activities;
using Focadu.Domain.Content;
using Focadu.Domain.Courses;
using Focadu.Domain.Dailies;
using Focadu.Domain.Monthlies;
using Focadu.Domain.Weeklies;
using Microsoft.EntityFrameworkCore;

namespace Focadu.Infrastructure.Persistence;

/// <summary>
/// DbContext unico da Focadu. Todas as entidades de dominio sao mapeadas aqui via classes
/// IEntityTypeConfiguration dedicadas (uma por entidade), aplicadas por reflexao a partir deste
/// mesmo assembly - assim o Domain continua sem nenhuma referencia a EF Core.
/// </summary>
public class FocaduDbContext : DbContext
{
    public FocaduDbContext(DbContextOptions<FocaduDbContext> options) : base(options)
    {
    }

    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Monthly> Monthlies => Set<Monthly>();
    public DbSet<Weekly> Weeklies => Set<Weekly>();
    public DbSet<Daily> Dailies => Set<Daily>();
    public DbSet<DailyActivity> DailyActivities => Set<DailyActivity>();
    public DbSet<ActivityResponse> ActivityResponses => Set<ActivityResponse>();
    public DbSet<QuizOption> QuizOptions => Set<QuizOption>();
    public DbSet<RoleplayNode> RoleplayNodes => Set<RoleplayNode>();
    public DbSet<RoleplayOption> RoleplayOptions => Set<RoleplayOption>();
    public DbSet<CuratedContent> CuratedContents => Set<CuratedContent>();
    public DbSet<WeeklyProject> WeeklyProjects => Set<WeeklyProject>();
    public DbSet<WeeklyReinforcement> WeeklyReinforcements => Set<WeeklyReinforcement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FocaduDbContext).Assembly);

        // Todas as entidades do dominio expoem colecoes/referencias somente-leitura
        // (ex: IReadOnlyCollection<T>) apoiadas em campos privados, de proposito, para nunca
        // permitir que codigo externo adicione itens sem passar pelos metodos de negocio. Isso
        // significa que nenhuma navegacao tem um setter publico utilizavel - entao, para todas
        // elas, sempre usar acesso via campo (backing field) em vez de via propriedade.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var navigation in entityType.GetNavigations())
            {
                navigation.SetPropertyAccessMode(Microsoft.EntityFrameworkCore.PropertyAccessMode.Field);
            }
        }

        base.OnModelCreating(modelBuilder);
    }
}
