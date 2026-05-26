import type {
  DuelState,
  FieldPosition,
  Owner,
  Phase,
  Rotation,
  ZoneId,
} from '@/duel/types'

export type MoveReason =
  | 'normal_summon'
  | 'special_summon'
  | 'set'
  | 'send_gy'
  | 'banish'
  | 'return_deck'
  | 'return_hand'
  | 'shuffle_into_deck'
  | 'move_zone'
  | 'draw'
  | 'change_control'
  | 'destroy'
  | 'activate'
  | 'reveal'
  | 'overlay_attached'
  | 'overlay_detached'

export interface BaseEvent {
  id: string
  at: number
  actor: Owner | 'system'
}

export interface ZonePosition {
  zoneId: ZoneId
  index: number
}

export type DuelEvent =
  | (BaseEvent & { type: 'DUEL_RESET'; prevState: DuelState })
  | (BaseEvent & {
      type: 'DECK_LOADED'
      owner: Owner
      mainIds: number[]
      extraIds: number[]
      sideIds: number[]
    })
  | (BaseEvent & {
      type: 'CARD_MOVED'
      cardUuid: string
      from: ZonePosition
      to: ZonePosition
      prevPosition: FieldPosition
      newPosition: FieldPosition
      prevFaceUp: boolean
      newFaceUp: boolean
      prevRotation: Rotation
      newRotation: Rotation
      reason: MoveReason
      // For 'overlay_attached': the host that gains this card as a material.
      // For 'overlay_detached' / send-gy cascade: the host this card was attached to.
      hostUuid?: string
    })
  | (BaseEvent & { type: 'CARD_DRAWN'; cardUuid: string; owner: Owner })
  | (BaseEvent & {
      type: 'CARD_ROTATED'
      cardUuid: string
      prev: Rotation
      next: Rotation
    })
  | (BaseEvent & {
      type: 'CARD_FLIPPED'
      cardUuid: string
      prevFaceUp: boolean
      newFaceUp: boolean
    })
  | (BaseEvent & {
      type: 'CARD_POSITION_CHANGED'
      cardUuid: string
      prev: FieldPosition
      next: FieldPosition
    })
  | (BaseEvent & { type: 'CARD_REVEALED'; cardUuid: string })
  | (BaseEvent & {
      type: 'COUNTER_ADDED'
      cardUuid: string
      delta: number
      prevCount: number
    })
  | (BaseEvent & { type: 'TOKEN_CREATED'; cardUuid: string; zoneId: ZoneId })
  | (BaseEvent & { type: 'TOKEN_DESTROYED'; cardUuid: string; lastZoneId: ZoneId })
  | (BaseEvent & {
      type: 'DECK_SHUFFLED'
      owner: Owner
      prevOrder: string[]
      newOrder: string[]
      seedUsed: number
    })
  | (BaseEvent & {
      type: 'LIFE_CHANGED'
      owner: Owner
      prev: number
      next: number
      delta: number
      cause: 'manual_set' | 'manual_delta'
    })
  | (BaseEvent & { type: 'PHASE_CHANGED'; prev: Phase; next: Phase; turn: number })
  | (BaseEvent & {
      type: 'TURN_CHANGED'
      prevPlayer: Owner
      nextPlayer: Owner
      prevTurn: number
      nextTurn: number
    })
  | (BaseEvent & {
      type: 'DICE_ROLLED'
      result: 1 | 2 | 3 | 4 | 5 | 6
      seedUsed: number
    })
  | (BaseEvent & {
      type: 'COIN_TOSSED'
      result: 'heads' | 'tails'
      seedUsed: number
    })

export type DuelEventType = DuelEvent['type']
