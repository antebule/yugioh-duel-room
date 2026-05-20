import type { ZoneId } from './types'

export interface DevSeedEntry {
  passcode: number
  zoneId: ZoneId
}

export const DEV_SEED_BOARD: DevSeedEntry[] = [
  { passcode: 46986414, zoneId: 'player:MZ:0' }, // Dark Magician
  { passcode: 89631139, zoneId: 'player:MZ:1' }, // Blue-Eyes White Dragon
  { passcode: 74677422, zoneId: 'player:MZ:2' }, // Red-Eyes Black Dragon
  { passcode: 55144522, zoneId: 'player:ST:0' }, // Pot of Greed
  { passcode: 44095762, zoneId: 'player:ST:1' }, // Mirror Force
]

export const DEV_SEED_PASSCODES: number[] = DEV_SEED_BOARD.map((e) => e.passcode)
