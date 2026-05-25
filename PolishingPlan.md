# Polishing Plan — Duel Room

## Context

Phases 1–3 from [Plan.md](Plan.md) are complete (steps 1–12 landed; latest commit `a71f010` finished step 12). The app boots a working duel sandbox, but seven concrete UX/data issues need to land before moving on to Phase 4 (undo/replay). This plan turns each polish item into a verifiable step.

The pacing rule still applies: **finish one step at a time, then stop and ask before starting the next**.

---

## Locked decisions

| Topic | Decision |
|---|---|
| Card-back image | User will supply an image asset; we drop it into `src/assets/images/card-back.<ext>` and reference it via Vite's asset URL import. |
| Field-spell background scope | Either side's face-up Field Spell can set the background; if both are face-up, the most-recently activated one wins. |
| Field "Overlay" action | **Dropped** — XYZ summoning happens only via Extra Deck OL ATK / OL DEF. No on-field manual overlay action. |
| Field Spell Set | Auto-places face-down in the FIELD_SPELL zone, symmetric with Activate (no picker). |
| Hand fan kick-in | Only when hand size > 6. ≤ 6 cards stay in a flat horizontal row; ≥ 7 fan into an arc. |
| Playmat aspect change | Change from 413:430 → 7:5 so MZ/EMZ/ST cells fall out as 1:1 squares. |
| XYZ host return-to-Extra-Deck | Materials still go to GY (Return-to-Extra-Deck is treated the same as any other host-leaves-field event). |
| Step ordering | 1: square cells → 2: card-back → 3: hand fan → 4: deck context menu → 5: field spell → 6: Extra-Deck routing → 7: XYZ overlay. |

---

## Step-by-step build order

Each step has a concrete done-when criterion and ends with a manual smoke check in `npm run dev`.

### Step 1 — Square playmat cells (1:1 aspect)

**Goal:** MZ, EMZ, and ST cells become 1:1 so the same cell snugly fits a card in attack (portrait) or defense (landscape, 90° rotated) without overflow.

- [src/ui/field/PlayMat.vue](src/ui/field/PlayMat.vue): change `width: min(100cqw, calc(100cqh * 413 / 430))` and `aspect-ratio: 413 / 430` to a 7:5 column/row ratio (`aspect-ratio: 7/5`) so cells fall out square in a 7-column grid with 5 rows.
- [src/ui/field/FieldRow.vue](src/ui/field/FieldRow.vue): leave the 7-column grid; rows will now produce square cells from the new playmat ratio.
- [src/ui/field/CardOnField.vue](src/ui/field/CardOnField.vue): keep the card sized at `aspect-ratio: var(--card-ratio)`, centered inside the square zone; `transform: rotate(90deg)` already handles defense.

**Done-when:** Cards in attack mode are vertical portraits centered in the cell; rotating to defense (Rotate action) shows a horizontal landscape card that still fits inside the same cell with no clipping. Verify with both a hand-summoned monster (face-up-attack) and a set monster (face-down-defense).

---

### Step 2 — Card-back image for face-down cards

**Goal:** Face-down field cards (face-down-attack, face-down-defense) render the user-supplied card-back image, not a gradient.

- **User to drop the image** into `src/assets/images/card-back.<ext>` (PNG / WEBP / SVG — Vite will URL-resolve any of these).
- [src/ui/field/CardOnField.vue](src/ui/field/CardOnField.vue:64): replace `<div class="card-on-field__back" />` with `<img :src="cardBackUrl" class="card-on-field__back" />` where `cardBackUrl` is imported once via `import cardBackUrl from '@/assets/images/card-back.png'`. Keep current border-radius / sizing.
- Hand cards stay always face-up (the polish spec only calls out the field positions), so no change to `HandCard.vue`.

**Done-when:** Set a monster → MZ shows the card-back image. Opponent's deck top renders the same image. Verified by manually flipping a face-up card to face-down via the Flip action.

---

### Step 3 — Hand fan-shape spread (kicks in at > 6 cards)

**Goal:** ≤ 6 cards stay in the current flat flex row. ≥ 7 cards fan into a smooth arc that always fits the hand strip width without clipping.

- [src/ui/hand/Hand.vue](src/ui/hand/Hand.vue): add a computed `isFanned = handCards.length > 6`; pass `--count` (and `--idx` per card) as CSS vars. When fanned, switch the container from `display: flex` to `position: relative` so each card can be absolutely placed along the arc.
- [src/ui/hand/HandCard.vue](src/ui/hand/HandCard.vue): when the parent is `.hand--fanned`, use a CSS `calc()` to derive a per-card angle (`(--idx - (--count - 1) / 2) * <stepDeg>`) and translateX so cards overlap. Pivot point is a virtual center below the strip (long radius) so the bottom of each card rests on a curve. Hover state must override the fan: `translateY(-12px) scale(1.18) rotate(0)` and a higher z-index so the hovered card flattens and pops above its neighbours.
- Step degree and overlap are tuned by feel; the formula scales: more cards → tighter overlap, slightly larger spread.

**Done-when:** Drawing the 7th card transitions the row into a fan; all cards remain on-screen; hovering any card straightens + enlarges it without overlap/clipping; trimming back to ≤ 6 returns to the flat row.

---

### Step 4 — Deck context menu (remove on-deck buttons)

**Goal:** Hovering the player's Deck zone opens a context menu (just like other cards) instead of overlaying Draw/Shuffle buttons.

- [src/ui/field/Zone.vue](src/ui/field/Zone.vue:109-112): delete the `.zone__menu` block (Draw/Shuffle buttons) and its CSS rules (lines 192–227).
- [src/ui/field/CardOnField.vue](src/ui/field/CardOnField.vue:27-30): currently `isHidden` blocks hover for DECK and EXTRA cards (no preview / no context menu). For DECK we want the context menu but **not** the preview. Add a new computed `previewHidden` (DECK + EXTRA) vs. `contextMenuHidden` (EXTRA only); deck-top hover triggers the menu without leaking the card identity.
- [src/ui/menu/contextMenuItems.ts](src/ui/menu/contextMenuItems.ts): rewrite `buildDeckItems` to return the polish-spec list (bottom → top in the menu, which we display top → bottom):
  - View — opens the existing zone browser (preserves `onZoneClick` behavior)
  - Banish Face Down — moves top card to BANISHED in face-down-attack
  - Banish top — moves top card to BANISHED face-up
  - Mill — moves top card to GY face-up
  - Shuffle — `duelStore.shuffleDeck(owner)`
  - Draw — `duelStore.drawCard(owner)`
- [src/state/duelStore.ts](src/state/duelStore.ts): add three commands operating on the deck top:
  - `millTop(owner)` → top of deck → GY (face-up)
  - `banishTop(owner)` → top of deck → BANISHED (face-up-attack, faceUp=true)
  - `banishTopFaceDown(owner)` → top of deck → BANISHED (face-down-attack, faceUp=false)
- Zone click on DECK still opens the browser (the "View" menu item is an alternate path).

**Done-when:** Hover deck → menu with Draw / Shuffle / Mill / Banish top / Banish Face Down / View; clicking each performs the action and adds a log entry; clicking the deck itself still opens the zone browser.

---

### Step 5 — Field Spell auto-activate + playmat background

**Goal:** Activating (and Setting) a Field Spell skips the zone picker (only one slot exists) and sets the card's artwork as the playmat background. Either player's face-up Field Spell can drive the background — most recently activated wins.

- [src/ui/menu/contextMenuItems.ts](src/ui/menu/contextMenuItems.ts): in `buildHandItems` (`category === 'field-spell'`), `buildDeckItems` (field-spell branch), and `startReturnToField`:
  - Activate → direct `duelStore.activateSpellTrap(instance.uuid, \`${instance.owner}:FIELD_SPELL:0\`)`.
  - Set → direct `duelStore.setSpellTrap(instance.uuid, \`${instance.owner}:FIELD_SPELL:0\`)` (symmetric with Activate; no picker).
- [src/state/uiStore.ts](src/state/uiStore.ts): add a tiny `lastActivatedFieldSpellOwner: Owner | null` ref. The duelStore (or a subscriber on `CARD_MOVED` with `reason === 'activate'`) sets it whenever a card lands face-up in any `FIELD_SPELL` zone. Cleared when the corresponding card leaves the zone or is flipped face-down.
- [src/ui/field/PlayMat.vue](src/ui/field/PlayMat.vue): compute `activeFieldSpellImageUrl`:
  1. Look at `lastActivatedFieldSpellOwner` (player or opponent).
  2. If that side's FIELD_SPELL zone has a face-up card → use its `imageUrlLarge`.
  3. Else fall back to the other side's face-up field spell, if any.
  4. Else null (default field color).
- Apply via inline `background-image` on `.play-mat`, with `background-size: cover` and a subtle dark overlay (`linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))` layered above the image) so card art still reads clearly.

**Done-when:** Activate a Field Spell from hand → card snaps to FIELD_SPELL zone face-up, playmat background becomes that artwork (dimmed). Activate a different one on the opponent side (via dev seed or two-player flow) → background switches to that. Send the most-recent one to GY → background falls back to the other or to default.

---

### Step 6 — Extra-Deck monster return routing

**Goal:** Fusion/Synchro/XYZ/Link monsters cannot go to the main Deck or to the Hand; they return to the Extra Deck.

- [src/cards/types.ts](src/cards/types.ts): add a sibling helper `isExtraDeckMonster(cardData)` that returns `true` when `cardData.type` matches `/(Fusion|Synchro|XYZ|Link)/i`. Existing `CardCategory` stays as-is; this is an orthogonal flag.
- [src/state/duelStore.ts](src/state/duelStore.ts): add `returnToExtraDeck(cardUuid)` (mirrors `returnToHand` shape; target `${owner}:EXTRA:0`).
- [src/ui/menu/contextMenuItems.ts](src/ui/menu/contextMenuItems.ts): for any field/GY/Banished/Deck/Hand menu, when the card is an extra-deck monster:
  - Remove: Return to Deck (top), Return to Deck (bottom), Shuffle into Deck, Return to Hand.
  - Add: a single "Return to Extra Deck" item routing to `duel.returnToExtraDeck(uuid)`.
- [src/state/cardCacheStore.ts](src/state/cardCacheStore.ts): no change; already exposes `byId`.

**Done-when:** Right-click a Synchro/XYZ/Fusion/Link on the field → no Return to Hand / Return to Deck options visible, but a Return to Extra Deck option that places the card back in the EXTRA zone. Same on GY and Banished.

---

### Step 7 — XYZ Overlay system (Extra-Deck only)

**Largest change. Touches `CardInstance` shape, `duelStore`, `Zone.vue`/`CardOnField.vue` rendering, `contextMenuItems.ts`, and `uiStore` (new picker kinds).**

The on-field "Overlay" action is **dropped** per the locked decision — XYZ summoning only happens through the Extra Deck OL ATK / OL DEF entry points.

**Data model** ([src/duel/types.ts](src/duel/types.ts)):

- Extend `CardInstance` with two optional fields:
  - `overlayUuids?: string[]` — for an XYZ host: ordered list of attached material UUIDs (bottom → top).
  - `overlayHostUuid?: string` — for a material: UUID of the host it's attached to.
- Attached materials keep their existing `zoneId` (the host's zone) but are removed from the parent `Zone.cards` array. The host's slot stays capacity-1; materials are tracked only via the host's `overlayUuids` array. Removing materials from `Zone.cards` keeps existing zone-rendering code (which iterates `Zone.cards`) unaware of them.

**Helper** ([src/cards/types.ts](src/cards/types.ts)):

- `isXyzMonster(cardData)` — returns true when `cardData.type` matches `/XYZ/i`. Used by `buildExtraItems` to decide whether to show OL ATK / OL DEF.

**duelStore commands** ([src/state/duelStore.ts](src/state/duelStore.ts)):

- `xyzSummon(extraDeckCardUuid, targetZoneId, materialUuids[], position: 'face-up-attack' | 'face-up-defense')` — places the XYZ in the target MZ/EMZ; for each material: remove from its current zone's `cards`, set its `overlayHostUuid` to the host's uuid; the host's `overlayUuids` is populated in pick order. One log entry per material attached + one for the XYZ summon itself.
- `detachMaterial(materialUuid)` → removes uuid from host's `overlayUuids`, clears `overlayHostUuid`, moves the material to the owner's GY face-up.
- `banishMaterial(materialUuid)` → same, but destination is BANISHED face-up.
- Wrap all host-leaves-field commands (`sendToGY`, `destroy`, `banish`, `returnToHand`, `returnToDeckTop`, `returnToDeckBottom`, `shuffleIntoDeck`, `returnToExtraDeck`, `moveZone`): if `overlayUuids.length > 0`, send each material to GY first (one `CARD_MOVED` per material), then perform the host move. Per spec: "When the top overlayed card leaves the field, the attached monsters go to the Graveyard".

**Event types** ([src/core/events/eventTypes.ts](src/core/events/eventTypes.ts)):

- The existing `CARD_MOVED` event is sufficient for material transfers; add a new `MoveReason`: `'overlay_attached'` and `'overlay_detached'` (so the log can read "Player attached X to Y" / "Player detached X from Y").

**Rendering** ([src/ui/field/Zone.vue](src/ui/field/Zone.vue) + [src/ui/field/CardOnField.vue](src/ui/field/CardOnField.vue)):

- When the top card has `overlayUuids.length > 0`, `CardOnField` renders small overlay "chips" peeking out below the host (offset −6px per material, smaller scale, slight horizontal stagger). Each chip is a tiny `CardOnField`-like component that renders the material's image and registers hover for its own context menu.
- The host's context menu stays the full Field menu — when the host leaves the field, materials cascade to GY via the duelStore wrapper.

**Context menu items** ([src/ui/menu/contextMenuItems.ts](src/ui/menu/contextMenuItems.ts)):

- `buildExtraItems`: when `isXyzMonster(cardData)`, prepend two items above the existing Special Summon:
  - `OL ATK` → start an `xyz_summon_atk` picker.
  - `OL DEF` → start an `xyz_summon_def` picker.
- For instances with `overlayHostUuid` set (i.e. materials), `buildMenuItems` short-circuits to a 2-item menu:
  - `Banish` → `duel.banishMaterial(uuid)`
  - `Detach` → `duel.detachMaterial(uuid)`

**XYZ summon picker UX** ([src/state/uiStore.ts](src/state/uiStore.ts)):

- Add picker kinds `xyz_summon_atk` and `xyz_summon_def`, each storing `instanceUuid`, position, and a running `selectedMaterialUuids: string[]`.
- Step 1: highlight valid MZ/EMZ zones; clicking one fixes the target zone and advances to Step 2.
- Step 2: highlight all face-up player field monsters (MZ + EMZ). Clicking a material toggles its inclusion (visual outline). A floating "Confirm" button shows the running count and dispatches `xyzSummon(...)`.
- Allow 0 materials (a "vanilla" XYZ summon — host without overlays).
- ESC cancels the picker at any stage; cancellation is non-destructive.

**Done-when:**
1. Summon an XYZ from Extra Deck via OL ATK → pick an MZ slot → pick 2 face-up field monsters → press Confirm → XYZ lands face-up-attack in that slot with both materials rendering as chips beneath.
2. Hover a material chip → only Banish / Detach options shown. Detach → material lands in GY; chip count decreases by 1.
3. Send the XYZ host to GY → all remaining materials also land in GY automatically; log shows N+1 moves.
4. Right-click the XYZ host on the field → Return to Extra Deck still visible (Step 6); using it moves the host to EXTRA and the materials to GY in one user action (Return-to-Extra-Deck is treated the same as any other host-leaves-field event).

---

## Critical files

- [src/state/duelStore.ts](src/state/duelStore.ts) — new commands for millTop / banishTop / banishTopFaceDown, returnToExtraDeck, xyzSummon, detachMaterial, banishMaterial, plus a wrapper that cascades materials → GY on host-leaves-field.
- [src/ui/menu/contextMenuItems.ts](src/ui/menu/contextMenuItems.ts) — biggest UX surface; almost every step touches it.
- [src/ui/field/CardOnField.vue](src/ui/field/CardOnField.vue) — face-down image, separate "preview hidden" vs. "context-menu hidden" flags, overlay chip rendering.
- [src/ui/field/Zone.vue](src/ui/field/Zone.vue) — remove on-deck buttons; allow deck hover→menu without exposing the card.
- [src/ui/field/PlayMat.vue](src/ui/field/PlayMat.vue) — square cells, Field Spell background image.
- [src/duel/types.ts](src/duel/types.ts) — `overlayUuids` / `overlayHostUuid` on `CardInstance`.
- [src/cards/types.ts](src/cards/types.ts) — `isExtraDeckMonster`, `isXyzMonster` helpers.
- [src/ui/hand/Hand.vue](src/ui/hand/Hand.vue) + [src/ui/hand/HandCard.vue](src/ui/hand/HandCard.vue) — fan layout.

## End-to-end verification (after all 7 steps)

1. Import a deck containing at least one Field Spell, at least one XYZ Monster, and at least one Fusion/Synchro/Link → start a duel.
2. Draw 8 cards → hand fans cleanly, no clipping.
3. Activate the Field Spell from hand → no picker, card snaps to FIELD_SPELL zone, background changes.
4. Normal Summon → set the monster in DEF → confirm card-back image; rotate to ATK → portrait fits.
5. Hover deck → menu shows Draw / Shuffle / Mill / Banish top / Banish FD / View; perform Mill and Banish FD; check log.
6. Special Summon an XYZ from Extra Deck via OL ATK with 2 materials → host on field with 2 chips beneath; hover a chip → Banish / Detach only.
7. Send the XYZ to GY → both materials follow it to GY (log shows 3 moves).
8. Right-click a Synchro on the field → no Return to Hand / Return to Deck items; Return to Extra Deck moves it back to the EXTRA zone.

If all 8 pass, polishing pass is complete and Phase 4 (undo/replay) can start.
