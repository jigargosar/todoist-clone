import * as actions from './actions'
import * as effects from './effects'
import { state } from './state'
import { json} from 'overmind'
import { OnInitialize } from './index'

const onInitialize: OnInitialize = async (
  { state, actions, effects },
  overmind,
) => {
  overmind.addFlushListener((_mutation, _paths, _flushId, _isAsync) => {
    effects.debouncedCacheStoreState(json(overmind.state))
  })
}

export { onInitialize, state, actions, effects }
