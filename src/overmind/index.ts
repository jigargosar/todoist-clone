import * as actions from './actions'
import { defaultState, State } from './state'
import pick from 'ramda/es/pick'

const debounce = require('lodash.debounce')

function cacheStoreState(state: State) {
  const serializedModel = JSON.stringify(state)
  if (serializedModel) {
    localStorage.setItem('todoist-clone-model', serializedModel)
  }
}
export const debouncedCacheStoreState = debounce(cacheStoreState, 1000)
function getCachedState() {
  const parsedState = JSON.parse(
    localStorage.getItem('todoist-clone-model') || '{}',
  )
  return pick(Object.keys(defaultState), parsedState)
}

const state=  {
...defaultState,
...getCachedState(),
}

export  {
  state,
  actions
}