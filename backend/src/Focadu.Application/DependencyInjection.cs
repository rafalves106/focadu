using Focadu.Application.Achievements;
using Focadu.Application.Content;
using Focadu.Application.Courses;
using Focadu.Application.Dailies;
using Focadu.Application.Enrollments;
using Focadu.Application.Gamification;
using Focadu.Application.Marketplace;
using Focadu.Application.Notes;
using Focadu.Application.Ranking;
using Focadu.Application.Referrals;
using Focadu.Application.Seed;
using Focadu.Application.Squads;
using Focadu.Application.System;
using Focadu.Application.Users;
using Focadu.Application.Weeklies;
using Microsoft.Extensions.DependencyInjection;

namespace Focadu.Application;

/// <summary>Composicao dos casos de uso da camada de aplicacao no container de DI.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddFocaduApplication(this IServiceCollection services)
    {
        services.AddScoped<ListCoursesUseCase>();
        services.AddScoped<GetCourseDetailUseCase>();
        services.AddScoped<GetCourseCurriculumUseCase>();
        services.AddScoped<GetWeeklyDetailUseCase>();
        services.AddScoped<GetWeeklyTemplateDetailUseCase>();
        services.AddScoped<SubmitWeeklyProjectUseCase>();
        services.AddScoped<EvaluateWeeklyProjectUseCase>();
        services.AddScoped<GenerateLinkedInDraftUseCase>();
        services.AddScoped<GetGitHubRepositoriesUseCase>();
        services.AddScoped<CommitModuleSummaryUseCase>();
        services.AddScoped<SubmitPublicationUseCase>();
        services.AddScoped<GetPublicationStatusUseCase>();
        services.AddScoped<GetDailyStateUseCase>();
        services.AddScoped<GetTodayUseCase>();
        services.AddScoped<StartOrResumeDailyUseCase>();
        services.AddScoped<SubmitActivityResponseUseCase>();
        services.AddScoped<SubmitVoiceSummaryResponseUseCase>();
        services.AddScoped<CompleteDailyUseCase>();
        services.AddScoped<SeedWebSecurityCourseUseCase>();
        services.AddScoped<SeedCosmeticCatalogUseCase>();
        services.AddScoped<GetCuratedContentUseCase>();
        services.AddScoped<RegisterUserUseCase>();
        services.AddScoped<LoginUserUseCase>();
        services.AddScoped<GetCurrentUserUseCase>();
        services.AddScoped<CompleteProfileUseCase>();
        services.AddScoped<EnrollUserInCourseUseCase>();
        services.AddScoped<GetAvailableCoursesUseCase>();
        services.AddScoped<GetMyEnrollmentsUseCase>();
        services.AddScoped<GamificationCreditor>();
        services.AddScoped<GetGamificationSummaryUseCase>();
        services.AddScoped<AcknowledgeStreakBreakUseCase>();
        services.AddScoped<GetCourseRankingUseCase>();
        services.AddScoped<GetMarketplaceCatalogUseCase>();
        services.AddScoped<PurchaseCosmeticItemUseCase>();
        services.AddScoped<EquipCosmeticUseCase>();
        services.AddScoped<UnequipCosmeticUseCase>();
        services.AddScoped<GetUserBadgesUseCase>();
        services.AddScoped<GetReferralInfoUseCase>();
        services.AddScoped<CreateSquadUseCase>();
        services.AddScoped<JoinSquadUseCase>();
        services.AddScoped<LeaveSquadUseCase>();
        services.AddScoped<RemoveMemberUseCase>();
        services.AddScoped<SetSquadCoLeaderUseCase>();
        services.AddScoped<GetSquadRankingUseCase>();
        // Status de IA (Fase 28) - badge do GlobalNav, agrega todo IAiProviderHealthCheck registrado.
        services.AddScoped<GetAiProviderStatusUseCase>();
        // Caderninho de Anotacoes (Fase 29).
        services.AddScoped<CreateNoteUseCase>();
        services.AddScoped<EditNoteUseCase>();
        services.AddScoped<DeleteNoteUseCase>();
        services.AddScoped<ListNotesUseCase>();
        services.AddScoped<ListNoteTagsUseCase>();
        return services;
    }
}
