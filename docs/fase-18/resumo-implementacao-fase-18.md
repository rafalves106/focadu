# Resumo — Fase 18: Perfil, 3 Abas

## Contexto

Fase de consolidação, não de sistema novo: `/perfil` (Informações | Customização | Conquistas) só
compõe dado que já existia desde as Fases 14-17 (`GetGamificationSummaryUseCase`/
`GetUserBadgesUseCase`/`GetReferralInfoUseCase`/`GetMarketplaceCatalogUseCase`/`User.Interests`).
Fecha duas pontas deixadas em aberto na Fase 17: onde `BadgeGrid`/`ReferralCard` moram de vez, e a
aplicação visual dos cosméticos equipados (cor do nome no Ranking, moldura no avatar).

## Validação de Figma (3 nodes conferidos)

Os 3 nodes (Informações/Customização/Conquistas) foram conferidos antes da implementação. Boa
parte do conteúdo não tem dado real por trás - omitido, não inventado (mesmo critério de todas as
fases anteriores):

- **Upload de foto/avatar**, "Apelido/Username", "Sua frase de guerra" e toda a seção "Analogias de
  Aprendizado" (preview de IA) - nenhum desses campos/funcionalidades existe no domínio.
  Confirmado fora de escopo no próprio prompt (avatar) ou por não ter nenhuma base de dados (o
  resto).
- **Nível/XP, "Sessões completas", Platinas por curso** (troféu por 100% de conclusão) - não
  existem. Mesma decisão já tomada nas fases anteriores pra Elo/Patente: fora de escopo até
  Squad/PvP existir.
- **"Recorde de Streak"** do mockup virou dado real (`GamificationSummaryDto.longestStreak`, já
  existia desde a Fase 14) - mantido na aba Informações.
- O 4º grupo de customização do mockup ("Avatar", a ilustração do personagem) não existe como slot
  compravel - só os 3 slots reais de `CosmeticSlot` (Moldura/Cor do Nome/Banner) aparecem na aba
  Customização.

## O que foi implementado

### Backend

- **`UserDto`** ganhou `Interests`/`AdditionalProfileNotes` - a aba Informações lê direto do `user`
  já carregado pelo `AuthContext` (`GET /api/auth/me`), sem endpoint novo. 4 pontos de construção
  atualizados (`RegisterUserUseCase`/`LoginUserUseCase`/`CompleteProfileUseCase`/
  `GetCurrentUserUseCase`).
- **`PUT /api/users/me/profile` (`CompleteProfileUseCase`)** - confirmado que já aceitava ser
  chamado de novo desde a Fase 13 (sem guarda de "só uma vez", `User.CompleteProfile` sempre
  substitui a lista inteira). Zero mudança de backend necessária pra suportar edição.
- **`GetCourseRankingUseCase`** ganhou resolução de `EquippedNameColor` por Enrollment - injeta
  `IUserEquippedCosmeticsRepository`/`ICosmeticItemRepository` (já existiam desde a Fase 17), monta
  um dicionário `Id -> Name` do catálogo inteiro (8 itens, sem N+1) e resolve o `Name` do item
  equipado no slot `NameColor` de cada usuário. `RankingEntryDto`/`ScoredEnrollment` ganharam o
  campo `EquippedNameColor` (`string?`, default `null` nos dois - nenhum teste existente quebrou).
- **Decisão: token estável, não hex.** `EquippedNameColor` carrega o `Name` do `CosmeticItem` (ex:
  "Verde Neon"), não uma cor de verdade - o frontend mapeia token -> cor (mesmo padrão já
  estabelecido de `BadgeDto.code` -> label/ícone e `CosmeticRarity` -> swatch). Nenhum campo de
  cor/hex foi adicionado ao domínio - `CosmeticItem` continua só com `Name`/`Slot`/`Rarity`/
  `PriceGems`/`AssetUrl?`/`IsAnimated`, sem inventar um dado que a arte real ainda não define.
- **Decisão: sem endpoint consolidado novo.** `GET /api/users/me/profile-summary` era opcional no
  prompt - optei por manter os endpoints já existentes separados, mesmo padrão de composição no
  frontend já usado em `StartDashboard` (`Promise.all`). Mais simples pra uma fase que é só leitura.
- Sem migration - nenhum campo novo persistido (`UserDto`/`RankingEntryDto` são só projeções de
  dado que já existia).

### Frontend

- **`lib/cosmeticStyle.ts`** (novo) - `RARITY_STYLE` movido de `CosmeticItemCard.tsx` pra virar
  fonte única (reaproveitado por `EquippedFramePreview`) + `nameColorClass(token)`.
- **`CosmeticItemCard.tsx`**: `onPurchase` virou opcional - sem ele, item não possuído mostra
  "Ver na Loja" (link pra `/loja`) em vez do botão de comprar. Reaproveitado tal como está pela aba
  Customização (inventário, não vende nada por lá) - `MarketplacePage` continua passando
  `onPurchase` normalmente.
- **`components/EquippedFramePreview.tsx`** (novo) - placeholder de avatar (iniciais do nome + anel
  colorido por raridade quando uma Moldura está equipada, sem upload/ilustração real).
- **`components/HeaderUserBadge.tsx`** (novo) - nome+moldura equipados no nav global (`App.tsx`),
  link pra `/perfil`. Antes desta fase não havia **nenhum** lugar no app mostrando o nome do
  usuário logado fora do próprio Perfil, nem nenhum jeito de chegar em `/perfil` pela UI.
- **`components/profile/`** (novo): `ProfileHeader`/`ProfileTabs`/`InformationTab`/
  `CustomizationTab`/`ConquestsTab`. `ConquestsTab` é o conteúdo de `AchievementsPage.tsx`
  (removido) movido, não recriado - mesmo `BadgeGrid`/`ReferralCard` da Fase 17.
- **`routes/ProfilePage.tsx`** (`/perfil`, novo) - 3 abas via `?tab=info|customizacao|conquistas`
  (default `info`, mesmo padrão de `/start?weekly=`). Sem `Promise.all` gigante: cabeçalho busca
  gamificação+catálogo, cada aba busca o resto sozinha (mesmo padrão já usado em
  `StartDashboard`/`AchievementsPage`).
- **`ProfileInterviewPage.tsx`** ganhou `?edit=1` - mesma tela reaproveitada pra editar depois do
  onboarding: pré-popula com `user.interests`/`additionalProfileNotes`, ignora o guard de "perfil
  já completo" quando em modo edição, e volta pro `/perfil` ao salvar em vez de seguir pra
  `/selecionar-curso`.
- **`RankingTable.tsx`/`CurrentUserRankingCard.tsx`** aplicam `nameColorClass(entry.
  equippedNameColor)` no nome de cada entrada (não só do usuário logado).
- **`main.tsx`**: `/perfil` nova rota; `/conquistas` virou `<Navigate to="/perfil?tab=conquistas"/>`
  (decisão: redirect em vez de remover, pra não quebrar links/favoritos antigos - era a alternativa
  explicitamente oferecida no prompt).

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **184 aprovados** (183 pré-existentes + 1 novo -
  `RankEntries_PassesThroughEquippedNameColor`, cobrindo o único trecho de lógica nova que é
  testável sem repositório: o pass-through do campo pela projeção pura `RankEntries`; a resolução
  de verdade em `ExecuteAsync` é composição direta de repositórios já testados na Fase 17).
- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`).
- **Verificação ao vivo** (Postgres real, Playwright, fluxo completo):
  - Usuário registrado, Entrevista de Perfil preenchida (Games/Tecnologia + nota) e matriculado.
    `/perfil` visitado de verdade - header mostra nome real, aba Informações mostra os interesses e
    a nota salvos; confirmado por regex que nenhum termo fabricado do mockup (Elo/Patente/Nível/XP
    total/Sessões completas) vazou pra tela real.
  - **Edição de interesses**: clique real em "Editar meus interesses" -> `ProfileInterviewPage` em
    modo edição confirmada com "Games" pré-selecionado (`aria-pressed=true`) - trocado por "Anime"
    via clique real, salvo, voltou pro `/perfil`. `GET /api/auth/me` confirmado com a lista nova
    (`Anime`/`Tecnologia`, sem `Games`) - `PUT /api/users/me/profile` aceita edição de verdade.
  - **Customização**: usuário com 39 Gems reais (semana completa + projeto avaliado, mesma técnica
    das Fases 15-17) comprou a "Verde Neon" via API (setup) e equipou via clique real na aba
    Customização (botão virou "DESEQUIPAR"); itens não possuídos confirmados mostrando "Ver na
    Loja".
  - **Cor do nome propagada em 3 lugares**: nome do `ProfileHeader` (`/perfil`) confirmado com a
    classe `text-lime-400`; nome do `HeaderUserBadge` no nav global (`/start`) confirmado com a
    mesma classe; card "Sua posição" do Ranking (`/start?course=&ranking=1`) confirmado com a mesma
    classe - a cor equipada aparece em todo lugar que mostra o nome do usuário, não só no Perfil.
  - **Conquistas**: aba visitada, mesmo `BadgeGrid` (Easy Weekly conquistado, destacado) +
    `ReferralCard` (código + contador) de antes, agora dentro da aba.
  - **Redirect**: `/conquistas` visitado direto - confirmado redirecionamento real pra
    `/perfil?tab=conquistas`.
  - `console --errors`: limpo (o único 401 observado é o `GET /api/auth/me` da visita inicial não
    autenticada a `/login` - caminho esperado, documentado desde a Fase 12 no próprio
    `AuthContext`).

## Dúvidas ou pontos abertos

- Nenhuma pendência de implementação - checklist do prompt fechado integralmente.
- **`/conquistas`: redirect, não remoção.** Optei por manter a rota como
  `<Navigate to="/perfil?tab=conquistas"/>` em vez de excluí-la - o link já existente em
  `CourseDetailPage` ("🎖️ Conquistas") continua funcionando sem precisar de outro ajuste nesta
  fase, e qualquer favorito/link externo antigo não quebra.
- **Sem endpoint consolidado.** `GET /api/users/me/profile-summary` não foi construído - decisão
  documentada acima, alinhada ao padrão já estabelecido (`StartDashboard`) de compor no frontend.
- **`EquippedNameColor` fica com token, não hex.** Se um dia existir arte/paleta de cor de verdade
  por trás dos itens do slot `NameColor`, a extensão natural é dar a `CosmeticItem` um campo de
  cor de verdade (`AssetUrl` já está reservado pro caso análogo de arte de Moldura/Banner) - até
  lá, o Name como token estável é suficiente e não inventa dado.
