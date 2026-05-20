<script setup lang="ts">
import { computed } from 'vue'
import type { ZoneDef } from '@/duel/zoneCatalog'
import { ZONE_KIND_LABEL } from '@/duel/zoneCatalog'
import { useDuelStore } from '@/state/duelStore'
import CardOnField from './CardOnField.vue'

const props = defineProps<{
  zone: ZoneDef
}>()

const duelStore = useDuelStore()

const label = computed(() => ZONE_KIND_LABEL[props.zone.kind])
const zoneState = computed(() => duelStore.state.zones[props.zone.id])
const topInstanceUuid = computed(() => {
  const cards = zoneState.value?.cards
  return cards && cards.length > 0 ? cards[cards.length - 1]! : null
})
const cardCount = computed(() => zoneState.value?.cards.length ?? 0)
</script>

<template>
  <div
    class="zone"
    :class="[`zone--${zone.kind.toLowerCase()}`, { 'zone--filled': topInstanceUuid }]"
    :data-zone-id="zone.id"
  >
    <CardOnField v-if="topInstanceUuid" :instance-uuid="topInstanceUuid" />
    <span v-else class="zone__label">{{ label }}</span>
    <span v-if="cardCount > 1" class="zone__count">{{ cardCount }}</span>
  </div>
</template>

<style scoped>
.zone {
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px dashed var(--color-field-edge);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-field);
}

.zone--filled {
  border: none;
  background: transparent;
}

.zone__label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  opacity: 0.5;
  user-select: none;
}

.zone--field_spell {
  border-color: var(--color-accent-gold);
}

.zone--emz {
  border-color: var(--color-accent-blue);
}

.zone__count {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: var(--z-card-hover);
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.78);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: var(--radius-sm);
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
</style>
