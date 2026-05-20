<script setup lang="ts">
import { computed } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import { useCardCacheStore } from '@/state/cardCacheStore'

const props = defineProps<{
  instanceUuid: string
}>()

const duelStore = useDuelStore()
const cardCacheStore = useCardCacheStore()

const instance = computed(() => duelStore.state.instances[props.instanceUuid])
const card = computed(() =>
  instance.value ? cardCacheStore.byId(instance.value.cardId) : undefined,
)

const isDefense = computed(() => instance.value?.position.includes('defense') ?? false)
const isFaceUp = computed(() => instance.value?.faceUp ?? false)
</script>

<template>
  <div
    v-if="instance"
    class="card-on-field"
    :class="{ 'card-on-field--defense': isDefense }"
    :title="card?.name ?? `#${instance.cardId}`"
  >
    <img
      v-if="isFaceUp && card"
      :src="card.imageUrl"
      :alt="card.name"
      class="card-on-field__img"
      loading="lazy"
      draggable="false"
    />
    <div v-else-if="!isFaceUp" class="card-on-field__back" />
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
  background: linear-gradient(135deg, #2a3344 0%, #1b2230 100%);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-sm);
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
