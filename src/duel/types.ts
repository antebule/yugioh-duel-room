export type Owner = 'player' | 'opponent'

export type ZoneKind =
  | 'HAND'
  | 'DECK'
  | 'GY'
  | 'BANISHED'
  | 'EXTRA'
  | 'MZ'
  | 'EMZ'
  | 'ST'
  | 'FIELD_SPELL'

export type ZoneId = `${Owner}:${ZoneKind}:${number}`

export type FieldPosition =
  | 'face-up-attack'
  | 'face-down-attack'
  | 'face-up-defense'
  | 'face-down-defense'

export type Rotation = 0 | 90 | 180 | 270

export type Phase = 'DP' | 'SP' | 'M1' | 'BP' | 'M2' | 'EP'

export interface CardInstance {
  uuid: string
  cardId: number
  owner: Owner
  controller: Owner
  zoneId: ZoneId
  indexInZone: number
  position: FieldPosition
  rotation: Rotation
  faceUp: boolean
  counters: number
  isToken?: boolean
}

export interface Zone {
  id: ZoneId
  kind: ZoneKind
  owner: Owner
  slotIndex: number
  capacity: number
  cards: string[]
}

export interface DuelState {
  zones: Record<ZoneId, Zone>
  instances: Record<string, CardInstance>
  lifePoints: Record<Owner, number>
  turn: number
  activePlayer: Owner
  phase: Phase
  rngSeed: number
}

export const STARTING_LIFE_POINTS = 8000
