<script setup lang="ts">
import { computed } from 'vue'
import type { ZoneDef } from '@/duel/zoneCatalog'
import { useDuelStore } from '@/state/duelStore'
import { useUiStore } from '@/state/uiStore'
import type { ZonePickerKind } from '@/state/uiStore'
import CardOnField from './CardOnField.vue'

const props = defineProps<{
  zone: ZoneDef
}>()

const duelStore = useDuelStore()
const uiStore = useUiStore()

const zoneState = computed(() => duelStore.state.zones[props.zone.id])
const topInstanceUuid = computed(() => {
  const cards = zoneState.value?.cards
  return cards && cards.length > 0 ? cards[cards.length - 1]! : null
})
const cardCount = computed(() => zoneState.value?.cards.length ?? 0)

const STACKED_ZONE_KINDS = ['DECK', 'GY', 'BANISHED', 'EXTRA'] as const
const isBrowsable = computed(
  () =>
    (STACKED_ZONE_KINDS as readonly string[]).includes(props.zone.kind) &&
    cardCount.value > 0,
)

// Deck and Extra Deck render as a physical stack of cards: offset card-back
// layers peek out behind the top card, and the pile grows with the card count.
// The player's Deck, Extra Deck, Graveyard and Banished always display their
// card count. Opponent zones never show a count.
const showsCount = computed(
  () =>
    props.zone.owner === 'player' &&
    (STACKED_ZONE_KINDS as readonly string[]).includes(props.zone.kind),
)

const STACK_STEP = 1.6 // px between consecutive cards in the pile

const stackLayers = computed(() => {
  const kind = props.zone.kind
  if ((kind !== 'DECK' && kind !== 'EXTRA') || cardCount.value <= 1) return 0
  // Capped at 9 so layers stay below the top card (z-index var(--z-card) = 10).
  return Math.min(9, Math.round(cardCount.value / 4))
})

// Total depth the pile occupies. The top card and layers shrink by ~1.5x this
// so the whole stack — offsets included — stays inside the zone bounds.
const pileDepth = computed(() => stackLayers.value * STACK_STEP)
const stackedHeight = computed(() => `calc(100% - ${pileDepth.value * 1.5}px)`)

// Offset (in px, from the zone center) for stack element `i`: 0 = top card,
// 1..N = layers behind it. Deck fans left, Extra Deck right; the pile is
// centered so the top card shifts one way and the deepest layer the other.
function stackOffset(i: number): { x: number; y: number } {
  const dir = props.zone.kind === 'DECK' ? -1 : 1
  const half = pileDepth.value / 2
  return { x: dir * (i * STACK_STEP - half), y: i * STACK_STEP - half }
}

// Layers are absolutely positioned at the zone center, so they carry the
// -50% centering translate; the top card is flex-centered and only needs
// the offset.
function layerStyle(i: number): Record<string, string | number> {
  const { x, y } = stackOffset(i)
  return {
    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
    height: stackedHeight.value,
    zIndex: stackLayers.value - i + 1,
  }
}

const EMPTY_STYLE: Record<string, string> = {}
const topCardStyle = computed<Record<string, string>>(() => {
  if (stackLayers.value === 0) return EMPTY_STYLE
  const { x, y } = stackOffset(0)
  return { transform: `translate(${x}px, ${y}px)`, height: stackedHeight.value }
})
// The badge is absolutely positioned (-50% centered) like the layers.
const badgeStyle = computed<Record<string, string>>(() => {
  if (stackLayers.value === 0) return EMPTY_STYLE
  const { x, y } = stackOffset(0)
  return { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }
})

const isPickerTarget = computed(() => {
  const picker = uiStore.zonePicker
  if (!picker) return false
  // Overlay/XYZ pickers target a face-up monster card, not an empty zone.
  // CardOnField intercepts those clicks; zones should not highlight.
  if (
    picker.kind === 'overlay_target' ||
    picker.kind === 'xyz_summon' ||
    picker.kind === 'attach_target'
  )
    return false
  if (props.zone.owner !== 'player') return false
  if (!picker.validZoneKinds.includes(props.zone.kind)) return false
  if (picker.validZoneIds && !picker.validZoneIds.includes(props.zone.id)) return false
  return cardCount.value === 0
})

function runPickerAction(kind: ZonePickerKind, instanceUuid: string, zoneId: typeof props.zone.id): void {
  switch (kind) {
    case 'normal_summon':
      duelStore.normalSummon(instanceUuid, zoneId)
      return
    case 'special_summon': {
      const position =
        uiStore.zonePicker?.position === 'face-up-defense'
          ? 'face-up-defense'
          : 'face-up-attack'
      duelStore.specialSummon(instanceUuid, zoneId, position)
      return
    }
    case 'set_monster':
      duelStore.setMonster(instanceUuid, zoneId)
      return
    case 'activate':
      duelStore.activateSpellTrap(instanceUuid, zoneId)
      return
    case 'set_st':
      duelStore.setSpellTrap(instanceUuid, zoneId)
      return
    case 'move_zone':
      duelStore.moveZone(instanceUuid, zoneId)
      return
  }
}

function onZoneClick(): void {
  if (isPickerTarget.value) {
    const picker = uiStore.zonePicker
    if (!picker) return
    runPickerAction(picker.kind, picker.instanceUuid, props.zone.id)
    uiStore.cancelZonePicker()
    return
  }
  if (isBrowsable.value) {
    uiStore.openZoneBrowser(props.zone.id)
  }
}
</script>

<template>
  <div
    class="zone"
    :class="[
      `zone--${zone.kind.toLowerCase()}`,
      {
        'zone--filled': topInstanceUuid,
        'zone--picker-target': isPickerTarget,
        'zone--browsable': isBrowsable && !isPickerTarget,
      },
    ]"
    :data-zone-id="zone.id"
    @click="onZoneClick"
  >
    <div
      v-for="i in stackLayers"
      :key="i"
      class="zone__stack-layer"
      :style="layerStyle(i)"
    />
    <CardOnField
      v-if="topInstanceUuid"
      :instance-uuid="topInstanceUuid"
      :style="topCardStyle"
    />
    <span v-if="showsCount" class="zone__count" :style="badgeStyle">{{ cardCount }}</span>
  </div>
</template>

<style scoped>
.zone {
  position: relative;
  width: 100%;
  height: 100%;
  border: 3px solid var(--color-field-edge);
  border-radius: var(--radius-sm);
  padding: 1px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-field);
}

.zone--filled {
  background: transparent;
}

/* Stack-of-cards layers for Deck / Extra Deck: card-back layers offset behind
   the top card so it reads as a physical pile. Count and offsets are driven by
   layerStyle() in script. The top CardOnField (z-index: var(--z-card)) and the
   count badge (var(--z-card-hover)) sit above these layers. */
.zone__stack-layer {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 100%;
  aspect-ratio: var(--card-ratio, 59 / 86);
  border-radius: var(--radius-sm);
  background: url('../../assets/images/card-back.png') center / cover no-repeat;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.zone--mz {
  border-color: #6d82b0;
}

.zone--st {
  border-color: #3d9b9b;
}

.zone--field_spell {
  border-color: var(--color-accent-gold);
}

.zone--emz {
  border-color: #8a7fd6;
}

.zone--picker-target {
  border-color: var(--color-accent-blue);
  border-style: solid;
  background: rgba(77, 163, 255, 0.15);
  box-shadow: 0 0 12px rgba(77, 163, 255, 0.45) inset;
  cursor: pointer;
  animation: zone-pulse 1.2s ease-in-out infinite;
}

.zone--browsable {
  cursor: pointer;
}

.zone--picker-target:hover {
  background: rgba(77, 163, 255, 0.28);
}

@keyframes zone-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(77, 163, 255, 0.35) inset; }
  50% { box-shadow: 0 0 16px rgba(77, 163, 255, 0.6) inset; }
}

.zone__count {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: var(--z-card-hover);
  color: var(--color-text);
  font-family: var(--font-mono);
  /* Scale with the field (cqh of the playmat frame) so it stays proportional
     across screen sizes; clamped to sane bounds at the extremes. */
  font-size: clamp(12px, 4cqh, 30px);
  font-weight: 700;
  letter-spacing: 0.04em;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95), 0 0 6px rgba(0, 0, 0, 0.8);
}

</style>
