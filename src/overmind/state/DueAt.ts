export type DueAt =  null | { tag: 'Date'; ts: number }

export const DueAt = {
  notSet: (): DueAt => null,
  dateFromTS: (ts: number): DueAt => ({ tag: 'Date', ts }),
}
