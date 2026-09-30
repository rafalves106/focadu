# Resumo — Fase 83: Telas de curso sem Projeto Semanal (Linux)

## O que foi implementado

Implementação dos quadros aprovados no Figma "Cursos de pré-requisito — v2 (proposta)" (página 180:4502):
01/02 visão da semana, 03 Start, 04 trilha e 05 Ranking. Decisões do dono em 30/09/2026: a trilha é um
mapa curto no mesmo estilo do Web Security, com **um castelo por semana**; na visão da semana o marco
"Fim" virou o castelo; o Start segue o quadro 03 ("Rumo à ponte").

- **API:** `WeeklyOverviewDto` e `WeeklyDetailDto` ganharam `IsPracticeOnly` (`WeeklyTemplate.IsPracticeOnly`)
  e `IsClosed` (`Weekly.IsModuleComplete`). Campos com default, nenhum endpoint novo.
- **Visão da semana:** `WeekCastleRow` no lugar do cartão do Projeto Semanal - "Castelo da Semana N"
  (trancado, "Fechou a ponte do Dia 06, o castelo abre com a Semana N+1") ou "conquistado" com o botão
  "Ir pra Semana N+1". Regras: "Dia 06 é a ponte: um script bash, passo a passo" e "a semana fecha com os
  6 dias". Falas da Focada próprias (`buildPracticeOnlyWeekLine`): em andamento, ponte pendente, semana
  fechada, curso fechado.
- **Trilha (mapa):** região `mapa/linux/regiao-1` (2 ilhas, castelo em cada, bandeira de fim; marcos: antena,
  esteira de pipes, chave SSH), gerada por `secret/curadoria/scripts/mapa/regiao-linux-1.js` e exportada
  por `exportar-frontend.js` (agora por curso; os arquivos do Web Security saíram idênticos). No `CourseMap`:
  castelo trancado/concluído por `IsClosed`, balão "Castelo · Semana N" com "Ver semana", névoa "Abre
  quando a Semana N fechar", sem seletor de mês quando o curso tem uma região só. Resumo: "Pontes"
  (semanas fechadas), "N semanas · pré-requisito", sem o atalho de Certificações. A lista do celular usa
  a mesma regra do castelo.
- **Start:** `BridgePathCard` - "Rumo à ponte — Semana N", dias 1-5 como pontos e a ponte (Dia 6) como fim
  da linha ("D06 · fecha a semana", link pra sessão da ponte quando ela está aberta ou feita).
- **Ranking:** "Como subir" com "Daily bem feita · 100% do score" e "Ponte fecha a semana"; o aviso de
  semana pendente diz "quando a ponte fechar".
- **Falas do mapa:** `PRACTICE_ONLY_MAP_LINES` (primeira vez, último dia antes do castelo, curso concluído);
  curso concluído e "projeto liberado" passaram a considerar `IsClosed`/`IsPracticeOnly`.
- **Legenda do arquivo da ponte:** o `bodyText` do `File` vira a legenda no "Material de hoje"; o Dia 12 do
  Linux ganhou "Suba este servidor e rode o script contra ele." (curadoria, repo `focadu-secret`).
- **Guia das telas:** textos de Start/Trilha/Semana/tour valem pros dois tipos de curso (castelo "fecha a
  semana; no Web Security, é o projeto"), sem citar o Linux (ainda escondido).

## Decisões técnicas tomadas que não estavam no prompt original

- `IsClosed` no DTO em vez de recalcular no front: é a mesma regra do domínio (`IsModuleComplete`) que
  destrava a semana seguinte.
- No curso sem projeto o castelo nunca fica "pendente"/"entregue": a semana fecha no instante em que a ponte
  fecha, não há estado intermediário.
- A névoa da semana seguinte diz "Abre quando a Semana N fechar" mesmo sem `IsLocked`: no curso sem
  projeto nada fica "pendente de fechamento", então `IsLocked` é sempre falso ali.
- O painel "Prepara pro Web Security" dos quadros 01/02 (as semanas do Web Security em que o assunto volta)
  **não** foi implementado: não existe esse dado na curadoria. O painel de certificações some quando o
  módulo não tem nenhuma (já era assim).
- O quadro 03 tinha um bloco "Progresso do curso" com PONTES; o Start atual não tem esse bloco (saiu na
  Fase 66), então só o caminho da semana mudou.

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Courses/{Dtos.cs,GetCourseDetailUseCase.cs}
backend/src/Focadu.Application/Weeklies/{Dtos.cs,GetWeeklyDetailUseCase.cs}
frontend/src/api/types.ts
frontend/src/assets/mapa/linux/{regiao-1.png,regiao-1.json}          (novos, gerados)
frontend/src/components/week/WeekTrail.tsx                          (WeekCastleRow)
frontend/src/components/courseMap/CourseMap.tsx
frontend/src/components/start/{WeekPathCard.tsx,DailyMissionCard.tsx} (BridgePathCard)
frontend/src/components/ranking/Scoreboard.tsx
frontend/src/components/MaterialSidebar.tsx
frontend/src/lib/{courseMaps.ts,focadaMapLines.ts,guiaTelas.ts}
frontend/src/routes/{WeeklyDetailPage.tsx,CourseDetailPage.tsx,RankingPage.tsx}
secret/curadoria/scripts/mapa/exportar-frontend.js                  (por curso)
secret/curadoria/linux/semana-2/dia-12.json                         (legenda do arquivo)
```

## Testes

- `dotnet test`: 588 passando. `tsc -b` sem erro; `oxlint` só com os 3 avisos que já existiam.
- Navegador (Playwright + Chrome) contra a cópia local isolada (Postgres 5499, API 5298, Vite 5173), com o
  Linux recriado pelo seed: trilha com Dia 3 em andamento (mapa curto, névoa na Semana 2, "Pontes 0/2",
  sem Certificações), visão da Semana 1 em andamento e fechada (castelo trancado → conquistado, "Ir pra
  Semana 2", falas certas), trilha com a Semana 1 fechada (castelo concluído, névoa fora, Focada "Semana 2
  liberada"), Start "Rumo à ponte", Ranking do Linux e a legenda do `lab_http.py` no Dia 12. Regressão do
  Web Security: trilha, visão da semana e resumo iguais a antes (castelo = projeto, "Projetos",
  Certificações, seletor de mês).

## Dúvidas ou pontos abertos para a próxima fase

- **Publicar o Linux:** `"published": true` no `secret/curadoria/linux/curso.json` (o próximo deploy ativa).
- "Prepara pro Web Security" (quadros 01/02 e a aba renomeada do quadro 04): precisa de curadoria nova
  (quais semanas do Web Security retomam cada assunto) e de um campo pra levar isso à tela.
- Celular não foi conferido em navegador nesta fase (a lista de semanas usa a mesma regra do castelo).
- O recorte "Mês" do Ranking num curso de 2 semanas é igual ao "Curso"; não mexido.
