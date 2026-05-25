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

</style>
