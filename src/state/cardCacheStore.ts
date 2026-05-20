import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CardData } from '@/cards/types'
import { getAllCachedCards, putCachedCard } from '@/cards/cardCache'
import { fetchCardsByIds } from '@/cards/ygoprodeck'

export const useCardCacheStore = defineStore('cardCache', () => {
  const cards = ref<Record<number, CardData>>({})
  for (const c of getAllCachedCards()) {
    cards.value[c.id] = c
  }

  const loading = ref(false)
  const loadingProgress = ref({ loaded: 0, total: 0 })
  const lastError = ref<string | null>(null)

  async function ensureLoaded(ids: number[]): Promise<void> {
    const missing = Array.from(new Set(ids)).filter((id) => !cards.value[id])
    if (missing.length === 0) return
    loading.value = true
    lastError.value = null
    loadingProgress.value = { loaded: 0, total: missing.length }
    try {
      const fetched = await fetchCardsByIds(missing)
      for (const c of fetched) {
        cards.value[c.id] = c
        putCachedCard(c)
      }
      loadingProgress.value = { loaded: missing.length, total: missing.length }
    } catch (e) {
      lastError.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function byId(id: number): CardData | undefined {
    return cards.value[id]
  }

  return { cards, loading, loadingProgress, lastError, ensureLoaded, byId }
})
