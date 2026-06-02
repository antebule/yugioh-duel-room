# Polish Context Menu Items

## Context

The card context menu (`src/ui/menu/contextMenuItems.ts`) used to offer actions that don't always make sense for a given zone/state. It showed summon/activate items when no target zone was free, let monsters reach illegal positions (face-down-attack, defense in S/T zones), duplicated "Destroy" with "Send to GY", and only special-summoned to attack.

This change tightens each per-zone menu so the offered actions match what's legally possible. It splits Special Summon by position (ATK/DEF), adds a way to attach GY/Banished monsters to an on-field XYZ, removes dead items (Destroy, Reveal, Shuffle into Deck), relaxes and renames "Move", auto-places into a single free S/T zone, and renames labels for a narrow card-width menu panel.

No reducer changes are needed — `CARD_POSITION_CHANGED` already derives `faceUp`/`rotation` from the target `FieldPosition`, and `CARD_MOVED` with `reason: 'overlay_attached'` already handles attaching a material from any zone.

## Files modified

- `src/ui/menu/contextMenuItems.ts` — menu builders, helpers, labels, gating, ordering (primary)
- `src/state/duelStore.ts` — `banishFaceDown`, `setPosition`, `attachMaterialFromZone`, extended `specialSummon`, position-normalizing `moveZone`
- `src/state/uiStore.ts` — `attach_target` picker kind
- `src/ui/field/Zone.vue` — SS position into picker completion; `attach_target` guard
- `src/ui/field/CardOnField.vue` — `attach_target` highlight + click
- `src/ui/menu/ContextMenu.vue` — panel width matches the hovered card
- `src/ui/menu/ContextMenuItem.vue` — label wrapping

---

## 1. Store actions (`duelStore.ts`)

- **`banishFaceDown(cardUuid)`** — mirror `banish` (`duelStore.ts:329`) but `faceUp: false`, `position: 'face-down-attack'`. Add to API.
- **`specialSummon(cardUuid, toZoneId, position?)`** — extend (`duelStore.ts:271`) to accept an optional `position: 'face-up-attack' | 'face-up-defense'` (default `'face-up-attack'`); pass it through, `reason` unchanged.
- **`setPosition(cardUuid, position: FieldPosition)`** — new; dispatch `CARD_POSITION_CHANGED` (same shape as `rotate`, `duelStore.ts:655`) with `next: position`. Used by the MZ/EMZ Set / Flip / Flip-Summon items. Add to API.
- **`attachMaterialFromZone(hostUuid, materialUuid)`** — new; attach a GY/Banished monster onto an on-field XYZ host (host does **not** change zones). Dispatch one `CARD_MOVED` for `materialUuid` → host's zone, `reason: 'overlay_attached'`, `hostUuid`, `newPosition: 'face-up-attack'`, `newFaceUp: true`, `newRotation: 0`. Model on `attachAsMaterial` (`duelStore.ts:450`). Guard: host exists, is face-up, is in MZ/EMZ, controller === material.controller. Add to API.
- **`moveZone(...)`** — now normalizes the new position from source/destination zone *kinds* before delegating to `moveCard` (previously preserved position blindly). `faceUp` never changes, so only `position` is passed; `moveCard` re-derives `rotation`:
  - **MZ/EMZ → ST or FIELD_SPELL:** defense flips to the matching attack (`face-up-defense` → `face-up-attack`, `face-down-defense` → `face-down-attack`). One rule covers both the general case and a Field Spell's MZ/EMZ → ST/FIELD case.
  - **ST or FIELD_SPELL → MZ/EMZ:** a set card (`face-down-attack`) becomes `face-down-defense`.
  - **All other transitions** (MZ↔EMZ, ST→ST, FIELD_SPELL→ST/FIELD_SPELL, ST→FIELD_SPELL): position preserved.

## 2. uiStore (`uiStore.ts`)

- Add `'attach_target'` to `ZonePickerKind` (`uiStore.ts:14`).
- Reuse the existing `position?: FieldPosition` field on `ZonePicker` for `special_summon` (previously only used by `xyz_summon`).

## 3. Zone.vue picker completion (`Zone.vue:49`)

- In `runPickerAction`, the `special_summon` case passes position: `duelStore.specialSummon(instanceUuid, zoneId, picker.position === 'face-up-defense' ? 'face-up-defense' : 'face-up-attack')`.
- `attach_target` is a card-targeting picker (like `overlay_target`/`xyz_summon`), so it's in the early-return guard at `Zone.vue:37` (empty zones don't highlight for it).

## 4. CardOnField.vue — "Attach" target highlighting (`CardOnField.vue:32`)

- For `picker.kind === 'attach_target'`: highlight only the player's **face-up XYZ monsters in MZ/EMZ that are not themselves materials** (XYZ check via `card.value` + `isXyzMonster`).
- In `onClick` (`CardOnField.vue:45`): the **clicked** card is the host and `picker.instanceUuid` is the material (reversed vs. `overlay_target`) — call `duelStore.attachMaterialFromZone(inst.uuid, picker.instanceUuid)`, then `cancelZonePicker()`.

---

## 5. Menu builders (`contextMenuItems.ts`)

### Helpers (near top, reuse the pattern at `contextMenuItems.ts:111`)
- `listEmptyZones(owner, kinds: ZoneKind[]): string[]` — empty zone ids in slot order (use `ZONE_SLOT_COUNT` from `zoneCatalog.ts` to enumerate, e.g. `player:MZ:0..4`).
- `hasEmptyZone(owner, kinds)` — delegates to `listEmptyZones(...).length > 0`. (For "Move", the card's own occupied zone never counts, so a lone field spell or a fully-packed monster row hides "Move".)
- `placeOrPick(instance, kind, validZoneKinds, place)` — if exactly **one** valid zone is free, run the `place` move directly (no picker); otherwise open the zone picker.
- `toSpellTrap(instance)` — thin wrapper: `placeOrPick('activate', ['ST'], …activateSpellTrap)`. Every "To S/T" action routes through it (monsters/spells/traps auto-place identically when one S/T zone is free).
- `listPlayerFaceUpXyzMonsters(): string[]` — like `listPlayerFaceUpFieldMonsters` (`contextMenuItems.ts:20`) but filtered to XYZ via `useCardCacheStore().byId(inst.cardId)` + `isXyzMonster`.
- `returnToFieldItems(instance, category)` — **non-monster only**; returns the field-spell "Activate" / spell-trap "To S/T" items. Called only by `buildGYItems`.
- `isLinkMonster` in `src/cards/types.ts` — `/Link/i.test(card.type)`, mirrors `isXyzMonster`/`isPendulum`.

### Shared conventions
- **Special Summon split by position**, emitted **DEF before ATK**, built inline per builder. Labels: **"SS DEF"/"SS ATK"** (Banished/GY/Extra/Deck), **"S. Summon DEF"/"S. Summon ATK"** (Hand). XYZ overlay uses **"OL DEF"/"OL ATK"** (Extra).
- **Link guard:** SS DEF / Set / To DEF are hidden for Link monsters (no defense position). The guard is omitted where a Link can't legally be — hand, main deck, or face-up-defense.
- **SS free-zone gate:** `hasEmptyZone(owner, ['MZ'])` everywhere except the **Extra zone**, which uses `['MZ','EMZ']`. Normal Summon and monster Set are always `['MZ']`.
- **Auto-place** (S/T zones only): every S/T-targeting action routes through `placeOrPick`, so it auto-places when exactly one S/T zone is free and opens the picker when 2+ are free. Field-spell Set/Activate (single FIELD_SPELL zone) and Pendulum Activate (scale zones) auto-place the same way. Monster MZ-targeting actions (Set/Normal Summon/SS) are **not** auto-placed.
- **"Banish FD"** (`duel.banishFaceDown`) sends to Banished face-down. Present on field, GY, Extra, Deck-browse, and Hand. **Not** in Banished, and not on XYZ materials (the material short-circuit menu, `contextMenuItems.ts:264`).
- **Move:** valid destinations are any field zone regardless of card type, except non-field-spell cards exclude the FIELD_SPELL zone — Field Spell cards: `['MZ','EMZ','ST','FIELD_SPELL']`; all others: `['MZ','EMZ','ST']`. Gated on `hasEmptyZone(owner, validMove)`.

### Removed items
- **Destroy** (was `contextMenuItems.ts:233`), **Reveal**, **Shuffle into Deck** — removed from all menus. Store functions `reveal`/`shuffleIntoDeck` are left in place, just unsurfaced.

### Label renames (display only — store calls unchanged)
- "Return to Hand" → **To Hand** · "Return to Extra Deck" → **To Extra Deck** · "Send to GY" → **To Graveyard** · "Return to Deck (top)" → **To Top of Deck** · "Return to Deck (bottom)" → **To Bottom of Deck** · "Move Zone" → **Move** · "Add to Hand" → **To Hand**.

### Field menus (`buildFieldItems`, `contextMenuItems.ts:259`)
`buildFieldItems` early-returns a dedicated list for ST/FIELD_SPELL; the MZ/EMZ path follows. ST/Field-Spell cards only ever sit in face-up-attack or face-down-attack, so exactly one of Set/Activate shows.

**ST / Field-Spell zone** (top → bottom):
1. **Move** — free `validMove` zone exists
2. **To Bottom of Deck** — not an extra-deck monster
3. **To Top of Deck** — not an extra-deck monster
4. **To Extra Deck FU** — pendulum monster
5. **Banish FD**
6. **Banish**
7. **To Hand** — not an extra-deck monster
8. **Set** — `position === 'face-up-attack'` (calls `duel.flip`)
9. **To Graveyard**
10. **Activate** — `position === 'face-down-attack'` (calls `duel.flip`)

**MZ / EMZ zone** (top → bottom):
1. **Overlay** — face-up (attack or defense); existing `canOverlay` gate (requires a player-controlled, non-material host with a face-up field target)
2. **Move** — free `validMove` zone exists
3. **To Bottom of Deck** / **To Top of Deck** — not an extra-deck monster
4. **To Extra Deck** — extra-deck monster
5. **To Extra Deck FU** — pendulum monster
6. **Banish FD**
7. **Banish**
8. **To Hand** — not an extra-deck monster
9. **Set** — face-up and not a link monster → `setPosition('face-down-defense')`
10. **To DEF** — `face-up-attack` and not a link monster → `rotate`
11. **To ATK** — `face-up-defense` → `rotate` (no link guard needed — a Link can never be in face-up-defense)
12. **Flip** — `face-down-defense` → `setPosition('face-up-defense')`
13. **Flip Summon** — `face-down-defense` → `setPosition('face-up-attack')`
14. **To Graveyard**

face-down-attack is never reachable for an MZ/EMZ card: "To ATK"/"To DEF" and "Set" are face-up-only, and a face-down MZ/EMZ card is always face-down-defense.

### Non-field menus

**Banished** (`buildBanishedItems`) — all non-monster return-to-field actions are hidden (no "To S/T", no Field-Spell "Activate"); monster SS and Attach still work:
1. **Attach** — monster + face-up XYZ on field
2. **To Bottom of Deck** / 3. **To Top of Deck** — not an extra-deck monster
4. **To Extra Deck FU** — pendulum monster
5. **To Extra Deck** — extra-deck monster
6. **To Hand** — not an extra-deck monster
7. **To Graveyard**
8. **SS DEF** (not link) / 9. **SS ATK** — monster, MZ free

**Graveyard** (`buildGYItems`):
1. **Attach** — monster + face-up XYZ
2. **To S/T** — functional for monsters (`toSpellTrap`, gated on free ST); non-monsters use `returnToFieldItems` (spell/trap → "To S/T"; field-spell → **Activate** then **To S/T**, each gated on its own free destination)
3. **To Bottom of Deck** / 4. **To Top of Deck** — not an extra-deck monster
5. **To Extra Deck FU** — pendulum · 6. **To Extra Deck** — extra-deck monster
7. **Banish FD** · 8. **Banish**
9. **To Hand** — not an extra-deck monster
10. **SS DEF** (not link) / 11. **SS ATK** — monster, MZ free

**Extra Deck** (`buildExtraItems`) — "pendulum non-extra face-up" = `isPendulum && !isExtraDeckMonster && instance.faceUp` (a main-deck Pendulum sitting face-up in the Extra Deck, when deck/hand return is legal):
1. **To S/T** — pendulum monsters only, functional, gated on free ST
2. **To Bottom of Deck** / 3. **To Top of Deck** — pendulum non-extra face-up
4. **Banish FD** · 5. **Banish**
6. **To Hand** — pendulum non-extra face-up
7. **To Graveyard**
8. **SS DEF** (not link) / 9. **SS ATK** — monster, MZ/EMZ free
10. **OL DEF** / 11. **OL ATK** — XYZ monster and a face-up field target exists

**Deck-browse** (`buildDeckBrowseItems`):
1. **To S/T** — functional for monsters; spell/trap → "To S/T"; field-spell → **Activate** then **To S/T**
2. **Banish FD** · 3. **Banish** · 4. **To Graveyard**
5. **To Hand**
6. **SS DEF** / 7. **SS ATK** — monster, MZ free (no link guard)

**Hand** (`buildHandItems`) — single ordered builder:
1. **To S/T** — functional for monsters (`placeOrPick`); **traps** keep their functional move into a free S/T zone (`startPicker('activate', ['ST'])`); spells/field-spells get nothing here
2. **To Bottom of Deck** / 3. **To Top of Deck**
4. **Banish FD** · 5. **Banish** · 6. **To Graveyard**
7. **S. Summon DEF** / 8. **S. Summon ATK** — monster, MZ free
9. **Set** — per category (monster `set_monster` / field-spell set / spell-trap `set_st`), only when a destination zone is free; S/T routes through `placeOrPick`
10. **Normal Summon** — monster, MZ free
11. **Activate** — spells, field spells, and Pendulum monsters (scale activation); **not traps**; spell routes through `placeOrPick`

## 6. Menu panel sizing

**Width matching (`ContextMenu.vue`)** — the `ContextMenuAnchor` (`uiStore.ts`) already carries the card's `width`/`height` from `getBoundingClientRect()` (`useContextMenu.ts`). The wrapper's computed `style` adds `width: ${a.width}px`; it stays centered via the existing `transform: translate(-50%, -100%)`. `.ctx-menu__panel` uses `width: 100%` + `box-sizing: border-box` (was `min-width: 140px`), so the panel spans the card edge-to-edge.

**Label wrapping (`ContextMenuItem.vue`)** — `.ctx-item` uses `white-space: normal` + `overflow-wrap: break-word` (was `nowrap`), so multi-word labels (e.g. "To Bottom of Deck") wrap and any single long token breaks rather than overflows.

---

## Verification

Run the app (`npm run dev`) and exercise each menu by right-clicking / hovering cards. `npm run build` / typecheck must pass (new `ZonePickerKind`, store signatures).

1. **Banish FD** appears on field, GY, Extra, Deck-browse, and Hand; absent in Banished and on overlay materials. It sends the card to Banished face-down.
2. **Destroy / Reveal / Shuffle into Deck** are gone everywhere; "To Graveyard" still works.
3. **SS DEF / SS ATK** (DEF listed first) place the monster in defense vs attack. From Hand/GY/Banished/Deck the picker highlights **only MZ**; from the Extra zone it highlights **MZ and EMZ**. **SS DEF** is hidden for Link monsters where they can occur.
4. Fill all 5 MZ: Normal Summon/Set and SS disappear from a hand/GY/banished monster (a free EMZ does not re-enable them). For an Extra-deck monster, SS stays while any EMZ is free, gone only when MZ **and** EMZ are full. Fill all ST: S/T actions disappear. Fill the field-spell zone: field-spell Activate disappears but "To S/T" remains while an S/T zone is open.
5. **Auto-place:** with exactly one free S/T zone, every "To S/T" / spell Activate / spell-trap Set places directly with no picker; with 2+ free it opens the picker.
6. **ST/Field-Spell card:** no "Rotate"; exactly one of "Set" (face-up) / "Activate" (face-down) shows; toggling never yields a defense position.
7. **MZ/EMZ card:** "To DEF"/"To ATK" show only for face-up cards and toggle position; "Set" (face-up) → face-down-defense; "Flip" (face-down-defense) → face-up-defense; "Flip Summon" shows only on face-down-defense → face-up-attack. Link monsters lack "Set" and "To DEF". face-down-attack is never reachable.
8. **Attach:** with one XYZ on field, "Attach" on a GY/Banished monster attaches it directly (face-up) as material; with 2+ XYZ, the menu highlights the XYZ hosts and clicking one attaches it.
9. **Move:** shown only when a free target zone of the valid kind exists (the card's own zone never counts). A non-field-spell card cannot target the field-spell zone. Crossing MZ/EMZ ↔ ST/FIELD_SPELL normalizes position (defense→attack going to S/T; set card → face-down-defense going to a monster zone).
10. **Panel:** the menu matches the hovered card's width and long labels wrap.

---

## Change log

The spec above reflects the final state. It was reached over these passes:

1. **Initial plan** — per-zone availability gating, Special Summon split by position, "Banish FD", "Attach" for GY/Banished monsters, removed "Destroy".
2. **Refinements** — MZ/EMZ position controls (position-gated, no face-down-attack); "Move" rename + gate; S/T return actions; removed "Reveal"/"Shuffle into Deck"; label renames.
3. **Field-menu reordering** — fixed item order in both field-zone menus; split the flip/rotate toggles into separate position-gated items.
4. **Non-field menu reordering** — user-specified order; DEF-before-ATK; `isLinkMonster` guards; "To S/T" introduced (initially a placeholder).
5. **"To S/T" implementation + single-zone auto-place** — wired up the placeholders via `placeOrPick`/`toSpellTrap`; added Field-Spell "To S/T" in GY/Deck.
6. **Relaxed "Move" + position normalization** — any field zone (FIELD_SPELL excluded for non-field-spell cards); `moveZone` normalizes position across zone-kind transitions.
7. **Panel sizing** — menu width matches the hovered card; label wrapping.
