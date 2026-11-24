# Fase 116 — Sala sem fechamento por áudio e custo da curadoria (23/11/2026)

Decisão do dono: as salas do molde D2 não têm áudio no fim, só o áudio de cada tarefa.

- **Backend:** `fechamento` opcional no `sala.json`. Sem ele, `Room.HasFinal` é falso, `RoomProgress.RecordVoice` marca a conclusão (`FinalAt`, sem nota) no áudio da última tarefa e `EnsureCanRecordFinal` recusa (`sala_sem_fechamento`). Na reimportação, quem já tinha todos os áudios é concluído (`CompleteIfNoFinal`). Sem migration (colunas continuam não nulas, vazias). `RoomFinalDto` ganhou `Enabled` e `Completed`.
- **Front:** `RoomPage` mostra o resumo logo depois do feedback da última tarefa quando `final.enabled` é falso; guia das telas atualizado.
- **Conteúdo:** `fechamento` saiu do `sala.json` das sessões 1 a 3 do wstg (em produção); a teoria de `recursos` (sessao-3) foi cortada de 213 para ~200 palavras, que o linter já reprovava. Linter e `conferir-cobertura-sala.py` só checam o fechamento se ele existir; moldes, skill `curar-sala` e `revisor-editorial` atualizados.
- **Custo:** `secret/processo/scripts/lib-claude.sh` roda cada etapa com modelo e esforço próprios (`MODELO_<ETAPA>`, `ESFORCO_<ETAPA>`) e grava o custo real em `logs/custo.csv`; os três `curar-*-auto.sh` usam. Autoconferência no `curador` e no S2 da sala para cortar voltas do revisor.
- **Ordem de publicação:** primeiro o deploy do backend (o importador antigo exige `fechamento`), depois `importar-salas wstg` para as salas 1 a 3.
