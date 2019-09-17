
import { TodoId } from '../state'
import { shouldNeverBeCalled } from '../../utils'
import { Action } from '../index'

export const todoMenuOpen: Action<TodoId> = ({ state }, todoId: TodoId) => {
  state.todoMenu = { todoId }
}

export const todoMenuClose: Action = ({ state }) => {
  state.todoMenu = null
}

export type TodoMenuAction = 'Edit' | 'Delete'

export const todoMenuItemClicked: Action<TodoMenuAction> = (
  { state: { todoMenu }, actions },
  actionType,
) => {
  const todoId = todoMenu && todoMenu.todoId
  if (!todoId) return
  actions.todoMenuClose()
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

