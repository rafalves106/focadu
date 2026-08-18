using Focadu.Application.Ports;
using Focadu.Domain.Repositories;
using Focadu.Infrastructure.Persistence;
using Focadu.Infrastructure.Persistence.Repositories;
using Focadu.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Focadu.Infrastructure;

/// <summary>Composicao dos adapters concretos (EF Core / Postgres) no container de DI.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddFocaduInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<FocaduDbContext>(options => options.UseNpgsql(connectionString));

        services.AddScoped<ICourseRepository, CourseRepository>();
        services.AddScoped<IMonthlyRepository, MonthlyRepository>();
        services.AddScoped<IWeeklyRepository, WeeklyRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddSingleton<IClock, SystemClock>();

        return services;
    }
}
