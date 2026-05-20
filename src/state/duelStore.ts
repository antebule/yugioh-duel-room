import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Owner } from '@/duel/types'
import { initialState } from '@/duel/initialState'
import { applyEvent } from '@/core/reducers/duelReducer'
import { dispatch, registerApply } from '@/core/events/dispatcher'
import type { DuelEvent } from '@/core/events/eventTypes'
import { uuid } from '@/core/utils/uuid'
import { DEV_SEED_BOARD } from '@/duel/devSeed'

function makeBase(actor: Owner | 'system'): { id: string; at: number; actor: Owner | 'system' } {
  return { id: uuid(), at: Date.now(), actor }
}

export const useDuelStore = defineStore('duel', () => {
  const state = ref(initialState())

  registerApply((event: DuelEvent) => {
    applyEvent(state.value, event)
  })

  function adjustLife(owner: Owner, delta: number): void {
    const prev = state.value.lifePoints[owner]
    const next = Math.max(0, prev + delta)
    dispatch({
      ...makeBase(owner),
      type: 'LIFE_CHANGED',
      owner,
      prev,
      next,
      delta: next - prev,
      cause: 'manual_delta',
    })
  }

  function setLife(owner: Owner, value: number): void {
    const prev = state.value.lifePoints[owner]
    const next = Math.max(0, value)
    dispatch({
      ...makeBase(owner),
      type: 'LIFE_CHANGED',
      owner,
      prev,
      next,
      delta: next - prev,
      cause: 'manual_set',
    })
  }

  function devSeed(): void {
    for (const { passcode, zoneId } of DEV_SEED_BOARD) {
      const zone = state.value.zones[zoneId]
      if (!zone || zone.cards.length > 0) continue
      const id = uuid()
      state.value.instances[id] = {
        uuid: id,
        cardId: passcode,
        owner: 'player',
        controller: 'player',
        zoneId,
        indexInZone: 0,
        position: 'face-up-attack',
        rotation: 0,
        faceUp: true,
        counters: 0,
      }
      zone.cards.push(id)
    }
  }

  return { state, adjustLife, setLife, devSeed }
})
