<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    size?: 'sm' | 'lg'
  }>(),
  { size: 'sm' },
)

const emit = defineEmits<{ close: [] }>()

function close(): void {
  emit('close')
}

function onScrimClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) close()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="modal-scrim" @click="onScrimClick">
    <div class="modal" :class="`modal--${props.size}`" role="dialog" aria-modal="true">
      <header class="modal__header">
        <h2 class="modal__title">{{ title }}</h2>
        <button class="modal__close" aria-label="Close" @click="close">×</button>
      </header>
      <div class="modal__body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-scrim);
  padding: var(--space-4);
}

.modal {
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-lg);
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  z-index: var(--z-modal);
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
}

.modal--sm {
  max-width: 560px;
}

.modal--lg {
  max-width: min(1100px, 92vw);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-field-edge);
  flex-shrink: 0;
}

.modal__title {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  font-weight: 500;
}

.modal__close {
  width: 28px;
  height: 28px;
  font-size: 22px;
  line-height: 1;
  color: var(--color-text-dim);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal__close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text);
}

.modal__body {
  padding: var(--space-4);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
</style>
