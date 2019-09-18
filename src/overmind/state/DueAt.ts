export type DueAt = { tag: 'NoDue' } | { tag: 'Date'; ts: number }

export const DueAt = {
  notSet: (): DueAt => ({ tag: 'NoDue' }),
  dateFromTS: (ts: number): DueAt => ({ tag: 'Date', ts }),
}
