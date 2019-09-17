import * as root from './root'

import { merge, namespaced } from 'overmind/config'
import * as todoMenu from './todoMenu'
import { Config, IConfig } from 'overmind'
import { createHook } from 'overmind-react'

export const config = merge(root, namespaced({ todoMenu }))

declare module 'overmind' {
  // noinspection JSUnusedGlobalSymbols
  export interface Config extends IConfig<typeof config> {}
}

export const useOvermind = createHook<Config>()