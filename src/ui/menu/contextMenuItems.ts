import type { CardInstance, ZoneKind } from '@/duel/types'
import type { CardData, CardCategory } from '@/cards/types'
import { classifyCard, isExtraDeckMonster } from '@/cards/types'
import { useDuelStore } from '@/state/duelStore'
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

function startPicker(
  instance: CardInstance,
  kind: ZonePickerKind,
  validZoneKinds: ZoneKind[],
): void {
  const ui = useUiStore()
  ui.closeContextMenu()
  ui.closeZoneBrowser()
  ui.startZonePicker({
    instanceUuid: instance.uuid,
    kind,
    validZoneKinds,
  })
}

function startReturnToField(instance: CardInstance, category: CardCategory): void {
  if (category === 'monster') {
    startPicker(instance, 'special_summon', ['MZ', 'EMZ'])
  } else if (category === 'field-spell') {
    const ui = useUiStore()
    ui.closeContextMenu()
    ui.closeZoneBrowser()
    useDuelStore().activateSpellTrap(
      instance.uuid,
      `${instance.owner}:FIELD_SPELL:0`,
    )
  } else {
    startPicker(instance, 'activate', ['ST'])
  }
}

function buildHandItems(
  instance: CardInstance,
  category: CardCategory,
  cardData: CardData | undefined,
): MenuItem[] {
  const duel = useDuelStore()
  const extraDeck = cardData ? isExtraDeckMonster(cardData) : false

  if (category === 'monster') {
    const items: MenuItem[] = [
      {
        label: 'Normal Summon',
        run: () => startPicker(instance, 'normal_summon', ['MZ']),
      },
      {
        label: 'Special Summon',
        run: () => startPicker(instance, 'special_summon', ['MZ', 'EMZ']),
      },
      {
        label: 'Set',
        run: () => startPicker(instance, 'set_monster', ['MZ']),
      },
      { label: 'Reveal', run: () => duel.reveal(instance.uuid) },
      { label: 'Send to GY', run: () => duel.sendToGY(instance.uuid) },
      { label: 'Banish', run: () => duel.banish(instance.uuid) },
    ]
    if (extraDeck) {
      items.push({
        label: 'Return to Extra Deck',
        run: () => duel.returnToExtraDeck(instance.uuid),
      })
    } else {
      items.push(
        { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
        { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
        { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
      )
    }
    return items
  }

  if (category === 'field-spell') {
    const ui = useUiStore()
    const fieldZone = `${instance.owner}:FIELD_SPELL:0` as const
    return [
      {
        label: 'Activate',
        run: () => {
          ui.closeContextMenu()
          duel.activateSpellTrap(instance.uuid, fieldZone)
        },
      },
      {
        label: 'Set',
        run: () => {
          ui.closeContextMenu()
          duel.setSpellTrap(instance.uuid, fieldZone)
        },
      },
      { label: 'Reveal', run: () => duel.reveal(instance.uuid) },
      { label: 'Send to GY', run: () => duel.sendToGY(instance.uuid) },
      { label: 'Banish', run: () => duel.banish(instance.uuid) },
      { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
      { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
      { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
    ]
  }

  // Spell / Trap
  return [
    {
      label: 'Activate',
      run: () => startPicker(instance, 'activate', ['ST']),
    },
    {
      label: 'Set',
      run: () => startPicker(instance, 'set_st', ['ST']),
    },
    { label: 'Reveal', run: () => duel.reveal(instance.uuid) },
    { label: 'Send to GY', run: () => duel.sendToGY(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
    { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
    { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
    { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
  ]
}

function buildFieldItems(
  instance: CardInstance,
  category: CardCategory,
  cardData: CardData | undefined,
): MenuItem[] {
  const duel = useDuelStore()
  const validMove: ZoneKind[] =
    category === 'monster'
      ? ['MZ', 'EMZ']
      : category === 'field-spell'
        ? ['FIELD_SPELL']
        : ['ST']
  const extraDeck = cardData ? isExtraDeckMonster(cardData) : false

  const items: MenuItem[] = [
    { label: 'Rotate (ATK/DEF)', run: () => duel.rotate(instance.uuid) },
    { label: 'Flip', run: () => duel.flip(instance.uuid) },
    {
      label: 'Move Zone',
      run: () => startPicker(instance, 'move_zone', validMove),
    },
    { label: 'Destroy', run: () => duel.destroy(instance.uuid) },
    { label: 'Send to GY', run: () => duel.sendToGY(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
  ]
  if (extraDeck) {
    items.push({
      label: 'Return to Extra Deck',
      run: () => duel.returnToExtraDeck(instance.uuid),
    })
  } else {
    items.push(
      { label: 'Return to Hand', run: () => duel.returnToHand(instance.uuid) },
      { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
      { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
      { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
    )
  }
  return items
}

export function buildMenuItems(
  instance: CardInstance,
  cardData: CardData | undefined,
): MenuItem[] {
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
  const items: MenuItem[] = [
    { label: 'Reveal', run: () => duel.reveal(instance.uuid) },
    {
      label: category === 'monster' ? 'Special Summon' : 'Activate',
      run: () => startReturnToField(instance, category),
    },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
  ]
  if (extraDeck) {
    items.push({
      label: 'Return to Extra Deck',
      run: () => duel.returnToExtraDeck(instance.uuid),
    })
  } else {
    items.push(
      { label: 'Return to Hand', run: () => duel.returnToHand(instance.uuid) },
      { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
      { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
      { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
    )
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
  const items: MenuItem[] = [
    { label: 'Reveal', run: () => duel.reveal(instance.uuid) },
    {
      label: category === 'monster' ? 'Special Summon' : 'Activate',
      run: () => startReturnToField(instance, category),
    },
    { label: 'Send to GY', run: () => duel.sendToGY(instance.uuid) },
  ]
  if (extraDeck) {
    items.push({
      label: 'Return to Extra Deck',
      run: () => duel.returnToExtraDeck(instance.uuid),
    })
  } else {
    items.push(
      { label: 'Return to Hand', run: () => duel.returnToHand(instance.uuid) },
      { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
      { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
      { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
    )
  }
  return items
}

function buildExtraItems(
  instance: CardInstance,
  category: CardCategory,
  cardData: CardData | undefined,
): MenuItem[] {
  const duel = useDuelStore()
  const extraDeck = cardData ? isExtraDeckMonster(cardData) : false
  const items: MenuItem[] = [{ label: 'Reveal', run: () => duel.reveal(instance.uuid) }]
  if (category === 'monster') {
    items.push({
      label: 'Special Summon',
      run: () => startPicker(instance, 'special_summon', ['MZ', 'EMZ']),
    })
  }
  items.push(
    { label: 'Send to GY', run: () => duel.sendToGY(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
  )
  if (!extraDeck) {
    items.push({ label: 'Return to Hand', run: () => duel.returnToHand(instance.uuid) })
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
  const items: MenuItem[] = [{ label: 'Reveal', run: () => duel.reveal(instance.uuid) }]
  if (category === 'monster') {
    items.push({
      label: 'Special Summon',
      run: () => startPicker(instance, 'special_summon', ['MZ', 'EMZ']),
    })
  } else if (category === 'field-spell') {
    const ui = useUiStore()
    items.push({
      label: 'Activate',
      run: () => {
        ui.closeContextMenu()
        ui.closeZoneBrowser()
        duel.activateSpellTrap(instance.uuid, `${instance.owner}:FIELD_SPELL:0`)
      },
    })
  } else {
    items.push(
      { label: 'Activate', run: () => startPicker(instance, 'activate', ['ST']) },
      { label: 'Set', run: () => startPicker(instance, 'set_st', ['ST']) },
    )
  }
  items.push(
    { label: 'Add to Hand', run: () => duel.returnToHand(instance.uuid) },
    { label: 'Send to GY', run: () => duel.sendToGY(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
  )
  return items
}

function buildDeckItems(instance: CardInstance, category: CardCategory): MenuItem[] {
  const ui = useUiStore()
  if (ui.zoneBrowserZoneId === instance.zoneId) {
    return buildDeckBrowseItems(instance, category)
  }
  return buildDeckTopItems(instance)
}
