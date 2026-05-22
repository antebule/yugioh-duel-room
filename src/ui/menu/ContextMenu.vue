<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '@/state/uiStore'
import { useDuelStore } from '@/state/duelStore'
import { useCardCacheStore } from '@/state/cardCacheStore'
import { useContextMenu } from '@/composables/useContextMenu'
import { buildMenuItems } from './contextMenuItems'
import ContextMenuItem from './ContextMenuItem.vue'

const ui = useUiStore()
const duel = useDuelStore()
const cardCache = useCardCacheStore()
const { onMenuEnter, onMenuLeave, closeNow } = useContextMenu()

const instance = computed(() => {
  const uuid = ui.contextMenuInstanceUuid
  return uuid ? duel.state.instances[uuid] : null
})

const card = computed(() => (instance.value ? cardCache.byId(instance.value.cardId) : undefined))

const items = computed(() => (instance.value ? buildMenuItems(instance.value, card.value) : []))

const style = computed(() => {
  const a = ui.contextMenuAnchor
  if (!a) return {}
  return {
    left: `${a.x + a.width / 2}px`,
    top: `${a.y}px`,
  }
})

function onSelect(run: () => void): void {
  run()
  closeNow()
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && ui.contextMenuInstanceUuid) {
    closeNow()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="instance"
      class="ctx-menu"
      :style="style"
      @mouseenter="onMenuEnter"
      @mouseleave="onMenuLeave"
    >
      <div class="ctx-menu__panel">
        <ContextMenuItem
          v-for="(item, i) in items"
          :key="i"
          :label="item.label"
          :disabled="item.disabled"
          :tooltip="item.tooltip"
          @select="onSelect(item.run)"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ctx-menu {
  /* Anchored at the card's top edge (style.top = cardTop, style.left = cardCenter).
     translateY(-100%) lifts the wrapper so its bottom sits flush against cardTop. */
  position: fixed;
  transform: translate(-50%, -100%);
  z-index: var(--z-menu);
}

.ctx-menu__panel {
  min-width: 140px;
  padding: 4px;
  background: rgba(15, 20, 30, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
</style>
