import * as actions from './actions'
import { debouncedCacheStoreState, state } from './state'
import { json, OnInitialize } from 'overmind'

const onInitialize: OnInitialize = async (
  { state, actions, effects },
  overmind,
) => {
  overmind.addFlushListener((_mutation, _paths, _flushId, _isAsync) => {
    debouncedCacheStoreState(json(overmind.state))
  })
}

export { onInitialize, state, actions }
