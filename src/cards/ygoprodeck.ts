import type { CardData } from './types'

const API_BASE = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const IMG_BASE = 'https://images.ygoprodeck.com/images'

const BATCH_SIZE = 200
const MAX_CONCURRENT = 3

interface YgoApiCard {
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
}

interface YgoApiResponse {
  data?: YgoApiCard[]
  error?: string
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function mapToCardData(c: YgoApiCard): CardData {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    desc: c.desc,
    race: c.race,
    attribute: c.attribute,
    atk: c.atk,
    def: c.def,
    level: c.level,
    linkval: c.linkval,
    linkmarkers: c.linkmarkers,
    scale: c.scale,
    archetype: c.archetype,
    imageUrl: `${IMG_BASE}/cards_small/${c.id}.jpg`,
    imageUrlCropped: `${IMG_BASE}/cards_cropped/${c.id}.jpg`,
    imageUrlLarge: `${IMG_BASE}/cards/${c.id}.jpg`,
    fetchedAt: Date.now(),
  }
}

async function fetchBatch(ids: number[]): Promise<CardData[]> {
  const url = `${API_BASE}?id=${ids.join(',')}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`YGOPRODeck fetch failed (${res.status}) for ${ids.length} ids`)
  }
  const json = (await res.json()) as YgoApiResponse
  if (json.error) {
    throw new Error(`YGOPRODeck error: ${json.error}`)
  }
  return (json.data ?? []).map(mapToCardData)
}

export async function fetchCardsByIds(ids: number[]): Promise<CardData[]> {
  if (ids.length === 0) return []
  const uniqueIds = Array.from(new Set(ids))
  const chunks = chunk(uniqueIds, BATCH_SIZE)
  const results: CardData[] = []
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
    const slice = chunks.slice(i, i + MAX_CONCURRENT)
    const batchResults = await Promise.all(slice.map(fetchBatch))
    for (const r of batchResults) results.push(...r)
  }
  return results
}
