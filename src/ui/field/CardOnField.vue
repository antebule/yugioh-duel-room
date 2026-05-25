<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import { useCardCacheStore } from '@/state/cardCacheStore'
import { useUiStore } from '@/state/uiStore'
import { useContextMenu } from '@/composables/useContextMenu'
import cardBackUrl from '@/assets/images/card-back.png'

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

const isDefense = computed(() => instance.value?.position.includes('defense') ?? false)
const isFaceUp = computed(() => instance.value?.faceUp ?? false)

// Cards in DECK or EXTRA aren't previewed — they're face-down to the controller
// and showing the art on hover would leak the next draw / extra-deck contents.
const isHidden = computed(() => {
  const z = instance.value?.zoneId ?? ''
  return z.includes(':DECK:') || z.includes(':EXTRA:')
})

const rootEl = ref<HTMLElement | null>(null)

function onEnter(): void {
  if (isHidden.value) return
  uiStore.hoverInstance(props.instanceUuid)
  if (rootEl.value) ctx.onCardEnter(props.instanceUuid, rootEl.value)
}
function onLeave(): void {
  if (isHidden.value) return
  uiStore.unhoverInstance(props.instanceUuid)
  ctx.onCardLeave(props.instanceUuid)
}
</script>

<template>
  <div
    v-if="instance"
    ref="rootEl"
    class="card-on-field"
    :class="{ 'card-on-field--defense': isDefense }"
    :title="card?.name ?? `#${instance.cardId}`"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <img
      v-if="isFaceUp && card"
      :src="card.imageUrl"
      :alt="card.name"
      class="card-on-field__img"
      loading="lazy"
      draggable="false"
    />
    <img
      v-else-if="!isFaceUp"
      :src="cardBackUrl"
      alt=""
      class="card-on-field__back"
      loading="lazy"
      draggable="false"
    />
    <div v-else class="card-on-field__loading">#{{ instance.cardId }}</div>
  </div>
</template>

<style scoped>
.card-on-field {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-card);
}

.card-on-field--defense {
  /* For now, rotation is visual-only; bounding box unchanged for layout. */
  transform: rotate(90deg);
}

.card-on-field__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.card-on-field__back {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.card-on-field__loading {
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
