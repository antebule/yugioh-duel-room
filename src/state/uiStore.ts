import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FieldPosition, Owner, ZoneId, ZoneKind } from '@/duel/types'

export type ModalName = 'deck-import' | 'reset-confirm' | null

export interface ContextMenuAnchor {
  x: number
  y: number
  width: number
  height: number
}

export type ZonePickerKind =
  | 'normal_summon'
  | 'special_summon'
  | 'set_monster'
  | 'activate'
  | 'set_st'
  | 'move_zone'
  | 'overlay_target'
  | 'xyz_summon'
  | 'attach_target'

export interface ZonePicker {
  instanceUuid: string
  kind: ZonePickerKind
  validZoneKinds: ZoneKind[]
  // When set, restricts valid targets to these exact zones (e.g. the two
  // Pendulum Scale zones for a Pendulum Activate). Existing pickers leave it
  // undefined and are unaffected.
  validZoneIds?: ZoneId[]
  // For 'xyz_summon': position the XYZ should be summoned in (face-up-attack/defense).
  position?: FieldPosition
}

export const useUiStore = defineStore('ui', () => {
  const modal = ref<ModalName>(null)
  const globalDragOver = ref(false)

  const hoveredInstanceUuid = ref<string | null>(null)
  const previewedInstanceUuid = ref<string | null>(null)
  const previewSticky = ref(false)

  const contextMenuInstanceUuid = ref<string | null>(null)
  const contextMenuAnchor = ref<ContextMenuAnchor | null>(null)

  const zonePicker = ref<ZonePicker | null>(null)
  const zoneBrowserZoneId = ref<ZoneId | null>(null)

  const lastActivatedFieldSpellOwner = ref<Owner | null>(null)

  function openModal(name: Exclude<ModalName, null>): void {
    modal.value = name
  }

  function closeModal(): void {
    modal.value = null
  }

  function setGlobalDragOver(value: boolean): void {
    globalDragOver.value = value
  }

  function hoverInstance(uuid: string): void {
    hoveredInstanceUuid.value = uuid
    if (!previewSticky.value) {
      previewedInstanceUuid.value = uuid
    }
  }

  function unhoverInstance(uuid: string): void {
    if (hoveredInstanceUuid.value === uuid) {
      hoveredInstanceUuid.value = null
    }
  }

  function togglePreviewPin(): void {
    if (previewSticky.value) {
      previewSticky.value = false
      if (hoveredInstanceUuid.value) {
        previewedInstanceUuid.value = hoveredInstanceUuid.value
      }
    } else if (previewedInstanceUuid.value) {
      previewSticky.value = true
    }
  }

  function openContextMenu(instanceUuid: string, anchor: ContextMenuAnchor): void {
    contextMenuInstanceUuid.value = instanceUuid
    contextMenuAnchor.value = anchor
  }

  function closeContextMenu(): void {
    contextMenuInstanceUuid.value = null
    contextMenuAnchor.value = null
  }

  function startZonePicker(picker: ZonePicker): void {
    zonePicker.value = picker
  }

  function cancelZonePicker(): void {
    zonePicker.value = null
  }

  function openZoneBrowser(zoneId: ZoneId): void {
    zoneBrowserZoneId.value = zoneId
  }

  function closeZoneBrowser(): void {
    zoneBrowserZoneId.value = null
  }

  function setLastActivatedFieldSpellOwner(owner: Owner | null): void {
    lastActivatedFieldSpellOwner.value = owner
  }

  return {
    modal,
    globalDragOver,
    hoveredInstanceUuid,
    previewedInstanceUuid,
    previewSticky,
    contextMenuInstanceUuid,
    contextMenuAnchor,
    zonePicker,
    zoneBrowserZoneId,
    lastActivatedFieldSpellOwner,
    setLastActivatedFieldSpellOwner,
    openModal,
    closeModal,
    setGlobalDragOver,
    hoverInstance,
    unhoverInstance,
    togglePreviewPin,
    openContextMenu,
    closeContextMenu,
    startZonePicker,
    cancelZonePicker,
    openZoneBrowser,
    closeZoneBrowser,
  }
})
