export type DueAt = { tag: 'NotSet' } | { tag: 'Date'; ts: number }

export const DueAt = {
  notSet: (): DueAt => ({ tag: 'NotSet' }),
  dateFromTS: (ts: number): DueAt => ({ tag: 'Date', ts }),
}
