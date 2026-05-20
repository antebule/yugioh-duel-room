<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useLogStore } from '@/state/logStore'
import DuelLogEntry from './DuelLogEntry.vue'

const logStore = useLogStore()
const listEl = ref<HTMLElement | null>(null)

watch(
  () => logStore.entries.length,
  () => {
    nextTick(() => {
      if (listEl.value) {
        listEl.value.scrollTop = listEl.value.scrollHeight
      }
    })
  },
)
</script>

<template>
  <section class="duel-log">
    <header class="duel-log__header">Duel Log</header>
    <ul v-if="logStore.entries.length" ref="listEl" class="duel-log__list">
      <DuelLogEntry v-for="entry in logStore.entries" :key="entry.id" :entry="entry" />
    </ul>
    <div v-else class="duel-log__empty">No events yet.</div>
  </section>
</template>

<style scoped>
.duel-log {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.duel-log__header {
  padding: var(--space-2) var(--space-3);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  border-bottom: 1px solid var(--color-field-edge);
  flex-shrink: 0;
}

.duel-log__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-1) 0;
}

.duel-log__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--color-text-dim);
  opacity: 0.5;
  letter-spacing: 0.05em;
}
</style>
