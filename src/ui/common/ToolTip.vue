<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    label: string
    placement?: 'top' | 'bottom'
  }>(),
  { placement: 'top' },
)

const shown = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function show(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    shown.value = true
    timer = null
  }, 300)
}

function hide(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  shown.value = false
}
</script>

<template>
  <span
    class="tooltip"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <span v-if="shown" class="tooltip__bubble" :class="`tooltip__bubble--${placement}`" role="tooltip">
      {{ label }}
    </span>
  </span>
</template>

<style scoped>
.tooltip {
  position: relative;
  display: inline-flex;
}

.tooltip__bubble {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: rgba(15, 20, 30, 0.95);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 11px;
  letter-spacing: 0.03em;
  white-space: nowrap;
  pointer-events: none;
  z-index: var(--z-toast);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.tooltip__bubble--top {
  bottom: calc(100% + 6px);
}

.tooltip__bubble--bottom {
  top: calc(100% + 6px);
}
</style>
