using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Monthlies;

/// <summary>
/// Cobertura curada (manual, nunca gerada por IA) de uma certificação de mercado (ex: CompTIA
/// Security+, eJPT) por um Monthly - curriculo, compartilhado por todo mundo matriculado no
/// Course, populado exclusivamente pelo seed/importer (ver CertificationCoverageImporter), nunca
/// via API de autoria (Fase 45, secret/rascunhos/informativo-certificacoes.md).
/// </summary>
public class CertificationCoverage : Entity
{
    public Guid MonthlyId { get; private set; }
    public string CertificationCode { get; private set; }
    public string CertificationName { get; private set; }
    public string Certifier { get; private set; }
    public string CoveredDomains { get; private set; }

    private CertificationCoverage()
    {
        CertificationCode = string.Empty;
        CertificationName = string.Empty;
        Certifier = string.Empty;
        CoveredDomains = string.Empty;
    }

    public CertificationCoverage(Guid monthlyId, string certificationCode, string certificationName, string certifier, string coveredDomains)
    {
        Validate(certificationCode, certificationName, certifier, coveredDomains);

        MonthlyId = monthlyId;
        CertificationCode = certificationCode;
        CertificationName = certificationName;
        Certifier = certifier;
        CoveredDomains = coveredDomains;
    }

    private static void Validate(string certificationCode, string certificationName, string certifier, string coveredDomains)
    {
        if (string.IsNullOrWhiteSpace(certificationCode))
            throw new DomainException("Codigo da certificacao e obrigatorio.");
        if (string.IsNullOrWhiteSpace(certificationName))
            throw new DomainException("Nome da certificacao e obrigatorio.");
        if (string.IsNullOrWhiteSpace(certifier))
            throw new DomainException("Certificadora e obrigatoria.");
        if (string.IsNullOrWhiteSpace(coveredDomains))
            throw new DomainException("Descricao dos dominios cobertos e obrigatoria.");
    }
}
