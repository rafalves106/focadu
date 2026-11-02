# Resumo — Fase 71: Loja em pixel art, agente e vitrine semanal

Pedido do Falves (24/09/2026), depois de aprovar no Figma "Focadu — Pixel Art" (página "Personagens —
corpo, roupas e loja") o corpo do agente em 5 tons de pele, as roupas como camadas separadas, o kit
básico e a Leva 1 da loja (14 peças em todas as vistas). As regras de raridade, preço em Gems e vitrine
aleatória foram decididas com ele no mesmo dia e estão em `secret/rascunhos/loja-raridade-e-vitrine.md`.

## O que foi implementado

- **Agente em pixel art**: corpo na pele escolhida + 4 camadas empilhadas (parte de baixo, tênis, parte
  de cima, cabeça). Criação (`POST /api/agent`): escolhe a pele (1–5) e 1 cabelo natural (curto, longo,
  black power) ou nenhum, e ganha o **kit básico** (moletom, calça, tênis) — tudo grátis, entra no
  inventário e sai equipado. A pele se troca depois sem custo (`PUT /api/agent/skin`).
- **Slots novos** `Top`, `Bottom`, `Hair`, `Shoes` em `CosmeticSlot`; parte de cima, parte de baixo e tênis
  não se tiram, só se trocam (`unequip` → 409 `slot_obrigatorio`); cabelo pode ficar vazio.
- **Raridade `Legendary`** (reservada pra pets/auras/animados) e cores de raridade na paleta pixel:
  Comum metal, Raro verde, Épico âmbar, Lendário vermelho.
- **Catálogo**: `CosmeticItem` ganhou `Code` (chave do sprite, `"parte-de-cima/moletom"`) e `IsStarter`
  (kit básico, nunca vendido). Seed insere as 17 peças em pixel art (3 do kit + 14 da Leva 1) com os
  preços decididos; é incremental por `Code`.
- **Vitrine semanal** (`ShopShowcase`, domínio): até 6 itens por usuário, sorteio determinístico
  (semente = usuário + semana ISO, FNV-1a + Mulberry32), renova toda segunda. Pesos Comum 60 / Raro 30 /
  Épico 9 / Lendário 1, ao menos 2 Comuns, no máximo 2 por slot, só item com arte e fora do kit, nunca o
  que a pessoa já tinha antes da segunda. Sem rerolar. Comprar exige o item estar na vitrine
  (409 `item_fora_da_vitrine`) e o agente criado (409 `agente_nao_criado`).
- **Loja reaberta** (`/loja`, estava "em breve" desde a Fase 25): casca de 3 colunas do Perfil. Esquerda:
  o agente (frente/costas/lado + mini andando) com "provar" a peça escolhida; centro: a vitrine (cartão
  com o agente vestindo a peça, raridade, slot, preço, "Faltam N" sem saldo, "Já é sua · vestir");
  direita: Focada + como a vitrine funciona (chance de cada raridade). Sem agente, o centro é o criador.
- **Perfil → Customização** virou o guarda-roupa: vistas do agente, troca de pele e as peças que a pessoa
  tem, por slot, pra vestir (inclui "Sem cabelo"). Sem agente, o criador.
- **Avatar da ficha do agente** mostra o sprite de frente quando o agente existe (iniciais continuam pra
  quem ainda não criou).
- **Sprites**: 22 folhas PNG 192×48 (5 corpos + 17 peças) em `frontend/src/assets/pixel/personagem/`,
  geradas por `secret/curadoria/scripts/personagens/exportar-frontend.js` (mesma fonte do Figma).
- **Mock** (`npm run dev:mock`): loja e agente em memória, `/__mock/loja?agente=0|1&gemas=N`.

## Decisões técnicas tomadas que não estavam no prompt original

- **"Já tem" conta só o que a pessoa tinha antes da segunda** (`ShopShowcase.OwnedBeforeWeek`): se a
  vitrine fosse recalculada sem os itens comprados, cada compra embaralharia a vitrine inteira e comprar
  um item barato viraria um "rerolar" disfarçado. O item comprado na semana continua na vitrine, marcado
  como da pessoa. Efeito colateral aceito: o cabelo ganho na criação pode aparecer na vitrine da mesma
  semana como "Já é sua".
- **PRNG próprio**: `System.Random` com semente não garante o mesmo algoritmo entre versões do .NET, e
  `string.GetHashCode` muda por processo — a vitrine precisa ser a mesma em qualquer réplica/deploy.
- **Os 8 itens da Fase 17** (molduras, cor do nome, banners) ficam no banco e no seed, mas fora do sorteio
  (não têm `Code`) até serem redesenhados em pixel art, como decidido. A Customização avisa isso.
- **Troca de pele livre** também depois da criação: pele nunca é item de loja.
- **Folha de sprite por camada** (192×48, 5 vistas + 12 quadros mini) em vez de 374 PNGs soltos; o
  componente recorta por `background-position` em escala inteira.
- **Seed incremental por `Code`**: uma leva nova de roupas chega em produção só acrescentando a linha no
  `SeedCosmeticCatalogUseCase` e rodando o seed (que o deploy já roda). Preço de peça já inserida não é
  atualizado (mesma limitação do seed do currículo).
- Removidos `CosmeticItemCard` e `CosmeticSlotFilter` (sem uso desde a Fase 25).

## Estrutura de arquivos criada

```
backend/src/
├── Focadu.Domain/Cosmetics/      AgentStarter.cs, ShopShowcase.cs (novos); CosmeticItem, UserEquippedCosmetics
├── Focadu.Domain/Enums/          CosmeticSlot (+Top/Bottom/Hair/Shoes), CosmeticRarity (+Legendary)
├── Focadu.Application/Marketplace/ CreateAgentUseCase.cs, UpdateAgentSkinToneUseCase.cs (novos);
│                                  GetMarketplaceCatalog, Purchase, Equip, Unequip
├── Focadu.Application/Seed/SeedCosmeticCatalogUseCase.cs (incremental por Code)
├── Focadu.Infrastructure/Migrations/*_AgentPixelArtAndShowcase.cs
└── Focadu.Api/Program.cs (POST /api/agent, PUT /api/agent/skin)
backend/tests/Focadu.Tests/Cosmetics/ ShopShowcaseTests.cs, AgentTests.cs
frontend/src/
├── assets/pixel/personagem/      corpo/pele-1..5.png, roupa/<slot>/<peça>.png
├── components/agent/             AgentSprite.tsx (+WalkingAgent), AgentCreator.tsx
├── components/profile/           CustomizationTab.tsx (reescrito), AgentSheet.tsx (avatar com sprite)
├── lib/agentSprites.ts, lib/cosmeticStyle.ts (paleta pixel, SLOT_LABEL, RARITY_CHANCE)
└── routes/MarketplacePage.tsx (reescrito), ProfilePage.tsx
frontend/mock/shopMock.ts
secret/curadoria/scripts/personagens/exportar-frontend.js (repo focadu-secret)
```

## Testes

- `dotnet test`: 506 passando (novos: determinismo da vitrine por semana, só itens à venda e não possuídos,
  6 distintos com ≥2 Comuns e ≤2 por slot, estabilidade depois de comprar, segunda-feira da semana,
  criação única do agente, faixa de pele, slots obrigatórios, catálogo com kit e cabelos naturais).
- Ponta a ponta contra Postgres descartável (Docker, porta 55471, `ASPNETCORE_ENVIRONMENT=Production`
  pra não carregar user-secrets): migration do zero, seed (25 itens na 1ª rodada, 0 na 2ª), registro,
  catálogo sem agente (6 na vitrine), pele inválida (400), cabelo não natural (400), criação (kit + cabelo
  equipados), criar de novo (409), comprar sem Gems (409), fora da vitrine (409), compra (100 → 85 Gems,
  vitrine idêntica depois), comprar de novo (409), vestir (200), tirar parte de cima (409), tirar cabelo
  (200), trocar pele (200).
- Frontend: `tsc -b`, `npm run build`, `npm run lint` só com os avisos que já existiam. Playwright +
  Chrome contra o mock em 1440×900 e 390×844: criar agente (pele 5 + black power), provar, comprar,
  guarda-roupa no Perfil; nenhum erro no console.

## Dúvidas ou pontos abertos para a próxima fase

- **Molduras, cor do nome e banners** (Fase 17) precisam de versão em pixel art pra entrar no sorteio.
- **Pets, auras e animações GIF**: categorias previstas no Figma (quadro "04 Loja"), ainda sem arte;
  Lendário só aparece no sorteio quando existir item Lendário.
- O agente ainda não aparece no **mapa da trilha** (o marcador continua a Focada), no ranking nem no
  squad — os minis de 16×16 já estão nas folhas de sprite.
- A tela da Loja não teve desenho no Figma antes (segue a casca do Perfil); vale uma revisão visual do dono.
