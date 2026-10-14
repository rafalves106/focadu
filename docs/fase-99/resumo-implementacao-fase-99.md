# Resumo — Fase 99: Segurança de borda

Aberta e fechada em 14/10/2026, na branch `fase-99-seguranca-de-borda` (parte da `fase-98-higiene-da-base`). Segunda fase do plano da v0.1.0
(`secret/produto/rascunhos/plano-v0-1-0-cenario-a.md`). Pré-requisito da pauta estratégica: limite de requisições em login, cadastro e
endpoints de IA antes de abrir para gente de fora.

## O que foi implementado

- **Limite de requisições (`backend/src/Focadu.Api/RateLimiting.cs`)**: limitador global em janela deslizante, escolhido pelo caminho (só `POST`).
  - `login`: 10 por minuto, por IP.
  - `account` (`/auth/register`, `forgot-password`, `reset-password`, `email-verification/send` e `/confirm`): 10 por 15 minutos, por IP.
  - `ai` (resposta de voz, passo de código, dica, envio e avaliação do projeto semanal, rascunho do LinkedIn, revisão do Caderninho, Suporte Rápido):
    20 por minuto, por aluno (cai para o IP sem sessão).
  - Excedeu: 429 com o envelope `{ error: "muitas_requisicoes", message }` e `Retry-After` (um segmento da janela: 15 s no login e na IA,
    225 s na conta). `RateLimit__Enabled=false` desliga.
- **IP e esquema reais (`Program.cs`)**: `UseForwardedHeaders` como primeiro middleware, lendo `X-Forwarded-For`/`X-Forwarded-Proto` com 2 saltos
  (Cloudflare Tunnel e nginx; `Forwarded__Limit` muda). Sem isso o limite por IP veria só o IP do nginx e juntaria todos os alunos num balde.
- **Headers no `frontend/nginx.conf`**: HSTS, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`
  (microfone só da própria origem) e CSP só com `frame-ancestors`, `base-uri`, `object-src` e `form-action`. O bloco `/lab/` repete os headers.
- **CORS por configuração**: `Cors__AllowedOrigins` (vírgulas), padrão ainda é o de dev. Comentário velho de `Program.cs` ("endpoints continuam
  abertos") corrigido.

## Decisões técnicas tomadas que não estavam no prompt original

- **Limitador global por caminho em vez de `.RequireRateLimiting` em cada rota**: rota nova que case com um padrão já entra; esquecer de anotar é impossível.
  O custo é que endpoint de IA novo precisa entrar no regex `AiPath`.
- **Sem `script-src` na CSP.** Uma CSP completa depende de conferir o app no navegador (Vite, fontes, Pyodide, vídeo do YouTube, microfone) e as sessões não têm navegador.
  Ficou só o que não quebra nada. Fica como melhoria depois da primeira leva.
- **`X-Frame-Options: SAMEORIGIN` e não `DENY`**: o laboratório (`/lab/`) roda em iframe da mesma origem.
- **Confiança total nos proxies de `X-Forwarded-*`** (lista de redes esvaziada): só o nginx alcança a Api na rede do Docker. A porta `5282` do host **não pode ficar aberta
  para a internet**, senão quem a alcançar forja o IP.
- **Sem teste automatizado do limitador**: o projeto de testes não referencia a Api (convenção do projeto). Verificado ao vivo, abaixo.

## Como verificar

- Build 0 erros e 738 testes aprovados.
- **Ao vivo** (Api real contra Postgres descartável, migrations aplicadas): login recusou a partir da 11ª tentativa (401 ×10, 429 depois); outro IP não foi afetado;
  `GET /health` ×15 sem limite; `register` e `forgot-password` dividem o balde (429 na 11ª); `X-Forwarded-For: falso, real, interno` contou como o IP "real";
  o 429 traz `Retry-After: 15` e o JSON do envelope; usuário autenticado em `/study-assistant/ask`: 20 passaram e as 3 seguintes deram 429.
- **Não verificado**: `nginx.conf` (sem nginx nem Docker na máquina; a sintaxe é simples, mas não rodou); o IP real atrás do Cloudflare Tunnel em produção;
  o app inteiro com os headers novos no navegador (o vídeo do YouTube e o microfone devem continuar funcionando; conferir).

## Dúvidas ou pontos abertos para a próxima fase

- **Conferir em produção após o deploy**: `curl -I https://focadu.falveshub.com/` deve mostrar os 6 headers; e, de duas redes diferentes (casa e 4G), errar a senha do
  login 11 vezes numa delas: só ela toma 429. Se as duas caírem no mesmo balde, o IP real não está chegando (ajustar `Forwarded__Limit`).
- Confirmar que a porta `5282` (e `5280`) do host não está exposta fora da VM (firewall da Oracle).
- Endpoint de IA novo precisa entrar em `AiPath`.
- CSP com `script-src` fica para depois da primeira leva.
- Os dias 5 a 9 da semana 2 do Banco de Dados ainda são tratados como ponte (ver Fase 98); a decisão do dono foi que não deve ser ponte, a corrigir.
