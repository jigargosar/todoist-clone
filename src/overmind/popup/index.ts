import { TodoId } from '../state'
import { Action } from '../index'

export type Popup =
  | { tag: 'Schedule'; todoId: TodoId }
  | { tag: 'Context'; todoId: TodoId }

export type State = {
  popup: Popup | null
}

const state: State = {
  popup: null,
}

const openSchedule: Action<TodoId> = ({ state }, todoId) => {
  state.popup.popup = { tag: 'Schedule', todoId }
}

const openContext: Action<TodoId> = ({ state }, todoId) => {
  state.popup.popup = { tag: 'Context', todoId }
}

const config = {
  state,
  actions: {
    openSchedule,
    openContext,
  },
}

export default config
