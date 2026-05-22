<script setup lang="ts">
import { computed } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import { useDeckStore } from '@/state/deckStore'
import { useUiStore } from '@/state/uiStore'
import ModalShell from './ModalShell.vue'

const duelStore = useDuelStore()
const deckStore = useDeckStore()
const uiStore = useUiStore()

const hasDeck = computed(() => deckStore.currentDeck !== null)

const description = computed(() =>
  hasDeck.value
    ? 'All cards return to the deck, the deck is reshuffled, your hand is cleared, LP returns to 8000, turn resets to 1, and the log is cleared.'
    : 'The duel log will be cleared.',
)

function close(): void {
  uiStore.closeModal()
}

function confirm(): void {
  duelStore.resetDuel(deckStore.currentDeck)
  close()
}
</script>

<template>
  <ModalShell title="Reset Duel" @close="close">
    <p class="reset-confirm__desc">{{ description }}</p>
    <div class="reset-confirm__actions">
      <button type="button" class="reset-confirm__btn" @click="close">Cancel</button>
      <button
        type="button"
        class="reset-confirm__btn reset-confirm__btn--danger"
        @click="confirm"
      >
        Reset
      </button>
    </div>
  </ModalShell>
</template>

<style scoped>
.reset-confirm__desc {
  margin: 0 0 var(--space-4);
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-dim);
}

.reset-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.reset-confirm__btn {
  padding: 8px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    background 100ms ease,
    border-color 100ms ease;
}

.reset-confirm__btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-accent-blue);
}

.reset-confirm__btn--danger {
  background: rgba(255, 90, 90, 0.12);
  border-color: rgba(255, 90, 90, 0.4);
  color: var(--color-danger);
}

.reset-confirm__btn--danger:hover {
  background: rgba(255, 90, 90, 0.22);
  border-color: var(--color-danger);
}
</style>
