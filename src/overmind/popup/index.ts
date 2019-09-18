import { TodoId } from '../state'
import { Action } from '../index'

const openSchedule: Action<TodoId> = ({ state }, todoId) => {
  state.popup = { tag: 'Schedule', todoId }
}

const openContext: Action<TodoId> = ({ state }, todoId) => {
  state.popup = { tag: 'Context', todoId }
}

const closePopup: Action = ({ state }) => {
  state.popup = { tag: 'Closed' }
}

const config = {
  actions: {
    openSchedule,
    openContext,
    closePopup,
  },
}

export default config
