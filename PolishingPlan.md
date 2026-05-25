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
| Hand overlap kick-in | Only when hand size > 6. ≤ 6 cards stay in a flat row with gaps; ≥ 7 cards stay flat but overlap horizontally to fit the strip (no fan/rotation). |
| Playmat aspect change | Change from 413:430 → 7:5 so MZ/EMZ/ST cells fall out as 1:1 squares. |
| XYZ host return-to-Extra-Deck | Materials still go to GY (Return-to-Extra-Deck is treated the same as any other host-leaves-field event). |
| Step ordering | 1: square cells → 2: card-back → 3: hand overlap → 4: deck context menu → 5: field spell → 6: Extra-Deck routing → 7: XYZ overlay. |

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

### Step 3 — Hand overlap (kicks in at > 6 cards)

**Goal:** ≤ 6 cards stay in the current flat flex row with a small gap. ≥ 7 cards keep the flat row but overlap horizontally so the whole hand fits the strip — no rotation, no arc. Stays responsive and stable even with very large hands (60-card deck top-decked into hand).

- [src/ui/hand/Hand.vue](src/ui/hand/Hand.vue):
  - Add a computed `isOverlapped = handCards.length > 6` and apply class `.hand--overlap` when true. Set the inline CSS var `--count` (the hand size) on the container so the overlap math can scale.
  - Add `min-width: 0; min-height: 0; container-type: size` to `.hand`. The `container-type: size` does double duty: it establishes size containment so the cards' `aspect-ratio + height: 100%` intrinsic sizing can't propagate up into the parent grid track and collapse the strip, and it enables `cqi`/`cqh` units for the overlap math below.
  - In `.hand--overlap`, drop `gap` to 0 and derive a `--hand-overlap` length from the strip's own width and height:
    - `--card-w: calc(100cqh * 59 / 86)` (card width derived from strip height).
    - `--hand-overlap: max(-0.9 × --card-w, min(-12px, fit-margin))` where `fit-margin = (100cqi - --count × --card-w) / (--count - 1)`.
    - At low counts overlap stays at the soft −12px; as count grows it deepens just enough to fit the strip; it bottoms out at −90% of card width so a sliver of every card stays visible even at deck-sized hands.
- [src/ui/hand/HandCard.vue](src/ui/hand/HandCard.vue): no per-card props needed. Add a single rule `.hand-card + .hand-card { margin-left: var(--hand-overlap, 0px); }` so adjacent cards pull leftward by the inherited custom property. The existing hover rule (`translateY(-12px) scale(1.18)` + `z-index: var(--z-hand-hover)`) already lifts the hovered card cleanly above its overlapping neighbours.
- [src/ui/DuelRoom.vue](src/ui/DuelRoom.vue) (`.duel-room__center`): change `grid-template-rows: auto 1fr` → `auto minmax(0, 1fr)`. Bare `1fr` is shorthand for `minmax(auto, 1fr)`, where `auto` = min-content of items in the track; with many overlapping cards the flex row's min-content balloons and pushes the hand track past its `1fr` share, eating the strip's height. `minmax(0, 1fr)` pins the floor at 0.
- No absolute positioning, no `--idx`, no rotation.

**Done-when:** Drawing the 7th card switches the row from gapped to overlapped; all cards remain on-screen; hovering any card lifts + enlarges it above its neighbours; trimming back to ≤ 6 returns to the flat gapped row; resizing the window or top-decking the entire deck into the hand never collapses the strip.

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
- [src/ui/hand/Hand.vue](src/ui/hand/Hand.vue) + [src/ui/hand/HandCard.vue](src/ui/hand/HandCard.vue) — overlap layout.

## End-to-end verification (after all 7 steps)

1. Import a deck containing at least one Field Spell, at least one XYZ Monster, and at least one Fusion/Synchro/Link → start a duel.
2. Draw 8 cards → hand overlaps cleanly, no clipping.
3. Activate the Field Spell from hand → no picker, card snaps to FIELD_SPELL zone, background changes.
4. Normal Summon → set the monster in DEF → confirm card-back image; rotate to ATK → portrait fits.
5. Hover deck → menu shows Draw / Shuffle / Mill / Banish top / Banish FD / View; perform Mill and Banish FD; check log.
6. Special Summon an XYZ from Extra Deck via OL ATK with 2 materials → host on field with 2 chips beneath; hover a chip → Banish / Detach only.
7. Send the XYZ to GY → both materials follow it to GY (log shows 3 moves).
8. Right-click a Synchro on the field → no Return to Hand / Return to Deck items; Return to Extra Deck moves it back to the EXTRA zone.

If all 8 pass, polishing pass is complete and Phase 4 (undo/replay) can start.
