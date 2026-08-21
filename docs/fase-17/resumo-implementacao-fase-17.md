# Resumo — Fase 17: Marketplace de Cosméticos + Troféus/Badges + Sistema de Indicação

## Contexto

Fecha o ciclo econômico da gamificação: Gems (Fase 14) finalmente têm onde ser gastas. Introduz
também Troféus/Badges (conquistas automáticas, calculadas sob demanda) e, como pré-requisito do
troféu "Embaixador", um sistema básico de indicação entre usuários.

## Sem referência de Figma

Confirmado no prompt: "Loja de Cosméticos" (14) e "Perfil — Conquistas" (12) nunca foram
validadas contra o Figma real. Sem arte pronta ainda - cor por raridade como placeholder visual
(Comum=cinza, Raro=azul, Épico=roxo), mesma paleta escura/neon já estabelecida. Nenhuma
ilustração inventada - só blocos de cor + nome do item.

## O que foi implementado

### Domínio

- **`Focadu.Domain.Cosmetics`**: `CosmeticItem` (catálogo, `Name`/`Slot`/`Rarity`/`PriceGems`,
  `AssetUrl`/`IsAnimated` prontos pro dia em que existir arte real), `UserCosmeticInventory`
  (posse permanente), `UserEquippedCosmetics` (1:1 com User, lazy - `Equip(slot, itemId)` só
  sobrescreve o campo daquele slot, desequipando o anterior automaticamente sem passo separado).
- **`UserGemBalance.TrySpend`** (novo, Fase 14 atualizada): gasto nunca mexe nos contadores
  mensais de cap - caps controlam quanto se GANHA por mês, não quanto se GASTA do saldo
  acumulado, sistemas independentes de propósito (confirmado no prompt).
- **`Focadu.Domain.Referrals.Referral`**: `ReferrerUserId`/`ReferredUserId`/`CreatedAt`/
  `ConfirmedAt?`, `Confirm()` idempotente, auto-indicação bloqueada no construtor.
- **`User.ReferralCode`** (novo): nulo até a 1ª consulta gerar - `AssignReferralCode` só aceita
  ser chamado uma vez (unicidade checada na Application antes, contra o repositório).
- **`IUserRepository.IsAmongFirstRegisteredAsync`** (novo, badge Founder): ordem total
  determinística por `(CreatedAt, Id)` - evita ambiguidade se 2 usuários registrarem no mesmo
  instante.

### Aplicação

- **`GetMarketplaceCatalogUseCase`**: monta `MarketplaceCatalogDto` (Owned/Equipped já resolvidos
  por item) - reaproveitado por `Purchase`/`Equip`/`UnequipCosmeticUseCase`, que só mudam o
  estado e delegam a leitura de volta (nunca duplicam a montagem do DTO em 4 lugares). Toda ação
  devolve o catálogo inteiro recalculado - o frontend nunca precisa de uma 2ª chamada.
- **`PurchaseCosmeticItemUseCase`**: reaproveita `GamificationCreditor.GetOrCreateGemBalanceAsync`
  (Fase 14) - mesmo critério de "só cria a linha quando precisa mexer nela de verdade". Rejeita
  compra duplicada (`item_ja_possuido`, 409) e saldo insuficiente (`gems_insuficientes`, 409).
- **`GetUserBadgesUseCase`**: os 5 badges, **tudo calculado sob demanda** (mesmo princípio já
  usado desde a Fase 13a pra `DailyStatus`/`Weekly.Number` - nada aqui é uma "conquista"
  armazenada). Núcleo `ComputeBadges` é `internal static`, testado direto com os 4 números já
  resolvidos (mesmo padrão de `SubmitActivityResponseUseCase.ResolveScore`/
  `GetCourseRankingUseCase.ComputeScore`).
- **`GetReferralInfoUseCase`**: gera o código (8 caracteres, alfabeto sem `0/O/1/I` pra evitar
  confusão visual) na 1ª consulta, checando unicidade contra o repositório antes de atribuir.
- **`RegisterUserUseCase`**: aceita `referralCode` opcional - código inválido/de ninguém só é
  ignorado, nunca bloqueia o registro. Cria um `Referral` ainda não confirmado.
- **`EnrollUserInCourseUseCase`**: ao final, confirma um `Referral` pendente pro usuário (se
  houver) - prova de uso real (matrícula de verdade), não só cadastro vazio.

### Endpoints

`GET /api/marketplace/catalog`, `POST /api/marketplace/purchase|equip|unequip`,
`GET /api/users/me/badges`, `GET /api/users/me/referral`, `POST /api/auth/register` (corpo ganhou
`referralCode?`).

### Migration

`AddMarketplaceAndReferrals` - `CosmeticItems`, `UserCosmeticInventories`,
`UserEquippedCosmetics`, `Referrals` + `Users.ReferralCode` (índice único nullable). Puramente
aditiva. Catálogo (8 itens) populado pelo mesmo `dotnet run -- seed` que já popula o curso piloto
- `SeedCosmeticCatalogUseCase`, idempotente.

### Frontend

- **`components/marketplace/`**: `CosmeticItemCard.tsx` (swatch por raridade + nome +
  preço/comprar OU equipar/desequipar), `CosmeticSlotFilter.tsx` (mesmo padrão de abas do
  `RankingScopeTabs`).
- **`components/badges/BadgeGrid.tsx`**: `code` estável do backend mapeado pra label/ícone/
  descrição no frontend (mesmo padrão de `DailyStatus` → `lib/statusBadge.ts`).
- **`components/referral/ReferralCard.tsx`**: código + copiar link (Clipboard API) + contador.
- **`MarketplacePage.tsx`** (`/loja`) - acessível clicando no `GemBadge` do header do
  `StartDashboard` (ficou clicável nesta fase). **`AchievementsPage.tsx`** (`/conquistas`) -
  `BadgeGrid` + `ReferralCard` juntos, sem lar definitivo ainda (Fase 18).
- **`LoginPage.tsx`**: `?ref=CODIGO` pula direto pra aba de registro com um banner de
  confirmação, `RegisterForm` inclui o código na chamada de registro.

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **183 aprovados** (150 pré-existentes + 33 novos -
  `TrySpend` (saldo suficiente/insuficiente, nunca mexe no cap mensal), `UserEquippedCosmetics`
  (equipar troca o slot, slots independentes, desequipar não afeta outros), `CosmeticItem`
  (validação), `Referral` (auto-indicação bloqueada, `Confirm` idempotente), `User.
  AssignReferralCode` (só uma vez), `GetUserBadgesUseCase.ComputeBadges` (limite exato de cada um
  dos 5 badges e abaixo dele)).
- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`).
- **Verificação ao vivo** (Postgres real, Playwright, fluxo completo em 2 partes):
  - **Indicação**: Usuário A registrado, código de indicação obtido. Usuário B registrado via
    `/login?ref=CODIGO` (banner de confirmação renderizado de verdade na UI) - badge Embaixador
    do Usuário A confirmado `false` logo após o registro do B (só cadastro, sem matrícula).
    Usuário B se matricula → badge Embaixador do Usuário A vira `true`, `confirmedReferralCount`
    vira `1` - confirmando que a confirmação acontece SÓ na matrícula, nunca no registro.
    `AchievementsPage` visitada de verdade, badge "Embaixador" destacado (borda verde) entre os
    outros 4 esmaecidos.
  - **Marketplace**: usuário com 39 Gems reais (semana completa + projeto avaliado, mesma técnica
    das Fases 15/16) comprou a "Moldura Bronze" (15 Gems) via clique real na UI - saldo confirmado
    em 24 via API. Comprar de novo confirmado rejeitado (409 `item_ja_possuido`). Equipou via
    clique real (botão virou "DESEQUIPAR") e desequipou (botão voltou a "EQUIPAR") - catálogo
    inteiro (8 itens, 3 raridades coloridas corretamente) renderizado via screenshot.
  - `console --errors`: limpo nas 3 sessões.

## Dúvidas ou pontos abertos

- Nenhuma pendência de implementação - checklist do prompt fechado integralmente.
- Preços do catálogo mantidos conforme a tabela do prompt - não houve sinal de desbalanceamento
  frente ao volume de Gems observado nas Fases 14-16 (uma semana perfeita rende 39 Gems, mais que
  o suficiente pro item mais barato, e ainda deixa margem pros intermediários).
- Aplicação visual dos cosméticos equipados (cor do nome no Ranking, moldura no avatar do header)
  confirmada fora de escopo desta fase - o dado já existe (`UserEquippedCosmetics`), só falta
  consumir; fica pra Fase 18 conforme o prompt.
