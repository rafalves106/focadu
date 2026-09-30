using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Dailies;

/// <summary>
/// Fase 86: configuracao do laboratorio de codigo de um dia (bloco <c>lab</c> do dia-N.json,
/// secret/curadoria/CURADORIA.md 5.2, rascunho laboratorio-de-codigo-na-ponte.md). Valor imutavel,
/// guardado em <see cref="DailyTemplate.Lab"/>: o dia so tem laboratorio quando isto existe. Quem
/// roda o codigo e o navegador do aluno (Pyodide, Worker de JavaScript ou Linux no v86) - o servidor
/// nunca executa nada, so guarda a configuracao e o que o aluno enviou.
/// </summary>
/// <param name="Runtime">"python", "javascript" ou "bash".</param>
/// <param name="Image">So pro bash: "basico" (Bash + coreutils) ou "servidor" (+ curl, nc, python3 e o host lab).</param>
/// <param name="FileContentIds">CuratedContents do tipo File que ja vem no ambiente (os mesmos do "Material de hoje").</param>
/// <param name="Packages">Libs a instalar sob demanda (Python via micropip, JavaScript empacotadas com shim).</param>
/// <param name="Services">Arquivos de <paramref name="FileContentIds"/> iniciados no boot em segundo plano (exige image servidor).</param>
/// <param name="Entry">Nome do arquivo que o aluno cria/edita (auditor.py, investigar.sh).</param>
/// <param name="Command">Comando de exemplo que roda o Entry - conferencia da curadoria e dica; no Linux o aluno digita.</param>
/// <param name="TimeoutSeconds">Teto por execucao; ao passar, o laboratorio derruba o programa.</param>
public sealed record LabConfig(
    string Runtime,
    string? Image,
    IReadOnlyList<Guid> FileContentIds,
    IReadOnlyList<string> Packages,
    IReadOnlyList<string> Services,
    string Entry,
    string Command,
    int TimeoutSeconds)
{
    public const string Python = "python";
    public const string JavaScript = "javascript";
    public const string Bash = "bash";

    public const string ImageBasic = "basico";
    public const string ImageServer = "servidor";

    public const int MaxTimeoutSeconds = 60;

    private static readonly string[] Runtimes = [Python, JavaScript, Bash];
    private static readonly string[] Images = [ImageBasic, ImageServer];

    /// <summary>Valida as regras da CURADORIA.md 5.2 e devolve a configuracao normalizada (minusculas, sem repeticao).</summary>
    public static LabConfig Create(
        string? runtime, string? image, IEnumerable<Guid>? fileContentIds, IEnumerable<string>? packages,
        IEnumerable<string>? services, string? entry, string? command, int timeoutSeconds)
    {
        var rt = runtime?.Trim().ToLowerInvariant();
        if (rt is null || !Runtimes.Contains(rt))
            throw new DomainException($"lab.runtime invalido: use {string.Join(", ", Runtimes)}.", "lab_runtime_invalido");

        var img = string.IsNullOrWhiteSpace(image) ? null : image.Trim().ToLowerInvariant();
        if (rt == Bash)
        {
            if (img is null || !Images.Contains(img))
                throw new DomainException($"lab.image e obrigatorio no bash: use {string.Join(", ", Images)}.", "lab_imagem_invalida");
        }
        else if (img is not null)
        {
            throw new DomainException("lab.image so vale pro runtime bash.", "lab_imagem_invalida");
        }

        var serviceList = Distinct(services);
        if (serviceList.Count > 0 && img != ImageServer)
            throw new DomainException("lab.services exige image servidor.", "lab_servico_invalido");

        var packageList = Distinct(packages);
        if (rt == Bash && packageList.Count > 0)
            throw new DomainException("No bash os pacotes vem na imagem: nao use lab.packages.", "lab_pacote_invalido");

        if (string.IsNullOrWhiteSpace(entry))
            throw new DomainException("lab.entry e obrigatorio.", "lab_entry_obrigatorio");
        if (string.IsNullOrWhiteSpace(command))
            throw new DomainException("lab.command e obrigatorio.", "lab_command_obrigatorio");
        if (!command.Contains(entry.Trim(), StringComparison.Ordinal))
            throw new DomainException("lab.command precisa rodar o arquivo de lab.entry.", "lab_command_invalido");

        if (timeoutSeconds is < 1 or > MaxTimeoutSeconds)
            throw new DomainException($"lab.timeoutSeconds deve ficar entre 1 e {MaxTimeoutSeconds}.", "lab_timeout_invalido");

        var files = (fileContentIds ?? []).Distinct().ToList();
        return new LabConfig(rt, img, files, packageList, serviceList, entry.Trim(), command.Trim(), timeoutSeconds);
    }

    private static List<string> Distinct(IEnumerable<string>? values) =>
        (values ?? []).Where(v => !string.IsNullOrWhiteSpace(v)).Select(v => v.Trim()).Distinct(StringComparer.Ordinal).ToList();
}
