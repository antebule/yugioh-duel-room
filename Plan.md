# Duel Room — Phase 1–3 Implementation Plan

## Context

The repo at [./](.) is a fresh Vue 3 + Pinia + TypeScript + Vite scaffold (App.vue is an empty placeholder, only a demo counter store exists). The goal is to build a DuelingBook-style solo Yu-Gi-Oh sandbox per [README.md](README.md). This plan covers **Phases 1–3** of that roadmap: static field + card rendering, YDK import + draw/shuffle + zones, and context menus + duel log + counter hooks. Phase 4 (undo/replay) is deferred but the architecture is designed so it drops in without refactor.

## Locked decisions (from interview)

| Decision | Choice |
|---|---|
| Scope | Phases 1–3 of README roadmap |
| Card data | YGOPRODeck API at runtime, cached to localStorage |
| Solo model | Player side fully interactive; opponent zones cosmetic/read-only |
| Rendering | Plain Vue components + CSS (no Canvas/Pixi) |
| Card movement | Context menu only — no drag-drop |
| Context menu trigger | Hover (as README literally specifies) |
| Field zones | 5 MZ, 2 EMZ, 5 ST, Field Spell, Deck, GY, Banished, Extra per side |
| Deck source | YDK import only; localStorage `recent decks` |
| Event system | Scaffolded from day one (replay-ready) |
| Life points | Tracked, +/- and Set on player side; display-only opponent |
| Hand UI | Simple horizontal flex row (fan-shape deferred) |
| Persistence | localStorage for decks + card metadata cache |
| Tokens/counters | Data hooks only; full UI deferred to Phase 4 (counter badge shown when count > 0) |
| Undo / Save Replay buttons | Rendered disabled with "Coming in Phase 4" tooltip |
| Stacked zone access | Click GY/Banished/Extra/Deck → modal grid; hover any card to open its context menu |
| Activate/Set routing | Type-aware: Activate Spell/Trap → S/T slot picker face-up; Activate Field Spell → Field Spell zone; Set monster → MZ slot picker face-down-defense; Set Spell/Trap → S/T slot picker face-down. Routes off `cardData.type` |
| Opponent state | Empty visual placeholders only; no deck loaded, Info Bar shows label only (no LP display) |
| Empty (no-deck) state | Empty playmat + dimmed centered CTA "Import a YDK file to start" — click/drop opens import flow |
| Rotation/Flip semantics | Unified `CARD_POSITION_CHANGED` event: Rotate cycles ATK↔DEF, Flip toggles face-up↔face-down |
| End Phase | Single button cycles DP→SP→M1→BP→M2→EP→(next turn) DP; turn auto-increments at EP→DP transition |
| Reset Duel | If a deck is loaded: all cards return to deck, deck reshuffled, hand cleared, LP=8000, turn=1, phase=DP, log cleared. If no deck: just clear log |
| Phase/turn indicator | Rendered in Player Info Bar |
| Preview pin | Click card image area in preview panel to toggle sticky pin |

## Folder structure

```
src/
  main.ts
  App.vue
  assets/styles/        tokens.css (palette, --card-ratio, z-index scale), reset.css, global.css
  core/
    events/             eventTypes.ts (DuelEvent union), eventBus.ts, dispatcher.ts
    reducers/           duelReducer.ts (pure (state,event)=>state for Phase 4 reuse)
    rng/                rng.ts (seedable mulberry32 — deterministic for future replays)
    utils/              uuid.ts, shuffle.ts, zoneIds.ts
  cards/                types.ts (CardData), ygoprodeck.ts (batch fetch), cardCache.ts (localStorage LRU)
  duel/                 types.ts (CardInstance, Zone, ZoneId, DuelState), zoneCatalog.ts, initialState.ts, actions.ts
  deck/                 types.ts (Deck), ydkParser.ts, deckStorage.ts
  state/                duelStore.ts, cardCacheStore.ts, deckStore.ts, logStore.ts, uiStore.ts
  ui/
    DuelRoom.vue
    field/              PlayMat.vue, FieldSide.vue, Zone.vue, CardOnField.vue
    hand/               Hand.vue, HandCard.vue
    menu/               ContextMenu.vue, ContextMenuItem.vue, contextMenuItems.ts
    preview/            CardPreviewPanel.vue
    log/                DuelLog.vue, DuelLogEntry.vue
    bars/               OpponentInfoBar.vue, PlayerInfoBar.vue, ControlsBar.vue
    modals/             DeckImportModal.vue, DiceRollModal.vue, CoinTossModal.vue, ZoneBrowserModal.vue, EmptyStateOverlay.vue
    common/             LifePointsControl.vue, ToolTip.vue, ModalShell.vue
  composables/          useHover.ts, useContextMenu.ts, useEventBus.ts, useDeckImport.ts
```

Deviations from README's suggested structure: `renderer/` dropped (DOM-only); `replay/` dropped (Phase 4); `cards/` split from `duel/` to separate static catalog from field instances; added `composables/`.

## Data models (key shapes)

[src/cards/types.ts](src/cards/types.ts):
```ts
interface CardData { id, name, type, desc, race?, attribute?, atk?, def?, level?, linkval?, linkmarkers?, scale?, archetype?, imageUrl, imageUrlCropped, imageUrlLarge, fetchedAt }
```

[src/duel/types.ts](src/duel/types.ts):
```ts
type Owner = 'player' | 'opponent'
type FieldPosition = 'face-up-attack' | 'face-down-attack' | 'face-up-defense' | 'face-down-defense'
type ZoneKind = 'HAND' | 'DECK' | 'GY' | 'BANISHED' | 'EXTRA' | 'MZ' | 'EMZ' | 'ST' | 'FIELD_SPELL'
type ZoneId   = `${Owner}:${ZoneKind}:${number}`     // e.g. 'player:MZ:2'

interface CardInstance { uuid, cardId, owner, controller, zoneId, indexInZone, position, rotation, faceUp, counters, tokens? }
interface Zone         { id, kind, owner, slotIndex, cards: string[], capacity }
interface DuelState    { zones: Record<ZoneId,Zone>, instances: Record<uuid,CardInstance>, lifePoints: Record<Owner,number>, turn, activePlayer, phase, rngSeed }
```

`instances` is flat (not nested in zones) → O(1) lookup by uuid; zones only hold ordered uuid lists.

[src/deck/types.ts](src/deck/types.ts):
```ts
interface Deck       { name, main: number[], extra: number[], side: number[], importedAt, sourceText }
interface RecentDeck { key, name, cardCount, importedAt }    // content stored under separate key
```

[src/core/events/eventTypes.ts](src/core/events/eventTypes.ts) — discriminated union with `id`, `at`, `actor` on every event. Each event includes BOTH old and new state of what it changed, so a future `invert(event)` produces a valid inverse without extra lookups. Event types:
- `DUEL_RESET` (carries `prevState` snapshot)
- `DECK_LOADED`, `DECK_SHUFFLED` (with `prevOrder`/`newOrder`/`seedUsed`)
- `CARD_MOVED` (workhorse — carries `from`/`to`/`prevPosition`/`newPosition`/`prevFaceUp`/`newFaceUp`/`prevRotation`/`newRotation`/`reason`)
- `CARD_DRAWN`, `CARD_REVEALED`, `CARD_ROTATED`, `CARD_FLIPPED`, `CARD_POSITION_CHANGED`
- `COUNTER_ADDED`, `TOKEN_CREATED`, `TOKEN_DESTROYED` (hooks only; UI deferred)
- `LIFE_CHANGED`, `PHASE_CHANGED`, `TURN_CHANGED`
- `DICE_ROLLED`, `COIN_TOSSED` (with `seedUsed` for replay determinism)

Compound user actions (e.g. Normal Summon = move + position + faceUp) are encoded as **one** `CARD_MOVED` carrying all delta fields, not as 3 separate events. One user action ≙ one log line ≙ one future undo step.

## Pinia stores

- **duelStore** ([src/state/duelStore.ts](src/state/duelStore.ts)) — holds `DuelState`. All mutations go through `dispatch(event)` → reducer applies → bus notifies. Commands: `loadDeck`, `drawCard`, `shuffleDeck`, `moveCard`, `normalSummon`/`set`/`activate`/`sendToGY`/`banish`/`returnToDeck`/`shuffleIntoDeck` (thin wrappers over `moveCard`), `rotate`, `flip`, `changePosition`, `changeControl`, `destroy`, `setLife`/`adjustLife`, `endPhase`/`endTurn`, `rollDice`, `coinToss`, `resetDuel`.
- **cardCacheStore** ([src/state/cardCacheStore.ts](src/state/cardCacheStore.ts)) — mirrors localStorage; `ensureLoaded(ids)` batch-fetches misses from YGOPRODeck.
- **deckStore** ([src/state/deckStore.ts](src/state/deckStore.ts)) — current deck + recent list; `importFromFile` → parse → ensure cards → loadDeck.
- **logStore** ([src/state/logStore.ts](src/state/logStore.ts)) — subscribes to event bus on setup; formats each event into a `LogEntry`.
- **uiStore** ([src/state/uiStore.ts](src/state/uiStore.ts)) — `hoveredInstanceUuid`, `previewedInstanceUuid` + sticky pin, `contextMenu` (open/uuid/anchor rect), `modal`.

## Event dispatcher

[src/core/events/dispatcher.ts](src/core/events/dispatcher.ts) — module-level singleton (not a Pinia store; stores import it).
- `dispatch(event)`: (1) call `duelStore.applyEvent(event)` to mutate state, (2) push to in-memory `history[]` (using `shallowRef` so it's not reactive — saves perf with many events), (3) notify subscribers synchronously.
- Sync only. No `await`/`setTimeout` inside dispatch. Animations live in components, not in dispatch.

## Context menu state machine (the trickiest part)

Hover-triggered, single global instance, teleported to `<body>`.

```
idle  --hover card--> opening (200ms) --> open
open  --leave card--> closing (300ms grace) --> idle
open  --enter menu--> open (cancels close timer)
open  --leave menu--> closing (150ms) --> idle
open  --click item--> dispatch action, close immediately
open  --hover OTHER card--> close immediate + open new
any   --ESC / outside click--> idle
```

Positioning: default right-of-card `(anchor.x + anchor.w + 8, anchor.y)`; after mount measure menu rect and flip left or clamp Y to fit viewport. An invisible 8px **bridge div** between card and menu eliminates the "lost the menu" gap bug.

Menu items are zone-aware ([src/ui/menu/contextMenuItems.ts](src/ui/menu/contextMenuItems.ts)). Type-aware routing keys off `cardData.type` (`Spell Card` / `Trap Card` / `*Monster*` / `Field Spell`):
- **Hand (Monster)**: Normal Summon → MZ slot submenu (face-up-attack) / Special Summon → MZ slot submenu / Set → MZ slot submenu (face-down-defense) / Reveal / Send to GY / Banish / Return to Deck (top/bottom) / Shuffle into Deck.
- **Hand (Spell/Trap)**: Activate → S/T slot submenu (face-up) / Set → S/T slot submenu (face-down) / Reveal / Send to GY / Banish / Return to Deck (top/bottom) / Shuffle into Deck.
- **Hand (Field Spell)**: Activate → Field Spell zone (face-up, replaces any existing field spell) / Set → Field Spell zone (face-down) / same transfers as above.
- **Field**: Rotate (ATK↔DEF), Flip (face-up↔face-down), Move Zone (submenu of valid same-side destinations), Change Control, Destroy (= send to GY with reason `destroy`), Send to GY / Banish / Return to Deck / Shuffle into Deck. Attach Counter / Detach Material / Create Token rendered disabled with "Phase 4" tooltip.
- **GY / Banished / Extra Deck / Deck (per-card from the zone browser modal)**: Reveal, Move Zone (= summon/return to play), Send to GY / Banish / Return to Deck / Shuffle into Deck as appropriate to the current zone.

## Stacked zone browser

[src/ui/modals/ZoneBrowserModal.vue](src/ui/modals/ZoneBrowserModal.vue) — clicking a stacked-zone slot (GY / Banished / Extra Deck / Deck) opens a full-screen modal with a responsive grid of every card in that zone (preserving order; Deck shows top-of-deck first). Hovering any card in the grid uses the same `useContextMenu` composable to surface zone-aware actions. Closing the modal returns to the playmat. The modal subscribes to the same `duelStore` getters so its contents stay live as actions dispatch through events.

## Empty state

[src/ui/modals/EmptyStateOverlay.vue](src/ui/modals/EmptyStateOverlay.vue) — when `deckStore.currentDeck === null`, render a dimmed centered scrim over the playmat with copy "Import a YDK file to start" and an "Import Deck" button. The overlay also serves as a global drop target; dropping a `.ydk` anywhere opens the Deck Import Modal. Once a deck loads, the overlay unmounts.

## YGOPRODeck integration

[src/cards/ygoprodeck.ts](src/cards/ygoprodeck.ts):
- Batch endpoint: `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=<csv>`. Chunk ids into groups of 200; max 3 concurrent requests.
- Images: `https://images.ygoprodeck.com/images/cards_small/<id>.jpg` for field/hand, `cards/<id>.jpg` for preview panel.

[src/cards/cardCache.ts](src/cards/cardCache.ts) — localStorage keys `dr:card:<id>` + index `dr:card-index`. LRU evict 25% oldest on `QuotaExceededError`. Fall back to in-memory if storage rejected. Cache-first; if network fails AND not cached, render placeholder with passcode + "Unknown card".

## YDK parser

[src/deck/ydkParser.ts](src/deck/ydkParser.ts) — walks lines, tracks `'preamble'|'main'|'extra'|'side'` section state via `#main`/`#extra`/`!side` markers; numeric lines append to current section; comments ignored; unknown lines → warnings. Errors (fail): no `#main` or zero cards. Warnings (succeed): off-spec sizes (main 40–60, extra ≤15, side ≤15), >3 copies. Original `sourceText` retained on the Deck for byte-identical re-export.

## Step-by-step build order

Each step ends with a verifiable `npm run dev` smoke check.

1. **Cleanup + tokens** — delete `src/stores/counter.ts`; add `assets/styles/{tokens,reset,global}.css` (palette, `--card-ratio: 59/86`, z-index scale); replace `App.vue` body with `<DuelRoom />`. → dark background renders.
2. **Static playmat** — `DuelRoom.vue` + `PlayMat.vue` + `FieldSide.vue` + `Zone.vue` driven by `duel/zoneCatalog.ts`. → 18 empty slots per side, mirrored.
3. **Type plumbing** — all types in `cards/types.ts`, `duel/types.ts`, `deck/types.ts`, `core/events/eventTypes.ts`; `initialState.ts` builds 36 empty zones. → `npm run type-check` passes.
4. **Event bus + dispatcher** — `eventBus.ts`, `dispatcher.ts`, `reducers/duelReducer.ts` (LIFE_CHANGED, PHASE_CHANGED minimally); `duelStore` + `logStore`; temporary debug LP button. → click button → LP drops + log line.
5. **Card cache + render** — `ygoprodeck.ts`, `cardCache.ts`, `cardCacheStore`, `CardOnField.vue`. Dev seed: hardcode 5 instances. → real cards render with 59:86 ratio; refresh = instant (cache).
6. **YDK import** — `ydkParser.ts`, `deckStorage.ts`, `deckStore`, `DeckImportModal.vue`, app-level drag-drop overlay (`useDeckImport`). On import: parse → `ensureLoaded(allIds)` → `loadDeck`. → drop .ydk → deck appears in player DECK zone, recent decks persisted.
7. **Draw + shuffle + hand** — `drawCard`, `shuffleDeck`, RNG (seeded by `Date.now()` for now), `Hand.vue` + `HandCard.vue`. → Draw moves top card to hand, Shuffle changes top image, log lines appear.
8. **Hover preview** — `useHover.ts` (200ms delay), `uiStore` hover state, `CardPreviewPanel.vue`. → hovering any card updates left preview within 200ms.
9. **Context menu** — `useContextMenu.ts` state machine, `ContextMenu.vue` + `ContextMenuItem.vue`, `contextMenuItems.ts`. Wire all hand + field actions through `duelStore` commands (dispatching `CARD_MOVED` with full prev/new fields). → hover → menu → Normal Summon → first empty MZ; no flicker traversing card↔menu.
10. **Empty state + zone browser + LP controls + remaining controls + polish** — `EmptyStateOverlay.vue` (centered CTA over empty playmat, doubles as drop target); `ZoneBrowserModal.vue` (click GY/Banished/Extra/Deck → grid of all cards inside, contextual menu reused); `LifePointsControl.vue`, `PlayerInfoBar.vue` (LP +/- + phase/turn indicator) / `OpponentInfoBar.vue` (label only, no LP); Roll Dice / Coin Toss / End Phase (cycles DP→SP→M1→BP→M2→EP→ next turn DP) / Reset Duel (returns cards to deck, reshuffles, clears log). Undo + Save Replay disabled with `ToolTip` "Coming in Phase 4". Lint + format + 100-card perf check.

## Critical files

- [src/core/events/eventTypes.ts](src/core/events/eventTypes.ts) — the `DuelEvent` discriminated union; every later piece keys off this.
- [src/state/duelStore.ts](src/state/duelStore.ts) — the heart of the app; holds `DuelState`, exposes commands, routes through `dispatch`.
- [src/duel/types.ts](src/duel/types.ts) — `CardInstance`, `Zone`, `ZoneId`, `DuelState`; the data spine.
- [src/ui/menu/ContextMenu.vue](src/ui/menu/ContextMenu.vue) + [src/composables/useContextMenu.ts](src/composables/useContextMenu.ts) — hover-driven menu; UX-riskiest part.
- [src/deck/ydkParser.ts](src/deck/ydkParser.ts) — input boundary; downstream shape depends on this.
- [src/assets/styles/tokens.css](src/assets/styles/tokens.css) — palette + z-index scale (prevents stacking bugs).

## Architectural risk mitigations

- **z-index** — single scale in `tokens.css` (`--z-field/card/card-hover/hand/hand-hover/bars/preview/menu/submenu/modal-scrim/modal/toast`); components only reference these vars. `ContextMenu` teleported to `<body>` to escape `overflow:hidden` ancestors.
- **Event synchronization** — dispatcher applies state mutation **first**, then notifies subscribers; logStore reads from event payload (never mid-flight state). All sync, no await. Compound actions encoded as one event.
- **Overlapping context menus** — single global instance; hovering a new card closes the old menu immediately and starts a fresh open-timer. Bridge div between card and menu has zero gap.
- **Reactivity cost** — `shallowRef` for dispatcher event history; `markRaw` for `CardData` (static, never mutates).
- **localStorage quota** — only cache decked cards (~40–60/deck, not the full 12k catalog); LRU evict on `QuotaExceededError`; IndexedDB is the upgrade path if MVP outgrows it.

## Verification (end-to-end manual)

After step 10, walk through this scripted sequence:

1. Drop a real `.ydk` file → modal shows main/extra/side counts.
2. Click Import → loading progress → modal closes → DECK zone shows top card + count badge.
3. Draw 5× → 5 cards in hand row → 5 log lines with actual card names.
4. Shuffle → top-of-deck image changes → log entry.
5. Hover hand card → preview panel updates → context menu opens after ~200ms.
6. Mouse onto menu (without retracing) → stays open. Mouse off → closes after grace.
7. Click Normal Summon → MZ slot submenu → pick slot 2 → card moves from hand to MZ 2 face-up; log entry.
8. Hover field card → Rotate → card rotates; Destroy → moves to GY (top of GY shows it); log entries.
9. Player Info Bar: −1000, Set 4500 → LP updates; log entries.
10. Roll Dice → result + log. Coin Toss → result + log.
11. End Phase repeatedly → cycles DP→SP→M1→BP→M2→EP→ (next turn) DP.
12. Hover Undo button → "Coming in Phase 4" tooltip; disabled.
13. Hard refresh → Deck Import modal lists the recent deck → click → instant reload (Network tab shows no card fetches).
14. Reset Duel → all zones empty, hand empty, LP 8000, log cleared.

If all 14 pass, Phases 1–3 are functionally complete and Phase 4 (undo/replay) can plug into the existing event pipeline without state refactor.
