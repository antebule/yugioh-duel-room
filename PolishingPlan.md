# Polishing Plan — Duel Room

## Context

Phases 1–3 from [Plan.md](Plan.md) are complete (steps 1–12 landed; latest commit `a71f010` finished step 12). The app boots a working duel sandbox, but eight concrete UX/data issues need to land before moving on to Phase 4 (undo/replay). This plan turns each polish item into a verifiable step.

The pacing rule still applies: **finish one step at a time, then stop and ask before starting the next**.

---

## Locked decisions

| Topic | Decision |
|---|---|
| Card-back image | User will supply an image asset; we drop it into `src/assets/images/card-back.<ext>` and reference it via Vite's asset URL import. |
| Field-spell background scope | Either side's face-up Field Spell can set the background; if both are face-up, the most-recently activated one wins. |
| Field "Overlay" action | **Two entry points:** (a) on-field `Overlay` action picks one target host and turns the source into a material; (b) Extra-Deck `OL ATK` / `OL DEF` (XYZ only, gated on ≥1 face-up field monster) summons the XYZ into the picked target's zone with that target as the first material. Multi-material XYZs are built by repeated on-field `Overlay`. |
| Field Spell Set | Auto-places face-down in the FIELD_SPELL zone, symmetric with Activate (no picker). |
| Hand overlap kick-in | Only when hand size > 6. ≤ 6 cards stay in a flat row with gaps; ≥ 7 cards stay flat but overlap horizontally to fit the strip (no fan/rotation). |
| Playmat aspect change | Change from 413:430 → 7:5 so MZ/EMZ/ST cells fall out as 1:1 squares. |
| XYZ host return-to-Extra-Deck | Materials still go to GY (Return-to-Extra-Deck is treated the same as any other host-leaves-field event). |
| Pendulum detection | By `cardData.type` matching `/Pendulum/i` (sibling to `isExtraDeckMonster` / `isXyzMonster`). |
| Pendulum "To Extra Deck FU" | Coexists with the existing face-down "Return to Extra Deck" for extra-deck pendulums (both shown); face-up version uses `pendulumToExtraDeck`. |
| Step ordering | 1: square cells → 2: card-back → 3: hand overlap → 4: deck context menu → 5: field spell → 6: Extra-Deck routing → 7: XYZ overlay → 8: Pendulum actions. |

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

### Step 7 — XYZ Overlay system

**Largest change. Touches `CardInstance` shape, `duelStore`, `Zone.vue` / `CardOnField.vue` rendering, a new `OverlayChip.vue`, `contextMenuItems.ts`, `uiStore` (two new picker kinds), the reducer, and `MoveReason`.**

Two entry points create overlays. Both pickers select **exactly one** face-up player-owned MZ/EMZ monster as the target. When exactly one valid target exists at action time, the picker is skipped and the action runs immediately.

**1. On-field Overlay** — a face-up player-owned MZ/EMZ monster that is not currently a material (hosts are allowed — this is how multi-material XYZs are stacked) gets an `Overlay` menu item, gated on at least one *other* eligible monster existing. The right-clicked monster acts as the **host**; the clicked target becomes the new **material**. On confirmation: if the target is itself a host, its existing materials are first re-parented onto the new host (so transferring a host onto another host stacks all materials beneath the new top); then the target is removed from its zone's `cards` and attached to the host; finally the host moves into the target's vacated zone. The host's pre-existing materials' `zoneId`s follow it automatically (reducer invariant).

**2. Extra-Deck OL ATK / OL DEF** — XYZ Extra-Deck cards get two extra menu items, gated on ≥1 face-up player-owned MZ/EMZ monster. Clicking selects exactly one such monster. On confirmation: the target *and all of the target's existing materials* are transferred to the new XYZ host (final chip order = target's previous materials, then the target appended on top), then the XYZ is special-summoned face-up-attack or face-up-defense into the target's zone.

In both flows: ESC cancels at any stage; cancel is non-destructive.

**Data model** ([src/duel/types.ts](src/duel/types.ts)):

- Extend `CardInstance` with two optional fields:
  - `overlayUuids?: string[]` — for a host: ordered list of attached material UUIDs (bottom → top).
  - `overlayHostUuid?: string` — for a material: UUID of the host it's attached to.
- Materials are removed from their old zone's `Zone.cards` array. Their `zoneId` is updated to the host's current zone — and the reducer keeps it in sync whenever the host changes zones (so chips locate correctly after moves).

**Helper** ([src/cards/types.ts](src/cards/types.ts)):

- `isXyzMonster(cardData)` — returns true when `cardData.type` matches `/XYZ/i`. Used by `buildExtraItems` to decide whether to surface OL ATK / OL DEF.

**duelStore commands** ([src/state/duelStore.ts](src/state/duelStore.ts)):

- `attachAsMaterial(hostUuid, materialUuid)` — backs the on-field Overlay flow. Validates both exist, both face-up, same controller, neither is currently a material, both on MZ/EMZ, host !== material. If the material is itself a host, dispatches one `overlay_attached` per inherited material (re-parenting them to the new host). Then dispatches `overlay_attached` for the material itself. Finally dispatches a `move_zone` CARD_MOVED for the host into the material's old zone.
- `xyzSummonOnto(extraDeckCardUuid, targetUuid, position: 'face-up-attack' | 'face-up-defense')` — backs OL ATK / OL DEF. Re-parents the target's existing materials onto the new XYZ via `overlay_attached`, attaches the target itself, then dispatches a `special_summon` CARD_MOVED moving the XYZ from EXTRA into the target's zone in the chosen position.
- `detachMaterial(materialUuid)` — moves the material to its owner's GY face-up via a CARD_MOVED with `reason: 'overlay_detached'`. The reducer pops uuid from the host's `overlayUuids` and clears the material's `overlayHostUuid`.
- `banishMaterial(materialUuid)` — same as `detachMaterial` but destination is BANISHED face-up.
- **Host-leaves-field cascade** — wrapped inside `moveCard()` itself, so every public command that funnels through it (`sendToGY`, `destroy`, `banish`, `returnToHand`, `returnToDeckTop`, `returnToDeckBottom`, `shuffleIntoDeck`, `returnToExtraDeck`, `moveZone`) gets the behavior for free. If the moving instance has `overlayUuids.length > 0` and the destination zone is not MZ/EMZ, each material is dispatched to its owner's GY first via a `send_gy` CARD_MOVED carrying the host's uuid. The reducer treats `overlayHostUuid` + non-overlay reason as a forced detach before applying the normal zone move.

**Event types** ([src/core/events/eventTypes.ts](src/core/events/eventTypes.ts)):

- Add `MoveReason` values `'overlay_attached'` and `'overlay_detached'`. The existing `CARD_MOVED` event is reused for both — no new event kinds.
- `CARD_MOVED` gains an optional `hostUuid?: string`, carried for both overlay reasons *and* for the host-leaves-field cascade `send_gy` events, so the reducer can locate the host without scanning all zones.

**Reducer** ([src/core/reducers/duelReducer.ts](src/core/reducers/duelReducer.ts)):

- Extend the `CARD_MOVED` branch to maintain `overlayUuids` / `overlayHostUuid` based on `reason`:
  - `'overlay_attached'` → if the instance was already a material, first splice it out of its previous host's `overlayUuids` (covers material transfer when an XYZ adopts a host's materials, or when overlaying a host onto another host). Remove from old zone's `cards`, push uuid into the new host's `overlayUuids`, set `instance.overlayHostUuid = event.hostUuid`, update `instance.zoneId = event.to.zoneId`. Does NOT append to any zone's `cards`.
  - `'overlay_detached'` (or any other non-overlay reason on a material) → clear the material's `overlayHostUuid`, splice uuid out of the host's `overlayUuids`, then run the normal zone-move logic. The "any other reason" branch covers the host-leaves-field cascade where materials get a normal `send_gy`.
- **Host-move material-sync invariant:** at the end of every non-overlay `CARD_MOVED`, if the moved instance still has `overlayUuids`, every attached material's `zoneId` is re-synced to the host's new `zoneId`. This keeps a host's chips locatable when the host changes zones (the trailing `move_zone` at the end of `attachAsMaterial`, or any other host move within MZ/EMZ).

**Picker UX** ([src/state/uiStore.ts](src/state/uiStore.ts) + [src/ui/field/Zone.vue](src/ui/field/Zone.vue)):

- Add two `ZonePickerKind`s: `'overlay_target'` (on-field Overlay) and `'xyz_summon'` (OL ATK / OL DEF). Both store the source `instanceUuid`; `ZonePicker` gains an optional `position` for `xyz_summon`.
- These pickers select a face-up player MZ/EMZ monster, NOT an empty zone. `Zone.vue.isPickerTarget` explicitly excludes these kinds from empty-zone highlighting, and the click is intercepted in `CardOnField.vue` instead — the valid target card pulses a blue outline highlight and runs the corresponding duelStore command on click.
- For on-field Overlay: the source's own zone (and the source card itself) is excluded from valid targets.
- For OL ATK / OL DEF: the Extra-Deck menu items are hidden unless ≥1 face-up player MZ/EMZ monster exists.
- When the menu action fires and exactly one valid target exists, the picker is skipped and the command runs immediately.
- ESC cancels via the existing `cancelZonePicker` path.

**Rendering** ([src/ui/field/CardOnField.vue](src/ui/field/CardOnField.vue) + new [src/ui/field/OverlayChip.vue](src/ui/field/OverlayChip.vue)):

- When the top card on a zone has `overlayUuids.length > 0`, `CardOnField` renders one `OverlayChip` per attached material as a horizontal right-fan inside the host's zone:
  - The host visual shifts from centered to the zone's left edge (via `justify-content: flex-start` on `.card-on-field--has-materials`).
  - Each chip is full card-size (`height: 100%; aspect-ratio: 59/86`), absolute-positioned with `left: (i+1) × (1 − 59/86) / N` of zone-width, so the rightmost chip's right edge always lands at the zone's right edge regardless of N.
  - Z-index counts down (`-1 − i`) so higher-index chips sit further back; the host stays on top.
- The host visual elements (`<img>`, card-back `<img>`, loading `<div>`) are sized to the card's aspect ratio (not the full zone), so the hover hit area matches what the user sees. `@mouseenter` / `@mouseleave` are bound to the host element (not the zone-spanning parent), and the host element is the context-menu anchor, so the menu lines up with the visual card whether materials are attached or not.
- Defense rotation uses `rotate(-90deg)` (counter-clockwise) applied to the host visual elements only — chips stay in face-up-attack orientation. When `--has-materials` and `--defense` are both set, the host re-centers (overrides the left-align) so the rotated landscape card fits inside the zone.
- `OverlayChip.vue` renders the material's card image, registers its own hover (fires both the right-side preview panel and the context-menu open path), and the menu short-circuits via `overlayHostUuid` to the 2-item `Banish` / `Detach` menu.

**Context menu items** ([src/ui/menu/contextMenuItems.ts](src/ui/menu/contextMenuItems.ts)):

- `buildFieldItems` — when the instance is a face-up player-controlled MZ/EMZ monster that is NOT a material (hosts allowed), prepends an `Overlay` item, gated on at least one *other* eligible monster existing. Its `run`: if exactly one valid target, calls `duel.attachAsMaterial(host=instance, material=target)` directly; otherwise opens an `overlay_target` picker.
- `buildExtraItems` — when `isXyzMonster(cardData)` AND ≥1 face-up player MZ/EMZ monster exists, prepends `OL ATK` and `OL DEF` items above `Special Summon`. Each `run`: if exactly one valid target, calls `duel.xyzSummonOnto` directly with the chosen position; otherwise opens an `xyz_summon` picker carrying the position.
- `buildMenuItems` — when the instance has `overlayHostUuid` set, short-circuits to a 2-item menu (`Banish` → `duel.banishMaterial`, `Detach` → `duel.detachMaterial`). This branch takes precedence over zoneKind-based dispatch.

**Done-when:**
1. Two face-up player monsters A (MZ1) and B (MZ2): right-click A → `Overlay` (auto-picks B since it's the only target) → MZ1 is empty; MZ2 contains A as host with B as a single chip beneath.
2. Add a third face-up monster C in MZ3; right-click C → `Overlay` (picker opens because there are now two targets) → click A → C moves into MZ2 carrying A and B as chips (A's prior material transferred). MZ3 is empty.
3. Hover any chip → only `Banish` and `Detach` shown. `Detach` → chip count drops by 1, material lands in GY face-up; host and remaining materials unchanged.
4. With ≥1 face-up player MZ/EMZ monster, right-click an XYZ in Extra Deck → `OL ATK` and `OL DEF` both appear. Pick `OL ATK` (auto-picks the only target, or pick one from the picker) → XYZ lands face-up-attack in that monster's zone with that monster *and all of its prior materials* as chips.
5. Send the XYZ host to GY via its menu → host and all remaining materials land in GY (one event per material + host; log shows N+1 entries).
6. Right-click the XYZ host → `Return to Extra Deck` (Step 6) → host goes to EXTRA, materials cascade to GY in one user action.
7. With zero face-up player MZ/EMZ monsters, an XYZ in Extra Deck shows NEITHER `OL ATK` nor `OL DEF`. A non-host monster with no other eligible monster on the field shows no `Overlay` item either.
8. Rotate a host (with materials) to defense → the host visual rotates counter-clockwise to landscape and re-centers within the zone; chips remain upright in face-up-attack orientation.

---

### Step 8 — Pendulum monsters: Activate (Hand) + To Extra Deck FU

**Goal:** Pendulum monsters gain two location-specific actions. In Hand they can be **Activated** into a Pendulum Scale zone (the far-left `ST:0` / far-right `ST:4` zones). On field / GY / banished they can be returned **To Extra Deck face-up**.

Pendulum detection: `cardData.type` matches `/Pendulum/i` (sibling to `isExtraDeckMonster` / `isXyzMonster`).

- [src/cards/types.ts](src/cards/types.ts): add `isPendulum(cardData)` → `/Pendulum/i.test(cardData.type)`.
- [src/state/uiStore.ts](src/state/uiStore.ts): extend `ZonePicker` with an optional `validZoneIds?: ZoneId[]`. When set, only those exact zones are valid picker targets (lets the Activate picker highlight just the two Pendulum zones). No new `ZonePickerKind` — reuse `'activate'`.
- [src/ui/field/Zone.vue](src/ui/field/Zone.vue:32): in `isPickerTarget`, after the existing kind/owner/empty checks, additionally require `picker.validZoneIds.includes(props.zone.id)` when `validZoneIds` is set. Existing pickers leave it undefined and are unaffected.
- [src/state/duelStore.ts](src/state/duelStore.ts): add `pendulumToExtraDeck(cardUuid)` — mirrors `returnToExtraDeck` but face-up (`position: 'face-up-attack'`, `faceUp: true`, `reason: 'return_deck'`). `moveCard`'s host-leaves-field cascade already handles any attached materials.
- [src/ui/menu/contextMenuItems.ts](src/ui/menu/contextMenuItems.ts):
  - `buildHandItems` (monster branch): when `isPendulum(cardData)`, compute `left = ${owner}:ST:0`, `right = ${owner}:ST:4`, and the subset that is empty. If ≥1 empty, prepend an **Activate** item: 1 empty → `duel.activateSpellTrap(uuid, theEmptyOne)` directly (auto, no picker, same pattern as the single-target Overlay/XYZ auto-pick); 2 empty → `ui.startZonePicker({ kind: 'activate', validZoneKinds: ['ST'], validZoneIds: empty })`. 0 empty → no Activate item.
  - `buildFieldItems`, `buildGYItems`, `buildBanishedItems`: when `isPendulum(cardData)`, add a **To Extra Deck FU** item → `duel.pendulumToExtraDeck(uuid)`. This is *in addition to* the existing face-down "Return to Extra Deck" for extra-deck pendulums (both shown).

**Done-when:**
1. With `ST:0` and `ST:4` both empty, right-click a Pendulum in hand → **Activate** appears → only the far-left and far-right ST zones pulse → clicking one places the card there face-up.
2. With exactly one of `ST:0` / `ST:4` empty → **Activate** places the card into the remaining Pendulum zone immediately (no picker).
3. With both Pendulum zones filled → no **Activate** item; a non-Pendulum monster in hand never shows it.
4. A Pendulum on field / in GY / banished shows **To Extra Deck FU**; clicking it puts the card on top of the Extra Deck face-up (art visible).
5. An extra-deck Pendulum shows BOTH "Return to Extra Deck" (face-down) and "To Extra Deck FU" (face-up), each behaving accordingly.

---

## Critical files

- [src/state/duelStore.ts](src/state/duelStore.ts) — new commands for millTop / banishTop / banishTopFaceDown, returnToExtraDeck, attachAsMaterial, xyzSummonOnto, detachMaterial, banishMaterial, pendulumToExtraDeck (face-up Extra Deck return). The host-leaves-field cascade lives inside `moveCard()` itself so every public command that funnels through it gets the behavior for free.
- [src/ui/menu/contextMenuItems.ts](src/ui/menu/contextMenuItems.ts) — biggest UX surface; almost every step touches it. Material short-circuit, `Overlay` item, OL ATK / OL DEF items, and the auto-pick when exactly one valid target exists all live here.
- [src/ui/field/CardOnField.vue](src/ui/field/CardOnField.vue) — face-down image, separate "preview hidden" vs. "context-menu hidden" flags, overlay chip rendering. Host visual elements are sized to the card's aspect ratio (not the full zone) and own the hover handlers + menu anchor, so the hover hit area and menu position match the visible card. Defense rotation (`rotate(-90deg)`) is applied to the host element rather than the parent so chips stay upright.
- [src/ui/field/Zone.vue](src/ui/field/Zone.vue) — remove on-deck buttons; allow deck hover→menu without exposing the card.
- [src/ui/field/OverlayChip.vue](src/ui/field/OverlayChip.vue) — new component for an attached material chip; renders the material's image and owns its 2-item `Banish` / `Detach` hover menu.
- [src/ui/field/PlayMat.vue](src/ui/field/PlayMat.vue) — square cells, Field Spell background image.
- [src/duel/types.ts](src/duel/types.ts) — `overlayUuids` / `overlayHostUuid` on `CardInstance`.
- [src/cards/types.ts](src/cards/types.ts) — `isExtraDeckMonster`, `isXyzMonster`, `isPendulum` helpers.
- [src/core/events/eventTypes.ts](src/core/events/eventTypes.ts) — `overlay_attached` / `overlay_detached` `MoveReason` values.
- [src/core/reducers/duelReducer.ts](src/core/reducers/duelReducer.ts) — `CARD_MOVED` extended to maintain `overlayUuids` / `overlayHostUuid` and to force-detach materials on host-leaves-field.
- [src/state/uiStore.ts](src/state/uiStore.ts) — two new picker kinds (`overlay_target`, `xyz_summon`); optional `validZoneIds` on `ZonePicker` to restrict highlighting to specific zones (Pendulum Activate).
- [src/ui/hand/Hand.vue](src/ui/hand/Hand.vue) + [src/ui/hand/HandCard.vue](src/ui/hand/HandCard.vue) — overlap layout.

## End-to-end verification (after all 8 steps)

1. Import a deck containing at least one Field Spell, at least one XYZ Monster, at least one Fusion/Synchro/Link, and at least one Pendulum monster → start a duel.
2. Draw 8 cards → hand overlaps cleanly, no clipping.
3. Activate the Field Spell from hand → no picker, card snaps to FIELD_SPELL zone, background changes.
4. Normal Summon → set the monster in DEF → confirm card-back image; rotate to ATK → portrait fits.
5. Hover deck → menu shows Draw / Shuffle / Mill / Banish top / Banish FD / View; perform Mill and Banish FD; check log.
6. Special Summon an XYZ from Extra Deck via OL ATK with 2 materials → host on field with 2 chips beneath; hover a chip → Banish / Detach only.
7. Send the XYZ to GY → both materials follow it to GY (log shows 3 moves).
8. Right-click a Synchro on the field → no Return to Hand / Return to Deck items; Return to Extra Deck moves it back to the EXTRA zone.
9. Right-click a Pendulum monster in hand (both `ST:0` / `ST:4` empty) → **Activate** highlights only the far-left and far-right ST zones; click one → card lands there face-up. Fill one Pendulum zone and repeat → it auto-activates into the other with no picker. Fill both → no Activate item.
10. Right-click that Pendulum on the field / in GY / banished → **To Extra Deck FU** puts it on top of the Extra Deck face-up (art visible). For an extra-deck Pendulum, confirm both "Return to Extra Deck" (face-down) and "To Extra Deck FU" (face-up) appear.

If all 10 pass, polishing pass is complete and Phase 4 (undo/replay) can start.
