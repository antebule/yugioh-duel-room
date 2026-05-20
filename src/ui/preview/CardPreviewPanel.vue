<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/state/uiStore'
import { useDuelStore } from '@/state/duelStore'
import { useCardCacheStore } from '@/state/cardCacheStore'

const uiStore = useUiStore()
const duelStore = useDuelStore()
const cardCacheStore = useCardCacheStore()

const previewedInstance = computed(() => {
  const uuid = uiStore.previewedInstanceUuid
  return uuid ? duelStore.state.instances[uuid] : undefined
})

const card = computed(() =>
  previewedInstance.value ? cardCacheStore.byId(previewedInstance.value.cardId) : undefined,
)

const metaParts = computed(() => {
  const c = card.value
  if (!c) return []
  const parts: string[] = [c.type]
  if (c.attribute) parts.push(c.attribute)
  if (c.race) parts.push(c.race)
  if (c.level !== undefined) parts.push(`Lv ${c.level}`)
  if (c.linkval !== undefined) parts.push(`Link ${c.linkval}`)
  if (c.scale !== undefined) parts.push(`Scale ${c.scale}`)
  return parts
})

const hasCombatStats = computed(() => {
  const c = card.value
  return c?.atk !== undefined || c?.def !== undefined
})

function togglePin(): void {
  if (card.value) uiStore.togglePreviewPin()
}
</script>

<template>
  <div v-if="card" class="preview" :class="{ 'preview--pinned': uiStore.previewSticky }">
    <button class="preview__image-btn" :title="uiStore.previewSticky ? 'Unpin' : 'Pin'" @click="togglePin">
      <img :src="card.imageUrlLarge" :alt="card.name" class="preview__image" draggable="false" />
      <span v-if="uiStore.previewSticky" class="preview__pin-badge">Pinned</span>
    </button>
    <div class="preview__info">
      <h3 class="preview__name">{{ card.name }}</h3>
      <div class="preview__meta">{{ metaParts.join(' · ') }}</div>
      <div v-if="hasCombatStats" class="preview__stats">
        <span>ATK {{ card.atk ?? '-' }}</span>
        <span class="preview__stats-sep">/</span>
        <span>DEF {{ card.def ?? '-' }}</span>
      </div>
      <p class="preview__desc">{{ card.desc }}</p>
    </div>
  </div>
  <div v-else class="preview preview--empty">
    <span class="preview__empty-label">Hover a card</span>
  </div>
</template>

<style scoped>
.preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview--empty {
  align-items: center;
  justify-content: center;
}

.preview__empty-label {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  opacity: 0.4;
}

.preview__image-btn {
  position: relative;
  width: 100%;
  padding: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  border: none;
  flex-shrink: 0;
}

.preview__image {
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  display: block;
  user-select: none;
  -webkit-user-drag: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: outline 100ms ease;
}

.preview--pinned .preview__image {
  outline: 2px solid var(--color-accent-gold);
  outline-offset: 2px;
}

.preview__pin-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 2px 8px;
  background: var(--color-accent-gold);
  color: #1a1408;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
}

.preview__info {
  padding: 0 var(--space-3) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-height: 0;
}

.preview__name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.25;
}

.preview__meta {
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--color-text-dim);
}

.preview__stats {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-accent-gold);
  margin-top: 2px;
}

.preview__stats-sep {
  color: var(--color-text-dim);
}

.preview__desc {
  margin: var(--space-2) 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--color-text);
  overflow-y: auto;
  white-space: pre-wrap;
  flex: 1;
  min-height: 0;
}
</style>
