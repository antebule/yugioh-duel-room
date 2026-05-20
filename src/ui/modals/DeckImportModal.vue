<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDeckStore } from '@/state/deckStore'
import { useUiStore } from '@/state/uiStore'
import { useCardCacheStore } from '@/state/cardCacheStore'
import ModalShell from './ModalShell.vue'

const deckStore = useDeckStore()
const uiStore = useUiStore()
const cardCacheStore = useCardCacheStore()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const errors = computed(() => {
  const r = deckStore.lastResult
  return r && !r.ok ? r.errors : []
})
const warnings = computed(() => deckStore.lastResult?.warnings ?? [])
const cardLoadingTotal = computed(() => cardCacheStore.loadingProgress.total)
const cardLoadingLoaded = computed(() => cardCacheStore.loadingProgress.loaded)

function close(): void {
  uiStore.closeModal()
}

async function handleFile(file: File): Promise<void> {
  const result = await deckStore.importFromFile(file)
  if (result.ok) close()
}

function onFilePicker(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void handleFile(file)
  input.value = ''
}

function onDrop(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) void handleFile(file)
}

function onDragOver(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = true
}

function onDragLeave(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false
}

function pickFile(): void {
  fileInput.value?.click()
}

async function loadRecent(key: string): Promise<void> {
  const ok = await deckStore.loadFromRecent(key)
  if (ok) close()
}

function removeRecent(key: string, e: MouseEvent): void {
  e.stopPropagation()
  deckStore.removeRecent(key)
}
</script>

<template>
  <ModalShell title="Import Deck" @close="close">
    <div
      class="dropzone"
      :class="{ 'dropzone--over': isDragOver, 'dropzone--loading': deckStore.loading }"
      role="button"
      tabindex="0"
      @click="pickFile"
      @keydown.enter.space.prevent="pickFile"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <template v-if="deckStore.loading || cardCacheStore.loading">
        <strong>Loading…</strong>
        <div v-if="cardLoadingTotal > 0" class="dropzone__hint">
          {{ cardLoadingLoaded }} / {{ cardLoadingTotal }} cards
        </div>
      </template>
      <template v-else>
        <strong>Drop a .ydk file here</strong>
        <div class="dropzone__hint">or click to choose</div>
      </template>
      <input
        ref="fileInput"
        type="file"
        accept=".ydk,text/plain"
        class="dropzone__input"
        @change="onFilePicker"
      />
    </div>

    <div v-if="errors.length" class="errors">
      <div v-for="(err, i) in errors" :key="i" class="errors__item">{{ err }}</div>
    </div>

    <details v-if="warnings.length" class="warnings">
      <summary>{{ warnings.length }} warning{{ warnings.length === 1 ? '' : 's' }}</summary>
      <div v-for="(w, i) in warnings" :key="i" class="warnings__item">{{ w }}</div>
    </details>

    <section v-if="deckStore.recent.length" class="recent">
      <h3 class="recent__title">Recent decks</h3>
      <ul class="recent__list">
        <li
          v-for="r in deckStore.recent"
          :key="r.key"
          class="recent__item"
          @click="loadRecent(r.key)"
        >
          <span class="recent__name">{{ r.name }}</span>
          <span class="recent__meta">
            M{{ r.cardCount.main }} · E{{ r.cardCount.extra }} · S{{ r.cardCount.side }}
          </span>
          <button class="recent__remove" @click="removeRecent(r.key, $event)">Remove</button>
        </li>
      </ul>
    </section>
  </ModalShell>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--color-field-edge);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  text-align: center;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
  outline: none;
  user-select: none;
}

.dropzone:hover,
.dropzone:focus-visible,
.dropzone--over {
  border-color: var(--color-accent-blue);
  background: rgba(77, 163, 255, 0.06);
}

.dropzone--loading {
  cursor: progress;
}

.dropzone__hint {
  font-size: 12px;
  color: var(--color-text-dim);
  margin-top: var(--space-2);
}

.dropzone__input {
  display: none;
}

.errors {
  margin-top: var(--space-3);
}
.errors__item {
  padding: var(--space-2);
  background: rgba(255, 90, 90, 0.08);
  border: 1px solid rgba(255, 90, 90, 0.3);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
  font-size: 12px;
  margin-bottom: var(--space-1);
}

.warnings {
  margin-top: var(--space-3);
  font-size: 12px;
  color: var(--color-text-dim);
}
.warnings summary {
  cursor: pointer;
  padding: var(--space-1) 0;
}
.warnings__item {
  padding: var(--space-1) var(--space-2);
}

.recent {
  margin-top: var(--space-5);
  border-top: 1px solid var(--color-field-edge);
  padding-top: var(--space-3);
}

.recent__title {
  margin: 0 0 var(--space-2);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-dim);
}

.recent__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 100ms;
}

.recent__item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.recent__name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent__meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-dim);
  flex-shrink: 0;
}

.recent__remove {
  padding: 2px 8px;
  font-size: 11px;
  color: var(--color-text-dim);
  border-radius: var(--radius-sm);
}

.recent__remove:hover {
  color: var(--color-danger);
  background: rgba(255, 90, 90, 0.08);
}
</style>
