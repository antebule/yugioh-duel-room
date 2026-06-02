export interface CardData {
  id: number
  name: string
  type: string
  desc: string
  race?: string
  attribute?: string
  atk?: number
  def?: number
  level?: number
  linkval?: number
  linkmarkers?: string[]
  scale?: number
  archetype?: string
  imageUrl: string
  imageUrlCropped: string
  imageUrlLarge: string
  fetchedAt: number
}

export type CardCategory = 'monster' | 'spell' | 'trap' | 'field-spell' | 'token'

export function classifyCard(card: Pick<CardData, 'type' | 'race'>): CardCategory {
  const t = card.type.toLowerCase()
  if (t.includes('token')) return 'token'
  if (t.includes('spell')) {
    if (card.race?.toLowerCase() === 'field') return 'field-spell'
    return 'spell'
  }
  if (t.includes('trap')) return 'trap'
  return 'monster'
}

export function isExtraDeckMonster(card: Pick<CardData, 'type'>): boolean {
  return /(Fusion|Synchro|XYZ|Link)/i.test(card.type)
}

export function isXyzMonster(card: Pick<CardData, 'type'>): boolean {
  return /XYZ/i.test(card.type)
}

export function isPendulum(card: Pick<CardData, 'type'>): boolean {
  return /Pendulum/i.test(card.type)
}

export function isLinkMonster(card: Pick<CardData, 'type'>): boolean {
  return /Link/i.test(card.type)
}
