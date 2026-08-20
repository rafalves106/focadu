using Focadu.Domain.Users;

namespace Focadu.Application.Ports;

/// <summary>
/// Port de emissao do JWT de sessao (Fase 12) - adapter concreto via System.IdentityModel.Tokens.
/// Jwt, ver Focadu.Infrastructure/Services/JwtTokenService. So gera o token: a validacao de um
/// token recebido e feita pelo proprio middleware JwtBearer do ASP.NET Core (configurado em
/// Program.cs com a mesma chave de assinatura), nao por este port - um metodo tipo
/// "ValidateAndGetUserId" aqui ficaria sem nenhum chamador real.
/// </summary>
public interface IJwtTokenService
{
    string GenerateToken(User user);
}
