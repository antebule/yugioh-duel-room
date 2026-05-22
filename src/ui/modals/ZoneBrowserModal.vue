<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiStore } from '@/state/uiStore'
import { useDuelStore } from '@/state/duelStore'
import { useCardCacheStore } from '@/state/cardCacheStore'
import { useContextMenu } from '@/composables/useContextMenu'
import { ZONE_KIND_LABEL } from '@/duel/zoneCatalog'
import type { Owner } from '@/duel/types'
import ModalShell from './ModalShell.vue'

const ui = useUiStore()
const duel = useDuelStore()
const cardCache = useCardCacheStore()
const ctx = useContextMenu()

const zoneId = computed(() => ui.zoneBrowserZoneId)
const zone = computed(() => (zoneId.value ? duel.state.zones[zoneId.value] : null))

const orderedUuids = computed<string[]>(() => {
  const z = zone.value
  if (!z) return []
  // Top-of-stack is the end of the array (draw pulls from last index).
  // Show top first for DECK/EXTRA/GY/BANISHED so the user reads "top → bottom".
  return [...z.cards].reverse()
})

const ownerLabel = computed(() => {
  const z = zone.value
  if (!z) return ''
  return (z.owner as Owner) === 'player' ? 'Player' : 'Opponent'
})

const title = computed(() => {
  const z = zone.value
  if (!z) return ''
  return `${ownerLabel.value} ${ZONE_KIND_LABEL[z.kind]} (${z.cards.length})`
})

const cellRefs = ref<Record<string, HTMLElement | null>>({})

function setCellRef(uuid: string, el: Element | null): void {
  cellRefs.value[uuid] = (el as HTMLElement) ?? null
}

function cardFor(uuid: string) {
  const inst = duel.state.instances[uuid]
  return inst ? cardCache.byId(inst.cardId) : undefined
}

function instanceFor(uuid: string) {
  return duel.state.instances[uuid]
}

function onCellEnter(uuid: string): void {
  ui.hoverInstance(uuid)
  const el = cellRefs.value[uuid]
  if (el) ctx.onCardEnter(uuid, el)
}

function onCellLeave(uuid: string): void {
  ui.unhoverInstance(uuid)
  ctx.onCardLeave(uuid)
}

function close(): void {
  ctx.closeNow()
  ui.closeZoneBrowser()
}
</script>

<template>
  <ModalShell v-if="zone" :title="title" size="lg" @close="close">
    <div v-if="orderedUuids.length === 0" class="zone-browser__empty">
      This zone is empty.
    </div>
    <div v-else class="zone-browser__grid">
      <div
        v-for="uuid in orderedUuids"
        :key="uuid"
        :ref="(el) => setCellRef(uuid, el as Element | null)"
        class="zone-browser__cell"
        :class="{ 'zone-browser__cell--active': ui.contextMenuInstanceUuid === uuid }"
        :title="cardFor(uuid)?.name ?? `#${instanceFor(uuid)?.cardId ?? '?'}`"
        @mouseenter="onCellEnter(uuid)"
        @mouseleave="onCellLeave(uuid)"
      >
        <img
          v-if="cardFor(uuid)"
          :src="cardFor(uuid)!.imageUrl"
          :alt="cardFor(uuid)!.name"
          class="zone-browser__img"
          loading="lazy"
          draggable="false"
        />
        <div v-else class="zone-browser__placeholder">
          #{{ instanceFor(uuid)?.cardId ?? '?' }}
        </div>
      </div>
    </div>
  </ModalShell>
</template>

<style scoped>
.zone-browser__empty {
  text-align: center;
  padding: var(--space-5);
  color: var(--color-text-dim);
  font-size: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.zone-browser__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--space-2);
}

.zone-browser__cell {
  position: relative;
  aspect-ratio: var(--card-ratio);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 100ms ease, transform 100ms ease;
}

.zone-browser__cell:hover,
.zone-browser__cell--active {
  border-color: var(--color-accent-blue);
  transform: translateY(-2px);
}

.zone-browser__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.zone-browser__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: 10px;
}
</style>
