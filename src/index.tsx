import * as React from 'react'
import { ButtonHTMLAttributes, FC } from 'react'
const { memo, useEffect, useState } = React

import { render } from 'react-dom'
import 'tachyons'
import './index.css'
const nanoid = require('nanoid')
const faker = require('faker')
import times from 'ramda/es/times'
const debounce = require('lodash.debounce')
import { Action, createOvermind, Derive, IConfig, json } from 'overmind'
import { createHook, Provider } from 'overmind-react'

import equals from 'ramda/es/equals'
import reject from 'ramda/es/reject'
import clone from 'ramda/es/clone'
import materialColorHash from 'material-color-hash'
import { ResolveActions, ResolveState } from 'overmind/lib/internalTypes'
import CssBaseline from '@material-ui/core/CssBaseline'
import IconButton from '@material-ui/core/IconButton'
import DeleteIcon from '@material-ui/icons/Delete'
import MoreHorizIcon from '@material-ui/icons/MoreHoriz'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import omit from 'ramda/es/omit'

type ProjectId = {
  readonly tag: 'ProjectId'
  readonly value: string
}

const ProjectId = {
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

type Project = {
  id: ProjectId
  title: string
}

const Project = {
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

const ProjectList = {
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

type TodoId = { tag: 'TodoId'; value: string }

const TodoId = {
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

type Todo = {
  id: TodoId
  title: string
  isDone: boolean
  projectId: ProjectId | null
}

const Todo = {
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
    }
  },
}

type TodoList = Todo[]

const TodoList = {
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

type TodoFormFields = { title: string; projectId: ProjectId | null }
type EditingTodo = { tag: 'EditingTodo'; id: TodoId } & TodoFormFields

function createEditingTodo(todo: Todo): EditingTodo {
  return {
    tag: 'EditingTodo',
    id: todo.id,
    title: todo.title,
    projectId: todo.projectId,
  }
}

type AddingTodo = { tag: 'AddingTodo' } & TodoFormFields

function createAddingTodo(): AddingTodo {
  return { tag: 'AddingTodo', title: '', projectId: null }
}

type InlineTodoForm = AddingTodo | EditingTodo | null

function maybeEditingTodo(form: InlineTodoForm): EditingTodo | null {
  return form && form.tag === 'EditingTodo' ? form : null
}

function maybeEditingTodoFor(
  todoId: TodoId,
  form: InlineTodoForm,
): EditingTodo | null {
  const editingTodo = maybeEditingTodo(form)
  return editingTodo && TodoId.eq(editingTodo.id)(todoId)
    ? editingTodo
    : null
}

type TodoPopup = { todoId: TodoId }

function isTodoPopupOpenFor(
  todoId: TodoId,
  todoPopup: TodoPopup | null,
): boolean {
  return !!todoPopup && TodoId.eq(todoPopup.todoId)(todoId)
}

type State = {
  todoPopup: TodoPopup | null
  todoList: Todo[]
  inlineTodoForm: AddingTodo | EditingTodo | null
  projectList: Project[]
  isTodoPopupOpenFor: Derive<State, (todoId: TodoId) => boolean>
  todoContextMenuAnchorElDomId: Derive<State, string>
}

const initialTodos: Todo[] = times(Todo.createFake, 10)
const initialProjects: Project[] = times(Project.createFake, 5)

const defaultState: State = {
  todoPopup: null,
  todoList: initialTodos,
  inlineTodoForm: null,
  projectList: initialProjects,
  isTodoPopupOpenFor: state => {
    const todoPopup = state.todoPopup
    return function(todoId) {
      return isTodoPopupOpenFor(todoId, state.todoPopup || todoPopup)
    }
  },
  todoContextMenuAnchorElDomId: state => {
    return state.todoPopup && state.todoPopup.todoId
      ? getTodoContextMenuAnchorElDomId(state.todoPopup.todoId)
      : ''
  },
}

function cacheStoreState(state: ResolveState<State>) {
  const serializedModel = JSON.stringify(state)
  if (serializedModel) {
    localStorage.setItem('todoist-clone-model', serializedModel)
  }
}

const debouncedCacheStoreState = debounce(cacheStoreState, 1000)

function getCachedState() {
  return JSON.parse(localStorage.getItem('todoist-clone-model') || '{}')
}

const cachedState: State = getCachedState()

const openTodoMenu: Action<TodoId> = ({ state }, todoId: TodoId) => {
  state.todoPopup = { todoId }
}
const closeTodoMenuFor: Action<TodoId> = ({ state }, todoId) => {
  if (isTodoPopupOpenFor(todoId, state.todoPopup)) {
    state.todoPopup = null
  }
}
const closeTodoMenu: Action = ({ state }) => {
  state.todoPopup = null
}
const setDone: Action<{ todoId: TodoId; isDone: boolean }> = (
  { state },
  { todoId, isDone },
) => {
  const maybeTodo = TodoList.findById(todoId)(state.todoList)
  if (maybeTodo) {
    maybeTodo.isDone = isDone
  }
}
const deleteProject: Action<ProjectId> = ({ state }, projectId) => {
  state.projectList = ProjectList.withoutId(projectId)(state.projectList)
}
const deleteTodo: Action<TodoId> = ({ state }, todoId) => {
  state.todoList = TodoList.withoutId(todoId)(state.todoList)
}

const editTodoClicked: Action<TodoId> = (ctx, todoId) => {
  const { state } = ctx
  const maybeTodo = TodoList.findById(todoId)(state.todoList)
  if (maybeTodo) {
    saveInlineTodoFormClicked(ctx)
    state.inlineTodoForm = createEditingTodo(maybeTodo)
  }
}

function shouldNeverBeCalled(nopes: never) {
  return nopes
}

const todoContextMenuItemClicked: Action<'Edit' | 'Delete'> = (
  { state: { todoPopup }, actions },
  actionType,
) => {
  const todoId = todoPopup && todoPopup.todoId
  if (!todoId) return
  actions.closeTodoMenu()
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

const addTodoClicked: Action = ctx => {
  const { state } = ctx
  saveEditingTodo(ctx)
  state.inlineTodoForm = createAddingTodo()
}

const addFakeTodoClicked: Action = ({ state }) => {
  const todo = Todo.createFake()
  state.todoList = TodoList.append(todo)(state.todoList)
  // state.todoList.push(todo)
}

const addFakeProjectClicked: Action = ({ state }) => {
  const project = Project.createFake()
  state.projectList = ProjectList.append(project)(state.projectList)
  // state.projectList.push(project)
}

const updateTodoForm: Action<Partial<TodoFormFields>> = (
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

const cancelInlineTodoFormClicked: Action = ({ state }) => {
  state.inlineTodoForm = null
}

const saveInlineTodoFormClicked: Action = ctx => {
  saveEditingTodo(ctx)
  saveAddingTodo(ctx)
  ctx.state.inlineTodoForm = null
}

const actions = {
  openTodoMenu,
  closeTodoMenuFor,
  closeTodoMenu,
  todoContextMenuItemClicked,
  setDone,
  deleteTodo,
  editTodoClicked,
  updateTodoForm,
  cancelInlineTodoFormClicked,
  addTodoClicked,
  saveInlineTodoFormClicked,
  deleteProject,
  addFakeTodoClicked,
  addFakeProjectClicked,
}

type Actions = ResolveActions<typeof actions>

const getTodoContextMenuAnchorEl = (todoPopup?: TodoPopup) => {
  if (!todoPopup) return null
  return document.getElementById(
    getTodoContextMenuAnchorElDomId(todoPopup.todoId),
  )
}

const config = {
  state: {
    ...defaultState,
    ...cachedState,
  },
  actions,
  effects: {
    todoContextMenuAnchorEl: getTodoContextMenuAnchorEl,
  },
}
declare module 'overmind' {
  // noinspection JSUnusedGlobalSymbols
  interface Config extends IConfig<typeof config> {}
}

const useOvermind = createHook<typeof config>()

const overmind = createOvermind(config)

overmind.addFlushListener((_mutation, _paths, _flushId, _isAsync) => {
  debouncedCacheStoreState(json(overmind.state))
})

const AppProvider: FC = ({ children }) => {
  return <Provider value={overmind}>{children}</Provider>
}

function App() {
  return (
    <AppProvider>
      <CssBaseline />

      <AppContent />
    </AppProvider>
  )
}

function maybeAddingTodo(form: InlineTodoForm): AddingTodo | null {
  return form && form.tag === 'AddingTodo' ? form : null
}

function AppContent() {
  const { state, actions } = useOvermind()

  const addingTodo = maybeAddingTodo(state.inlineTodoForm)
  return (
    <div className="pl2 lh-copy" style={{ maxWidth: 500 }}>
      <div className="f4 pv1">ProjectList</div>
      <ViewProjectList projectList={state.projectList} />
      <Button action={() => actions.addFakeProjectClicked()}>
        Add Fake Project
      </Button>
      <div className="f4 pv1">TodoList</div>
      <ViewTodoList todoList={state.todoList} />
      {addingTodo ? (
        <ViewAddTodoForm addingTodo={addingTodo} />
      ) : (
        <>
          <Button action={() => actions.addTodoClicked()}>Add Task</Button>
          <Button action={() => actions.addFakeTodoClicked()}>
            Add Fake Task
          </Button>
        </>
      )}
    </div>
  )
}

function ViewProjectList({ projectList }: { projectList: Project[] }) {
  const {} = useOvermind()

  return (
    <>
      {projectList.map(project => {
        return (
          <ProjectItem
            key={ProjectId.toString(project.id)}
            project={project}
          />
        )
      })}
    </>
  )
}

const ProjectItem: FC<{ project: Project }> = function ProjectItem({
  project,
}) {
  const { actions } = useOvermind()
  return (
    <div className="flex">
      <div
        className="ph1 pv1 flex-grow-1 lh-title"
        // onClick={() => actions.editTodoClicked(project.id)}
      >
        {project.title}
      </div>
      <IconButton
        size="small"
        onClick={() => actions.deleteProject(project.id)}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </div>
  )
}

function ViewTodoList({ todoList }: { todoList: Todo[] }) {
  const {
    state: { inlineTodoForm, projectList, isTodoPopupOpenFor, todoPopup },
  } = useOvermind()

  return (
    <>
      {todoList.map(todo => {
        const { id, projectId } = todo

        const projectTitle = ProjectList.findTitleByIdOrInbox(projectId)(
          projectList,
        )
        const editingTodo = maybeEditingTodoFor(id, inlineTodoForm)
        if (editingTodo) {
          return (
            <ViewEditTodoForm
              key={TodoId.toString(id)}
              editingTodo={editingTodo}
            />
          )
        }
        return (
          <ViewTodoItem
            key={TodoId.toString(id)}
            todo={todo}
            menuOpen={isTodoPopupOpenFor(id)}
            projectId={projectId}
            projectTitle={projectTitle}
          />
        )
      })}
      <ViewTodoItemContextMenu />
    </>
  )
}

function ViewTodoItemContextMenu() {
  const {
    reaction,
    actions,
    state: { todoContextMenuAnchorElDomId },
  } = useOvermind()

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  useEffect(() =>
    reaction(
      ({ todoContextMenuAnchorElDomId }) => todoContextMenuAnchorElDomId,
      () => {
        setAnchorEl(
          // @ts-ignore
          document.getElementById(todoContextMenuAnchorElDomId),
        )
      },
      { immediate: true },
    ),
  )
  // const anchorEl = state.todoContextMenuAnchorElDomId

  return (
    <Menu
      anchorEl={anchorEl}
      open={!!anchorEl}
      keepMounted={true}
      onClose={() => actions.closeTodoMenu()}
    >
      <MenuItem onClick={() => actions.todoContextMenuItemClicked('Edit')}>
        Edit
      </MenuItem>
      <MenuItem
        onClick={() => actions.todoContextMenuItemClicked('Delete')}
      >
        Delete
      </MenuItem>
    </Menu>
  )
}

function ViewEditTodoForm({ editingTodo }: { editingTodo: EditingTodo }) {
  return <ViewInlineTodoForm fields={editingTodo} />
}

const ViewAddTodoForm: FC<{ addingTodo: AddingTodo }> = ({
  addingTodo,
}) => {
  return <ViewInlineTodoForm fields={addingTodo} />
}

function ViewInlineTodoForm({ fields }: { fields: TodoFormFields }) {
  const { state, actions } = useOvermind()
  const projects = state.projectList
  return (
    <div className="flex">
      <div className="ph1 pv2 flex-grow-1">
        <input
          autoFocus={true}
          type="text"
          className="ph1 pv1 lh-copy w-100"
          value={fields.title}
          onChange={e => actions.updateTodoForm({ title: e.target.value })}
        />
        <select
          className="pa1 w-100"
          value={ProjectId.toStringOrEmpty(fields.projectId)}
          onChange={e =>
            actions.updateTodoForm({
              projectId: ProjectId.fromString(e.target.value),
            })
          }
        >
          <option value="">Inbox</option>
          {projects.map(project => (
            <option
              key={ProjectId.toString(project.id)}
              value={ProjectId.toString(project.id)}
            >
              {project.title}
            </option>
          ))}
        </select>
        <div className="flex pv1">
          <Button action={() => actions.saveInlineTodoFormClicked()}>
            Save
          </Button>
          <Button action={() => actions.cancelInlineTodoFormClicked()}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

function getTodoContextMenuAnchorElDomId(todoId: TodoId) {
  return TodoId.toString(todoId) + '__context-menu-anchor'
}

const ViewTodoItem: FC<{
  todo: Todo
  menuOpen: boolean
  projectId: ProjectId | null
  projectTitle: string
}> = memo(function ViewTodoItem({ todo, menuOpen, projectTitle }) {
  const { actions } = useOvermind()

  const todoId = todo.id

  function openTodoMenu() {
    actions.openTodoMenu(todoId)
  }

  function setDone(isDone: boolean) {
    actions.setDone({
      todoId: todoId,
      isDone,
    })
  }

  return (
    <div className="flex">
      <div className="ph1 pv2">
        <input
          type="checkbox"
          className=""
          checked={todo.isDone}
          style={{ width: 24, height: 24 }}
          onChange={e => setDone(e.target.checked)}
        />
      </div>
      <div
        className="ph1 pv1 flex-grow-1 lh-title"
        onClick={() => actions.editTodoClicked(todoId)}
      >
        {todo.title}
      </div>
      <div
        className="ph1 pv1"
        // onClick={() => actions.editTodoClicked(todo.id)}
      >
        <div
          className="f7 bn bw1 br-pill ph1 ttc lh-copy truncate"
          style={materialColorHash(projectTitle, 700)}
        >
          {projectTitle}
        </div>
      </div>
      <div className="relative">
        <IconButton
          id={getTodoContextMenuAnchorElDomId(todoId)}
          size="small"
          onClick={() => openTodoMenu()}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
        {/*{menuOpen && <ViewTodoItemContextMenu todoId={todo.id} />}*/}
      </div>
    </div>
  )
})

function todoContextMenuItemsMeta(actions: Actions, todoId: TodoId) {
  const items: [() => void, string][] = [
    [() => actions.editTodoClicked(todoId), 'Edit'],
    [() => actions.deleteTodo(todoId), 'Delete'],
  ]
  return items
}

// function ViewTodoItemContextMenu({ todoId }: { todoId: TodoId }) {
//   const { actions } = useOvermind()
//
//   const rootRef: RefObject<HTMLDivElement> = useRef(null)
//
//   useEffect(() => {
//     return () => actions.closeTodoMenu(todoId)
//   })
//
//   function viewItem([action, label]: [() => void, string], idx: number) {
//     return (
//       <Button
//         className="button-reset input-reset bn bg-inherit  ph2 pv1 pointer db w-100 tl"
//         autoFocus={idx === 0}
//         action={action}
//         key={label}
//       >
//         {label}
//       </Button>
//     )
//   }
//
//   const items = todoContextMenuItemsMeta(actions, todoId)
//
//   return (
//     <div
//       ref={rootRef}
//       className="absolute right-0 top-2 bg-white shadow-1 z-1"
//       style={{ width: 200 }}
//       onBlur={e => {
//         if (
//           e.relatedTarget === null ||
//           (e.relatedTarget instanceof Node &&
//             rootRef.current &&
//             !rootRef.current.contains(e.relatedTarget))
//         ) {
//           actions.closeTodoMenu(todoId)
//         }
//       }}
//     >
//       {items.map(viewItem)}
//     </div>
//   )
// }

const Button: FC<
  { action: () => void; className?: string } & ButtonHTMLAttributes<
    HTMLButtonElement
  >
> = ({ action, className, children, ...other }) => (
  <button
    className={`button-reset input-reset bn bg-inherit ph2 pv1 pointer blue${
      className ? className : ''
    }`}
    onClick={action}
    {...other}
  >
    {children}
  </button>
)

render(<App />, document.getElementById('root'))
