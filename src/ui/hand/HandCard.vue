<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import { useCardCacheStore } from '@/state/cardCacheStore'
import { useUiStore } from '@/state/uiStore'
import { useContextMenu } from '@/composables/useContextMenu'

const props = defineProps<{
  instanceUuid: string
}>()

const duelStore = useDuelStore()
const cardCacheStore = useCardCacheStore()
const uiStore = useUiStore()
const ctx = useContextMenu()

const instance = computed(() => duelStore.state.instances[props.instanceUuid])
const card = computed(() =>
  instance.value ? cardCacheStore.byId(instance.value.cardId) : undefined,
)

const menuActive = computed(
  () => uiStore.contextMenuInstanceUuid === props.instanceUuid,
)

const rootEl = ref<HTMLElement | null>(null)

function onEnter(): void {
  uiStore.hoverInstance(props.instanceUuid)
  if (rootEl.value) ctx.onCardEnter(props.instanceUuid, rootEl.value)
}
function onLeave(): void {
  uiStore.unhoverInstance(props.instanceUuid)
  ctx.onCardLeave(props.instanceUuid)
}
</script>

<template>
  <div
    v-if="instance"
    ref="rootEl"
    class="hand-card"
    :class="{ 'hand-card--active': menuActive }"
    :title="card?.name ?? `#${instance.cardId}`"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <img
      v-if="card"
      :src="card.imageUrl"
      :alt="card.name"
      class="hand-card__img"
      loading="lazy"
      draggable="false"
    />
    <div v-else class="hand-card__loading">#{{ instance.cardId }}</div>
  </div>
</template>

<style scoped>
.hand-card {
  position: relative;
  height: 100%;
  aspect-ratio: var(--card-ratio);
  cursor: pointer;
  transition: transform 120ms ease;
  z-index: var(--z-hand);
  flex-shrink: 0;
}

.hand-card:hover,
.hand-card--active {
  transform: translateY(-12px) scale(1.18);
  z-index: var(--z-hand-hover);
}

.hand-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.hand-card__loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed var(--color-field-edge);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: 10px;
}
</style>
