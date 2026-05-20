export function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}

export function shuffled<T>(arr: readonly T[], rng: () => number): T[] {
  const copy = arr.slice()
  shuffleInPlace(copy, rng)
  return copy
}
