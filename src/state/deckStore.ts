import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Deck, RecentDeck, YdkParseResult } from '@/deck/types'
import { parseYdk } from '@/deck/ydkParser'
import {
  getRecentDecks,
  getStoredDeck,
  removeStoredDeck,
  saveStoredDeck,
} from '@/deck/deckStorage'
import { useCardCacheStore } from './cardCacheStore'
import { useDuelStore } from './duelStore'

export const useDeckStore = defineStore('deck', () => {
  const currentDeck = ref<Deck | null>(null)
  const recent = ref<RecentDeck[]>(getRecentDecks())
  const loading = ref(false)
  const lastResult = ref<YdkParseResult | null>(null)

  async function applyDeck(deck: Deck): Promise<void> {
    const cardCacheStore = useCardCacheStore()
    const duelStore = useDuelStore()

    const allIds = Array.from(new Set([...deck.main, ...deck.extra, ...deck.side]))
    await cardCacheStore.ensureLoaded(allIds)

    currentDeck.value = deck
    const entry = saveStoredDeck(deck)
    recent.value = [entry, ...recent.value.filter((r) => r.key !== entry.key)].slice(0, 20)

    duelStore.loadDeck('player', deck)
  }

  async function importFromText(text: string, name: string): Promise<YdkParseResult> {
    loading.value = true
    try {
      const result = parseYdk(text, name)
      lastResult.value = result
      if (result.ok) await applyDeck(result.deck)
      return result
    } finally {
      loading.value = false
    }
  }

  async function importFromFile(file: File): Promise<YdkParseResult> {
    const text = await file.text()
    const name = file.name.replace(/\.ydk$/i, '')
    return importFromText(text, name)
  }

  async function loadFromRecent(key: string): Promise<boolean> {
    const deck = getStoredDeck(key)
    if (!deck) return false
    loading.value = true
    try {
      await applyDeck(deck)
      lastResult.value = { ok: true, deck, warnings: [] }
      return true
    } finally {
      loading.value = false
    }
  }

  function removeRecent(key: string): void {
    recent.value = recent.value.filter((r) => r.key !== key)
    removeStoredDeck(key)
  }

  function clearLastResult(): void {
    lastResult.value = null
  }

  return {
    currentDeck,
    recent,
    loading,
    lastResult,
    importFromText,
    importFromFile,
    loadFromRecent,
    removeRecent,
    clearLastResult,
  }
})
