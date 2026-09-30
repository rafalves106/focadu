# Resumo — Fase 87: Laboratório de código (front)

## O que foi implementado

Front do laboratório de código (rascunho `secret/rascunhos/laboratorio-de-codigo-na-ponte.md`; Figma "Laboratório de
código — v2 (proposta)", `193:9321`, aprovado pelo dono em 30/09/2026; backend na Fase 86). O aluno escreve e **roda** o
código dentro da Focada e a saída que vai pra avaliação é a do laboratório. Quem executa é o navegador dele.

- **Três runtimes em Workers** (`frontend/public/lab/`, servidos em `/lab/`): Python (Pyodide + Scapy, com o shim de
  IPv6 do spike), JavaScript (módulo ES num Worker, `process.argv`/`console` capturados e o `pcap-parser`
  empacotado com `fs` virtual) e Linux (Alpine i386 com Bash no emulador v86; o terminal conversa pela serial,
  cada comando vira uma entrada do histórico com saída e exit code). `runner.html`/`runner.mjs` é o anfitrião:
  recebe `init/run/exec/write/abort/dispose` por `postMessage`, derruba o Worker no timeout ou no "Parar" e o
  sobe de novo sozinho.
- **Isolamento sem subdomínio**: a página e os Workers de `/lab/` saem com `Content-Security-Policy` cujo
  `connect-src` só libera o caminho `/lab/` (`default-src 'none'`, `script-src 'self' 'wasm-unsafe-eval' blob:`).
  O código do aluno não alcança a API da Focada (nem por URL relativa, nem absoluta) nem outra origem; só baixa os
  arquivos do próprio laboratório. Dev: plugin no `vite.config.ts`; produção: `location /lab/` no `nginx.conf`.
- **App** (`src/lab/`): `LabClient` (iframe escondido + protocolo), `LabSession` (um laboratório por Daily, vive
  na `TodayPage` e sobrevive entre os passos; `ensure` idempotente, `reset`, `abort`), `labContext`
  (`useLab`), `labOutput` (argv por runtime, linha do erro, rótulos). Os arquivos do dia vêm do
  `weekly.curatedContents` (ids de `lab.fileContentIds`) e são entregues ao runtime por `postMessage`.
- **Tela do passo** (`components/code/LabCodeStepActivity.tsx`, despachada por `CodeStepActivity` quando
  `codeStep.labEnabled`): editor com a linha do erro marcada em âmbar, botão Rodar/Parar, saída do laboratório,
  chip do runtime (`● PYTHON 3.12 · SCAPY · PRONTO`), barra de progresso do download, painel da dica da Focada
  (3 blocos, `DICA · N RESTANTES`), terminal do Linux, "Enviar passo" só libera depois de rodar **o código que
  está no editor**, e no celular o aviso "Continue no computador" (sem baixar nada). As etapas "ajuste isto /
  passou / solução" são as da Fase 79. O passo sem laboratório (`lab=none`) segue o fluxo antigo, sem mudança.
- **API**: tipos (`LabConfigDto`, `CodeStepHintDto`, `LabRunPayload`...), `submitCodeStepResponse` com `labRun` e
  `requestCodeStepHint`.
- **Assets**: `frontend/scripts/lab-assets.mjs` (roda em `predev`/`prebuild`) copia Pyodide e v86 do `node_modules`,
  empacota o `pcap-parser` (esbuild) e gera `manifest.json` com os tamanhos reais. Versionados em `public/lab/`:
  wheels do Scapy e do micropip, BIOS do v86, kernel (`linux/vmlinuz`, um só) e os dois initramfs
  (`linux/basico`, `linux/servidor`, montados por `secret/curadoria/scripts/lab/montar_imagem.sh`).
- **Mock** (`npm run dev:mock`): `/__mock/reset?at=codigo&lab=python|javascript|bash|servidor|none`, dica e envio
  com `labRun`, usando os `dia-N.json` reais.
- **Guia das telas** (`lib/guiaTelas.ts`): texto do passo de código e uma pergunta nova no FAQ.

## Decisões técnicas tomadas que não estavam no prompt original

- **CSP em vez de origem própria** (o rascunho previa um subdomínio): um iframe `sandbox` (origem opaca) não sobe
  Worker de módulo no Chrome, e o Pyodide 314 não roda em Worker clássico; um Worker na mesma origem alcançava a
  API com as credenciais do aluno (spike). A CSP de `/lab/` fecha isso sem DNS nem certificado novos.
  Resta `indexedDB` da origem (a app não guarda nada sensível nele). **Em produção o `$http_host` do nginx precisa
  ser o host que o navegador usou**: se o proxy da frente reescrever o `Host`, a CSP não casa e o laboratório não
  baixa os arquivos (não foi testado atrás do proxy real).
- **Runtime vive na `TodayPage`, não no passo**: o passo é remontado a cada etapa e o ambiente persiste no dia.
- **Enviar exige rodar o código atual**: se o código mudou depois da última execução, o botão trava ("Rode de
  novo pra enviar: o código mudou"), porque uma saída velha faria a IA reprovar o aluno à toa. O backend só exige
  existir um `labRun`.
- **`/lab/` sem fallback de SPA** (`try_files $uri =404`): o fallback devolvia o `index.html` com 200 no lugar de um
  arquivo que faltava (o Vite de dev faz isso e escondeu um erro do micropip no meio do caminho).
- **Progresso com tamanhos do `manifest.json`**: com gzip o `Content-Length` é o comprimido e o que se conta ao
  baixar é o descomprimido. Eventos de progresso limitados a 1 a cada 100 ms (centenas por segundo estouravam o
  limite de atualizações do React).
- **Linux**: o arquivo do aluno é gravado na VM (`/root/<entry>`) sob demanda, antes de cada comando, só se o
  editor mudou; o serviço (`lab_http.py`) sobe no boot e o runner espera aparecer um socket em LISTEN em
  `/proc/net/tcp` (em vez de um `sleep` fixo). Timeout/Parar derrubam a VM, que sobe limpa e regrava o arquivo.
- O aviso "Scapy currently does not support emscripten" (impresso pelo próprio Scapy no `import`) é filtrado da
  saída do aluno.

## Estrutura de arquivos criada

```
frontend/public/lab/{runner.html,runner.mjs,py.worker.mjs,js.worker.mjs,linux.worker.mjs}
frontend/public/lab/vendor/{scapy-2.7.0,micropip-0.11.1}-py3-none-any.whl  vendor/bios/{seabios,vgabios}.bin
frontend/public/lab/linux/{vmlinuz,basico/initrd.zst,servidor/initrd.zst}
frontend/scripts/lab-assets.mjs  frontend/scripts/lab/{pcap-entry,inject,shim-fs}.mjs
frontend/src/lab/{labClient,labSession,labContext,labOutput}.ts*
frontend/src/components/code/{LabCodeStepActivity,labParts,codeParts}.tsx  codeHelpers.ts
```

Gerados e fora do git: `public/lab/{pyodide,v86,js}/` e `public/lab/manifest.json`. Alterados: `CodeStepActivity`
(extraiu o editor/saída pra `codeParts`, virou despachante), `TodayPage`, `api/types.ts`, `api/client.ts`,
`vite.config.ts`, `nginx.conf`, `package.json`/`package-lock.json` (devDependencies: pyodide, v86, esbuild,
pcap-parser e os polyfills), `.gitignore`, `lib/guiaTelas.ts`, `mock/sessionMock.ts`.

## Testes

- `tsc -b` limpo, `oxlint` sem aviso novo (os 2 que restam já existiam), `npm run build` ok (`dist/lab` ~50 MB).
- **Runner no Chrome de verdade** (Playwright, com a CSP ligada), soluções acumuladas dos dias reais batendo com a
  saída esperada: Python 6/6, JavaScript 6/6, Linux básico 6/6 e Linux com servidor 6/6; timeout derruba em 10 s
  (exit 124) e o runtime sobe de novo sozinho; traceback mostra só o arquivo do aluno. Repetido contra um **nginx
  real** (contêiner descartável com o `dist` e o `nginx.conf`): mesmos resultados, `/lab/` com CSP e gzip no wasm,
  arquivo inexistente dá 404, o resto do site continua com o fallback da SPA.
- **Tela no mock**, fluxo completo (esperar ficar pronto → escrever → rodar → dica → enviar → "Passou") nos 4
  runtimes; erro na linha 24 com a marca no editor; editar depois de rodar trava o envio; timeout com mensagem e
  recuperação; celular (390 px) mostra o aviso e **não cria o iframe**; `lab=none` segue igual à Fase 79.
- Capturas conferidas contra os quadros 01, 03, 04, 05 e 07 do Figma.

## Dúvidas ou pontos abertos para a próxima fase

- **Não testado atrás do proxy de produção** (o `$http_host` da CSP), nem no Safari/Firefox, nem em notebook fraco
  (a VM do Linux usa 171 a 313 MB de RAM).
- **Sem saída se o laboratório não subir** (navegador sem WebAssembly/módulo em Worker, arquivo que não baixou):
  o passo com laboratório exige `labRun`, então o aluno fica travado; a tela mostra o motivo e "Tentar de novo".
  Um "rodar na minha máquina" de emergência exigiria o backend aceitar `output` num passo com `lab`.
- **Quadros do Figma não desenhados**: estado do serviço do Linux subindo (~15 s; hoje aparece a barra de
  progresso "Iniciando o servidor do laboratório…"), variação JavaScript (igual à do Python com outro chip).
- **Peso na 1ª carga**: ~15 MB (Python), 13 MB (Linux básico), 22 MB (Linux com servidor); `Cache-Control` de 1 dia.
  O repositório ganhou ~29 MB de binários versionados (kernel e initramfs) em `public/lab/`.
- Verificador de JavaScript da curadoria (`secret/curadoria/scripts/lab`) continua sem existir.
- Este commit **não foi empurrado**: o push no `main` do `focadu` dispara o deploy, que faz `reset --hard` neste
  diretório e apagaria alterações de outra pessoa ainda não commitadas (ver o aviso no relatório da sessão).
