import * as root from './root'

import { merge, namespaced } from 'overmind/config'
import * as todoMenu from './todoMenu'
import {  IAction, IConfig, IDerive, IOnInitialize, IOperator, IState } from 'overmind'
import { createHook } from 'overmind-react'

export const config = merge(root, namespaced({ todoMenu }))

// declare module 'overmind' {
//   // noinspection JSUnusedGlobalSymbols
//   export interface Config extends IConfig<typeof config> {}
// }

export interface Config extends IConfig<typeof config> {}

export interface OnInitialize extends IOnInitialize<Config> {}

export interface Action<Input = void, Output = void> extends IAction<Config, Input, Output> {}

export interface AsyncAction<Input = void, Output = void> extends IAction<Config, Input, Promise<Output>> {}

export interface Operator<Input = void, Output = Input> extends IOperator<Config, Input, Output> {}

export interface Derive<Parent extends IState, Output> extends IDerive<Config, Parent, Output> {}

export const useOvermind = createHook<Config>()
