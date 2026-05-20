<script setup lang="ts">
import type { LogEntry } from '@/state/logStore'

defineProps<{
  entry: LogEntry
}>()

function formatTime(at: number): string {
  const d = new Date(at)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
</script>

<template>
  <li class="duel-log-entry">
    <span class="duel-log-entry__time">{{ formatTime(entry.at) }}</span>
    <span class="duel-log-entry__text">{{ entry.text }}</span>
  </li>
</template>

<style scoped>
.duel-log-entry {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  font-size: 12px;
  line-height: 1.4;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.duel-log-entry:last-child {
  border-bottom: none;
}

.duel-log-entry__time {
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: 11px;
  opacity: 0.6;
  flex-shrink: 0;
}

.duel-log-entry__text {
  color: var(--color-text);
  word-break: break-word;
}
</style>
