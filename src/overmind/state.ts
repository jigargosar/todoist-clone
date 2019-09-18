import equals from 'ramda/es/equals'
import times from 'ramda/es/times'
import reject from 'ramda/es/reject'
import { Derive } from './index'
import { DueAt } from './state/DueAt'

const nanoid = require('nanoid')
const faker = require('faker')

export type ProjectId = {
  readonly tag: 'ProjectId'
  readonly value: string
}
export const ProjectId = {
  gen(): ProjectId {
    return { tag: 'ProjectId', value: nanoid() }
  },
  toString(projectId: ProjectId) {
    return projectId.value
  },
  toStringOrEmpty(projectId: ProjectId | null) {
    return projectId === null ? '' : projectId.value
  },
  fromString(str: string): ProjectId | null {
    if (str.trim() === '') return null
    return { tag: 'ProjectId', value: str.trim() }
  },
  eq(a: ProjectId) {
    return function eq(b: ProjectId) {
      return equals(a, b)
    }
  },
}
export type Project = {
  readonly id: ProjectId
  title: string
}
export const Project = {
  idEq(id: ProjectId) {
    return function idEq(project: Project) {
      return ProjectId.eq(id)(project.id)
    }
  },
  createFake(): Project {
    return {
      id: ProjectId.gen(),
      title: faker.hacker.ingverb() + ' ' + faker.hacker.noun(),
    }
  },
}
type ProjectList = Project[]
export const ProjectList = {
  findById(projectId: ProjectId) {
    return function findById(projectList: ProjectList) {
      return projectList.find(Project.idEq(projectId))
    }
  },
  findTitleByIdOrInbox(projectId: ProjectId | null) {
    return function findTitleByIdOrInbox(projectList: ProjectList) {
      if (!projectId) {
        return 'Inbox'
      }

      const project = ProjectList.findById(projectId)(projectList)
      if (project) {
        return project.title
      } else {
        return 'Inbox'
      }
    }
  },
  // findIndexById(projectId: ProjectId) {
  //   return function findIndexById(projectList: ProjectList) {
  //     return projectList.findIndex(Project.idEq(projectId))
  //   }
  // },
  append(project: Project) {
    return function append(projectList: ProjectList) {
      return [...projectList, project]
    }
  },
  withoutId(projectId: ProjectId) {
    return function withoutId(projectList: ProjectList) {
      return reject(Project.idEq(projectId))(projectList)
    }
  },
}
export type TodoId = { readonly tag: 'TodoId'; readonly value: string }
export const TodoId = {
  gen(): TodoId {
    return { tag: 'TodoId', value: nanoid() }
  },
  toString(todoId: TodoId) {
    return todoId.value
  },

  eq(a: TodoId) {
    return function eq(b: TodoId) {
      return equals(a, b)
    }
  },
}
export type Todo = {
  readonly id: TodoId
  title: string
  isDone: boolean
  projectId: ProjectId | null
  dueAt: DueAt
}
export const Todo = {
  idEq(id: TodoId) {
    return function idEq(todo: Todo) {
      return TodoId.eq(id)(todo.id)
    }
  },
  createFake(): Todo {
    return {
      id: TodoId.gen(),
      title: faker.hacker.phrase(),
      isDone: false,
      projectId: null,
      dueAt: DueAt.notSet(),
    }
  },
}
type TodoList = Todo[]
export const TodoList = {
  findById(todoId: TodoId) {
    return function findById(todoList: TodoList) {
      return todoList.find(Todo.idEq(todoId))
    }
  },
  // findIndexById(todoId: TodoId) {
  //   return function findIndexById(todoList: TodoList) {
  //     return todoList.findIndex(Todo.idEq(todoId))
  //   }
  // },
  append(todo: Todo) {
    return function append(todoList: TodoList) {
      return [...todoList, todo]
    }
  },
  withoutId(todoId: TodoId) {
    return function withoutId(todoList: TodoList) {
      return reject(Todo.idEq(todoId))(todoList)
    }
  },
}
export type TodoFormFields = { title: string; projectId: ProjectId | null }
export type EditingTodo = {
  tag: 'EditingTodo'
  id: TodoId
} & TodoFormFields

export function createEditingTodo(todo: Todo): EditingTodo {
  return {
    tag: 'EditingTodo',
    id: todo.id,
    title: todo.title,
    projectId: todo.projectId,
  }
}

export type AddingTodo = { tag: 'AddingTodo' } & TodoFormFields

export function createAddingTodo(): AddingTodo {
  return { tag: 'AddingTodo', title: '', projectId: null }
}

export type InlineTodoForm = AddingTodo | EditingTodo | null

export function maybeEditingTodo(
  form: InlineTodoForm,
): EditingTodo | null {
  return form && form.tag === 'EditingTodo' ? form : null
}

export function maybeEditingTodoFor(
  todoId: TodoId,
  form: InlineTodoForm,
): EditingTodo | null {
  const editingTodo = maybeEditingTodo(form)
  return editingTodo && TodoId.eq(editingTodo.id)(todoId)
    ? editingTodo
    : null
}
export function maybeAddingTodo(form: InlineTodoForm): AddingTodo | null {
  return form && form.tag === 'AddingTodo' ? form : null
}

export function todoMenuAnchorDomIdFor(todoId: TodoId) {
  return TodoId.toString(todoId) + '__context-menu-anchor'
}

type TodoMenu = { todoId: TodoId }

export type Popup =
  | { tag: 'Schedule'; todoId: TodoId }
  | { tag: 'Context'; todoId: TodoId }
  | { tag: 'Closed' }

export function getScheduleTrigger(todoId: TodoId) {
  return TodoId.toString(todoId) + '__schedule-trigger'
}

export function getContextTrigger(todoId: TodoId) {
  return TodoId.toString(todoId) + '__context-trigger'
}

export type State = {
  popup: Popup
  scheduleTriggerId: Derive<State, string>
  contextTriggerId: Derive<State, string>
  todoItemSchedulePopup: TodoId | null
  todoMenu: TodoMenu | null
  currentTodoMenuAnchorDomId: Derive<State, string>
  todoList: Todo[]
  inlineTodoForm: AddingTodo | EditingTodo | null
  projectList: Project[]
}
const initialTodos: Todo[] = times(Todo.createFake, 10)
const initialProjects: Project[] = times(Project.createFake, 5)

export const state: State = {
  popup: { tag: 'Closed' },
  scheduleTriggerId: ({ popup }) =>
    popup.tag === 'Schedule' ? getScheduleTrigger(popup.todoId) : '',
  contextTriggerId: ({ popup }) =>
    popup.tag === 'Context' ? getContextTrigger(popup.todoId) : '',
  todoItemSchedulePopup: null,
  todoMenu: null,
  currentTodoMenuAnchorDomId: state => {
    return state.todoMenu && state.todoMenu.todoId
      ? todoMenuAnchorDomIdFor(state.todoMenu.todoId)
      : ''
  },
  todoList: initialTodos,
  inlineTodoForm: null,
  projectList: initialProjects,
}
