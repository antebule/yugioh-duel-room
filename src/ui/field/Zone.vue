<script setup lang="ts">
import { computed } from 'vue'
import type { ZoneDef } from '@/duel/zoneCatalog'
import { ZONE_KIND_LABEL } from '@/duel/zoneCatalog'

const props = defineProps<{
  zone: ZoneDef
}>()

const label = computed(() => ZONE_KIND_LABEL[props.zone.kind])
</script>

<template>
  <div class="zone" :class="`zone--${zone.kind.toLowerCase()}`" :data-zone-id="zone.id">
    <span class="zone__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.zone {
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
</style>
