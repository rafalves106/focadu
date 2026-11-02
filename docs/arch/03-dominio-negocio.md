# Contexto de Domínio e Regras de Negócio (Focadu)

## 1. Arquitetura Base do Domínio

- **Template vs. Instância**: `Course`, `Monthly`, `WeeklyTemplate` e `DailyTemplate` são o currículo base (compartilhado). O progresso do usuário vive em instâncias criadas na matrícula (`Enrollment`): `Weekly`, `Daily`, `ActivityResponse`, `WeeklyProject`.
- **Cálculo Sob Demanda**: Dados deriváveis (Status do dia, Badges, Ranking, Quebra de ofensiva) NUNCA são persistidos no banco. São calculados em tempo real na leitura (ex: comparando datas para saber se a ofensiva quebrou).
- **Tempo e Fuso**: O container usa `TZ=America/Sao_Paulo`. `IClock.Today()` usa a data local vivida pelo usuário. Timestamps de auditoria (banco) usam UTC.
- **Integração Groq (IA)**: Adapters Groq SEMPRE operam em modo JSON para retornos estruturados. Todo prompt DEVE conter a instrução explícita "em português do Brasil". Notas da IA avaliam a completude contra a _instrução da atividade_, não contra o conteúdo inteiro.
- **Eventos de Domínio**: O projeto NÃO utiliza mecanismos de Domain Events (Event Sourcing ou MediatR pub/sub). Efeitos colaterais (como creditar Gems ao terminar o dia) ocorrem na camada de Application (ex: `CompleteDailyUseCase`).

## 2. Pontuação (Score) e Avaliação

- **Sempre no Servidor**: O `Score` e a nota final NUNCA são recebidos do frontend. O cliente envia a resposta, e a correção é feita na API.
- **Gabarito Oculto**: `IsCorrect`, `ExpectedAnswer` e `TerminalQuality` descem como `null` na API até que o usuário responda pela primeira vez.
- **Cálculo de Score (Qualidade)**:
  - `Daily.CalculateScore()`: Média ponderada da tentativa MAIS RECENTE de cada atividade. Dailies de Reforço sempre retornam `null` no Score (são recompensadas com Gems, não Score).
  - `Weekly.CalculateScore()`: Só é calculado quando a semana inteira (Dailies + Projeto) está 100% concluída. Semanas incompletas valem `0` no Ranking (para permitir ordenação), mas `null` em visualizações de progresso do usuário.
- **Ranking**: Possui 3 recortes (`course`, `monthly`, `weekly`), baseados na _posição do usuário no currículo_, e não no calendário real.

## 3. Gamificação (Gems e Streak/Ofensiva)

As entidades de gamificação (`UserGemBalance`, `UserStreak`) têm relação 1:1 com o User, mas são **criadas sob demanda (lazy)** apenas na primeira vez que pontuam.

- **Gems (Consistência)**: Não expiram. Possuem um cap (limite) mensal por categoria (Daily, Weekly, Monthly) que reseta ao virar o mês. Gastar Gems NUNCA diminui o progresso desses caps mensais.
- **Bonus de Superação**: Dailies de Reforço feitas com 100% de acerto geram 2 Gems (substitui o ganho normal, não acumula).
- **Streak (Ofensiva)**: Replays de Dailies não somam nem quebram ofensiva.
  - _Folga Móvel_: O usuário pode ficar 1 dia sem estudar a cada 7 dias sem quebrar a ofensiva.
  - _Pausa_: Projetos semanais em avaliação pausam a ofensiva (não quebram, nem gastam a folga) por até 14 dias.

## 4. Agente, Loja e Cosméticos

- **Catálogo e Inventário**: O catálogo é fixo (Seed). As compras vão para `UserCosmeticInventory` (permanentes).
- **Agente Pixel Art**: `CreateAgentUseCase` monta o agente inicial gratuitamente (pele + kit básico). Roupas possuem um `Code` (sprite) e pertencem a um `CosmeticSlot` obrigatório (Top, Bottom, Hair, Shoes).
- **Vitrine (Showcase)**: A vitrine da loja sorteia até 6 itens semanalmente (toda segunda-feira) com base em um seed determinístico (FNV-1a) atrelado ao usuário.
- **Transações**: Todas as ações da loja (comprar, equipar, desequipar) devolvem o catálogo inteiro recalculado no DTO, sem criar endpoints apartados de leitura.

## 5. Squad (Grupos) e Indicação

- **Indicação (Referral)**: Confirmada apenas quando o convidado se matricula (`EnrollUserInCourseUseCase`), e não no momento do registro.
- **Squads**:
  - Limite de 1 squad ativo por usuário (`SquadMemberships.UserId` tem índice único).
  - A entrada no squad é via `JoinCode` de 8 caracteres (alfabeto sem confusão visual 0/O/1/I), sem necessidade de aprovação.
  - Hierarquia: Owner -> Co-Leader -> Member. A sucessão passa pro Co-Leader (se houver) ou pro membro mais antigo se o Owner sair. Se o Owner for o único membro, o Squad é deletado.
  - **QG do Squad**: O feed de atividades é calculado _on-the-fly_ (sob demanda) baseado nas datas de conclusão de atividades (Dailies, Projetos, Compras). NÃO HÁ uma tabela física de "Feed de Squad". Os membros podem interagir no feed usando "GG" (`SquadCheers`). Ocultação de notas no feed é controlada via flag do usuário (`HideScoresInSquadFeed`).
