<script setup lang="ts">
import { makeZone, mzWithUtilityRow, stWithUtilityRow } from '@/duel/zoneCatalog'
import FieldRow from './FieldRow.vue'
import Zone from './Zone.vue'
import ControlsBar from '@/ui/bars/ControlsBar.vue'

const opponentSt = stWithUtilityRow('opponent')
const opponentMz = mzWithUtilityRow('opponent')
const playerMz = mzWithUtilityRow('player')
const playerSt = stWithUtilityRow('player')

const oppBanished = makeZone('opponent', 'BANISHED', 0)
const playerEmz0 = makeZone('player', 'EMZ', 0)
const playerEmz1 = makeZone('player', 'EMZ', 1)
const playerBanished = makeZone('player', 'BANISHED', 0)
</script>

<template>
  <div class="play-mat">
    <FieldRow :cells="opponentSt" mirrored />
    <FieldRow :cells="opponentMz" mirrored />
    <div class="play-mat__emz-row">
      <Zone :zone="oppBanished" />
      <ControlsBar segment="left" />
      <Zone :zone="playerEmz0" />
      <ControlsBar segment="middle" />
      <Zone :zone="playerEmz1" />
      <ControlsBar segment="right" />
      <Zone :zone="playerBanished" />
    </div>
    <FieldRow :cells="playerMz" />
    <FieldRow :cells="playerSt" />
  </div>
</template>

<style scoped>
.play-mat {
  /* 5-row × 7-col grid with square MZ/EMZ/ST cells and narrower portrait
     corner cells. Width sums 59 + 5×86 + 59 = 548 card units, height sums
     5×86 = 430, hence aspect 548/430 ≈ 1.274. */
  width: min(100cqw, calc(100cqh * 548 / 430));
  aspect-ratio: 548 / 430;
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

.play-mat__emz-row {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns:
    minmax(0, 59fr) repeat(5, minmax(0, 86fr)) minmax(0, 59fr);
  grid-template-rows: minmax(0, 1fr);
  gap: var(--space-2);
}
</style>
