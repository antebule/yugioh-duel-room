<script setup lang="ts">
import PlayMat from '@/ui/field/PlayMat.vue'
import ControlsBar from '@/ui/bars/ControlsBar.vue'
import DuelLog from '@/ui/log/DuelLog.vue'
import { useDuelStore } from '@/state/duelStore'

const duelStore = useDuelStore()
</script>

<template>
  <div class="duel-room">
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
</style>
