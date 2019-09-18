import { Todo, TodoId } from '../state'
import { Action } from '../index'
import { Derive } from 'overmind'
import { ResolveState } from 'overmind/es/internalTypes'
import equals from 'ramda/es/equals'

export type Popup =
  | { tag: 'Schedule'; todoId: TodoId }
  | { tag: 'Context'; todoId: TodoId }

export type State = {
  popup: Popup | null
  isScheduleOpen: Derive<State, boolean>
  isScheduleOpenFor: Derive<State, (todoId: TodoId) => boolean>
  scheduleTriggerId: Derive<State, string>
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
  isScheduleOpenFor: state => {
    const { popup } = state
    return (todoId: TodoId) => equals(popup, { tag: 'Schedule', todoId })
  },
  scheduleTriggerId: state => {
    console.log(state)
    return state.popup && state.popup.tag === 'Schedule'
      ? TodoId.toString(state.popup.todoId) +
          '__todo-item-schedule-trigger'
      : ''
  },
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
