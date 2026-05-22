import type { CardInstance, ZoneKind } from '@/duel/types'
import type { CardData, CardCategory } from '@/cards/types'
import { classifyCard } from '@/cards/types'
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
    startPicker(instance, 'activate_field', ['FIELD_SPELL'])
  } else {
    startPicker(instance, 'activate', ['ST'])
  }
}

function buildHandItems(instance: CardInstance, category: CardCategory): MenuItem[] {
  const duel = useDuelStore()

  if (category === 'monster') {
    return [
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
      { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
      { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
      { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
    ]
  }

  if (category === 'field-spell') {
    return [
      {
        label: 'Activate',
        run: () => startPicker(instance, 'activate_field', ['FIELD_SPELL']),
      },
      {
        label: 'Set',
        run: () => startPicker(instance, 'set_st', ['FIELD_SPELL']),
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

function buildFieldItems(instance: CardInstance, category: CardCategory): MenuItem[] {
  const duel = useDuelStore()
  const validMove: ZoneKind[] =
    category === 'monster'
      ? ['MZ', 'EMZ']
      : category === 'field-spell'
        ? ['FIELD_SPELL']
        : ['ST']

  return [
    { label: 'Rotate (ATK/DEF)', run: () => duel.rotate(instance.uuid) },
    { label: 'Flip', run: () => duel.flip(instance.uuid) },
    {
      label: 'Move Zone',
      run: () => startPicker(instance, 'move_zone', validMove),
    },
    { label: 'Destroy', run: () => duel.destroy(instance.uuid) },
    { label: 'Send to GY', run: () => duel.sendToGY(instance.uuid) },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
    { label: 'Return to Hand', run: () => duel.returnToHand(instance.uuid) },
    { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
    { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
    { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
  ]
}

export function buildMenuItems(
  instance: CardInstance,
  cardData: CardData | undefined,
): MenuItem[] {
  const kind = zoneKindOf(instance)
  const category: CardCategory = cardData ? classifyCard(cardData) : 'monster'

  if (kind === 'HAND') return buildHandItems(instance, category)
  if (kind === 'MZ' || kind === 'EMZ' || kind === 'ST' || kind === 'FIELD_SPELL') {
    return buildFieldItems(instance, category)
  }

  if (kind === 'GY') return buildGYItems(instance, category)
  if (kind === 'BANISHED') return buildBanishedItems(instance, category)
  if (kind === 'EXTRA') return buildExtraItems(instance, category)
  if (kind === 'DECK') return buildDeckItems(instance, category)

  return []
}

function buildGYItems(instance: CardInstance, category: CardCategory): MenuItem[] {
  const duel = useDuelStore()
  return [
    { label: 'Reveal', run: () => duel.reveal(instance.uuid) },
    {
      label: category === 'monster' ? 'Special Summon' : 'Activate',
      run: () => startReturnToField(instance, category),
    },
    { label: 'Banish', run: () => duel.banish(instance.uuid) },
    { label: 'Return to Hand', run: () => duel.returnToHand(instance.uuid) },
    { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
    { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
    { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
  ]
}

function buildBanishedItems(instance: CardInstance, category: CardCategory): MenuItem[] {
  const duel = useDuelStore()
  return [
    { label: 'Reveal', run: () => duel.reveal(instance.uuid) },
    {
      label: category === 'monster' ? 'Special Summon' : 'Activate',
      run: () => startReturnToField(instance, category),
    },
    { label: 'Send to GY', run: () => duel.sendToGY(instance.uuid) },
    { label: 'Return to Hand', run: () => duel.returnToHand(instance.uuid) },
    { label: 'Return to Deck (top)', run: () => duel.returnToDeckTop(instance.uuid) },
    { label: 'Return to Deck (bottom)', run: () => duel.returnToDeckBottom(instance.uuid) },
    { label: 'Shuffle into Deck', run: () => duel.shuffleIntoDeck(instance.uuid) },
  ]
}

function buildExtraItems(instance: CardInstance, category: CardCategory): MenuItem[] {
  const duel = useDuelStore()
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
    { label: 'Return to Hand', run: () => duel.returnToHand(instance.uuid) },
  )
  return items
}

function buildDeckItems(instance: CardInstance, category: CardCategory): MenuItem[] {
  const duel = useDuelStore()
  const items: MenuItem[] = [{ label: 'Reveal', run: () => duel.reveal(instance.uuid) }]
  if (category === 'monster') {
    items.push({
      label: 'Special Summon',
      run: () => startPicker(instance, 'special_summon', ['MZ', 'EMZ']),
    })
  } else if (category === 'field-spell') {
    items.push({
      label: 'Activate',
      run: () => startPicker(instance, 'activate_field', ['FIELD_SPELL']),
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
