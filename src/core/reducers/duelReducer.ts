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
      // No-op: resetDuel() installs the fresh state directly before dispatch.
      // The event carries prevState only for future undo/replay.
      return
    }
    case 'DECK_SHUFFLED': {
      const zoneId = `${event.owner}:DECK:0` as const
      const zone = state.zones[zoneId]
      if (zone) zone.cards = [...event.newOrder]
      return
    }
    case 'CARD_MOVED': {
      const inst = state.instances[event.cardUuid]
      if (!inst) return
      const fromZone = state.zones[event.from.zoneId]
      const toZone = state.zones[event.to.zoneId]

      if (event.reason === 'overlay_attached') {
        // If this instance was already a material, detach from old host first
        // (handles material-transfer when a host becomes a material itself, or
        // when an XYZ is summoned onto a host and adopts its materials).
        if (inst.overlayHostUuid) {
          const oldHost = state.instances[inst.overlayHostUuid]
          if (oldHost?.overlayUuids) {
            const oldIdx = oldHost.overlayUuids.indexOf(event.cardUuid)
            if (oldIdx !== -1) oldHost.overlayUuids.splice(oldIdx, 1)
          }
        }
        // Remove from old zone's cards (when on-field), do NOT append to any zone.
        if (fromZone) {
          const idx = fromZone.cards.indexOf(event.cardUuid)
          if (idx !== -1) fromZone.cards.splice(idx, 1)
        }
        // Link to new host.
        if (event.hostUuid) {
          const host = state.instances[event.hostUuid]
          if (host) {
            if (!host.overlayUuids) host.overlayUuids = []
            host.overlayUuids.push(event.cardUuid)
          }
        }
        inst.overlayHostUuid = event.hostUuid
        inst.zoneId = event.to.zoneId
        inst.position = event.newPosition
        inst.faceUp = event.newFaceUp
        inst.rotation = event.newRotation
        return
      }

      // Any other reason on an instance that is currently a material is a
      // forced detach (covers explicit overlay_detached AND host-leaves-field
      // cascades that send each material to GY via reason: 'send_gy').
      if (inst.overlayHostUuid) {
        const host = state.instances[inst.overlayHostUuid]
        if (host?.overlayUuids) {
          const idx = host.overlayUuids.indexOf(event.cardUuid)
          if (idx !== -1) host.overlayUuids.splice(idx, 1)
        }
        inst.overlayHostUuid = undefined
      }

      if (fromZone) {
        const idx = fromZone.cards.indexOf(event.cardUuid)
        if (idx !== -1) fromZone.cards.splice(idx, 1)
      }
      if (toZone) {
        const insertAt = Math.min(event.to.index, toZone.cards.length)
        toZone.cards.splice(insertAt, 0, event.cardUuid)
        inst.indexInZone = insertAt
      }
      inst.zoneId = event.to.zoneId
      inst.position = event.newPosition
      inst.faceUp = event.newFaceUp
      inst.rotation = event.newRotation

      // Keep attached materials' zoneId aligned with their host's current
      // zone, so a host moving between MZ/EMZ slots drags its chips along.
      if (inst.overlayUuids && inst.overlayUuids.length > 0) {
        for (const matUuid of inst.overlayUuids) {
          const mat = state.instances[matUuid]
          if (mat) mat.zoneId = inst.zoneId
        }
      }
      return
    }
    case 'CARD_POSITION_CHANGED': {
      const inst = state.instances[event.cardUuid]
      if (!inst) return
      inst.position = event.next
      inst.faceUp = event.next.startsWith('face-up')
      inst.rotation = event.next.includes('defense') ? 90 : 0
      return
    }
    case 'CARD_FLIPPED': {
      const inst = state.instances[event.cardUuid]
      if (!inst) return
      inst.faceUp = event.newFaceUp
      const isDefense = inst.position.includes('defense')
      inst.position = event.newFaceUp
        ? isDefense
          ? 'face-up-defense'
          : 'face-up-attack'
        : isDefense
          ? 'face-down-defense'
          : 'face-down-attack'
      return
    }
    case 'CARD_ROTATED': {
      const inst = state.instances[event.cardUuid]
      if (!inst) return
      inst.rotation = event.next
      return
    }
    default:
      return
  }
}
