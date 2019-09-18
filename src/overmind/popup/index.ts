import { TodoId } from '../state'
import { Action } from '../index'

const openSchedule: Action<TodoId> = ({ state }, todoId) => {
  state.popup = { tag: 'Schedule', todoId }
}

const openTodoContext: Action<TodoId> = ({ state }, todoId) => {
  state.popup = { tag: 'Context', todoId }
}

const closePopup: Action = ({ state }) => {
  state.popup = { tag: 'Closed' }
}

const config = {
  actions: {
    openSchedule,
    openTodoContext,
    closePopup,
  },
}

export default config
