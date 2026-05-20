import { defineStore } from 'pinia'
import { ref } from 'vue'
import { subscribe } from '@/core/events/eventBus'
import type { DuelEvent, DuelEventType } from '@/core/events/eventTypes'

export interface LogEntry {
  id: string
  at: number
  text: string
  eventType: DuelEventType
}

function ownerLabel(owner: 'player' | 'opponent'): string {
  return owner === 'player' ? 'Player' : 'Opponent'
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
      return `${ownerLabel(event.owner)} drew a card`
    case 'CARD_MOVED':
      return `Card moved (${event.reason})`
    case 'CARD_ROTATED':
      return `Card rotated (${event.prev}° → ${event.next}°)`
    case 'CARD_FLIPPED':
      return event.newFaceUp ? 'Card flipped face-up' : 'Card set face-down'
    case 'CARD_POSITION_CHANGED':
      return `Position: ${event.prev} → ${event.next}`
    case 'CARD_REVEALED':
      return 'Card revealed'
    case 'COUNTER_ADDED': {
      const sign = event.delta > 0 ? '+' : ''
      return `Counter ${sign}${event.delta}`
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
