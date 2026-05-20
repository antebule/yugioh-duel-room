import type { DuelState, Zone, ZoneId } from './types'
import { STARTING_LIFE_POINTS } from './types'
import { ALL_ZONES, ZONE_CAPACITY } from './zoneCatalog'

export function initialState(seed: number = Date.now()): DuelState {
  const zones = {} as Record<ZoneId, Zone>
  for (const def of ALL_ZONES) {
    zones[def.id] = {
      id: def.id,
      kind: def.kind,
      owner: def.owner,
      slotIndex: def.slotIndex,
      capacity: ZONE_CAPACITY[def.kind],
      cards: [],
    }
  }
  return {
    zones,
    instances: {},
    lifePoints: { player: STARTING_LIFE_POINTS, opponent: STARTING_LIFE_POINTS },
    turn: 1,
    activePlayer: 'player',
    phase: 'DP',
    rngSeed: seed,
  }
}
