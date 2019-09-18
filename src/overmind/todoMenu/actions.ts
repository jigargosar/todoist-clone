import { TodoId } from '../state'
import { shouldNeverBeCalled } from '../../utils'
import { Action } from '../index'

const todoMenuOpen: Action<TodoId> = ({ state }, todoId: TodoId) => {
  state.todoMenu = { todoId }
}

const todoMenuClose: Action = ({ state }) => {
  state.todoMenu = null
}

export type TodoMenuAction = 'Edit' | 'Delete'

const todoMenuItemClicked: Action<TodoMenuAction> = (
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

export const actions = {
  open: todoMenuOpen,
  close: todoMenuClose,
  onClick: todoMenuItemClicked,
}

export default actions
