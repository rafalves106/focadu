# Resumo — Fase 105: Repositório do Projeto Semanal sai quando o projeto abre

## O que foi implementado
- `WeeklyProjectRepositoryProvisioner` (Application/Weeklies): se o projeto está `Pending`, sem `SubmissionUrl`, a semana não tem variantes de linguagem, tem `ForgejoTemplateSlug` e as Dailies originais estão concluídas, cria a conta Forgejo (se faltar), faz o fork do modelo de AGORA e anexa a URL. Idempotente; `ExternalServiceException` é engolida (o projeto segue sem URL e a próxima abertura tenta de novo).
- `GetWeeklyDetailUseCase` chama o provisionador ao montar o projeto (a tela do projeto não muda).
- `EnrollUserInCourseUseCase` não faz mais fork: a matrícula só cria Weekly/Daily/projeto `Pending`.

## Decisões técnicas tomadas que não estavam no prompt original
- Disparo na leitura do detalhe da semana (GET com efeito colateral idempotente) em vez de endpoint novo, para não mexer no front. Duas leituras simultâneas podem forkar duas vezes; o 409 do `ForkTemplateAsync` reaproveita o mesmo repositório, então a URL é a mesma.
- Semana com variantes de linguagem continua no `ChooseWeeklyProjectLanguageUseCase` (fork na escolha).
- Quem já tem `SubmissionUrl` (fork da matrícula antiga) não é tocado. Para refazer um fork velho sem resetar o curso: apagar o fork no Forgejo e zerar `WeeklyProjects.SubmissionUrl` do aluno; a próxima abertura do projeto forka o modelo atual.

## Estrutura de arquivos criada
- `backend/src/Focadu.Application/Weeklies/WeeklyProjectRepositoryProvisioner.cs`

## Testes
- Build limpo; 754 testes de unidade passam (sem os que dependem do `focadu-secret`). Sem teste novo: a regra mora em adapter/Forgejo e a Application não tem fakes de repositório (convenção do projeto). Verificação ao vivo no Forgejo pendente.

## Dúvidas ou pontos abertos para a próxima fase
- O `ForgejoTemplateSlug` das semanas 2 a 12 só existe quando o `projeto.json` de cada uma for importado; até lá a semana abre sem repositório.
- Matrícula nova não cria mais repositório: o histórico de forks órfãos (ex.: `template-web-security-semana-1-python` do dono) fica no Forgejo até alguém apagar.
