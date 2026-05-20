<script setup lang="ts">
import PlayMat from '@/ui/field/PlayMat.vue'
import Hand from '@/ui/hand/Hand.vue'
import DuelLog from '@/ui/log/DuelLog.vue'
import DeckImportModal from '@/ui/modals/DeckImportModal.vue'
import EmptyStateOverlay from '@/ui/modals/EmptyStateOverlay.vue'
import { useDuelStore } from '@/state/duelStore'
import { useDeckStore } from '@/state/deckStore'
import { useUiStore } from '@/state/uiStore'
import { useDeckImport } from '@/composables/useDeckImport'

const duelStore = useDuelStore()
const deckStore = useDeckStore()
const uiStore = useUiStore()

useDeckImport()
</script>

<template>
  <div class="duel-room" :class="{ 'duel-room--drag-over': uiStore.globalDragOver }">
    <header class="duel-room__opp-bar">
      <span class="duel-room__bar-label">Opponent</span>
      <span class="duel-room__lp">LP {{ duelStore.state.lifePoints.opponent }}</span>
    </header>

    <aside class="duel-room__preview">
      <span class="duel-room__placeholder">Card Preview</span>
    </aside>

    <main class="duel-room__center">
      <div class="duel-room__playmat-frame">
        <PlayMat />
        <EmptyStateOverlay v-if="!deckStore.currentDeck" />
      </div>
      <section class="duel-room__hand">
        <Hand />
      </section>
    </main>

    <aside class="duel-room__right">
      <div class="duel-room__log-inner">
        <DuelLog />
      </div>
      <footer class="duel-room__player-bar">
        <div class="duel-room__player-bar-row">
          <span class="duel-room__bar-label">Player</span>
          <span class="duel-room__lp">LP {{ duelStore.state.lifePoints.player }}</span>
        </div>
        <div class="duel-room__player-bar-row duel-room__player-bar-row--muted">
          <span>Turn {{ duelStore.state.turn }} · {{ duelStore.state.phase }}</span>
        </div>
      </footer>
    </aside>

    <Teleport to="body">
      <DeckImportModal v-if="uiStore.modal === 'deck-import'" />
      <div v-if="uiStore.globalDragOver" class="drop-hint">
        <div class="drop-hint__inner">Drop .ydk to import</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.duel-room {
  --duel-room-aspect: 1.55;
  width: min(95vw, calc(100vh * var(--duel-room-aspect)));
  aspect-ratio: var(--duel-room-aspect) / 1;
  min-width: 1000px;
  min-height: 650px;
  display: grid;
  grid-template-columns: 22% 1fr 22%;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'opp-bar opp-bar opp-bar'
    'preview center right';
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  transition: border-color 120ms ease;
}

.duel-room--drag-over {
  border-color: var(--color-accent-blue);
}

.duel-room__opp-bar {
  grid-area: opp-bar;
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

.duel-room__bar-label {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
}

.duel-room__lp {
  font-family: var(--font-mono);
  color: var(--color-accent-gold);
  font-size: 13px;
}

.duel-room__preview {
  grid-area: preview;
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-preview);
  overflow: hidden;
}

.duel-room__right {
  grid-area: right;
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.duel-room__log-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.duel-room__player-bar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-field-edge);
  background: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  z-index: var(--z-bars);
}

.duel-room__player-bar-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 12px;
}

.duel-room__player-bar-row--muted {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-dim);
}

.duel-room__center {
  grid-area: center;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 4fr 1fr;
  gap: var(--space-2);
}

.duel-room__playmat-frame {
  position: relative;
  min-height: 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;
}

.duel-room__hand {
  min-height: 0;
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  display: flex;
}

.duel-room__placeholder {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  opacity: 0.5;
}

.drop-hint {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-toast);
}

.drop-hint__inner {
  padding: 12px 24px;
  background: var(--color-accent-blue);
  color: #0a0e15;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.05em;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
</style>
