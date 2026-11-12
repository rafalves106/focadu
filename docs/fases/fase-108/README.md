# Fase 108 — alvos do molde C (t1 a t15)

12/11/2026. O molde C (curso Termos do Estágio) tem um alvo de aprendizagem por bloco de leitura, até 15 por dia.
Os moldes A e B continuam com t1 a t3.

- `DailyActivity.SetTarget` aceita de `t1` a `t15` (`IsValidTarget`, sem zero à esquerda).
- Coluna `DailyActivities.Target` passa de 2 para 3 caracteres (migration `Fase108AlvosMoldeC`).
- `CuratedDayImporter` recusa atividade cujo alvo não está em `targets` do próprio dia (`alvo_invalido`).
- Testes: `LearningTargetIdTests`.

O lado da curadoria (schema `moldeTipo: "C"`, linter, pacote do dia) vive no repositório `secret/`.

## 108b (mesmo dia)

- `DailyTemplate.SetCurationInfo` ainda exigia exatamente 3 alvos e derrubou a 1ª importação do Dia 1 em produção. Agora aceita de 3 a 15.
- `publicar-conteudo.yml`: o passo de importar escondia a exceção no `grep` e ficava verde. Agora mostra o fim da saída e falha.
