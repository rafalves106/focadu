using System.Text;

namespace Focadu.Application.Rooms;

/// <summary>
/// iniciar.ps1: o mesmo papel do iniciar.sh da sala, para quem estuda no Windows (PowerShell, com o Docker Desktop).
/// Sobe o compose da pasta e derruba tudo ao apertar Ctrl+C ou quando o tempo acaba. Vai no zip de toda sala (a sala
/// so traz um proprio se quiser outro comportamento), porque o script nao depende da sala: tudo o que muda esta no
/// compose.yml. Sai em UTF-8 com BOM e CRLF: o Windows PowerShell 5.1 le .ps1 sem BOM como ANSI e estraga os acentos.
/// </summary>
public static class WindowsStartScript
{
    public const string FileName = "iniciar.ps1";

    private const string Script = """
        # Sobe a sala da Focadu no Windows e desliga tudo sozinho: ao apertar Ctrl+C ou quando o tempo acaba
        # (2 horas; mude com $env:LIMITE_MINUTOS = 90 antes de rodar).
        # Rode pelo PowerShell: powershell -ExecutionPolicy Bypass -File .\iniciar.ps1
        Set-Location -LiteralPath $PSScriptRoot
        $limite = if ($env:LIMITE_MINUTOS) { [int]$env:LIMITE_MINUTOS } else { 120 }
        $senha = if ($env:VNC_PW) { $env:VNC_PW } else { 'focadu' }

        docker info *> $null
        if ($LASTEXITCODE -ne 0) {
            Write-Host 'O Docker não está rodando. Abra o Docker Desktop e tente de novo.'
            exit 1
        }

        try {
            Write-Host 'Subindo a sala (na primeira vez demora alguns minutos)...'
            docker compose up -d --build
            if ($LASTEXITCODE -ne 0) { exit 1 }

            Write-Host ''
            Write-Host 'Pronto. Abra o desktop do Kali: https://127.0.0.1:6901'
            Write-Host "  usuário: kasm_user   senha: $senha"
            Write-Host '  (o navegador avisa do certificado: é esperado, pode continuar)'
            Write-Host ''
            Write-Host 'Volte na Focadu e marque "Já subi a máquina".'
            Write-Host "A sala desliga sozinha em $limite minutos. Ctrl+C desliga agora."
            Write-Host 'Desligue sempre com Ctrl+C: fechar a janela deixa a sala ligada.'
            $fim = (Get-Date).AddMinutes($limite)
            while ((Get-Date) -lt $fim) { Start-Sleep -Seconds 1 }
        }
        finally {
            Write-Host ''
            Write-Host 'Desligando a sala...'
            docker compose down --remove-orphans *> $null
            Write-Host 'Sala desligada. Seu progresso fica salvo na Focadu.'
        }
        """;

    public static byte[] Bytes() =>
        new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(Script.ReplaceLineEndings("\r\n") + "\r\n"))
            .ToArray();
}
