export type DueAt = { tag: 'NoDue' } | { tag: 'Date'; ts: number }

export const DueAt = {
  noDue: (): DueAt => ({ tag: 'NoDue' }),
  dateFromTS: (ts: number): DueAt => ({ tag: 'Date', ts }),
  toDateTS: (dueAt: DueAt) => {
    return dueAt.tag === 'Date' ? dueAt.ts : null
  },
}
