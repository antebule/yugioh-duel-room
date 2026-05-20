<script setup lang="ts">
import { useUiStore } from '@/state/uiStore'

const uiStore = useUiStore()

function openImport(): void {
  uiStore.openModal('deck-import')
}
</script>

<template>
  <div class="empty-state" @click.self="openImport">
    <div class="empty-state__inner">
      <div class="empty-state__title">No deck loaded</div>
      <p class="empty-state__hint">Drop a .ydk file anywhere on this page, or</p>
      <button class="empty-state__btn" @click="openImport">Import Deck</button>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  position: absolute;
  inset: 0;
  background: rgba(17, 19, 24, 0.65);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-preview);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.empty-state__inner {
  text-align: center;
  padding: var(--space-5);
  cursor: default;
}

.empty-state__title {
  font-size: 14px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
  margin-bottom: var(--space-3);
}

.empty-state__hint {
  font-size: 12px;
  color: var(--color-text-dim);
  margin: 0 0 var(--space-3);
}

.empty-state__btn {
  padding: 8px 18px;
  background: var(--color-accent-blue);
  color: #0a0e15;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  transition: opacity 100ms ease;
}

.empty-state__btn:hover {
  opacity: 0.9;
}
</style>
