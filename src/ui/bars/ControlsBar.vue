<script setup lang="ts">
import { useDuelStore } from '@/state/duelStore'

const duelStore = useDuelStore()

function debugDamage() {
  duelStore.adjustLife('player', -500)
}
</script>

<template>
  <div class="controls-bar">
    <button class="controls-bar__btn controls-bar__btn--debug" @click="debugDamage">
      Debug: −500 LP
    </button>
    <span class="controls-bar__hint">(temporary button for Step 4)</span>
  </div>
</template>

<style scoped>
.controls-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-3);
  height: 100%;
  width: 100%;
}

.controls-bar__btn {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-field-edge);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text);
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}

.controls-bar__btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--color-accent-blue);
}

.controls-bar__btn--debug {
  color: var(--color-danger);
  border-color: rgba(255, 90, 90, 0.4);
}

.controls-bar__hint {
  font-size: 10px;
  color: var(--color-text-dim);
  opacity: 0.6;
  letter-spacing: 0.05em;
}
</style>
