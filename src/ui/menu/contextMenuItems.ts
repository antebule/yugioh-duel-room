import type { CardInstance, FieldPosition, Owner, ZoneId, ZoneKind } from '@/duel/types'
import type { CardData, CardCategory } from '@/cards/types'
import { classifyCard, isExtraDeckMonster, isXyzMonster, isPendulum, isLinkMonster } from '@/cards/types'
import { ZONE_SLOT_COUNT } from '@/duel/zoneCatalog'
import { useDuelStore } from '@/state/duelStore'
import { useCardCacheStore } from '@/state/cardCacheStore'
import { useUiStore } from '@/state/uiStore'
import type { ZonePickerKind } from '@/state/uiStore'

export interface MenuItem {
  label: string
  run: () => void
  disabled?: boolean
  tooltip?: string
}

function zoneKindOf(instance: CardInstance): ZoneKind {
  const parts = instance.zoneId.split(':')
  return parts[1] as ZoneKind
}

function listPlayerFaceUpFieldMonsters(excludeUuid?: string): string[] {
  const duel = useDuelStore()
  const uuids: string[] = []
  for (const inst of Object.values(duel.state.instances)) {
    if (!inst) continue
    if (excludeUuid && inst.uuid === excludeUuid) continue
    if (inst.controller !== 'player') continue
    if (!inst.faceUp) continue
    if (inst.overlayHostUuid) continue
    const kind = inst.zoneId.split(':')[1]
    if (kind === 'MZ' || kind === 'EMZ') uuids.push(inst.uuid)
  }
  return uuids
}

function playerHasFaceUpFieldMonster(excludeUuid?: string): boolean {
  return listPlayerFaceUpFieldMonsters(excludeUuid).length > 0
}

function listPlayerFaceUpXyzMonsters(): string[] {
  const duel = useDuelStore()
  const cache = useCardCacheStore()
  const uuids: string[] = []
  for (const inst of Object.values(duel.state.instances)) {
    if (!inst) continue
    if (inst.controller !== 'player') continue
    if (!inst.faceUp) continue
    if (inst.overlayHostUuid) continue
    const kind = inst.zoneId.split(':')[1]
    if (kind !== 'MZ' && kind !== 'EMZ') continue
    const card = cache.byId(inst.cardId)
    if (card && isXyzMonster(card)) uuids.push(inst.uuid)
  }
  return uuids
}

// The player's empty zone ids across the given kinds, in slot order.
function listEmptyZones(owner: Owner, kinds: ZoneKind[]): ZoneId[] {
  const duel = useDuelStore()
  const ids: ZoneId[] = []
  for (const kind of kinds) {
    for (let i = 0; i < ZONE_SLOT_COUNT[kind]; i++) {
      const id = `${owner}:${kind}:${i}` as ZoneId
      if ((duel.state.zones[id]?.cards.length ?? 0) === 0) ids.push(id)
    }
  }
  return ids
}

// True if the player owns at least one empty zone of any of the given kinds.
function hasEmptyZone(owner: Owner, kinds: ZoneKind[]): boolean {
  return listEmptyZones(owner, kinds).length > 0
}

// Run a single-zone action: auto-place when exactly one valid zone is free,
// otherwise open the zone picker. `place` performs the direct store move.
function placeOrPick(
  instance: CardInstance,
  kind: ZonePickerKind,
  validZoneKinds: ZoneKind[],
  place: (zoneId: ZoneId) => void,
): void {
  const empty = listEmptyZones(instance.owner, validZoneKinds)
  if (empty.length === 1) {
    const ui = useUiStore()
    ui.closeContextMenu()
    ui.closeZoneBrowser()
    place(empty[0]!)
    return
  }
  startPicker(instance, kind, validZoneKinds)
}

// "To S/T" — place a card face-up (attack) into a free S/T zone.
function toSpellTrap(instance: CardInstance): void {
  const duel = useDuelStore()
  placeOrPick(instance, 'activate', ['ST'], (zoneId) =>
    duel.activateSpellTrap(instance.uuid, zoneId),
  )
}

function startPicker(
  instance: CardInstance,
  kind: ZonePickerKind,
  validZoneKinds: ZoneKind[],
  position?: FieldPosition,
): void {
  const ui = useUiStore()
  ui.closeContextMenu()
  ui.closeZoneBrowser()
  ui.startZonePicker({
    instanceUuid: instance.uuid,
    kind,
    validZoneKinds,
    position,
  })
}

// "Attach" — present only when the player has a face-up XYZ on the field that
// this monster can be attached to as material. Returns null otherwise.
function attachItemIfXyz(instance: CardInstance): MenuItem | null {
  const targets = listPlayerFaceUpXyzMonsters()
  if (targets.length === 0) return null
  const duel = useDuelStore()
  return {
    label: 'Attach',
    run: () => {
      const ui = useUiStore()
      ui.closeContextMenu()
      ui.closeZoneBrowser()
      if (targets.length === 1) {
        duel.attachMaterialFromZone(targets[0]!, instance.uuid)
        return
      }
      ui.startZonePicker({
        instanceUuid: instance.uuid,
        kind: 'attach_target',
        validZoneKinds: ['MZ', 'EMZ'],
      })
    },
  }
}

// Non-monster "return to field" items for the GY menu: field spells get
// "Activate" (to the field-spell zone) and "To S/T" (to a regular S/T zone);
// spells/traps get "To S/T". Each is shown only when its destination is free.
// (Monster special-summons are handled inline by the menu builders.)
function returnToFieldItems(
  instance: CardInstance,
  category: CardCategory,
): MenuItem[] {
  const owner = instance.owner
  if (category === 'field-spell') {
    const items: MenuItem[] = []
    if (hasEmptyZone(owner, ['FIELD_SPELL'])) {
      items.push({ label: 'Activate', run: () => startActivateFromZone(instance, category) })
    }
    if (hasEmptyZone(owner, ['ST'])) {
      items.push({ label: 'To S/T', run: () => toSpellTrap(instance) })
    }
    return items
  }
  // Spell / Trap
  if (!hasEmptyZone(owner, ['ST'])) return []
  return [{ label: 'To S/T', run: () => startActivateFromZone(instance, category) }]
}

// Activate a spell/trap (or field spell) when returning it to the field from
// the GY. Monster special-summons are handled inline by the menu builders.
function startActivateFromZone(instance: CardInstance, category: CardCategory): void {
  if (category === 'field-spell') {
    const ui = useUiStore()
    ui.closeContextMenu()
    ui.closeZoneBrowser()
    useDuelStore().activateSpellTrap(
      instance.uuid,
      `${instance.owner}:FIELD_SPELL:0`,
    )
  } else {
    toSpellTrap(instance)
  }
}

function buildHandItems(
  instance: CardInstance,
  category: CardCategory,
  cardData: CardData | undefined,
): MenuItem[] {
  const duel = useDuelStore()
  const ui = useUiStore()
  const owner = instance.owner
  const isMonster = category === 'monster'
  const isPend = cardData ? isPendulum(cardData) : false
  const mzFree = isMonster && hasEmptyZone(owner, ['MZ'])
  const items: MenuItem[] = []

  // "To S/T" — place into a free S/T zone (face-up attack, like activate). For
  // monsters and traps alike; spells/field-spells use Activate/Set instead.
  if (isMonster) {
    if (hasEmptyZone(owner, ['ST'])) {
      items.push({ label: 'To S/T', run: () => toSpellTrap(instance) })
    }
  } else if (category === 'trap' && hasEmptyZone(owner, ['ST'])) {
    items.push({ label: 'To S/T', run: () => toSpellTrap(instance) })
  }
  items.push(
    { label: 'To Bottom of Deck', run: () => duel.returnToDeckBottom(instance.uuid) },
    { label: 'To Top of Deck', run: () => duel.returnToDeckTop(instance.uuid) },
    { label: 'Banish FD', run: () => duel.banishFaceDown(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
    { label: 'To Graveyard', run: () => duel.sendToGY(instance.uuid) },
  )

  if (mzFree) {
    items.push(
      {
        label: 'S. Summon DEF',
        run: () => startPicker(instance, 'special_summon', ['MZ'], 'face-up-defense'),
      },
      {
        label: 'S. Summon ATK',
        run: () => startPicker(instance, 'special_summon', ['MZ'], 'face-up-attack'),
      },
    )
  }

  // "Set" — per category, only when a destination zone is free.
  if (isMonster) {
    if (mzFree) {
      items.push({ label: 'Set', run: () => startPicker(instance, 'set_monster', ['MZ']) })
    }
  } else if (category === 'field-spell') {
    if (hasEmptyZone(owner, ['FIELD_SPELL'])) {
      items.push({
        label: 'Set',
        run: () => {
          ui.closeContextMenu()
          duel.setSpellTrap(instance.uuid, `${owner}:FIELD_SPELL:0`)
        },
      })
    }
  } else if (hasEmptyZone(owner, ['ST'])) {
    items.push({
      label: 'Set',
      run: () =>
        placeOrPick(instance, 'set_st', ['ST'], (zoneId) =>
          duel.setSpellTrap(instance.uuid, zoneId),
        ),
    })
  }

  if (mzFree) {
    items.push({
      label: 'Normal Summon',
      run: () => startPicker(instance, 'normal_summon', ['MZ']),
    })
  }

  // "Activate" — spells/field-spells, plus Pendulum monsters (scale activation).
  // Traps can't activate from hand, so they're excluded.
  if (isMonster) {
    if (isPend) {
      const empty = [`${owner}:ST:0`, `${owner}:ST:4`].filter(
        (id) => (duel.state.zones[id as ZoneId]?.cards.length ?? 0) === 0,
      ) as ZoneId[]
      if (empty.length > 0) {
        items.push({
          label: 'Activate',
          run: () => {
            ui.closeContextMenu()
            ui.closeZoneBrowser()
            if (empty.length === 1) {
              duel.activateSpellTrap(instance.uuid, empty[0]!)
              return
            }
            ui.startZonePicker({
              instanceUuid: instance.uuid,
              kind: 'activate',
              validZoneKinds: ['ST'],
              validZoneIds: empty,
            })
          },
        })
      }
    }
  } else if (category === 'field-spell') {
    if (hasEmptyZone(owner, ['FIELD_SPELL'])) {
      items.push({
        label: 'Activate',
        run: () => {
          ui.closeContextMenu()
          duel.activateSpellTrap(instance.uuid, `${owner}:FIELD_SPELL:0`)
        },
      })
    }
  } else if (category === 'spell') {
    if (hasEmptyZone(owner, ['ST'])) {
      items.push({
        label: 'Activate',
        run: () =>
          placeOrPick(instance, 'activate', ['ST'], (zoneId) =>
            duel.activateSpellTrap(instance.uuid, zoneId),
          ),
      })
    }
  }

  return items
}

function buildFieldItems(
  instance: CardInstance,
  category: CardCategory,
  cardData: CardData | undefined,
): MenuItem[] {
  const duel = useDuelStore()
  const validMove: ZoneKind[] =
    category === 'field-spell'
      ? ['MZ', 'EMZ', 'ST', 'FIELD_SPELL']
      : ['MZ', 'EMZ', 'ST']
  const extraDeck = cardData ? isExtraDeckMonster(cardData) : false
  const isPend = cardData ? isPendulum(cardData) : false
  const kind = zoneKindOf(instance)

  // ST / FIELD_SPELL zones use a dedicated ordering (no defense position; the
  // Set/Activate flip is split into two position-gated items).
  if (kind === 'ST' || kind === 'FIELD_SPELL') {
    const items: MenuItem[] = []
    if (hasEmptyZone(instance.owner, validMove)) {
      items.push({ label: 'Move', run: () => startPicker(instance, 'move_zone', validMove) })
    }
    if (!extraDeck) {
      items.push(
        { label: 'To Bottom of Deck', run: () => duel.returnToDeckBottom(instance.uuid) },
        { label: 'To Top of Deck', run: () => duel.returnToDeckTop(instance.uuid) },
      )
    }
    if (isPend) {
      items.push({
        label: 'To Extra Deck FU',
        run: () => duel.pendulumToExtraDeck(instance.uuid),
      })
    }
    items.push(
      { label: 'Banish FD', run: () => duel.banishFaceDown(instance.uuid) },
      { label: 'Banish', run: () => duel.banish(instance.uuid) },
    )
    if (!extraDeck) {
      items.push({ label: 'To Hand', run: () => duel.returnToHand(instance.uuid) })
    }
    if (instance.position === 'face-up-attack') {
      items.push({ label: 'Set', run: () => duel.flip(instance.uuid) })
    }
    items.push({ label: 'To Graveyard', run: () => duel.sendToGY(instance.uuid) })
    if (instance.position === 'face-down-attack') {
      items.push({ label: 'Activate', run: () => duel.flip(instance.uuid) })
    }
    return items
  }

  // The right-clicked card acts as the host; it just needs to be a face-up,
  // player-controlled MZ/EMZ card that is not itself a material. Spell/Traps
  // moved into MZ/EMZ qualify on the same terms as monsters. Hosts (already
  // carrying materials) can still gain more.
  const canOverlay =
    instance.controller === 'player' &&
    instance.faceUp &&
    !instance.overlayHostUuid &&
    (kind === 'MZ' || kind === 'EMZ') &&
    playerHasFaceUpFieldMonster(instance.uuid)

  const isLink = cardData ? isLinkMonster(cardData) : false
  const items: MenuItem[] = []
  if (canOverlay) {
    items.push({
      label: 'Overlay',
      run: () => {
        const targets = listPlayerFaceUpFieldMonsters(instance.uuid)
        if (targets.length === 1) {
          const ui = useUiStore()
          ui.closeContextMenu()
          ui.closeZoneBrowser()
          duel.attachAsMaterial(instance.uuid, targets[0]!)
          return
        }
        startPicker(instance, 'overlay_target', ['MZ', 'EMZ'])
      },
    })
  }
  if (hasEmptyZone(instance.owner, validMove)) {
    items.push({
      label: 'Move',
      run: () => startPicker(instance, 'move_zone', validMove),
    })
  }
  if (extraDeck) {
    items.push({
      label: 'To Extra Deck',
      run: () => duel.returnToExtraDeck(instance.uuid),
    })
  } else {
    items.push(
      { label: 'To Bottom of Deck', run: () => duel.returnToDeckBottom(instance.uuid) },
      { label: 'To Top of Deck', run: () => duel.returnToDeckTop(instance.uuid) },
    )
  }
  if (isPend) {
    items.push({
      label: 'To Extra Deck FU',
      run: () => duel.pendulumToExtraDeck(instance.uuid),
    })
  }
  items.push(
    { label: 'Banish FD', run: () => duel.banishFaceDown(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
  )
  if (!extraDeck) {
    items.push({ label: 'To Hand', run: () => duel.returnToHand(instance.uuid) })
  }
  // Face-up → "Set" (flip to face-down-defense). Link monsters can't go to
  // defense, so they're excluded.
  if (instance.faceUp && !isLink) {
    items.push({
      label: 'Set',
      run: () => duel.setPosition(instance.uuid, 'face-down-defense'),
    })
  }
  // ATK/DEF rotation, split by current position. "To DEF" excludes links.
  if (instance.position === 'face-up-attack' && !isLink) {
    items.push({ label: 'To DEF', run: () => duel.rotate(instance.uuid) })
  }
  if (instance.position === 'face-up-defense') {
    items.push({ label: 'To ATK', run: () => duel.rotate(instance.uuid) })
  }
  if (instance.position === 'face-down-defense') {
    items.push(
      { label: 'Flip', run: () => duel.setPosition(instance.uuid, 'face-up-defense') },
      { label: 'Flip Summon', run: () => duel.setPosition(instance.uuid, 'face-up-attack') },
    )
  }
  items.push({ label: 'To Graveyard', run: () => duel.sendToGY(instance.uuid) })
  return items
}

export function buildMenuItems(
  instance: CardInstance,
  cardData: CardData | undefined,
): MenuItem[] {
  // XYZ material: short-circuit to a 2-item menu regardless of zoneId.
  if (instance.overlayHostUuid) {
    const duel = useDuelStore()
    return [
      { label: 'Banish', run: () => duel.banishMaterial(instance.uuid) },
      { label: 'Detach', run: () => duel.detachMaterial(instance.uuid) },
    ]
  }

  const kind = zoneKindOf(instance)
  const category: CardCategory = cardData ? classifyCard(cardData) : 'monster'

  if (kind === 'HAND') return buildHandItems(instance, category, cardData)
  if (kind === 'MZ' || kind === 'EMZ' || kind === 'ST' || kind === 'FIELD_SPELL') {
    return buildFieldItems(instance, category, cardData)
  }

  if (kind === 'GY') return buildGYItems(instance, category, cardData)
  if (kind === 'BANISHED') return buildBanishedItems(instance, category, cardData)
  if (kind === 'EXTRA') return buildExtraItems(instance, category, cardData)
  if (kind === 'DECK') return buildDeckItems(instance, category)

  return []
}

function buildGYItems(
  instance: CardInstance,
  category: CardCategory,
  cardData: CardData | undefined,
): MenuItem[] {
  const duel = useDuelStore()
  const extraDeck = cardData ? isExtraDeckMonster(cardData) : false
  const isMonster = category === 'monster'
  const items: MenuItem[] = []

  const attach = isMonster ? attachItemIfXyz(instance) : null
  if (attach) items.push(attach)

  // "To S/T" — place into a free S/T zone (face-up attack, like activate); for
  // non-monsters the functional return ("To S/T" for spell/trap, "Activate" for
  // field spells) is preserved via returnToFieldItems.
  if (isMonster) {
    if (hasEmptyZone(instance.owner, ['ST'])) {
      items.push({ label: 'To S/T', run: () => toSpellTrap(instance) })
    }
  } else {
    items.push(...returnToFieldItems(instance, category))
  }

  if (!extraDeck) {
    items.push(
      { label: 'To Bottom of Deck', run: () => duel.returnToDeckBottom(instance.uuid) },
      { label: 'To Top of Deck', run: () => duel.returnToDeckTop(instance.uuid) },
    )
  }
  if (cardData && isPendulum(cardData)) {
    items.push({
      label: 'To Extra Deck FU',
      run: () => duel.pendulumToExtraDeck(instance.uuid),
    })
  }
  if (extraDeck) {
    items.push({
      label: 'To Extra Deck',
      run: () => duel.returnToExtraDeck(instance.uuid),
    })
  }
  items.push(
    { label: 'Banish FD', run: () => duel.banishFaceDown(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
  )
  if (!extraDeck) {
    items.push({ label: 'To Hand', run: () => duel.returnToHand(instance.uuid) })
  }

  if (isMonster && hasEmptyZone(instance.owner, ['MZ'])) {
    const isLink = cardData ? isLinkMonster(cardData) : false
    if (!isLink) {
      items.push({
        label: 'SS DEF',
        run: () => startPicker(instance, 'special_summon', ['MZ'], 'face-up-defense'),
      })
    }
    items.push({
      label: 'SS ATK',
      run: () => startPicker(instance, 'special_summon', ['MZ'], 'face-up-attack'),
    })
  }
  return items
}

function buildBanishedItems(
  instance: CardInstance,
  category: CardCategory,
  cardData: CardData | undefined,
): MenuItem[] {
  const duel = useDuelStore()
  const extraDeck = cardData ? isExtraDeckMonster(cardData) : false
  const isMonster = category === 'monster'
  const items: MenuItem[] = []

  const attach = isMonster ? attachItemIfXyz(instance) : null
  if (attach) items.push(attach)

  if (!extraDeck) {
    items.push(
      { label: 'To Bottom of Deck', run: () => duel.returnToDeckBottom(instance.uuid) },
      { label: 'To Top of Deck', run: () => duel.returnToDeckTop(instance.uuid) },
    )
  }
  if (cardData && isPendulum(cardData)) {
    items.push({
      label: 'To Extra Deck FU',
      run: () => duel.pendulumToExtraDeck(instance.uuid),
    })
  }
  if (extraDeck) {
    items.push({
      label: 'To Extra Deck',
      run: () => duel.returnToExtraDeck(instance.uuid),
    })
  }
  if (!extraDeck) {
    items.push({ label: 'To Hand', run: () => duel.returnToHand(instance.uuid) })
  }
  items.push({ label: 'To Graveyard', run: () => duel.sendToGY(instance.uuid) })

  if (isMonster && hasEmptyZone(instance.owner, ['MZ'])) {
    const isLink = cardData ? isLinkMonster(cardData) : false
    if (!isLink) {
      items.push({
        label: 'SS DEF',
        run: () => startPicker(instance, 'special_summon', ['MZ'], 'face-up-defense'),
      })
    }
    items.push({
      label: 'SS ATK',
      run: () => startPicker(instance, 'special_summon', ['MZ'], 'face-up-attack'),
    })
  }
  return items
}

function buildExtraItems(
  instance: CardInstance,
  category: CardCategory,
  cardData: CardData | undefined,
): MenuItem[] {
  const duel = useDuelStore()
  const ui = useUiStore()
  const extraDeck = cardData ? isExtraDeckMonster(cardData) : false
  const isMonster = category === 'monster'
  const isPend = cardData ? isPendulum(cardData) : false
  const xyz = cardData ? isXyzMonster(cardData) : false
  const hasFaceUpTarget = playerHasFaceUpFieldMonster()
  // Pendulum monsters that are main-deck cards sit face-up in the Extra Deck and
  // can be returned to the main deck / hand from here.
  const pendNonExtraFaceUp = isPend && !extraDeck && instance.faceUp

  const items: MenuItem[] = []

  // "To S/T" — place a pendulum monster into a free S/T zone (face-up attack).
  if (isPend && hasEmptyZone(instance.owner, ['ST'])) {
    items.push({ label: 'To S/T', run: () => toSpellTrap(instance) })
  }
  if (pendNonExtraFaceUp) {
    items.push(
      { label: 'To Bottom of Deck', run: () => duel.returnToDeckBottom(instance.uuid) },
      { label: 'To Top of Deck', run: () => duel.returnToDeckTop(instance.uuid) },
    )
  }
  items.push(
    { label: 'Banish FD', run: () => duel.banishFaceDown(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
  )
  if (pendNonExtraFaceUp) {
    items.push({ label: 'To Hand', run: () => duel.returnToHand(instance.uuid) })
  }
  items.push({ label: 'To Graveyard', run: () => duel.sendToGY(instance.uuid) })

  if (isMonster && hasEmptyZone(instance.owner, ['MZ', 'EMZ'])) {
    const isLink = cardData ? isLinkMonster(cardData) : false
    if (!isLink) {
      items.push({
        label: 'SS DEF',
        run: () => startPicker(instance, 'special_summon', ['MZ', 'EMZ'], 'face-up-defense'),
      })
    }
    items.push({
      label: 'SS ATK',
      run: () => startPicker(instance, 'special_summon', ['MZ', 'EMZ'], 'face-up-attack'),
    })
  }

  if (xyz && hasFaceUpTarget) {
    const startXyzSummon = (position: 'face-up-attack' | 'face-up-defense') => {
      ui.closeContextMenu()
      ui.closeZoneBrowser()
      const targets = listPlayerFaceUpFieldMonsters()
      if (targets.length === 1) {
        duel.xyzSummonOnto(instance.uuid, targets[0]!, position)
        return
      }
      ui.startZonePicker({
        instanceUuid: instance.uuid,
        kind: 'xyz_summon',
        validZoneKinds: ['MZ', 'EMZ'],
        position,
      })
    }
    items.push(
      { label: 'OL DEF', run: () => startXyzSummon('face-up-defense') },
      { label: 'OL ATK', run: () => startXyzSummon('face-up-attack') },
    )
  }
  return items
}

function buildDeckTopItems(instance: CardInstance): MenuItem[] {
  const duel = useDuelStore()
  const ui = useUiStore()
  const owner = instance.owner
  return [
    { label: 'View', run: () => ui.openZoneBrowser(instance.zoneId) },
    { label: 'Banish Face Down', run: () => duel.banishTopFaceDown(owner) },
    { label: 'Banish top', run: () => duel.banishTop(owner) },
    { label: 'Mill', run: () => duel.millTop(owner) },
    { label: 'Shuffle', run: () => duel.shuffleDeck(owner) },
    { label: 'Draw', run: () => duel.drawCard(owner) },
  ]
}

// Per-card menu shown for individual deck cards inside the ZoneBrowserModal.
function buildDeckBrowseItems(instance: CardInstance, category: CardCategory): MenuItem[] {
  const duel = useDuelStore()
  const owner = instance.owner
  const isMonster = category === 'monster'
  const items: MenuItem[] = []

  // "To S/T" — place into a free S/T zone (face-up attack, like activate); for
  // non-monsters the existing return ("To S/T" for spell/trap, "Activate" for
  // field spells) is preserved.
  if (isMonster) {
    if (hasEmptyZone(owner, ['ST'])) {
      items.push({ label: 'To S/T', run: () => toSpellTrap(instance) })
    }
  } else if (category === 'field-spell') {
    if (hasEmptyZone(owner, ['FIELD_SPELL'])) {
      const ui = useUiStore()
      items.push({
        label: 'Activate',
        run: () => {
          ui.closeContextMenu()
          ui.closeZoneBrowser()
          duel.activateSpellTrap(instance.uuid, `${instance.owner}:FIELD_SPELL:0`)
        },
      })
    }
    if (hasEmptyZone(owner, ['ST'])) {
      items.push({ label: 'To S/T', run: () => toSpellTrap(instance) })
    }
  } else {
    if (hasEmptyZone(owner, ['ST'])) {
      items.push({ label: 'To S/T', run: () => toSpellTrap(instance) })
    }
  }

  items.push(
    { label: 'Banish FD', run: () => duel.banishFaceDown(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
    { label: 'To Graveyard', run: () => duel.sendToGY(instance.uuid) },
    { label: 'To Hand', run: () => duel.returnToHand(instance.uuid) },
  )

  if (isMonster && hasEmptyZone(owner, ['MZ'])) {
    items.push(
      {
        label: 'SS DEF',
        run: () => startPicker(instance, 'special_summon', ['MZ'], 'face-up-defense'),
      },
      {
        label: 'SS ATK',
        run: () => startPicker(instance, 'special_summon', ['MZ'], 'face-up-attack'),
      },
    )
  }
  return items
}

function buildDeckItems(instance: CardInstance, category: CardCategory): MenuItem[] {
  const ui = useUiStore()
  if (ui.zoneBrowserZoneId === instance.zoneId) {
    return buildDeckBrowseItems(instance, category)
  }
  return buildDeckTopItems(instance)
}
