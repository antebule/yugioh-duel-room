<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import PlayMat from '@/ui/field/PlayMat.vue'
import Hand from '@/ui/hand/Hand.vue'
import DuelLog from '@/ui/log/DuelLog.vue'
import CardPreviewPanel from '@/ui/preview/CardPreviewPanel.vue'
import DeckImportModal from '@/ui/modals/DeckImportModal.vue'
import EmptyStateOverlay from '@/ui/modals/EmptyStateOverlay.vue'
import ZoneBrowserModal from '@/ui/modals/ZoneBrowserModal.vue'
import ResetConfirmModal from '@/ui/modals/ResetConfirmModal.vue'
import ContextMenu from '@/ui/menu/ContextMenu.vue'
import OpponentInfoBar from '@/ui/bars/OpponentInfoBar.vue'
import PlayerInfoBar from '@/ui/bars/PlayerInfoBar.vue'
import DuelActions from '@/ui/bars/DuelActions.vue'
import { useDeckStore } from '@/state/deckStore'
import { useUiStore } from '@/state/uiStore'
import { useDeckImport } from '@/composables/useDeckImport'

const deckStore = useDeckStore()
const uiStore = useUiStore()

useDeckImport()

const pickerHint = computed(() => {
  const p = uiStore.zonePicker
  if (!p) return null
  switch (p.kind) {
    case 'normal_summon':
      return 'Click a Monster Zone to Normal Summon · Esc to cancel'
    case 'special_summon':
      return 'Click a Monster / Extra Monster Zone to Special Summon · Esc to cancel'
    case 'set_monster':
      return 'Click a Monster Zone to Set · Esc to cancel'
    case 'activate':
      return 'Click a Spell/Trap Zone to Activate · Esc to cancel'
    case 'set_st':
      return 'Click a Spell/Trap Zone to Set · Esc to cancel'
    case 'activate_field':
      return 'Click the Field Spell Zone to Activate · Esc to cancel'
    case 'move_zone':
      return 'Click a destination zone · Esc to cancel'
    default:
      return null
  }
})

function onGlobalKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && uiStore.zonePicker) {
    uiStore.cancelZonePicker()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<template>
  <div class="duel-room" :class="{ 'duel-room--drag-over': uiStore.globalDragOver }">
    <OpponentInfoBar class="duel-room__opp-bar" />

    <aside class="duel-room__preview">
      <div class="duel-room__preview-inner">
        <CardPreviewPanel />
      </div>
      <DuelActions />
    </aside>

    <main class="duel-room__center">
      <div class="duel-room__playmat-frame">
        <PlayMat />
        <EmptyStateOverlay v-if="!deckStore.currentDeck" />
      </div>
      <section class="duel-room__hand">
        <Hand />
      </section>
    </main>

    <aside class="duel-room__right">
      <div class="duel-room__log-inner">
        <DuelLog />
      </div>
      <PlayerInfoBar />
    </aside>

    <Teleport to="body">
      <DeckImportModal v-if="uiStore.modal === 'deck-import'" />
      <ResetConfirmModal v-if="uiStore.modal === 'reset-confirm'" />
      <ZoneBrowserModal v-if="uiStore.zoneBrowserZoneId" />
      <div v-if="uiStore.globalDragOver" class="drop-hint">
        <div class="drop-hint__inner">Drop .ydk to import</div>
      </div>
      <div v-if="pickerHint" class="picker-hint">
        <div class="picker-hint__inner">{{ pickerHint }}</div>
      </div>
    </Teleport>

    <ContextMenu />
  </div>
</template>

<style scoped>
.duel-room {
  --duel-room-aspect: 1.65;
  width: min(95vw, calc(100vh * var(--duel-room-aspect)));
  aspect-ratio: var(--duel-room-aspect) / 1;
  min-width: 1000px;
  min-height: 650px;
  display: grid;
  /* Center column gets a 590px floor (keeps cells ≈82px at the min viewport
     with the asymmetric playmat); sides take up to 20% only once that floor
     is satisfied, so they widen on larger screens without crowding the field. */
  grid-template-columns: minmax(0, 20%) minmax(590px, 1fr) minmax(0, 20%);
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'opp-bar opp-bar opp-bar'
    'preview center right';
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  transition: border-color 120ms ease;
}

.duel-room--drag-over {
  border-color: var(--color-accent-blue);
}

.duel-room__opp-bar {
  grid-area: opp-bar;
}

.duel-room__preview {
  grid-area: preview;
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  z-index: var(--z-preview);
  overflow: hidden;
  min-height: 0;
}

.duel-room__preview-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.duel-room__right {
  grid-area: right;
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.duel-room__log-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.duel-room__center {
  grid-area: center;
  min-width: 0;
  min-height: 0;
  display: grid;
  /* Frame is aspect-locked to 7:5 and sizes off the column width;
     hand row fills whatever vertical space is left, no gap between them. */
  /* minmax(0, 1fr) on the hand row prevents flex/aspect-ratio intrinsic
     sizing of the cards from feeding back into the grid track size. */
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-2);
}

.duel-room__playmat-frame {
  position: relative;
  min-height: 0;
  min-width: 0;
  aspect-ratio: 548 / 430;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;
}

.duel-room__hand {
  min-height: 0;
  background: var(--color-field);
  border: 1px solid var(--color-field-edge);
  border-radius: var(--radius-md);
  display: flex;
}

.drop-hint {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-toast);
}

.drop-hint__inner {
  padding: 12px 24px;
  background: var(--color-accent-blue);
  color: #0a0e15;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.05em;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.picker-hint {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: var(--z-toast);
}

.picker-hint__inner {
  padding: 8px 16px;
  background: rgba(15, 20, 30, 0.92);
  border: 1px solid var(--color-accent-blue);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: 12px;
  letter-spacing: 0.04em;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
</style>
