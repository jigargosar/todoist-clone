import {
  createAddingTodo,
  createEditingTodo,
  maybeAddingTodo,
  maybeEditingTodo,
  Project,
  ProjectId,
  ProjectList,
  Todo,
  TodoFormFields,
  TodoId,
  TodoList,
} from './state'
import clone from 'ramda/es/clone'
import { Action } from './index'
import { shouldNeverBeCalled } from '../utils'

export * from './todoMenu/actions'

export const setDone: Action<{ todoId: TodoId; isDone: boolean }> = (
  { state },
  { todoId, isDone },
) => {
  const maybeTodo = TodoList.findById(todoId)(state.todoList)
  if (maybeTodo) {
    maybeTodo.isDone = isDone
  }
}
export const deleteProject: Action<ProjectId> = ({ state }, projectId) => {
  state.projectList = ProjectList.withoutId(projectId)(state.projectList)
}
export const deleteTodo: Action<TodoId> = ({ state }, todoId) => {
  state.todoList = TodoList.withoutId(todoId)(state.todoList)
}
export const editTodoClicked: Action<TodoId> = (ctx, todoId) => {
  const { state } = ctx
  const maybeTodo = TodoList.findById(todoId)(state.todoList)
  if (maybeTodo) {
    saveInlineTodoFormClicked(ctx)
    state.inlineTodoForm = createEditingTodo(maybeTodo)
  }
}
export const addTodoClicked: Action = ctx => {
  const { state } = ctx
  saveEditingTodo(ctx)
  state.inlineTodoForm = createAddingTodo()
}
export const addFakeTodoClicked: Action = ({ state }) => {
  const todo = Todo.createFake()
  state.todoList = TodoList.append(todo)(state.todoList)
}
export const addFakeProjectClicked: Action = ({ state }) => {
  const project = Project.createFake()
  state.projectList = ProjectList.append(project)(state.projectList)
}
export const updateTodoForm: Action<Partial<TodoFormFields>> = (
  { state },
  formFields,
) => {
  if (state.inlineTodoForm) {
    state.inlineTodoForm = { ...state.inlineTodoForm, ...formFields }
  }
}

function updatedTodoWithFormFields(form: TodoFormFields, todo: Todo) {
  todo.title = form.title
  todo.projectId = clone(form.projectId)
}

const saveEditingTodo: Action = ({ state }) => {
  const editingTodo = maybeEditingTodo(state.inlineTodoForm)
  if (!editingTodo) return
  const todo = TodoList.findById(editingTodo.id)(state.todoList)
  if (todo) {
    updatedTodoWithFormFields(editingTodo, todo)
  }
  state.inlineTodoForm = null
}
const saveAddingTodo: Action = ({ state }) => {
  const addingTodo = maybeAddingTodo(state.inlineTodoForm)
  if (!addingTodo || addingTodo.title.trim().length === 0) return

  const todo = Todo.createFake()
  updatedTodoWithFormFields(addingTodo, todo)
  state.todoList.push(todo)
  state.inlineTodoForm = null
}
export const cancelInlineTodoFormClicked: Action = ({ state }) => {
  state.inlineTodoForm = null
}
export const saveInlineTodoFormClicked: Action = ctx => {
  saveEditingTodo(ctx)
  saveAddingTodo(ctx)
  ctx.state.inlineTodoForm = null
}
export const todoItemScheduleClicked: Action<TodoId> = (
  { state },
  todoId,
) => {
  state.todoItemSchedulePopup = clone(todoId)
}
export const closeTodoItemSchedulePopup: Action = ({ state }) => {
  state.todoItemSchedulePopup = null
}

export type TodoItemSchedulePopupAction = 'Yesterday'| 'Today' | 'Tomorrow'

export const todoItemSchedulePopupItemClicked: Action<
  TodoItemSchedulePopupAction
> = ({ state, actions }, action) => {
  const todoId = state.todoItemSchedulePopup
  if (!todoId) return
  actions.closeTodoItemSchedulePopup()
  switch (action) {
    case 'Yesterday':
      return
    case 'Today':
      return
    case 'Tomorrow':
      return
  }
  shouldNeverBeCalled(action)
}
