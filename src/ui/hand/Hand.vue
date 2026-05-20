<script setup lang="ts">
import { computed } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import HandCard from './HandCard.vue'

const duelStore = useDuelStore()

const handCards = computed(() => duelStore.state.zones['player:HAND:0']?.cards ?? [])
</script>

<template>
  <div class="hand">
    <HandCard v-for="uuid in handCards" :key="uuid" :instance-uuid="uuid" />
    <span v-if="handCards.length === 0" class="hand__empty">Hand is empty</span>
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
}

.hand__empty {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  opacity: 0.4;
}
</style>
