<script setup lang="ts">
import { computed } from 'vue'
import type { ZoneDef } from '@/duel/zoneCatalog'
import { ZONE_KIND_LABEL } from '@/duel/zoneCatalog'
import { useDuelStore } from '@/state/duelStore'
import { useUiStore } from '@/state/uiStore'
import type { ZonePickerKind } from '@/state/uiStore'
import CardOnField from './CardOnField.vue'

const props = defineProps<{
  zone: ZoneDef
}>()

const duelStore = useDuelStore()
const uiStore = useUiStore()

const label = computed(() => ZONE_KIND_LABEL[props.zone.kind])
const zoneState = computed(() => duelStore.state.zones[props.zone.id])
const topInstanceUuid = computed(() => {
  const cards = zoneState.value?.cards
  return cards && cards.length > 0 ? cards[cards.length - 1]! : null
})
const cardCount = computed(() => zoneState.value?.cards.length ?? 0)

const hasDeckActions = computed(
  () =>
    props.zone.kind === 'DECK' && props.zone.owner === 'player' && cardCount.value > 0,
)

const STACKED_ZONE_KINDS = ['DECK', 'GY', 'BANISHED', 'EXTRA'] as const
const isBrowsable = computed(
  () =>
    (STACKED_ZONE_KINDS as readonly string[]).includes(props.zone.kind) &&
    cardCount.value > 0,
)

const isPickerTarget = computed(() => {
  const picker = uiStore.zonePicker
  if (!picker) return false
  if (props.zone.owner !== 'player') return false
  if (!picker.validZoneKinds.includes(props.zone.kind)) return false
  return cardCount.value === 0
})

function onDraw(): void {
  duelStore.drawCard('player')
}

function onShuffle(): void {
  duelStore.shuffleDeck('player')
}

function runPickerAction(kind: ZonePickerKind, instanceUuid: string, zoneId: typeof props.zone.id): void {
  switch (kind) {
    case 'normal_summon':
      duelStore.normalSummon(instanceUuid, zoneId)
      return
    case 'special_summon':
      duelStore.specialSummon(instanceUuid, zoneId)
      return
    case 'set_monster':
      duelStore.setMonster(instanceUuid, zoneId)
      return
    case 'activate':
    case 'activate_field':
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
    <CardOnField v-if="topInstanceUuid" :instance-uuid="topInstanceUuid" />
    <span v-else class="zone__label">{{ label }}</span>
    <span v-if="cardCount > 1" class="zone__count">{{ cardCount }}</span>

    <div v-if="hasDeckActions" class="zone__menu">
      <button class="zone__menu-item" @click.stop="onDraw">Draw</button>
      <button class="zone__menu-item" @click.stop="onShuffle">Shuffle</button>
    </div>
  </div>
</template>

<style scoped>
.zone {
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px dashed var(--color-field-edge);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-field);
}

.zone--filled {
  border: none;
  background: transparent;
}

.zone__label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  opacity: 0.5;
  user-select: none;
}

.zone--field_spell {
  border-color: var(--color-accent-gold);
}

.zone--emz {
  border-color: var(--color-accent-blue);
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
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.78);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: var(--radius-sm);
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.zone__menu {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.78);
  border-radius: var(--radius-sm);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
  z-index: var(--z-menu);
}

.zone:hover .zone__menu {
  opacity: 1;
  pointer-events: auto;
}

.zone__menu-item {
  padding: 6px 14px;
  background: var(--color-accent-blue);
  color: #0a0e15;
  border-radius: var(--radius-sm);
  font-size: 11px;
  letter-spacing: 0.04em;
  font-weight: 500;
  cursor: pointer;
  min-width: 80px;
}

.zone__menu-item:hover {
  opacity: 0.9;
}
</style>
