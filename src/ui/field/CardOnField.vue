<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDuelStore } from '@/state/duelStore'
import { useCardCacheStore } from '@/state/cardCacheStore'
import { useUiStore } from '@/state/uiStore'
import { useContextMenu } from '@/composables/useContextMenu'
import cardBackUrl from '@/assets/images/card-back.png'
import OverlayChip from './OverlayChip.vue'

const props = defineProps<{
  instanceUuid: string
}>()

const duelStore = useDuelStore()
const cardCacheStore = useCardCacheStore()
const uiStore = useUiStore()
const ctx = useContextMenu()

const instance = computed(() => duelStore.state.instances[props.instanceUuid])
const card = computed(() =>
  instance.value ? cardCacheStore.byId(instance.value.cardId) : undefined,
)

const isDefense = computed(() => instance.value?.position.includes('defense') ?? false)
const isFaceUp = computed(() => instance.value?.faceUp ?? false)

const materials = computed(() => instance.value?.overlayUuids ?? [])
const hasMaterials = computed(() => materials.value.length > 0)

// Pickers that select a face-up player MZ/EMZ monster (rather than an empty
// zone). Click on this card is intercepted to run the picker action.
const isOverlayPickerTarget = computed(() => {
  const picker = uiStore.zonePicker
  const inst = instance.value
  if (!picker || !inst) return false
  if (picker.kind !== 'overlay_target' && picker.kind !== 'xyz_summon') return false
  if (inst.controller !== 'player' || !inst.faceUp) return false
  if (inst.overlayHostUuid) return false
  const kind = inst.zoneId.split(':')[1]
  if (kind !== 'MZ' && kind !== 'EMZ') return false
  if (picker.kind === 'overlay_target' && picker.instanceUuid === inst.uuid) return false
  return true
})

function onClick(e: MouseEvent): void {
  if (!isOverlayPickerTarget.value) return
  const picker = uiStore.zonePicker
  const inst = instance.value
  if (!picker || !inst) return
  e.stopPropagation()
  if (picker.kind === 'overlay_target') {
    // The right-clicked monster (picker.instanceUuid) is the host; the
    // clicked monster (inst.uuid) becomes its material.
    duelStore.attachAsMaterial(picker.instanceUuid, inst.uuid)
  } else if (picker.kind === 'xyz_summon' && picker.position) {
    const position = picker.position === 'face-up-defense' ? 'face-up-defense' : 'face-up-attack'
    duelStore.xyzSummonOnto(picker.instanceUuid, inst.uuid, position)
  }
  uiStore.cancelZonePicker()
}

// Preview (right-side card info panel) is hidden for DECK and EXTRA so we don't
// leak the next draw or the extra-deck contents.
const previewHidden = computed(() => {
  const z = instance.value?.zoneId ?? ''
  return z.includes(':DECK:') || z.includes(':EXTRA:')
})

// Context menu is hidden for EXTRA, and for opponent's DECK. Player's DECK top
// shows the deck context menu (Draw / Shuffle / Mill / Banish / View).
const contextMenuHidden = computed(() => {
  const z = instance.value?.zoneId ?? ''
  if (z.includes(':EXTRA:')) return true
  if (z.includes(':DECK:') && instance.value?.owner !== 'player') return true
  return false
})

// Bound to whichever element renders the host (face-up img / face-down back /
// loading div). Used both for hover-to-menu and as the menu's anchor element,
// so the menu lines up with the visual card rather than the full zone — this
// also matters when materials are attached and the host shifts to the left.
const hostEl = ref<HTMLElement | null>(null)

function onEnter(): void {
  if (!previewHidden.value) uiStore.hoverInstance(props.instanceUuid)
  if (!contextMenuHidden.value && hostEl.value) {
    ctx.onCardEnter(props.instanceUuid, hostEl.value)
  }
}
function onLeave(): void {
  if (!previewHidden.value) uiStore.unhoverInstance(props.instanceUuid)
  if (!contextMenuHidden.value) ctx.onCardLeave(props.instanceUuid)
}
</script>

<template>
  <div
    v-if="instance"
    class="card-on-field"
    :class="{
      'card-on-field--defense': isDefense,
      'card-on-field--overlay-target': isOverlayPickerTarget,
      'card-on-field--has-materials': hasMaterials,
    }"
    :title="card?.name ?? `#${instance.cardId}`"
    @click="onClick"
  >
    <img
      v-if="isFaceUp && card"
      ref="hostEl"
      :src="card.imageUrl"
      :alt="card.name"
      class="card-on-field__img"
      loading="lazy"
      draggable="false"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
    />
    <img
      v-else-if="!isFaceUp"
      ref="hostEl"
      :src="cardBackUrl"
      alt=""
      class="card-on-field__back"
      loading="lazy"
      draggable="false"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
    />
    <div
      v-else
      ref="hostEl"
      class="card-on-field__loading"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
    >
      #{{ instance.cardId }}
    </div>
    <OverlayChip
      v-for="(matUuid, i) in materials"
      :key="matUuid"
      :material-uuid="matUuid"
      :index="i"
      :count="materials.length"
    />
  </div>
</template>

<style scoped>
.card-on-field {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-card);
}

/* With materials, the host slides to the left edge so chips can fan rightward
   within the zone. Chips are absolute-positioned and ignore flex alignment. */
.card-on-field--has-materials {
  justify-content: flex-start;
}

/* In defense, the host's visual rotates around its layout-box center, which
   would push the rotated landscape card off the zone's left edge if it were
   still left-aligned. Re-center it so the rotated card sits inside the zone. */
.card-on-field--has-materials.card-on-field--defense {
  justify-content: center;
}

/* Defense position rotates ONLY the host visual; overlay chips stay upright
   in face-up-attack orientation. Rotation is applied to the inner host
   element rather than .card-on-field so chips (its absolute-positioned
   siblings) are not affected. */
.card-on-field--defense .card-on-field__img,
.card-on-field--defense .card-on-field__back,
.card-on-field--defense .card-on-field__loading {
  transform: rotate(-90deg);
}

.card-on-field--overlay-target {
  cursor: pointer;
  outline: 2px solid var(--color-accent-blue);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
  animation: card-target-pulse 1.2s ease-in-out infinite;
}

@keyframes card-target-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(77, 163, 255, 0.45); }
  50% { box-shadow: 0 0 18px rgba(77, 163, 255, 0.75); }
}

/* Host elements are sized to the visual card so their hit area matches what
   the user sees — important when materials are stacked behind/beside them. */
.card-on-field__img,
.card-on-field__back {
  height: 100%;
  aspect-ratio: var(--card-ratio, 59 / 86);
  border-radius: var(--radius-sm);
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.card-on-field__loading {
  height: 100%;
  aspect-ratio: var(--card-ratio, 59 / 86);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed var(--color-field-edge);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: 10px;
}
</style>
