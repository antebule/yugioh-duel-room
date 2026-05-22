import { defineStore } from 'pinia'
import { ref } from 'vue'
import { subscribe } from '@/core/events/eventBus'
import type { DuelEvent, DuelEventType } from '@/core/events/eventTypes'
import { useDuelStore } from './duelStore'
import { useCardCacheStore } from './cardCacheStore'

export interface LogEntry {
  id: string
  at: number
  text: string
  eventType: DuelEventType
}

function ownerLabel(owner: 'player' | 'opponent'): string {
  return owner === 'player' ? 'Player' : 'Opponent'
}

function cardName(instanceUuid: string): string {
  const inst = useDuelStore().state.instances[instanceUuid]
  if (!inst) return '?'
  const name = useCardCacheStore().byId(inst.cardId)?.name
  return name ?? `#${inst.cardId}`
}

function formatEvent(event: DuelEvent): string {
  switch (event.type) {
    case 'LIFE_CHANGED': {
      const sign = event.delta > 0 ? '+' : ''
      return `${ownerLabel(event.owner)} LP ${event.prev} → ${event.next} (${sign}${event.delta})`
    }
    case 'PHASE_CHANGED':
      return `Phase: ${event.prev} → ${event.next}`
    case 'TURN_CHANGED':
      return `Turn ${event.nextTurn} — ${ownerLabel(event.nextPlayer)}'s turn`
    case 'DUEL_RESET':
      return 'Duel reset'
    case 'DECK_LOADED':
      return `Deck loaded for ${ownerLabel(event.owner)} (${event.mainIds.length} main, ${event.extraIds.length} extra)`
    case 'DECK_SHUFFLED':
      return `${ownerLabel(event.owner)} shuffled deck`
    case 'CARD_DRAWN':
      return `${ownerLabel(event.owner)} drew ${cardName(event.cardUuid)}`
    case 'CARD_MOVED':
      return `${cardName(event.cardUuid)} moved (${event.reason})`
    case 'CARD_ROTATED':
      return `${cardName(event.cardUuid)} rotated (${event.prev}° → ${event.next}°)`
    case 'CARD_FLIPPED':
      return `${cardName(event.cardUuid)} ${event.newFaceUp ? 'flipped face-up' : 'set face-down'}`
    case 'CARD_POSITION_CHANGED':
      return `${cardName(event.cardUuid)}: ${event.prev} → ${event.next}`
    case 'CARD_REVEALED':
      return `${cardName(event.cardUuid)} revealed`
    case 'COUNTER_ADDED': {
      const sign = event.delta > 0 ? '+' : ''
      return `${cardName(event.cardUuid)} counter ${sign}${event.delta}`
    }
    case 'TOKEN_CREATED':
      return 'Token created'
    case 'TOKEN_DESTROYED':
      return 'Token destroyed'
    case 'DICE_ROLLED':
      return `Rolled a ${event.result}`
    case 'COIN_TOSSED':
      return `Coin: ${event.result}`
  }
}

export const useLogStore = defineStore('log', () => {
  const entries = ref<LogEntry[]>([])

  subscribe((event) => {
    // DUEL_RESET wipes prior log entries — fresh duel, fresh log.
    if (event.type === 'DUEL_RESET') {
      entries.value = []
      return
    }
    // CARD_MOVED with reason 'draw' is suppressed because CARD_DRAWN logs the same action
    // with the card name.
    if (event.type === 'CARD_MOVED' && event.reason === 'draw') return

    entries.value.push({
      id: event.id,
      at: event.at,
      text: formatEvent(event),
      eventType: event.type,
    })
  })

  function clear(): void {
    entries.value = []
  }

  return { entries, clear }
})
