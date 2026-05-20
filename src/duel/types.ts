export type Owner = 'player' | 'opponent'

export type ZoneKind =
  | 'HAND'
  | 'DECK'
  | 'GY'
  | 'BANISHED'
  | 'EXTRA'
  | 'MZ'
  | 'EMZ'
  | 'ST'
  | 'FIELD_SPELL'

export type ZoneId = `${Owner}:${ZoneKind}:${number}`
