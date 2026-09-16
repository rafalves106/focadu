namespace Focadu.Infrastructure.Services;

/// <summary>Onde o frontend esta hospedado (Fase 41) - so usado pra montar o link absoluto do email de redefinicao de senha (a Application nunca sabe de rota de frontend, so o token em si). Default localhost:5173 em dev (mesma origem hardcoded do CORS, ver Program.cs); producao configura via Frontend:BaseUrl.</summary>
public record FrontendOptions(string BaseUrl);
