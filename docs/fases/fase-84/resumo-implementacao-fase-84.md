# Resumo — Fase 84: Cursos livres com recomendação (ficha do curso)

## O que foi implementado

Decisão do dono em 30/09/2026: os cursos são livres, nenhum destrava outro. A Focadu só recomenda
("antes deste, recomendamos aquele") e mostra o que ajuda saber antes, na tela do curso, pra o aluno decidir.
Telas do Figma "Escolha de curso: recomendação — v2 (proposta)" (página 189:8775), aprovadas.

- **Dados:** `Course.Requirements` e `Course.RecommendedBefore` (`text[]`) e `Course.PreparesText`
  (migration `CourseRecommendation`), aplicados por `Course.SetRecommendation` (ignora item vazio e o
  próprio curso). Fonte: `secret/curadoria/<slug>/recomendacao.json` (`requisitos`, `recomendadoAntes`,
  `preparaTexto`); o Web Security recomenda o Linux antes e o Linux "começa do zero".
- **Seed:** `SyncCourseRecommendationsUseCase` roda em todo deploy, depois dos cursos, e sobrescreve a
  ficha de cada curso que tem o arquivo (é vitrine: vale pra curso já publicado, sem tocar em progresso).
  O log diz em quais cursos atualizou.
- **API:** `GET /api/courses/available` traz `requirements`, `recommendedBefore` (id, nome, duração e a
  situação do aluno no recomendado: `NotStarted`, `InProgress` ou `Completed`, este quando todas as
  semanas da matrícula fecharam), `preparesFor` e `preparesText`.
- **Escolha de curso (`/selecionar-curso`, também o "Explorar cursos" do Start):** selo por cartão
  (âmbar "Recomendado antes: Linux"; verde "Linux em andamento"/"Linux feito"; verde "Prepara pro Web
  Security · começa do zero"), "Iniciar missão" virou "Ver curso" e a Focada diz "Os cursos são livres,
  agente. Eu só digo por onde eu começaria."
- **Ficha do curso (`CourseSheet`, no `PixelModal`):** descrição, "O que ajuda saber antes" (ou "O que você
  precisa antes" quando não há recomendação), a caixa âmbar da recomendação (ou verde, se o aluno já fez o
  recomendado), a caixa verde "Prepara pro ..." e os botões: "Começar pelo X" (abre a ficha do X), "Ir pro X"
  (quando o aluno já está nele) e "Iniciar <curso>", que matricula direto, sem trava nem "tem certeza?".
- **Guia das telas:** o passo "O curso" do onboarding explica que os cursos são livres.

## Decisões técnicas tomadas que não estavam no prompt original

- Recomendação por **nome** de curso na curadoria (como o manifesto já identifica o curso), resolvida pra
  id na API; um nome que não existe (ou curso escondido pra quem não está na prévia) simplesmente some.
- O Web Security não tem manifesto de curso: o `recomendacao.json` é um arquivo próprio, igual pra todos os
  cursos, achado pelo slug do nome.
- "Começar pelo X" só aparece quando o X ainda está disponível pro aluno; se ele já está no X, vira um link
  "Ir pro X"; se já fez, a caixa fica verde e não há botão extra.
- No celular os botões empilham com o de matrícula por último (notas do Figma).

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Courses/Course.cs                              (Requirements, RecommendedBefore, PreparesText)
backend/src/Focadu.Infrastructure/Persistence/Configurations/CourseConfiguration.cs
backend/src/Focadu.Infrastructure/Migrations/*_CourseRecommendation.cs    (nova)
backend/src/Focadu.Application/Seed/SyncCourseRecommendationsUseCase.cs  (novo)
backend/src/Focadu.Application/Enrollments/GetAvailableCoursesUseCase.cs (DTO + situacao no recomendado)
backend/src/Focadu.Application/DependencyInjection.cs, backend/src/Focadu.Api/Program.cs (seed)
backend/tests/Focadu.Tests/Seed/SyncCourseRecommendationsTests.cs         (novo)
backend/tests/Focadu.Tests/Seed/CuratedCourseImporterTests.cs            (manifesto fixo como nao publicado)
frontend/src/api/types.ts, frontend/src/routes/CourseSelectionPage.tsx, frontend/src/lib/guiaTelas.ts
secret/curadoria/{web-security,linux}/recomendacao.json                  (novos)
```

## Testes

- `dotnet test`: 595 passando (novos: slug igual à pasta da curadoria, leitura/aplicação do arquivo,
  `SetRecommendation` sem item vazio nem o próprio curso e substituindo o anterior, arquivo vazio limpa).
  `CuratedCourseImporterTests` lia o `curso.json` real e esperava o Linux escondido: quebrou com a
  publicação (esse teste não roda no CI hospedado, sem o repo `secret`); agora fixa o manifesto como não
  publicado.
- `tsc -b` sem erro; `oxlint` só com os 3 avisos que já existiam.
- Navegador (Playwright + Chrome) numa cópia local isolada com banco novo (migration + seed, "ficha do curso
  atualizada em 2 cursos"): usuário novo vê os dois selos; ficha do Web Security com os requisitos e a
  recomendação; "Começar pelo Linux" abre a ficha do Linux; "Iniciar Linux" matricula e vai pro Start; de
  volta à escolha, o Web Security mostra "Linux em andamento" e a ficha oferece "Ir pro Linux"; ficha no
  celular (390px) rolando por dentro.

## Dúvidas ou pontos abertos para a próxima fase

- A descrição do Web Security no seed segue sem acento ("seguranca", "autenticacao"); não mexido aqui.
- O estado "Linux feito" (caixa verde) foi coberto pela regra, mas não visto em tela (exigiria fechar as
  duas semanas na cópia local).
- Quando o curso de Python existir, basta o `recomendacao.json` dele (e, se for o caso, incluir "Python pra
  Web Security" no `recomendadoAntes` do Web Security).
