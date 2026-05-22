import { defineStore } from 'pinia'
import { ref, toRaw } from 'vue'
import type { CardInstance, DuelState, FieldPosition, Owner, Phase, Zone, ZoneId } from '@/duel/types'
import { initialState } from '@/duel/initialState'
import { applyEvent } from '@/core/reducers/duelReducer'
import { dispatch, registerApply } from '@/core/events/dispatcher'
import type { DuelEvent, MoveReason } from '@/core/events/eventTypes'
import { uuid } from '@/core/utils/uuid'
import { mulberry32, randomSeed } from '@/core/rng/rng'
import { shuffled } from '@/core/utils/shuffle'
import type { Deck } from '@/deck/types'

const PHASE_ORDER: Phase[] = ['DP', 'SP', 'M1', 'BP', 'M2', 'EP']

// Deep snapshot of a reactive DuelState into plain (non-proxied) data.
// structuredClone() can't traverse Vue's reactive Proxies, so we toRaw and
// rebuild field-by-field. Preserves Infinity (Zone.capacity uses it).
function snapshotDuelState(state: DuelState): DuelState {
  const rawState = toRaw(state)
  const zones = {} as Record<ZoneId, Zone>
  for (const [id, zone] of Object.entries(rawState.zones) as [ZoneId, Zone][]) {
    const z = toRaw(zone)
    zones[id] = { ...z, cards: [...z.cards] }
  }
  const instances: Record<string, CardInstance> = {}
  for (const [uuid, inst] of Object.entries(rawState.instances)) {
    instances[uuid] = { ...toRaw(inst) }
  }
  return {
    zones,
    instances,
    lifePoints: { ...toRaw(rawState.lifePoints) },
    turn: rawState.turn,
    activePlayer: rawState.activePlayer,
    phase: rawState.phase,
    rngSeed: rawState.rngSeed,
  }
}

function makeBase(actor: Owner | 'system'): { id: string; at: number; actor: Owner | 'system' } {
  return { id: uuid(), at: Date.now(), actor }
}

export interface MoveCardOptions {
  position?: FieldPosition
  faceUp?: boolean
  reason: MoveReason
  toIndex?: number
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

  function drawCard(owner: Owner, n: number = 1): void {
    const deckZoneId = `${owner}:DECK:0` as ZoneId
    const handZoneId = `${owner}:HAND:0` as ZoneId
    const deckZone = state.value.zones[deckZoneId]
    const handZone = state.value.zones[handZoneId]
    if (!deckZone || !handZone) return

    for (let i = 0; i < n; i++) {
      if (deckZone.cards.length === 0) break
      const fromIndex = deckZone.cards.length - 1
      const cardUuid = deckZone.cards[fromIndex]!
      const inst = state.value.instances[cardUuid]
      if (!inst) break

      const toIndex = handZone.cards.length

      dispatch({
        ...makeBase(owner),
        type: 'CARD_MOVED',
        cardUuid,
        from: { zoneId: deckZoneId, index: fromIndex },
        to: { zoneId: handZoneId, index: toIndex },
        prevPosition: inst.position,
        newPosition: 'face-up-attack',
        prevFaceUp: inst.faceUp,
        newFaceUp: owner === 'player',
        prevRotation: inst.rotation,
        newRotation: 0,
        reason: 'draw',
      })

      dispatch({
        ...makeBase(owner),
        type: 'CARD_DRAWN',
        cardUuid,
        owner,
      })
    }
  }

  function moveCard(cardUuid: string, toZoneId: ZoneId, opts: MoveCardOptions): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const fromZone = state.value.zones[inst.zoneId]
    const toZone = state.value.zones[toZoneId]
    if (!fromZone || !toZone) return

    const fromIndex = fromZone.cards.indexOf(cardUuid)
    const toIndex = opts.toIndex ?? toZone.cards.length

    const newPosition = opts.position ?? inst.position
    const newFaceUp = opts.faceUp ?? inst.faceUp
    const newRotation = newPosition.includes('defense') ? 90 : 0

    dispatch({
      ...makeBase(inst.owner),
      type: 'CARD_MOVED',
      cardUuid,
      from: { zoneId: inst.zoneId, index: fromIndex },
      to: { zoneId: toZoneId, index: toIndex },
      prevPosition: inst.position,
      newPosition,
      prevFaceUp: inst.faceUp,
      newFaceUp,
      prevRotation: inst.rotation,
      newRotation,
      reason: opts.reason,
    })
  }

  function normalSummon(cardUuid: string, toZoneId: ZoneId): void {
    moveCard(cardUuid, toZoneId, {
      position: 'face-up-attack',
      faceUp: true,
      reason: 'normal_summon',
    })
  }

  function specialSummon(cardUuid: string, toZoneId: ZoneId): void {
    moveCard(cardUuid, toZoneId, {
      position: 'face-up-attack',
      faceUp: true,
      reason: 'special_summon',
    })
  }

  function setMonster(cardUuid: string, toZoneId: ZoneId): void {
    moveCard(cardUuid, toZoneId, {
      position: 'face-down-defense',
      faceUp: false,
      reason: 'set',
    })
  }

  function activateSpellTrap(cardUuid: string, toZoneId: ZoneId): void {
    moveCard(cardUuid, toZoneId, {
      position: 'face-up-attack',
      faceUp: true,
      reason: 'activate',
    })
  }

  function setSpellTrap(cardUuid: string, toZoneId: ZoneId): void {
    moveCard(cardUuid, toZoneId, {
      position: 'face-down-attack',
      faceUp: false,
      reason: 'set',
    })
  }

  function moveZone(cardUuid: string, toZoneId: ZoneId): void {
    moveCard(cardUuid, toZoneId, { reason: 'move_zone' })
  }

  function sendToGY(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const gyZone = `${inst.owner}:GY:0` as ZoneId
    moveCard(cardUuid, gyZone, {
      position: 'face-up-attack',
      faceUp: true,
      reason: 'send_gy',
    })
  }

  function destroy(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const gyZone = `${inst.owner}:GY:0` as ZoneId
    moveCard(cardUuid, gyZone, {
      position: 'face-up-attack',
      faceUp: true,
      reason: 'destroy',
    })
  }

  function banish(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const banishedZone = `${inst.owner}:BANISHED:0` as ZoneId
    moveCard(cardUuid, banishedZone, {
      position: 'face-up-attack',
      faceUp: true,
      reason: 'banish',
    })
  }

  function returnToDeckTop(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const deckZone = `${inst.owner}:DECK:0` as ZoneId
    const zone = state.value.zones[deckZone]
    moveCard(cardUuid, deckZone, {
      position: 'face-up-attack',
      faceUp: false,
      reason: 'return_deck',
      toIndex: zone ? zone.cards.length : undefined,
    })
  }

  function returnToDeckBottom(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const deckZone = `${inst.owner}:DECK:0` as ZoneId
    moveCard(cardUuid, deckZone, {
      position: 'face-up-attack',
      faceUp: false,
      reason: 'return_deck',
      toIndex: 0,
    })
  }

  function returnToHand(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const handZone = `${inst.owner}:HAND:0` as ZoneId
    moveCard(cardUuid, handZone, {
      position: 'face-up-attack',
      faceUp: inst.owner === 'player',
      reason: 'return_hand',
    })
  }

  function shuffleIntoDeck(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    returnToDeckTop(cardUuid)
    shuffleDeck(inst.owner)
  }

  function rotate(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const next: FieldPosition = inst.position.includes('defense')
      ? inst.faceUp
        ? 'face-up-attack'
        : 'face-down-attack'
      : inst.faceUp
        ? 'face-up-defense'
        : 'face-down-defense'
    dispatch({
      ...makeBase(inst.owner),
      type: 'CARD_POSITION_CHANGED',
      cardUuid,
      prev: inst.position,
      next,
    })
  }

  function flip(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const newFaceUp = !inst.faceUp
    dispatch({
      ...makeBase(inst.owner),
      type: 'CARD_FLIPPED',
      cardUuid,
      prevFaceUp: inst.faceUp,
      newFaceUp,
    })
  }

  function reveal(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    dispatch({
      ...makeBase(inst.owner),
      type: 'CARD_REVEALED',
      cardUuid,
    })
  }

  function setPhase(next: Phase): void {
    const prev = state.value.phase
    if (prev === next) return
    const wraps = PHASE_ORDER.indexOf(next) < PHASE_ORDER.indexOf(prev)
    const turn = wraps ? state.value.turn + 1 : state.value.turn
    dispatch({
      ...makeBase('system'),
      type: 'PHASE_CHANGED',
      prev,
      next,
      turn,
    })
  }

  function endPhase(): void {
    const idx = PHASE_ORDER.indexOf(state.value.phase)
    const next = PHASE_ORDER[(idx + 1) % PHASE_ORDER.length]!
    setPhase(next)
  }

  function rollDice(): 1 | 2 | 3 | 4 | 5 | 6 {
    const seedUsed = state.value.rngSeed
    const rng = mulberry32(seedUsed)
    const result = (Math.floor(rng() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6
    state.value.rngSeed = (seedUsed + 1) >>> 0
    dispatch({
      ...makeBase('system'),
      type: 'DICE_ROLLED',
      result,
      seedUsed,
    })
    return result
  }

  function coinToss(): 'heads' | 'tails' {
    const seedUsed = state.value.rngSeed
    const rng = mulberry32(seedUsed)
    const result: 'heads' | 'tails' = rng() < 0.5 ? 'heads' : 'tails'
    state.value.rngSeed = (seedUsed + 1) >>> 0
    dispatch({
      ...makeBase('system'),
      type: 'COIN_TOSSED',
      result,
      seedUsed,
    })
    return result
  }

  function resetDuel(deck: Deck | null): void {
    const prevState = snapshotDuelState(state.value)
    state.value = initialState(randomSeed())

    if (deck) {
      const deckZoneId = `player:DECK:0` as ZoneId
      const extraZoneId = `player:EXTRA:0` as ZoneId
      for (const cardId of deck.main) {
        const inst = makeInstance(cardId, 'player', deckZoneId)
        state.value.instances[inst.uuid] = inst
        state.value.zones[deckZoneId]!.cards.push(inst.uuid)
      }
      for (const cardId of deck.extra) {
        const inst = makeInstance(cardId, 'player', extraZoneId)
        state.value.instances[inst.uuid] = inst
        state.value.zones[extraZoneId]!.cards.push(inst.uuid)
      }
    }

    dispatch({
      ...makeBase('system'),
      type: 'DUEL_RESET',
      prevState,
    })

    if (deck) shuffleDeck('player')
  }

  return {
    state,
    adjustLife,
    setLife,
    loadDeck,
    shuffleDeck,
    drawCard,
    moveCard,
    normalSummon,
    specialSummon,
    setMonster,
    activateSpellTrap,
    setSpellTrap,
    moveZone,
    sendToGY,
    destroy,
    banish,
    returnToDeckTop,
    returnToDeckBottom,
    returnToHand,
    shuffleIntoDeck,
    rotate,
    flip,
    reveal,
    setPhase,
    endPhase,
    rollDice,
    coinToss,
    resetDuel,
  }
})
