import React, { FC, memo, RefObject, useEffect, useRef } from 'react'
import { render } from 'react-dom'
import 'tachyons'
import './index.css'
import nanoid from 'nanoid'
import faker from 'faker'
import times from 'ramda/es/times'
import isHK from 'is-hotkey'
import debounce from 'lodash.debounce'
import { Action, createOvermind, IConfig } from 'overmind'

import { createHook, Provider } from 'overmind-react'

type ProjectId = string

type Project = {
  id: ProjectId
  title: string
}

function createFakeProject(): Project {
  return {
    id: nanoid(),
    title: faker.hacker.ingverb() + faker.hacker.noun(),
  }
}

type TodoId = string

type Todo = {
  id: TodoId
  title: string
  isDone: boolean
}

function createFakeTodo(): Todo {
  return { id: nanoid(), title: faker.hacker.phrase(), isDone: false }
}

type TodoFormFields = { title: string }
type EditingTodo = { tag: 'EditingTodo'; id: TodoId } & TodoFormFields

function createEditingTodo(maybeTodo: Todo): EditingTodo {
  return { tag: 'EditingTodo', id: maybeTodo.id, title: maybeTodo.title }
}

type AddingTodo = { tag: 'AddingTodo' } & TodoFormFields

function createAddingTodo(): AddingTodo {
  return { tag: 'AddingTodo', title: '' }
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
  return editingTodo && editingTodo.id === todoId ? editingTodo : null
}

type TodoPopup = { todoId: string }

function isTodoPopupOpenFor(
  todoId: TodoId,
  todoPopup: TodoPopup | null,
): boolean {
  return !!todoPopup && todoPopup.todoId === todoId
}

type State = {
  todoPopup: TodoPopup | null
  todoList: Todo[]
  inlineTodoForm: AddingTodo | EditingTodo | null
  projectList: Project[]
}

const initialTodos: Todo[] = times(createFakeTodo, 10)
const initialProjects: Project[] = times(createFakeProject, 5)

const defaultState: State = {
  todoPopup: null,
  todoList: initialTodos,
  inlineTodoForm: null,
  projectList: initialProjects,
}

function cacheStoreState(state: State) {
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
const closeTodoMenu: Action<TodoId> = ({ state }, todoId) => {
  if (isTodoPopupOpenFor(todoId, state.todoPopup)) {
    state.todoPopup = null
  }
}
const setDone: Action<{ todoId: TodoId; isDone: boolean }> = (
  { state },
  { todoId, isDone },
) => {
  const maybeTodo = state.todoList.find(todo => todo.id === todoId)
  if (maybeTodo) {
    maybeTodo.isDone = isDone
  }
}
const deleteProject: Action<ProjectId> = ({ state }, projectId) => {
  const maybeIdx = state.projectList.findIndex(
    project => project.id === projectId,
  )
  if (maybeIdx > -1) {
    state.projectList.splice(maybeIdx, 1)
  }
}
const deleteTodo: Action<TodoId> = ({ state }, todoId) => {
  const maybeIdx = state.todoList.findIndex(todo => todo.id === todoId)
  if (maybeIdx > -1) {
    state.todoList.splice(maybeIdx, 1)
  }
}

const editTodoClicked: Action<TodoId> = (ctx, todoId) => {
  const { state } = ctx
  const maybeTodo = state.todoList.find(todo => todo.id === todoId)
  if (maybeTodo) {
    saveInlineTodoFormClicked(ctx)
    state.inlineTodoForm = createEditingTodo(maybeTodo)
  }
}
const addTodoClicked: Action = ctx => {
  const { state } = ctx
  saveEditingTodo(ctx)
  state.inlineTodoForm = createAddingTodo()
}

const addFakeTodoClicked: Action = ({state}) => {
  const todo = createFakeTodo()
  state.todoList.push(todo)
}

const updateTodoForm: Action<Partial<TodoFormFields>> = (
  { state },
  formFields,
) => {
  if (state.inlineTodoForm) {
    state.inlineTodoForm = { ...state.inlineTodoForm, ...formFields }
  }
}

const saveEditingTodo: Action = ({ state }) => {
  const editingTodo = maybeEditingTodo(state.inlineTodoForm)
  if (!editingTodo) return

  const maybeTodo = state.todoList.find(todo => todo.id === editingTodo.id)
  if (maybeTodo) {
    maybeTodo.title = editingTodo.title
  }
  state.inlineTodoForm = null
}

const saveAddingTodo: Action = ({ state }) => {
  const addingTodo = maybeAddingTodo(state.inlineTodoForm)
  if (!addingTodo || addingTodo.title.trim().length === 0) return

  const todo = createFakeTodo()
  todo.title = addingTodo.title

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

const config = {
  state: {
    ...defaultState,
    ...cachedState,
  },
  actions: {
    openTodoMenu,
    closeTodoMenu,
    setDone,
    deleteTodo,
    editTodoClicked,
    updateTodoForm,
    cancelInlineTodoFormClicked,
    addTodoClicked,
    saveInlineTodoFormClicked,
    deleteProject,
    addFakeTodoClicked
  },
  effects: {},
}
declare module 'overmind' {
  // noinspection JSUnusedGlobalSymbols
  interface Config extends IConfig<typeof config> {}
}

const useOvermind = createHook<typeof config>()

const overmind = createOvermind(config)

overmind.addMutationListener((_mutation, _paths, _flushId) => {
  debouncedCacheStoreState(overmind.state)
})

const AppProvider: FC = ({ children }) => {
  return <Provider value={overmind}>{children}</Provider>
}

function App() {
  return (
    <AppProvider>
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
    <div className="lh-copy" style={{ maxWidth: 500 }}>
      <div className="f4 pv1">ProjectList</div>
      <ViewProjectList projectList={state.projectList} />
      <div className="f4 pv1">TodoList</div>
      <ViewTodoList todoList={state.todoList} />
      {addingTodo ? (
        <ViewAddTodoForm addingTodo={addingTodo} />
      ) : (
        <>
          <Button action={() => actions.addTodoClicked()}>Add Task</Button>
          <Button action={() => actions.addTodoClicked()}>
            Add Fake Task
          </Button>
        </>
      )}
    </div>
  )
}

function ViewProjectList({ projectList }: { projectList: Project[] }) {
  const { state, actions } = useOvermind()

  return (
    <>
      {projectList.map(project => {
        return <ProjectItem key={project.id} project={project} />
      })}
    </>
  )
}

const ProjectItem: FC<{ project: Project }> = memo(function ProjectItem({
  project,
}) {
  const { state, actions } = useOvermind()
  return (
    <div className="flex">
      <div
        className="ph1 pv1 flex-grow-1 lh-title"
        // onClick={() => actions.editTodoClicked(project.id)}
      >
        {project.title}
      </div>
      <Button
        action={() => {
          actions.deleteProject(project.id)
        }}
      >
        X
      </Button>
    </div>
  )
})

function ViewTodoList({ todoList }: { todoList: Todo[] }) {
  const { state, actions } = useOvermind()

  return (
    <>
      {todoList.map(todo => {
        const maybeEditingTodo = maybeEditingTodoFor(
          todo.id,
          state.inlineTodoForm,
        )
        if (maybeEditingTodo) {
          return (
            <ViewEditTodoForm
              key={todo.id}
              editingTodo={maybeEditingTodo}
            />
          )
        }
        const menuOpen = isTodoPopupOpenFor(todo.id, state.todoPopup)
        return <TodoItem key={todo.id} todo={todo} menuOpen={menuOpen} />
      })}
    </>
  )
}

function ViewEditTodoForm({ editingTodo }: { editingTodo: EditingTodo }) {
  const { state, actions } = useOvermind()
  return (
    <div className="flex">
      <div className="ph1 pv2 flex-grow-1">
        <input
          autoFocus={true}
          type="text"
          className="ph1 pv1 lh-copy w-100"
          value={editingTodo.title}
          onChange={e => actions.updateTodoForm({ title: e.target.value })}
        />
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

const ViewAddTodoForm: FC<{ addingTodo: AddingTodo }> = ({
  addingTodo,
}) => {
  const { state, actions } = useOvermind()
  return (
    <div className="flex">
      <div className="ph1 pv2 flex-grow-1">
        <input
          autoFocus={true}
          type="text"
          className="ph1 pv1 lh-copy w-100"
          value={addingTodo.title}
          onChange={e => actions.updateTodoForm({ title: e.target.value })}
        />
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

const TodoItem: FC<{ todo: Todo; menuOpen: boolean }> = memo(
  function TodoItem({ todo, menuOpen }) {
    const { state, actions } = useOvermind()

    function openTodoMenu() {
      actions.openTodoMenu(todo.id)
    }

    function setDone(isDone: boolean) {
      actions.setDone({
        todoId: todo.id,
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
          onClick={() => actions.editTodoClicked(todo.id)}
        >
          {todo.title}
        </div>
        <div className="relative">
          <div
            className="ph1 b pointer"
            onClick={() => openTodoMenu()}
            tabIndex={0}
            onKeyDown={e => {
              if (isHK(['enter', 'space'], e.nativeEvent)) {
                openTodoMenu()
              }
            }}
          >
            ...
          </div>
          {menuOpen && <OpenedTodoMenu todoId={todo.id} />}
        </div>
      </div>
    )
  },
)

function OpenedTodoMenu({ todoId }: { todoId: TodoId }) {
  const { state, actions } = useOvermind()

  const rootRef: RefObject<HTMLDivElement> = useRef(null)

  useEffect(() => {
    return () => actions.closeTodoMenu(todoId)
  })

  function viewItem([action, label]: [() => void, string], idx: number) {
    return (
      <button
        className="button-reset input-reset bn bg-inherit  ph2 pv1 pointer db w-100 tl"
        tabIndex={0}
        autoFocus={idx === 0}
        onClick={action}
        onKeyDown={e => {
          if (isHK(['enter', 'space'], e.nativeEvent)) {
            action()
          }
        }}
        key={label}
      >
        {label}
      </button>
    )
  }

  const items: [() => void, string][] = [
    [() => actions.editTodoClicked(todoId), 'Edit'],
    [() => actions.deleteTodo(todoId), 'Delete'],
  ]

  return (
    <div
      ref={rootRef}
      className="absolute right-0 top-2 bg-white shadow-1 z-1"
      style={{ width: 200 }}
      onBlur={e => {
        if (
          rootRef.current &&
          e.relatedTarget instanceof Node &&
          !rootRef.current.contains(e.relatedTarget)
        ) {
          actions.closeTodoMenu(todoId)
        }
      }}
    >
      {items.map(viewItem)}
    </div>
  )
}

const Button: FC<{ action: () => void; className?: string }> = ({
  action,
  className,
  children,
}) => (
  <button
    className={`button-reset input-reset bn bg-inherit ph2 pv1 pointer blue${
      className ? className : ''
    }`}
    tabIndex={0}
    onClick={action}
    onKeyDown={e => {
      if (isHK(['enter', 'space'], e.nativeEvent)) {
        action()
      }
    }}
  >
    {children}
  </button>
)

render(<App />, document.getElementById('root'))
