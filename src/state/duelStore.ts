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
import { useUiStore } from './uiStore'

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

    // Host-leaves-field cascade: if this instance has attached materials AND
    // the destination is not a Monster / Extra-Monster zone, all materials
    // are sent to GY first (one CARD_MOVED with reason 'send_gy' per material).
    // The reducer detects overlayHostUuid set + non-overlay reason and treats
    // each as a forced detach before applying the normal zone move.
    const leavingField = toZone.kind !== 'MZ' && toZone.kind !== 'EMZ'
    const materials = inst.overlayUuids ? [...inst.overlayUuids] : []
    if (materials.length > 0 && leavingField) {
      for (const matUuid of materials) {
        const mat = state.value.instances[matUuid]
        if (!mat) continue
        const gyZoneId = `${mat.owner}:GY:0` as ZoneId
        const gyZone = state.value.zones[gyZoneId]
        if (!gyZone) continue
        dispatch({
          ...makeBase(mat.owner),
          type: 'CARD_MOVED',
          cardUuid: matUuid,
          from: { zoneId: mat.zoneId, index: 0 },
          to: { zoneId: gyZoneId, index: gyZone.cards.length },
          prevPosition: mat.position,
          newPosition: 'face-up-attack',
          prevFaceUp: mat.faceUp,
          newFaceUp: true,
          prevRotation: mat.rotation,
          newRotation: 0,
          reason: 'send_gy',
          hostUuid: cardUuid,
        })
      }
    }

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

    const ui = useUiStore()
    if (toZone.kind === 'FIELD_SPELL' && newFaceUp) {
      ui.setLastActivatedFieldSpellOwner(inst.owner)
    } else if (
      fromZone.kind === 'FIELD_SPELL' &&
      toZone.kind !== 'FIELD_SPELL' &&
      ui.lastActivatedFieldSpellOwner === inst.owner
    ) {
      ui.setLastActivatedFieldSpellOwner(null)
    }
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

  function returnToExtraDeck(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const extraZone = `${inst.owner}:EXTRA:0` as ZoneId
    moveCard(cardUuid, extraZone, {
      position: 'face-up-attack',
      faceUp: false,
      reason: 'return_deck',
    })
  }

  function pendulumToExtraDeck(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    const extraZone = `${inst.owner}:EXTRA:0` as ZoneId
    moveCard(cardUuid, extraZone, {
      position: 'face-up-attack',
      faceUp: true,
      reason: 'return_deck',
    })
  }

  function shuffleIntoDeck(cardUuid: string): void {
    const inst = state.value.instances[cardUuid]
    if (!inst) return
    returnToDeckTop(cardUuid)
    shuffleDeck(inst.owner)
  }

  function deckTopUuid(owner: Owner): string | null {
    const deckZone = state.value.zones[`${owner}:DECK:0` as ZoneId]
    if (!deckZone || deckZone.cards.length === 0) return null
    return deckZone.cards[deckZone.cards.length - 1] ?? null
  }

  function millTop(owner: Owner): void {
    const topUuid = deckTopUuid(owner)
    if (!topUuid) return
    const gyZone = `${owner}:GY:0` as ZoneId
    moveCard(topUuid, gyZone, {
      position: 'face-up-attack',
      faceUp: true,
      reason: 'send_gy',
    })
  }

  function banishTop(owner: Owner): void {
    const topUuid = deckTopUuid(owner)
    if (!topUuid) return
    const banishedZone = `${owner}:BANISHED:0` as ZoneId
    moveCard(topUuid, banishedZone, {
      position: 'face-up-attack',
      faceUp: true,
      reason: 'banish',
    })
  }

  function banishTopFaceDown(owner: Owner): void {
    const topUuid = deckTopUuid(owner)
    if (!topUuid) return
    const banishedZone = `${owner}:BANISHED:0` as ZoneId
    moveCard(topUuid, banishedZone, {
      position: 'face-down-attack',
      faceUp: false,
      reason: 'banish',
    })
  }

  function zoneKindFromId(zoneId: ZoneId): string {
    return zoneId.split(':')[1] ?? ''
  }

  // Attach `materialUuid` (and any materials it already had) to `hostUuid`.
  // The right-clicked monster is the host; the clicked monster is the material.
  function attachAsMaterial(hostUuid: string, materialUuid: string): void {
    if (hostUuid === materialUuid) return
    const host = state.value.instances[hostUuid]
    const material = state.value.instances[materialUuid]
    if (!host || !material) return
    if (!host.faceUp || !material.faceUp) return
    if (host.controller !== material.controller) return
    if (host.overlayHostUuid || material.overlayHostUuid) return
    const hostKind = zoneKindFromId(host.zoneId)
    const materialKind = zoneKindFromId(material.zoneId)
    if (hostKind !== 'MZ' && hostKind !== 'EMZ') return
    if (materialKind !== 'MZ' && materialKind !== 'EMZ') return

    const hostOldZone = host.zoneId
    const materialOldZone = material.zoneId
    if (hostOldZone === materialOldZone) return

    // If material was itself a host, transfer its existing materials to the
    // new host first so they end up beneath the freshly-attached material.
    const inherited = material.overlayUuids ? [...material.overlayUuids] : []
    for (const matUuid of inherited) {
      const mat = state.value.instances[matUuid]
      if (!mat) continue
      dispatch({
        ...makeBase(mat.owner),
        type: 'CARD_MOVED',
        cardUuid: matUuid,
        from: { zoneId: mat.zoneId, index: 0 },
        to: { zoneId: materialOldZone, index: 0 },
        prevPosition: mat.position,
        newPosition: mat.position,
        prevFaceUp: mat.faceUp,
        newFaceUp: mat.faceUp,
        prevRotation: mat.rotation,
        newRotation: mat.rotation,
        reason: 'overlay_attached',
        hostUuid,
      })
    }

    // Attach the material to the host (vacating the target zone).
    const materialFromZone = state.value.zones[materialOldZone]
    if (!materialFromZone) return
    const materialFromIndex = materialFromZone.cards.indexOf(materialUuid)
    dispatch({
      ...makeBase(material.owner),
      type: 'CARD_MOVED',
      cardUuid: materialUuid,
      from: { zoneId: materialOldZone, index: materialFromIndex },
      to: { zoneId: materialOldZone, index: 0 },
      prevPosition: material.position,
      newPosition: material.position,
      prevFaceUp: material.faceUp,
      newFaceUp: material.faceUp,
      prevRotation: material.rotation,
      newRotation: material.rotation,
      reason: 'overlay_attached',
      hostUuid,
    })

    // Move the host into the target's (now empty) zone. The reducer
    // auto-syncs every attached material's zoneId to the host's new zone.
    const hostFromZone = state.value.zones[hostOldZone]
    const hostFromIndex = hostFromZone ? hostFromZone.cards.indexOf(hostUuid) : 0
    const materialZoneAfter = state.value.zones[materialOldZone]
    const hostToIndex = materialZoneAfter ? materialZoneAfter.cards.length : 0
    dispatch({
      ...makeBase(host.owner),
      type: 'CARD_MOVED',
      cardUuid: hostUuid,
      from: { zoneId: hostOldZone, index: hostFromIndex },
      to: { zoneId: materialOldZone, index: hostToIndex },
      prevPosition: host.position,
      newPosition: host.position,
      prevFaceUp: host.faceUp,
      newFaceUp: host.faceUp,
      prevRotation: host.rotation,
      newRotation: host.rotation,
      reason: 'move_zone',
    })
  }

  function xyzSummonOnto(
    extraDeckCardUuid: string,
    targetUuid: string,
    position: 'face-up-attack' | 'face-up-defense',
  ): void {
    const xyz = state.value.instances[extraDeckCardUuid]
    const target = state.value.instances[targetUuid]
    if (!xyz || !target) return
    if (!target.faceUp) return
    const targetZoneId = target.zoneId
    const targetKind = zoneKindFromId(targetZoneId)
    if (targetKind !== 'MZ' && targetKind !== 'EMZ') return

    // Inherit the target's existing materials: they transfer from `target` to
    // the new XYZ host. Order: previous materials first, then the displaced
    // target itself appended on top.
    const inherited = target.overlayUuids ? [...target.overlayUuids] : []
    for (const matUuid of inherited) {
      const mat = state.value.instances[matUuid]
      if (!mat) continue
      dispatch({
        ...makeBase(mat.owner),
        type: 'CARD_MOVED',
        cardUuid: matUuid,
        from: { zoneId: mat.zoneId, index: 0 },
        to: { zoneId: targetZoneId, index: 0 },
        prevPosition: mat.position,
        newPosition: mat.position,
        prevFaceUp: mat.faceUp,
        newFaceUp: mat.faceUp,
        prevRotation: mat.rotation,
        newRotation: mat.rotation,
        reason: 'overlay_attached',
        hostUuid: extraDeckCardUuid,
      })
    }

    // Target becomes a material of the XYZ, vacating its zone.
    dispatch({
      ...makeBase(target.owner),
      type: 'CARD_MOVED',
      cardUuid: targetUuid,
      from: { zoneId: targetZoneId, index: state.value.zones[targetZoneId]?.cards.indexOf(targetUuid) ?? 0 },
      to: { zoneId: targetZoneId, index: 0 },
      prevPosition: target.position,
      newPosition: target.position,
      prevFaceUp: target.faceUp,
      newFaceUp: target.faceUp,
      prevRotation: target.rotation,
      newRotation: target.rotation,
      reason: 'overlay_attached',
      hostUuid: extraDeckCardUuid,
    })

    // Special-summon the XYZ into the now-empty target zone.
    const xyzNewRotation = position === 'face-up-defense' ? 90 : 0
    const xyzFromZoneId = xyz.zoneId
    const xyzFromZone = state.value.zones[xyzFromZoneId]
    const xyzFromIndex = xyzFromZone ? xyzFromZone.cards.indexOf(extraDeckCardUuid) : 0
    const targetZoneAfter = state.value.zones[targetZoneId]
    const xyzToIndex = targetZoneAfter ? targetZoneAfter.cards.length : 0
    dispatch({
      ...makeBase(xyz.owner),
      type: 'CARD_MOVED',
      cardUuid: extraDeckCardUuid,
      from: { zoneId: xyzFromZoneId, index: xyzFromIndex },
      to: { zoneId: targetZoneId, index: xyzToIndex },
      prevPosition: xyz.position,
      newPosition: position,
      prevFaceUp: xyz.faceUp,
      newFaceUp: true,
      prevRotation: xyz.rotation,
      newRotation: xyzNewRotation,
      reason: 'special_summon',
    })
  }

  function detachMaterial(materialUuid: string): void {
    const mat = state.value.instances[materialUuid]
    if (!mat || !mat.overlayHostUuid) return
    const gyZoneId = `${mat.owner}:GY:0` as ZoneId
    const gyZone = state.value.zones[gyZoneId]
    if (!gyZone) return
    dispatch({
      ...makeBase(mat.owner),
      type: 'CARD_MOVED',
      cardUuid: materialUuid,
      from: { zoneId: mat.zoneId, index: 0 },
      to: { zoneId: gyZoneId, index: gyZone.cards.length },
      prevPosition: mat.position,
      newPosition: 'face-up-attack',
      prevFaceUp: mat.faceUp,
      newFaceUp: true,
      prevRotation: mat.rotation,
      newRotation: 0,
      reason: 'overlay_detached',
      hostUuid: mat.overlayHostUuid,
    })
  }

  function banishMaterial(materialUuid: string): void {
    const mat = state.value.instances[materialUuid]
    if (!mat || !mat.overlayHostUuid) return
    const banishedZoneId = `${mat.owner}:BANISHED:0` as ZoneId
    const banishedZone = state.value.zones[banishedZoneId]
    if (!banishedZone) return
    dispatch({
      ...makeBase(mat.owner),
      type: 'CARD_MOVED',
      cardUuid: materialUuid,
      from: { zoneId: mat.zoneId, index: 0 },
      to: { zoneId: banishedZoneId, index: banishedZone.cards.length },
      prevPosition: mat.position,
      newPosition: 'face-up-attack',
      prevFaceUp: mat.faceUp,
      newFaceUp: true,
      prevRotation: mat.rotation,
      newRotation: 0,
      reason: 'overlay_detached',
      hostUuid: mat.overlayHostUuid,
    })
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
    const zone = state.value.zones[inst.zoneId]
    dispatch({
      ...makeBase(inst.owner),
      type: 'CARD_FLIPPED',
      cardUuid,
      prevFaceUp: inst.faceUp,
      newFaceUp,
    })

    if (zone?.kind === 'FIELD_SPELL') {
      const ui = useUiStore()
      if (newFaceUp) {
        ui.setLastActivatedFieldSpellOwner(inst.owner)
      } else if (ui.lastActivatedFieldSpellOwner === inst.owner) {
        ui.setLastActivatedFieldSpellOwner(null)
      }
    }
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
    returnToExtraDeck,
    pendulumToExtraDeck,
    shuffleIntoDeck,
    millTop,
    banishTop,
    banishTopFaceDown,
    attachAsMaterial,
    xyzSummonOnto,
    detachMaterial,
    banishMaterial,
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
