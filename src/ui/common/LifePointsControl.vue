<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Owner } from '@/duel/types'
import { useDuelStore } from '@/state/duelStore'

const props = withDefaults(
  defineProps<{
    owner: Owner
    interactive?: boolean
  }>(),
  { interactive: true },
)

const duelStore = useDuelStore()
const lp = computed(() => duelStore.state.lifePoints[props.owner])

const amountText = ref('1000')
const parsedAmount = computed(() => {
  const n = Number.parseInt(amountText.value, 10)
  return Number.isFinite(n) && n > 0 ? n : null
})
const canApply = computed(() => parsedAmount.value !== null)

function onSubtract(): void {
  if (parsedAmount.value === null) return
  duelStore.adjustLife(props.owner, -parsedAmount.value)
}

function onAdd(): void {
  if (parsedAmount.value === null) return
  duelStore.adjustLife(props.owner, parsedAmount.value)
}

function onAmountInput(e: Event): void {
  const target = e.target as HTMLInputElement
  amountText.value = target.value.replace(/[^0-9]/g, '')
  target.value = amountText.value
}
</script>

<template>
  <div class="lp" :class="{ 'lp--readonly': !interactive }">
    <span class="lp__value" :class="{ 'lp--low': lp <= 2000 }">{{ lp }}</span>
    <div v-if="interactive" class="lp__controls">
      <input
        class="lp__amount"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        :value="amountText"
        aria-label="LP amount"
        @input="onAmountInput"
      />
      <button
        type="button"
        class="lp__btn"
        :disabled="!canApply"
        aria-label="Subtract LP"
        @click="onSubtract"
      >
        −
      </button>
      <button
        type="button"
        class="lp__btn"
        :disabled="!canApply"
        aria-label="Add LP"
        @click="onAdd"
      >
        +
      </button>
    </div>
  </div>
</template>

<style scoped>
.lp {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.lp__value {
  font-family: var(--font-mono);
  color: var(--color-accent-gold);
  font-size: 14px;
  min-width: 4ch;
  text-align: right;
  transition: color 120ms ease;
}

.lp__value.lp--low {
  color: var(--color-danger);
}

.lp__controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.lp__amount {
  width: 56px;
  height: 22px;
  padding: 0 6px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: right;
  outline: none;
}

.lp__amount:focus {
  border-color: var(--color-accent-blue);
}

.lp__btn {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 100ms ease,
    border-color 100ms ease;
}

.lp__btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-accent-blue);
}

.lp__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
