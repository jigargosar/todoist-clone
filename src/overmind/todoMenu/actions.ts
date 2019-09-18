import { TodoId } from '../state'
import { shouldNeverBeCalled } from '../../utils'
import { Action } from '../index'

const open: Action<TodoId> = ({ state }, todoId: TodoId) => {
  state.todoMenu = { todoId }
}

const close: Action = ({ state }) => {
  state.todoMenu = null
}

export type TodoMenuAction = 'Edit' | 'Delete'

const itemClicked: Action<TodoMenuAction> = (
  { state: { todoMenu }, actions },
  actionType,
) => {
  const todoId = todoMenu && todoMenu.todoId
  if (!todoId) return
  actions.todoMenu.close()
  switch (actionType) {
    case 'Edit':
      actions.editTodoClicked(todoId)
      return
    case 'Delete':
      actions.deleteTodo(todoId)
      return
  }
  return shouldNeverBeCalled(actionType)
}

const actions = {
  open,
  close,
  itemClicked,
}

export default actions
