import { Todo, TodoId } from '../state'
import { Action, OnInitialize } from '../index'
import { Derive } from 'overmind'
import { ResolveState } from 'overmind/es/internalTypes'
import equals from 'ramda/es/equals'

export type Popup =
  | { tag: 'Schedule'; todoId: TodoId }
  | { tag: 'Context'; todoId: TodoId }
  | { tag: 'Closed' }

export type State = {
  popup: Popup
  scheduleTriggerId: Derive<State, string>
}

const state: State = {
  popup: { tag: 'Closed' },
  scheduleTriggerId: state => {
    // @ts-ignore
    console.log(state.popup.todoId)
    // @ts-ignore
    return state.popup.tag === 'Schedule'
      ? TodoId.toString(
          // @ts-ignore
          state.popup.todoId,
        ) + '__todo-item-schedule-trigger'
      : ''
  },
}

const openSchedule: Action<TodoId> = ({ actions }, todoId) => {
  actions.popup.internal.set({ tag: 'Schedule', todoId })
}

const openContext: Action<TodoId> = ({ actions }, todoId) => {
  actions.popup.internal.set({ tag: 'Context', todoId })
}

const close: Action = ({ actions }) => {
  actions.popup.internal.set({ tag: 'Closed' })
}

const setPopup: Action<Popup> = ({ state }, popup) => {
  state.popup.popup = popup
}

const onInitialize: OnInitialize = ({ state }) => {
  console.log(state.popup.popup)
}
const config = {
  state,
  onInitialize,
  actions: {
    openSchedule,
    openContext,
    close,
    internal: { set: setPopup },
  },
}

export default config
