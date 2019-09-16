import React, {
  FC,
  memo,
  RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { render } from 'react-dom'
import 'tachyons'
import './index.css'
import nanoid from 'nanoid'
import faker from 'faker'
import times from 'ramda/es/times'
import isHK from 'is-hotkey'
import { mergeRight } from 'ramda'
import debounce from 'lodash.debounce'
import {
  createActionsHook,
  createStateHook,
  createStore,
  IAction,
  Provider,
} from 'immer-store'
import { State } from 'immer-store/lib/types'

type TodoId = string

type Todo = {
  id: TodoId
  title: string
  isDone: boolean
}
type EditingTodo = { id: TodoId; title: string }

type TodoPopup = { todoId: string }

type Model = {
  todoPopup: TodoPopup | null
  todoList: Todo[]
  editingTodo: EditingTodo | null
}

function createFakeTodo(): Todo {
  return { id: nanoid(), title: faker.hacker.phrase(), isDone: false }
}

const initialTodos: Todo[] = times(createFakeTodo, 10)

const defaultModel: Model = {
  todoPopup: null,
  todoList: initialTodos,
  editingTodo: null,
}

function cacheStoreState(model: State) {
  const serializedModel = JSON.stringify(model)
  if (serializedModel) {
    localStorage.setItem('todoist-clone-model', serializedModel)
  }
}

const debouncedCacheStoreState = debounce(cacheStoreState, 1000)

function getCachedModel() {
  return JSON.parse(localStorage.getItem('todoist-clone-model') || '{}')
}

const cachedModel: Model = getCachedModel()

const initialModel: Model = mergeRight(defaultModel, cachedModel)

interface Action<Payload = void> extends IAction<Payload, Config> {}

const openTodoMenu: Action<TodoId> = ({ state }, todoId: TodoId) => {
  state.todoPopup = { todoId }
}
const closeTodoMenu: Action = ({ state }) => {
  state.todoPopup = null
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
const deleteTodo: Action<TodoId> = ({ state }, todoId) => {
  const maybeIdx = state.todoList.findIndex(todo => todo.id === todoId)
  if (maybeIdx > -1) {
    state.todoList.splice(maybeIdx, 1)
  }
}
const editTodo: Action<TodoId> = ({ state }, todoId) => {
  const maybeTodo = state.todoList.find(todo => todo.id === todoId)
  if (maybeTodo) {
    state.editingTodo = { id: maybeTodo.id, title: maybeTodo.title }
  }
}

type EditingTodoPartial = Partial<Omit<EditingTodo, 'id'>>
const mergeEditingTodo: Action<EditingTodoPartial> = (
  { state },
  editingTodo,
) => {
  if (state.editingTodo) {
    state.editingTodo = { ...state.editingTodo, ...editingTodo }
  }
}

const saveEditingTodo: Action = ({ state }) => {
  const editingTodo = state.editingTodo
  if (!editingTodo) return
  const maybeTodo = state.todoList.find(todo => todo.id === editingTodo.id)
  if (maybeTodo) {
    maybeTodo.title = editingTodo.title
  }
  state.editingTodo = null
}

const cancelEditingTodo: Action = ({ state }) => {
  state.editingTodo = null
}

const config = {
  state: {
    todoPopup: null,
    todoList: initialTodos,
    editingTodo: null,
    ...initialModel,
  },
  actions: {
    openTodoMenu,
    closeTodoMenu,
    setDone,
    deleteTodo,
    editTodo,
    mergeEditingTodo,
    saveEditingTodo,
    cancelEditingTodo,
  },
  effects: {},
}

type Config = typeof config

const store = createStore(config)
store.subscribe(state => {
  debouncedCacheStoreState(state)
})
const useStoreActions = createActionsHook<Config>()
const useStoreState = createStateHook<Config>()

function isTodoPopupOpenFor(
  todoId: TodoId,
  todoPopup: TodoPopup | null,
): boolean {
  return !!todoPopup && todoPopup.todoId === todoId
}

function maybeEditingTodoFor(todoId:TodoId, editingTodo:EditingTodo|null) {
  return editingTodo && editingTodo.id === todoId ? editingTodo : null
}

const AppProvider: FC = ({ children }) => {
  return <Provider store={store}>{children}</Provider>
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

function AppContent() {
  const state = useStoreState()
  return (
    <div className="lh-copy" style={{ maxWidth: 500 }}>
      <div className="f4 pv1">TodoList</div>
      <ViewTodoList todoList={state.todoList} />
    </div>
  )
}



function ViewTodoList({ todoList }: { todoList: Todo[] }) {
  const state = useStoreState()

  return (
    <>
      {todoList.map(todo => {
        const maybeEditingTodo = maybeEditingTodoFor(todo.id, state.editingTodo)
        if (maybeEditingTodo) {
          return (
            <TodoEditItem key={todo.id} editingTodo={maybeEditingTodo} />
          )
        }
        const menuOpen = isTodoPopupOpenFor(todo.id, state.todoPopup)
        return <TodoItem key={todo.id} todo={todo} menuOpen={menuOpen} />
      })}
    </>
  )
}

function TodoEditItem({ editingTodo }: { editingTodo: EditingTodo }) {
  const actions = useStoreActions()
  return (
    <div className="flex">
      <div className="ph1 pv2 flex-grow-1">
        <input
          autoFocus={true}
          type="text"
          className="ph1 pv1 lh-copy w-100"
          value={editingTodo.title}
          onChange={e => actions.mergeEditingTodo({ title: e.target.value })}
        />
        <div className="flex pv1">
          <Button action={() => actions.saveEditingTodo()}>Save</Button>
          <Button action={() => actions.cancelEditingTodo()}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

const TodoItem: FC<{ todo: Todo; menuOpen: boolean }> = memo(
  function TodoItem({ todo, menuOpen }) {
    const actions = useStoreActions()
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
        <div className="ph1 pv1 flex-grow-1 lh-title ">{todo.title}</div>
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
  const actions = useStoreActions()

  const rootRef: RefObject<HTMLDivElement> = useRef(null)

  useEffect(() => {
    return () => actions.closeTodoMenu()
  })

  const onBlurCallback = useCallback(() => {
    setTimeout(() => {
      if (
        rootRef.current &&
        !rootRef.current.contains(document.activeElement)
      ) {
        actions.closeTodoMenu()
      }
    }, 0)
  }, [rootRef.current])

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
    [() => actions.editTodo(todoId), 'Edit'],
    [() => actions.deleteTodo(todoId), 'Delete'],
  ]

  return (
    <div
      ref={rootRef}
      className="absolute right-0 top-2 bg-white shadow-1 z-1"
      style={{ width: 200 }}
      onBlur={onBlurCallback}
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
    className={`button-reset input-reset bn bg-inherit ph2 pv1 pointer${
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
