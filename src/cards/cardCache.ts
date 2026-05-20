import type { CardData } from './types'

const KEY_PREFIX = 'dr:card:'
const INDEX_KEY = 'dr:card-index'

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function readIndex(): number[] {
  return safeParse<number[]>(localStorage.getItem(INDEX_KEY)) ?? []
}

function writeIndex(ids: number[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
  } catch {
    // ignored; storage might be full or disabled
  }
}

export function getCachedCard(id: number): CardData | null {
  return safeParse<CardData>(localStorage.getItem(KEY_PREFIX + id))
}

export function getAllCachedCards(): CardData[] {
  const out: CardData[] = []
  for (const id of readIndex()) {
    const card = getCachedCard(id)
    if (card) out.push(card)
  }
  return out
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)
  )
}

function evictOldestFraction(fraction: number): void {
  const index = readIndex()
  if (index.length === 0) return
  const removeCount = Math.max(1, Math.floor(index.length * fraction))
  for (const id of index.slice(0, removeCount)) {
    localStorage.removeItem(KEY_PREFIX + id)
  }
  writeIndex(index.slice(removeCount))
}

export function putCachedCard(card: CardData): void {
  const write = (): void => {
    localStorage.setItem(KEY_PREFIX + card.id, JSON.stringify(card))
    const index = readIndex()
    if (!index.includes(card.id)) {
      index.push(card.id)
      writeIndex(index)
    }
  }
  try {
    write()
  } catch (e) {
    if (isQuotaError(e)) {
      evictOldestFraction(0.25)
      try {
        write()
      } catch {
        // give up — in-memory only this session
      }
    }
  }
}

export function clearCache(): void {
  for (const id of readIndex()) localStorage.removeItem(KEY_PREFIX + id)
  localStorage.removeItem(INDEX_KEY)
}
