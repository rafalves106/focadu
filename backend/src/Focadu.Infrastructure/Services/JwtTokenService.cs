using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Focadu.Application.Ports;
using Focadu.Domain.Users;
using Microsoft.IdentityModel.Tokens;

namespace Focadu.Infrastructure.Services;

/// <summary>
/// Adapter de IJwtTokenService via System.IdentityModel.Tokens.Jwt (Fase 12). So gera o token - a
/// validacao de um token recebido e feita pelo proprio middleware JwtBearer do ASP.NET Core
/// (Program.cs, configurado com a mesma SecretKey), nunca por este servico.
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private static readonly TimeSpan Expiration = TimeSpan.FromDays(7);

    private readonly JwtOptions _options;

    public JwtTokenService(JwtOptions options)
    {
        _options = options;
    }

    public string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.Add(Expiration),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
