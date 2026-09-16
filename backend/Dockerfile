# --- Build Stage ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 1. Copiar o arquivo de solution
COPY Focadu.slnx .

# 2. Copiar todos os .csproj primeiro (restore cacheia por hash de csproj, nao muda a cada
#    alteracao de codigo - build mais rapido em CI/CD e no dia a dia).
COPY src/Focadu.Api/Focadu.Api.csproj src/Focadu.Api/
COPY src/Focadu.Application/Focadu.Application.csproj src/Focadu.Application/
COPY src/Focadu.Domain/Focadu.Domain.csproj src/Focadu.Domain/
COPY src/Focadu.Infrastructure/Focadu.Infrastructure.csproj src/Focadu.Infrastructure/
COPY tests/Focadu.Tests/Focadu.Tests.csproj tests/Focadu.Tests/

# 3. Restaurar a solution inteira
RUN dotnet restore Focadu.slnx

# 4. Copiar o restante do codigo
COPY . .

# 5. Publicar so o projeto Api
RUN dotnet publish src/Focadu.Api/Focadu.Api.csproj -c Release -o /out --no-restore

# --- Runtime Stage ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /out .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
HEALTHCHECK --interval=10s --timeout=3s --retries=10 --start-period=20s \
    CMD curl -fsS http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "Focadu.Api.dll"]
