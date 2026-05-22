import type { Owner, ZoneId, ZoneKind } from './types'

export interface ZoneDef {
  id: ZoneId
  kind: ZoneKind
  owner: Owner
  slotIndex: number
}

export const ZONE_SLOT_COUNT: Record<ZoneKind, number> = {
  HAND: 1,
  DECK: 1,
  GY: 1,
  BANISHED: 1,
  EXTRA: 1,
  FIELD_SPELL: 1,
  MZ: 5,
  EMZ: 2,
  ST: 5,
}

export const ZONE_CAPACITY: Record<ZoneKind, number> = {
  HAND: Infinity,
  DECK: Infinity,
  GY: Infinity,
  BANISHED: Infinity,
  EXTRA: Infinity,
  FIELD_SPELL: 1,
  MZ: 1,
  EMZ: 1,
  ST: 1,
}

export const ZONE_KIND_LABEL: Record<ZoneKind, string> = {
  HAND: 'Hand',
  DECK: 'Deck',
  GY: 'GY',
  BANISHED: 'Banished',
  EXTRA: 'Extra',
  FIELD_SPELL: 'Field',
  MZ: 'MZ',
  EMZ: 'EMZ',
  ST: 'ST',
}

export function makeZone(owner: Owner, kind: ZoneKind, slotIndex: number): ZoneDef {
  return {
    id: `${owner}:${kind}:${slotIndex}`,
    kind,
    owner,
    slotIndex,
  }
}

export function zonesForOwner(owner: Owner): ZoneDef[] {
  const result: ZoneDef[] = []
  for (const kind of Object.keys(ZONE_SLOT_COUNT) as ZoneKind[]) {
    const count = ZONE_SLOT_COUNT[kind]
    for (let i = 0; i < count; i++) {
      result.push(makeZone(owner, kind, i))
    }
  }
  return result
}

export const ALL_ZONES: ZoneDef[] = [...zonesForOwner('player'), ...zonesForOwner('opponent')]

export type PlaymatCell = ZoneDef | null

export function mzWithUtilityRow(owner: Owner): PlaymatCell[] {
  return [
    makeZone(owner, 'FIELD_SPELL', 0),
    ...Array.from({ length: ZONE_SLOT_COUNT.MZ }, (_, i) => makeZone(owner, 'MZ', i)),
    makeZone(owner, 'GY', 0),
  ]
}

export function stWithUtilityRow(owner: Owner): PlaymatCell[] {
  return [
    makeZone(owner, 'EXTRA', 0),
    ...Array.from({ length: ZONE_SLOT_COUNT.ST }, (_, i) => makeZone(owner, 'ST', i)),
    makeZone(owner, 'DECK', 0),
  ]
}
