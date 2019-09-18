import { TodoId } from '../state'
import { Action, Config } from '../index'
import { Derive, IContext } from 'overmind'
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

const openSchedule: Action<TodoId> = ({ actions }, todoId) => {
  actions.popup.internal.set({ tag: 'Schedule', todoId })
}

const openContext: Action<TodoId> = ({ actions }, todoId) => {
  actions.popup.internal.set({ tag: 'Context', todoId })
}

const close: Action = ({ actions }) => {
  actions.popup.internal.set(null)
}

const setPopup: Action<Popup | null> = ({ state }, popup) => {
  state.popup.popup = popup
}

const config = {
  state,
  actions: {
    openSchedule,
    openContext,
    close,
    internal: { set: setPopup },
  },
}

export default config
