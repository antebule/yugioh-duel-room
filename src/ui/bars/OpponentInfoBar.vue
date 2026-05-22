<script setup lang="ts">
import LifePointsControl from '@/ui/common/LifePointsControl.vue'
</script>

<template>
  <header class="opp-bar">
    <span class="opp-bar__label">Opponent</span>
    <LifePointsControl owner="opponent" :interactive="false" />
  </header>
</template>

<style scoped>
.opp-bar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-3);
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--color-text-dim);
  z-index: var(--z-bars);
}

.opp-bar__label {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
}
</style>
