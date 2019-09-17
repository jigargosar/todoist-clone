import * as root from './root'

import { merge, namespaced } from 'overmind/config'
import * as todoMenu from './todo-menu'
import { IConfig } from 'overmind'

export const config = merge(root, namespaced({ todoMenu }))

declare module 'overmind' {
  // noinspection JSUnusedGlobalSymbols
  export interface Config extends IConfig<typeof config> {}
}
