<script setup lang="ts">
import type { PlaymatCell } from '@/duel/zoneCatalog'
import Zone from './Zone.vue'

defineProps<{
  cells: PlaymatCell[]
  mirrored?: boolean
}>()
</script>

<template>
  <div class="field-row" :class="{ 'field-row--mirrored': mirrored }">
    <template v-for="(cell, i) in cells" :key="i">
      <Zone v-if="cell" :zone="cell" />
      <div v-else class="field-row__spacer" />
    </template>
  </div>
</template>

<style scoped>
.field-row {
  flex: 1;
  min-height: 0;
  display: grid;
  /* Corner columns (FIELD_SPELL/GY/DECK/EXTRA) are portrait-width (59fr);
     the 5 MZ/ST columns are square (86fr), matching row height.
     minmax(0, ...) prevents the card image's intrinsic size from inflating
     the track past its fr share. */
  grid-template-columns:
    minmax(0, 59fr) repeat(5, minmax(0, 86fr)) minmax(0, 59fr);
  grid-template-rows: minmax(0, 1fr);
  gap: var(--space-2);
}

.field-row--mirrored {
  direction: rtl;
}

.field-row--mirrored > :deep(*) {
  direction: ltr;
}

.field-row__spacer {
  width: 100%;
  height: 100%;
}
</style>
