<script setup lang="ts">
import LifePointsControl from '@/ui/common/LifePointsControl.vue'
</script>

<template>
  <header class="opp-bar">
    <span class="opp-bar__label">Opponent</span>
    <LifePointsControl owner="opponent" />
  </header>
</template>

<style scoped>
.opp-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-field-edge);
  background: rgba(0, 0, 0, 0.15);
  font-size: 12px;
  flex-shrink: 0;
  z-index: var(--z-bars);
}

.opp-bar__label {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
  color: var(--color-text-dim);
}
</style>
