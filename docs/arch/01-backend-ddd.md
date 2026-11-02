## Stack

- **Backend**: .NET 10, C# puro no domínio, PostgreSQL + EF Core (Code-First), xUnit, ASP.NET Core
  minimal APIs. Camadas com regra de dependência única: `Api -> Infrastructure -> Application ->
Domain` (`Domain` nunca depende de nada externo). `Focadu.Tests` cobre só domínio puro e funções
  `internal static` da Application — não há fakes de repositório no projeto.

## Comandos de verificação

- Backend: `dotnet build backend/Focadu.slnx` e `dotnet test backend/tests/Focadu.Tests/Focadu.Tests.csproj`
  (avisos de conflito de versão do EF Core em `Focadu.Tests.csproj` são pré-existentes). O CI hospedado
  exclui `CuratedContentAllFilesTests`, `CertificationCoverageFileTests` e `CuratedCourseImporterTests`
  (precisam do repo `focadu-secret`) — **rodá-los localmente depois de editar qualquer curadoria**.

- Seed: `dotnet run --project backend/src/Focadu.Api -- seed` (idempotente por Curso). Migrations
  aplicam sozinhas no boot da Api; gerar nova com `dotnet ef migrations add` (não precisa de Postgres,
  via `FocaduDbContextFactory`).

## Convenções e armadilhas já descobertas (leia antes de mexer em código)

- **EF Core**: `Guid` gerado no domínio com `ValueGenerated.Never` centralizado em
  `FocaduDbContext.OnModelCreating` (sem isso o tracker emite `UPDATE` em vez de `INSERT`); enums
  como string. Bug de EF/Postgres só aparece rodando contra banco real, nunca em teste de domínio.

- **Testes**: só domínio puro e funções `internal static` da Application (`InternalsVisibleTo`).
  Sem fakes de repositório e sem teste dos adapters Groq — avaliação por IA é verificada ao vivo.

## Arquitetura do backend: Hexagonal (Ports & Adapters) + DDD

```
Focadu.Domain          <- entidades, value objects, regras de negocio, interfaces de
                           repositorio (ports). ZERO dependencia de EF Core ou qualquer
                           biblioteca de infraestrutura - C# puro.
Focadu.Application      <- casos de uso, DTOs, interfaces de servicos externos (ports:
                           IContentEvaluationService, IAudioTranscriptionService, IClock),
                           excecoes de aplicacao (NotFoundException, ConflictException,
                           ValidationException, ExternalServiceException). So depende de
                           Focadu.Domain.
Focadu.Infrastructure   <- adapters concretos: DbContext do EF Core, IEntityTypeConfiguration
                           por entidade, repositorios Postgres, UnitOfWork, SystemClock, adapters
                           Groq (transcricao + avaliacao, Fase 5). Depende de Focadu.Domain e
                           Focadu.Application.
Focadu.Api              <- composicao (DI) + endpoints HTTP reais, validacao de request,
                           tratamento de erro padronizado. Depende dos tres acima.
Focadu.Tests            <- testes unitarios de dominio (xUnit). Depende de Domain e Application.
```

Regra de dependencia (sentido unico, nunca invertido): `Api -> Infrastructure -> Application ->
Domain`, e `Api -> Application -> Domain` diretamente tambem. `Domain` nunca aponta para fora de
si mesmo.
