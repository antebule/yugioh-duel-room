<script setup lang="ts">
import { computed } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import LifePointsControl from '@/ui/common/LifePointsControl.vue'
import type { Phase } from '@/duel/types'

const duelStore = useDuelStore()

const PHASE_LABELS: Record<Phase, string> = {
  DP: 'Draw',
  SP: 'Standby',
  M1: 'Main 1',
  BP: 'Battle',
  M2: 'Main 2',
  EP: 'End',
}

const turn = computed(() => duelStore.state.turn)
const phase = computed(() => duelStore.state.phase)
const phaseLabel = computed(() => PHASE_LABELS[phase.value])
</script>

<template>
  <footer class="player-bar">
    <div class="player-bar__row">
      <span class="player-bar__label">Player</span>
      <LifePointsControl owner="player" />
    </div>
    <div class="player-bar__row player-bar__row--muted">
      <span class="player-bar__turn">Turn {{ turn }}</span>
      <span class="player-bar__sep">·</span>
      <span class="player-bar__phase">
        <span class="player-bar__phase-code">{{ phase }}</span>
        <span class="player-bar__phase-name">{{ phaseLabel }}</span>
      </span>
    </div>
  </footer>
</template>

<style scoped>
.player-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-field-edge);
  background: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  z-index: var(--z-bars);
}

.player-bar__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 12px;
}

.player-bar__row--muted {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-dim);
  gap: var(--space-2);
}

.player-bar__label {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
  color: var(--color-text-dim);
}

.player-bar__sep {
  opacity: 0.4;
}

.player-bar__phase {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.player-bar__phase-code {
  color: var(--color-accent-blue);
  letter-spacing: 0.06em;
}

.player-bar__phase-name {
  opacity: 0.7;
}
</style>
