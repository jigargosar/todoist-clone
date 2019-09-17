import { State } from './state'

const debounce = require('lodash.debounce')

function cacheStoreState(state: State) {
  const serializedModel = JSON.stringify(state)
  if (serializedModel) {
    localStorage.setItem('todoist-clone-model', serializedModel)
  }
}

export const debouncedCacheStoreState = debounce(cacheStoreState, 1000)

export function getCachedState() {
  return JSON.parse(
    localStorage.getItem('todoist-clone-model') || '{}',
  )
}
