<script setup lang="ts">
defineProps<{
  label: string
  disabled?: boolean
  tooltip?: string
}>()

defineEmits<{ (e: 'select'): void }>()
</script>

<template>
  <button
    type="button"
    class="ctx-item"
    :class="{ 'ctx-item--disabled': disabled }"
    :title="tooltip"
    :disabled="disabled"
    @click.stop="$emit('select')"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.ctx-item {
  display: block;
  width: 100%;
  padding: 6px 10px;
  background: transparent;
  border: none;
  color: var(--color-text);
  text-align: left;
  font-size: 11px;
  letter-spacing: 0.02em;
  cursor: pointer;
  border-radius: var(--radius-sm);
  white-space: normal;
  overflow-wrap: break-word;
}

.ctx-item:hover:not(.ctx-item--disabled) {
  background: var(--color-accent-blue);
  color: #0a0e15;
}

.ctx-item--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
