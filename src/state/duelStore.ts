import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CardInstance, Owner, ZoneId } from '@/duel/types'
import { initialState } from '@/duel/initialState'
import { applyEvent } from '@/core/reducers/duelReducer'
import { dispatch, registerApply } from '@/core/events/dispatcher'
import type { DuelEvent } from '@/core/events/eventTypes'
import { uuid } from '@/core/utils/uuid'
import { mulberry32, randomSeed } from '@/core/rng/rng'
import { shuffled } from '@/core/utils/shuffle'
import type { Deck } from '@/deck/types'

function makeBase(actor: Owner | 'system'): { id: string; at: number; actor: Owner | 'system' } {
  return { id: uuid(), at: Date.now(), actor }
}

export const useDuelStore = defineStore('duel', () => {
  const state = ref(initialState(randomSeed()))

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

  function makeInstance(cardId: number, owner: Owner, zoneId: ZoneId): CardInstance {
    return {
      uuid: uuid(),
      cardId,
      owner,
      controller: owner,
      zoneId,
      indexInZone: 0,
      position: 'face-up-attack',
      rotation: 0,
      faceUp: false,
      counters: 0,
    }
  }

  function loadDeck(owner: Owner, deck: Deck): void {
    // Full reset before loading.
    state.value = initialState(randomSeed())

    const deckZoneId = `${owner}:DECK:0` as ZoneId
    const extraZoneId = `${owner}:EXTRA:0` as ZoneId

    for (const cardId of deck.main) {
      const inst = makeInstance(cardId, owner, deckZoneId)
      state.value.instances[inst.uuid] = inst
      state.value.zones[deckZoneId]!.cards.push(inst.uuid)
    }
    for (const cardId of deck.extra) {
      const inst = makeInstance(cardId, owner, extraZoneId)
      state.value.instances[inst.uuid] = inst
      state.value.zones[extraZoneId]!.cards.push(inst.uuid)
    }
    // Side deck is parsed/stored but not placed in a zone in MVP.

    dispatch({
      ...makeBase('system'),
      type: 'DECK_LOADED',
      owner,
      mainIds: deck.main,
      extraIds: deck.extra,
      sideIds: deck.side,
    })

    shuffleDeck(owner)
  }

  function shuffleDeck(owner: Owner): void {
    const deckZoneId = `${owner}:DECK:0` as ZoneId
    const zone = state.value.zones[deckZoneId]
    if (!zone) return
    const prevOrder = [...zone.cards]
    const seedUsed = state.value.rngSeed
    const newOrder = shuffled(prevOrder, mulberry32(seedUsed))
    state.value.rngSeed = (seedUsed + 1) >>> 0

    dispatch({
      ...makeBase(owner),
      type: 'DECK_SHUFFLED',
      owner,
      prevOrder,
      newOrder,
      seedUsed,
    })
  }

  return { state, adjustLife, setLife, loadDeck, shuffleDeck }
})
