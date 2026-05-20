<script setup lang="ts">
import PlayMat from '@/ui/field/PlayMat.vue'
import ControlsBar from '@/ui/bars/ControlsBar.vue'
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
        <span class="duel-room__placeholder">Hand</span>
      </section>
      <section class="duel-room__controls">
        <ControlsBar />
      </section>
    </main>

    <aside class="duel-room__log">
      <DuelLog />
    </aside>

    <footer class="duel-room__player-bar">
      <span class="duel-room__bar-label">Player</span>
      <span class="duel-room__lp">LP {{ duelStore.state.lifePoints.player }}</span>
      <span class="duel-room__phase">Turn {{ duelStore.state.turn }} · {{ duelStore.state.phase }}</span>
    </footer>

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
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    'opp-bar opp-bar opp-bar'
    'preview center log'
    'player-bar player-bar player-bar';
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

.duel-room__opp-bar,
.duel-room__player-bar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-3);
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  font-size: 12px;
  z-index: var(--z-bars);
}

.duel-room__opp-bar {
  grid-area: opp-bar;
  color: var(--color-text-dim);
}

.duel-room__player-bar {
  grid-area: player-bar;
  color: var(--color-text);
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

.duel-room__phase {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-dim);
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

.duel-room__log {
  grid-area: log;
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  display: flex;
  overflow: hidden;
}

.duel-room__center {
  grid-area: center;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.duel-room__playmat-frame {
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;
}

.duel-room__hand {
  min-height: 80px;
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.duel-room__controls {
  min-height: 36px;
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  flex-shrink: 0;
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
