<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import { useCardCacheStore } from '@/state/cardCacheStore'
import { useUiStore } from '@/state/uiStore'
import { useContextMenu } from '@/composables/useContextMenu'

const props = defineProps<{
  materialUuid: string
  index: number
  count: number
}>()

const duelStore = useDuelStore()
const cardCacheStore = useCardCacheStore()
const uiStore = useUiStore()
const ctx = useContextMenu()

const instance = computed(() => duelStore.state.instances[props.materialUuid])
const card = computed(() =>
  instance.value ? cardCacheStore.byId(instance.value.cardId) : undefined,
)

const rootEl = ref<HTMLElement | null>(null)

function onEnter(): void {
  uiStore.hoverInstance(props.materialUuid)
  if (rootEl.value) ctx.onCardEnter(props.materialUuid, rootEl.value)
}
function onLeave(): void {
  uiStore.unhoverInstance(props.materialUuid)
  ctx.onCardLeave(props.materialUuid)
}

// Layout: the host visual is shifted to the zone's left edge; chips fan
// out rightward across the remaining slack so that the last chip's right
// edge ends at the zone's right edge.
//   visual card width  vw = 59/86 ≈ 0.686 of (square) zone width
//   per-chip delta     Δ  = (1 - vw) / N            (zone-width units)
//   chip i left edge      = i * Δ + vw … wait, we want chip 0 to peek past
//   the host (which sits at 0 → vw), so chip i left = (i+1) * Δ.
const style = computed(() => {
  const count = Math.max(props.count, 1)
  const cardWidthPct = (59 / 86) * 100
  const deltaPct = (100 - cardWidthPct) / count
  const leftPct = (props.index + 1) * deltaPct
  return {
    left: `${leftPct.toFixed(3)}%`,
    zIndex: String(-1 - props.index),
  }
})
</script>

<template>
  <div
    v-if="instance && card"
    ref="rootEl"
    class="overlay-chip"
    :style="style"
    :title="card.name"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <img
      :src="card.imageUrl"
      :alt="card.name"
      class="overlay-chip__img"
      loading="lazy"
      draggable="false"
    />
  </div>
</template>

<style scoped>
.overlay-chip {
  position: absolute;
  top: 0;
  height: 100%;
  aspect-ratio: var(--card-ratio, 59 / 86);
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}

.overlay-chip__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}
</style>
