import * as actions from './actions'
import * as effects from './effects'
import { state } from './state'
import {
  IAction,
  IConfig,
  IDerive,
  IOnInitialize,
  IOperator,
  IState,
  json,
} from 'overmind'
import { createHook } from 'overmind-react'

const onInitialize: OnInitialize = async (
  { state, actions, effects },
  overmind,
) => {
  Object.assign(state, effects.getCachedState())
  overmind.addFlushListener((_mutation, _paths, _flushId, _isAsync) => {
    effects.debouncedCacheStoreState(json(overmind.state))
  })
}

export const config = { onInitialize, state, actions, effects }

// declare module 'overmind' {
//   // noinspection JSUnusedGlobalSymbols
//   export interface Config extends IConfig<typeof config> {}
// }

export interface Config extends IConfig<typeof config> {}

export interface OnInitialize extends IOnInitialize<Config> {}

export interface Action<Input = void, Output = void>
  extends IAction<Config, Input, Output> {}

export interface AsyncAction<Input = void, Output = void>
  extends IAction<Config, Input, Promise<Output>> {}

export interface Operator<Input = void, Output = Input>
  extends IOperator<Config, Input, Output> {}

export interface Derive<Parent extends IState, Output>
  extends IDerive<Config, Parent, Output> {}

export const useOvermind = createHook<Config>()
