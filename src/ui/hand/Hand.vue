<script setup lang="ts">
import { computed } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import HandCard from './HandCard.vue'

const duelStore = useDuelStore()

const handCards = computed(() => duelStore.state.zones['player:HAND:0']?.cards ?? [])
const isOverlapped = computed(() => handCards.value.length > 6)
const overlapStyle = computed<Record<string, string> | undefined>(() =>
  isOverlapped.value ? { '--count': String(handCards.value.length) } : undefined,
)
</script>

<template>
  <div class="hand" :class="{ 'hand--overlap': isOverlapped }" :style="overlapStyle">
    <HandCard v-for="uuid in handCards" :key="uuid" :instance-uuid="uuid" />
  </div>
</template>

<style scoped>
.hand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-1);
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  /* size containment: stops the cards' aspect-ratio intrinsic sizing from
     propagating up through the flex container into the grid row and
     collapsing the strip. also enables cqi/cqh below. */
  container-type: size;
}

.hand--overlap {
  gap: 0;
  /* card width is derived from the strip's own height (cqh) so overlap
     adapts to whatever the layout gives us. */
  --card-w: calc(100cqh * 59 / 86);
  /* always overlap at least 12px; tighten further if the cards would
     otherwise overflow the strip width; cap at 70% of card width so a
     sliver of every card stays visible. */
  --hand-overlap: max(calc(-0.9 * var(--card-w)),
      min(-12px, calc((100cqi - var(--count) * var(--card-w)) / (var(--count) - 1))));
}
</style>
