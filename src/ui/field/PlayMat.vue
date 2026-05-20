<script setup lang="ts">
import { emzCenterRow, mzWithUtilityRow, stWithUtilityRow } from '@/duel/zoneCatalog'
import FieldRow from './FieldRow.vue'

const opponentSt = stWithUtilityRow('opponent')
const opponentMz = mzWithUtilityRow('opponent')
const emz = emzCenterRow()
const playerMz = mzWithUtilityRow('player')
const playerSt = stWithUtilityRow('player')
</script>

<template>
  <div class="play-mat">
    <FieldRow :cells="opponentSt" mirrored />
    <FieldRow :cells="opponentMz" mirrored />
    <FieldRow :cells="emz" />
    <FieldRow :cells="playerMz" />
    <FieldRow :cells="playerSt" />
  </div>
</template>

<style scoped>
.play-mat {
  /* Aspect-locked to a 5-row × 7-col card grid (7 × 59 : 5 × 86 = 413 : 430).
     Picks the larger of (fit-by-width, fit-by-height) using the parent's
     container-query size, then aspect-ratio derives the other dimension. */
  width: min(100cqw, calc(100cqh * 413 / 430));
  aspect-ratio: 413 / 430;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-field);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-field-edge);
}
</style>
