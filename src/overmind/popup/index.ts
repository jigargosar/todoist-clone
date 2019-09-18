import { TodoId } from '../state'
import { Action } from '../index'
import { Derive } from 'overmind'
import { ResolveState } from 'overmind/es/internalTypes'

export type Popup =
  | { tag: 'Schedule'; todoId: TodoId }
  | { tag: 'Context'; todoId: TodoId }

export type State = {
  popup: Popup | null
  isScheduleOpen: Derive<State, boolean>
  isContextOpen: Derive<State, boolean>
}

function isOpen(tag: string) {
  return function(state: ResolveState<State>) {
    return !!state.popup && state.popup.tag === tag
  }
}

const state: State = {
  popup: null,
  isScheduleOpen: isOpen('Schedule'),
  isContextOpen: isOpen('Context'),
}

const openSchedule: Action<TodoId> = ({ state: rootState }, todoId) => {
  const state = rootState.popup
  state.popup = { tag: 'Schedule', todoId }
}

const openContext: Action<TodoId> = ({ state: rootState }, todoId) => {
  const state = rootState.popup
  state.popup = { tag: 'Context', todoId }
}

const close: Action = ({ state }) => {
  state.popup.popup = null
}

const config = {
  state,
  actions: {
    openSchedule,
    openContext,
    close,
  },
}

export default config
