using Focadu.Domain.Activities;
using Focadu.Domain.Content;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Courses;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enrollments;
using Focadu.Domain.Gamification;
using Focadu.Domain.Monthlies;
using Focadu.Domain.Referrals;
using Focadu.Domain.Users;
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

    // Template (curriculo, Fase 13) - ver docs/ARQUITETURA.md "Template vs Instancia".
    public DbSet<WeeklyTemplate> WeeklyTemplates => Set<WeeklyTemplate>();
    public DbSet<DailyTemplate> DailyTemplates => Set<DailyTemplate>();
    public DbSet<DailyActivity> DailyActivities => Set<DailyActivity>();

    // Instancia (progresso por usuario, Fase 13).
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Weekly> Weeklies => Set<Weekly>();
    public DbSet<Daily> Dailies => Set<Daily>();
    public DbSet<ActivityResponse> ActivityResponses => Set<ActivityResponse>();
    public DbSet<QuizOption> QuizOptions => Set<QuizOption>();
    public DbSet<RoleplayNode> RoleplayNodes => Set<RoleplayNode>();
    public DbSet<RoleplayOption> RoleplayOptions => Set<RoleplayOption>();
    public DbSet<CuratedContent> CuratedContents => Set<CuratedContent>();
    public DbSet<WeeklyProject> WeeklyProjects => Set<WeeklyProject>();
    public DbSet<WeeklyReinforcement> WeeklyReinforcements => Set<WeeklyReinforcement>();
    public DbSet<ModulePublication> ModulePublications => Set<ModulePublication>();
    public DbSet<User> Users => Set<User>();

    // Gamificacao (Fase 14) - 1:1 com User, sempre criadas lazy (ver GamificationCreditor).
    public DbSet<UserGemBalance> UserGemBalances => Set<UserGemBalance>();
    public DbSet<UserStreak> UserStreaks => Set<UserStreak>();

    // Marketplace de Cosmeticos + Indicacao (Fase 17).
    public DbSet<CosmeticItem> CosmeticItems => Set<CosmeticItem>();
    public DbSet<UserCosmeticInventory> UserCosmeticInventories => Set<UserCosmeticInventory>();
    public DbSet<UserEquippedCosmetics> UserEquippedCosmetics => Set<UserEquippedCosmetics>();
    public DbSet<Referral> Referrals => Set<Referral>();

    // Personalizacao por IA (Fase 21) - cache de analogias por (User, CuratedContent).
    public DbSet<PersonalizedAnalogy> PersonalizedAnalogies => Set<PersonalizedAnalogy>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FocaduDbContext).Assembly);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            // Todas as entidades do dominio expoem colecoes/referencias somente-leitura
            // (ex: IReadOnlyCollection<T>) apoiadas em campos privados, de proposito, para nunca
            // permitir que codigo externo adicione itens sem passar pelos metodos de negocio.
            // Isso significa que nenhuma navegacao tem um setter publico utilizavel - entao, para
            // todas elas, sempre usar acesso via campo (backing field) em vez de via propriedade.
            foreach (var navigation in entityType.GetNavigations())
            {
                navigation.SetPropertyAccessMode(Microsoft.EntityFrameworkCore.PropertyAccessMode.Field);
            }

            // Toda Entity gera seu proprio Id (Guid.NewGuid()) no construtor, antes mesmo de o EF
            // ver o objeto - nunca e o banco quem gera. Sem isso, a convencao padrao do EF Core
            // pra chave Guid (ValueGeneratedOnAdd) faz o change tracker, ao descobrir uma entidade
            // nova dentro de um grafo ja rastreado (ex: uma ActivityResponse nova adicionada a uma
            // DailyActivity carregada do banco), concluir erroneamente que "ja tem Id, entao ja
            // existe" e emitir um UPDATE em vez de um INSERT - o UPDATE nao afeta nenhuma linha e
            // vira DbUpdateConcurrencyException. So nao afeta entidades adicionadas via Add() num
            // grafo 100% novo (ex: o seed), porque Add() forca o estado Added independente disso.
            var idProperty = entityType.FindProperty(nameof(Domain.Common.Entity.Id));
            if (idProperty is not null)
            {
                idProperty.ValueGenerated = Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.Never;
            }
        }

        base.OnModelCreating(modelBuilder);
    }
}
