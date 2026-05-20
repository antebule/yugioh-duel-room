import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Owner } from '@/duel/types'
import { initialState } from '@/duel/initialState'
import { applyEvent } from '@/core/reducers/duelReducer'
import { dispatch, registerApply } from '@/core/events/dispatcher'
import type { DuelEvent } from '@/core/events/eventTypes'
import { uuid } from '@/core/utils/uuid'

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

  return { state, adjustLife, setLife }
})
