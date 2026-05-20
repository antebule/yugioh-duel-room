import type { Deck, RecentDeck } from './types'

const RECENT_KEY = 'dr:recent-decks'
const DECK_PREFIX = 'dr:deck:'
const MAX_RECENT = 20

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function readRecent(): RecentDeck[] {
  return safeParse<RecentDeck[]>(localStorage.getItem(RECENT_KEY)) ?? []
}

function writeRecent(list: RecentDeck[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // storage full or disabled — fine to drop
  }
}

export function deckKey(deck: Deck): string {
  // Lightweight stable hash from name + source text
  const s = `${deck.name}:${deck.sourceText}`
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return `${Math.abs(h)}-${s.length}`
}

export function getRecentDecks(): RecentDeck[] {
  return readRecent()
}

export function getStoredDeck(key: string): Deck | null {
  return safeParse<Deck>(localStorage.getItem(DECK_PREFIX + key))
}

export function saveStoredDeck(deck: Deck): RecentDeck {
  const key = deckKey(deck)
  const entry: RecentDeck = {
    key,
    name: deck.name,
    cardCount: {
      main: deck.main.length,
      extra: deck.extra.length,
      side: deck.side.length,
    },
    importedAt: deck.importedAt,
  }

  try {
    localStorage.setItem(DECK_PREFIX + key, JSON.stringify(deck))
  } catch {
    // ignore quota errors here; recent list can still be updated
  }

  const recent = readRecent().filter((r) => r.key !== key)
  recent.unshift(entry)
  writeRecent(recent.slice(0, MAX_RECENT))

  return entry
}

export function removeStoredDeck(key: string): void {
  const recent = readRecent().filter((r) => r.key !== key)
  writeRecent(recent)
  try {
    localStorage.removeItem(DECK_PREFIX + key)
  } catch {
    // ignore
  }
}
