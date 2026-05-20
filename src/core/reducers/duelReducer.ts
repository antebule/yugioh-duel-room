import type { DuelEvent } from '@/core/events/eventTypes'
import type { DuelState } from '@/duel/types'

export function applyEvent(state: DuelState, event: DuelEvent): void {
  switch (event.type) {
    case 'LIFE_CHANGED': {
      state.lifePoints[event.owner] = event.next
      return
    }
    case 'PHASE_CHANGED': {
      state.phase = event.next
      state.turn = event.turn
      return
    }
    case 'TURN_CHANGED': {
      state.activePlayer = event.nextPlayer
      state.turn = event.nextTurn
      return
    }
    case 'DUEL_RESET': {
      const prev = event.prevState
      state.zones = prev.zones
      state.instances = prev.instances
      state.lifePoints = prev.lifePoints
      state.turn = prev.turn
      state.activePlayer = prev.activePlayer
      state.phase = prev.phase
      state.rngSeed = prev.rngSeed
      return
    }
    case 'DECK_SHUFFLED': {
      const zoneId = `${event.owner}:DECK:0` as const
      const zone = state.zones[zoneId]
      if (zone) zone.cards = [...event.newOrder]
      return
    }
    default:
      return
  }
}
