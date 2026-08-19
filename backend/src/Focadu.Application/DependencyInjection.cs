using Focadu.Application.Content;
using Focadu.Application.Courses;
using Focadu.Application.Dailies;
using Focadu.Application.Seed;
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
        services.AddScoped<GetWeeklyDetailUseCase>();
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
        services.AddScoped<CreateCuratedContentUseCase>();
        services.AddScoped<UpdateCuratedContentUseCase>();
        services.AddScoped<GetCuratedContentUseCase>();
        return services;
    }
}
