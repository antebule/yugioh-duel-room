<script setup lang="ts">
import { useUiStore } from '@/state/uiStore'
import ToolTip from '@/ui/common/ToolTip.vue'

const uiStore = useUiStore()

function onResetDuel(): void {
  uiStore.openModal('reset-confirm')
}
</script>

<template>
  <div class="duel-actions">
    <ToolTip label="Coming in Phase 4" placement="top">
      <button
        type="button"
        class="duel-actions__btn duel-actions__btn--disabled"
        aria-label="Undo"
        disabled
      >
        <span class="duel-actions__icon">↶</span>
        <span class="duel-actions__label">Undo</span>
      </button>
    </ToolTip>

    <ToolTip label="Reset Duel" placement="top">
      <button
        type="button"
        class="duel-actions__btn duel-actions__btn--danger"
        aria-label="Reset Duel"
        @click="onResetDuel"
      >
        <span class="duel-actions__icon">↻</span>
        <span class="duel-actions__label">Reset</span>
      </button>
    </ToolTip>

    <ToolTip label="Coming in Phase 4" placement="top">
      <button
        type="button"
        class="duel-actions__btn duel-actions__btn--disabled"
        aria-label="Save Replay"
        disabled
      >
        <span class="duel-actions__icon">💾</span>
        <span class="duel-actions__label">Replay</span>
      </button>
    </ToolTip>
  </div>
</template>

<style scoped>
.duel-actions {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-field-edge);
  background: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.duel-actions :deep(.tooltip) {
  flex: 1;
}

.duel-actions__btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 11px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    background 100ms ease,
    border-color 100ms ease,
    color 100ms ease;
}

.duel-actions__btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-accent-blue);
}

.duel-actions__btn--danger:hover:not(:disabled) {
  border-color: var(--color-danger);
  background: rgba(255, 90, 90, 0.1);
  color: var(--color-danger);
}

.duel-actions__btn--disabled,
.duel-actions__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.duel-actions__icon {
  font-size: 13px;
  line-height: 1;
}

.duel-actions__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
