# Resumo — Fase 102: Termos, privacidade e aceite

Aberta e fechada em 14/10/2026, na branch `fase-102-termos-e-privacidade`. Quinta fase do plano da v0.1.0
(`secret/produto/rascunhos/plano-v0-1-0-cenario-a.md`); requisito legal (LGPD) para abrir o teste fechado.

## O que foi implementado

- **Backend**: `User.TermsAcceptedVersion`/`TermsAcceptedAt` + `AcceptTerms` (migration `TermsAcceptance`); `LegalDocuments.CurrentVersion` (`2026-10-15`);
  `RegisterUserUseCase` recusa o cadastro sem `AcceptTerms` (`termos_obrigatorios`, 400) e grava o aceite; `POST /api/users/me/accept-terms`
  (`AcceptTermsUseCase`, 409 `termos_desatualizados` se a versao enviada nao e a vigente); `UserDto.TermsAcceptancePending`/`TermsAcceptedAt`.
- **Texto**: `docs/fase-102/rascunho-termos-e-privacidade.md` (escrito pelo Claude, respostas do dono aplicadas) e `frontend/src/lib/legal.ts` (versao final
  servida pelas paginas; `LEGAL_VERSION` espelha a constante do backend).
- **Frontend** (Figma "Termos e Privacidade — v1 (proposta)", pagina `305:4502`, aprovado pelo dono): paginas publicas `/termos` e `/privacidade`
  (`LegalPage`, indice lateral/sanfona, tabela vira cartoes no celular), caixa de aceite (`TermsCheckbox`) no `RegisterForm`, tela `/aceite`
  (`AcceptTermsPage`, bloqueia o app logado), `LegalFooter` no login e, discreto com a data do aceite, no fim das Configuracoes.
  `ProtectedRoute` e `resolveLandingPath` mandam para `/aceite` quando `termsAcceptancePending`. Guia das telas atualizado (`login`, `aceite`).

## Decisões técnicas tomadas que não estavam no prompt original

- Contas antigas tambem aceitam, no proximo login (decisao do dono). Quem aceitou outra versao volta a ver `/aceite` ao subir a constante.
- Caixa unica de aceite com a frase da voz explicita (sem caixa separada de consentimento).
- Botao "Criar conta" sempre clicavel; o erro aparece ao clicar sem marcar (opcao B do Figma, melhor para leitor de tela).
- Corpo dos documentos em Inter 16/26, coluna de 720px (texto longo); titulos em VT323.
- Rotulo de backup no texto: "rotativos, so as copias mais recentes" - o `deploy.yml` mantem os 14 ultimos dumps pre-deploy; nao ha prazo em dias.
- Git: a branch foi reapontada para `bcdd47a` apos uma queda corromper objetos (0 bytes); a migration `TermsAcceptance` foi regerada.

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/{Shared/LegalDocuments.cs, Users/AcceptTermsUseCase.cs}
backend/src/Focadu.Infrastructure/Migrations/*_TermsAcceptance*.cs
backend/tests/Focadu.Tests/Users/TermsAcceptanceTests.cs
frontend/src/{lib/legal.ts, components/legal/{LegalBits,LegalContent}.tsx, routes/{LegalPage,AcceptTermsPage}.tsx}
docs/fase-102/
```

## Testes

`dotnet test` (sem os 3 testes que exigem o repo `focadu-secret`): 731 aprovados, 0 falhas; 5 novos em `TermsAcceptanceTests`. `npx tsc -b`, `npm run lint`
(so avisos pre-existentes) e `npm run build` passam. **Nao verificado ao vivo** (sessao sem navegador): layout das paginas e da tela `/aceite`, o fluxo de
cadastro com a caixa, o rodape das Configuracoes no celular e a migration contra o Postgres.

## Dúvidas ou pontos abertos para a próxima fase

- O dono precisa revisar o texto juridico final (idealmente com contador/advogado) - o rascunho nao e aconselhamento juridico.
- Zero Data Retention ligado no Groq (global) pelo dono em 14/10/2026; o texto da Privacidade afirma isso, entao nao desligar sem rever o texto.
- Item de cookies/armazenamento do navegador: reconferir apos a Fase 103 (medicao de produto).
- Conferir no celular o rodape discreto das Configuracoes (o designer avisou que quebra em duas linhas).
