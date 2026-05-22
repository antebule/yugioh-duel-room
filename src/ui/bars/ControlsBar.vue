<script setup lang="ts">
import { computed } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import type { Phase } from '@/duel/types'
import ToolTip from '@/ui/common/ToolTip.vue'

const props = defineProps<{
  segment: 'left' | 'middle' | 'right'
}>()

const duelStore = useDuelStore()

const PHASE_LABELS: Record<Phase, string> = {
  DP: 'Draw Phase',
  SP: 'Standby Phase',
  M1: 'Main Phase 1',
  BP: 'Battle Phase',
  M2: 'Main Phase 2',
  EP: 'End Phase',
}

const SEGMENT_PHASES: Record<typeof props.segment, Phase[]> = {
  left: ['DP', 'SP'],
  middle: ['M1', 'BP'],
  right: ['M2', 'EP'],
}

const phases = computed(() => SEGMENT_PHASES[props.segment])
const currentPhase = computed(() => duelStore.state.phase)

function onPhaseClick(phase: Phase): void {
  duelStore.setPhase(phase)
}

function onRollDice(): void {
  duelStore.rollDice()
}

function onCoinToss(): void {
  duelStore.coinToss()
}
</script>

<template>
  <div class="controls" :class="`controls--${segment}`">
    <div class="controls__phases">
      <ToolTip v-for="p in phases" :key="p" :label="PHASE_LABELS[p]" placement="top">
        <button
          type="button"
          class="controls__phase"
          :class="{ 'controls__phase--active': currentPhase === p }"
          :aria-pressed="currentPhase === p"
          :aria-label="PHASE_LABELS[p]"
          @click="onPhaseClick(p)"
        >
          {{ p }}
        </button>
      </ToolTip>
    </div>

    <div class="controls__actions">
      <ToolTip v-if="segment === 'left'" label="Roll Dice" placement="bottom">
        <button type="button" class="controls__action" aria-label="Roll Dice" @click="onRollDice">
          🎲
        </button>
      </ToolTip>
      <ToolTip v-else-if="segment === 'right'" label="Coin Toss" placement="bottom">
        <button type="button" class="controls__action" aria-label="Coin Toss" @click="onCoinToss">
          🪙
        </button>
      </ToolTip>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 100%;
  width: 100%;
  padding: 2px;
  z-index: var(--z-bars);
}

.controls__phases {
  display: flex;
  gap: 4px;
  align-items: center;
}

.controls__actions {
  display: flex;
  gap: 4px;
  align-items: center;
  min-height: 30px;
}

.controls__phase {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #6a2c2c, #2a0e0e);
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.78);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  line-height: 1;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease;
}

.controls__phase:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: #ffffff;
}

.controls__phase--active {
  background: radial-gradient(circle at 30% 30%, #ff5050, #8a1010);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow:
    0 0 8px rgba(255, 80, 80, 0.5),
    inset 0 1px 2px rgba(255, 255, 255, 0.25);
}

.controls__action {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-field-edge);
  color: var(--color-text);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    background 100ms ease,
    border-color 100ms ease;
}

.controls__action:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-accent-blue);
}
</style>
