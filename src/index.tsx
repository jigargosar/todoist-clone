import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { render } from 'react-dom'
import 'tachyons'
import './index.css'
import nanoid from 'nanoid'
import faker from 'faker'
import times from 'ramda/es/times'
import produce from 'immer'
import isHK from 'is-hotkey'

type TodoId = string

type Todo = {
  id: TodoId
  title: string
  isDone: boolean
}

type TodoPopup = { tag: 'Closed' } | { tag: 'Open'; todoId: string }
type Model = {
  todoPopup: TodoPopup
  todoList: Todo[]
  editingTodoId?: TodoId | null
}

function createFakeTodo(): Todo {
  return { id: nanoid(), title: faker.hacker.phrase(), isDone: false }
}

const initialTodos: Todo[] = times(createFakeTodo, 10)

const initialModel: Model = {
  todoPopup: { tag: 'Closed' },
  todoList: initialTodos,
  editingTodoId: null,
}

function exhaustiveCheck(never: never) {
  return never
}

type Msg =
  | { tag: 'OpenTodoMenu'; todoId: string }
  | { tag: 'CloseTodoMenu' }
  | { tag: 'SetDone'; todoId: string; isDone: boolean }
  | { tag: 'DeleteTodo'; todoId: string }
  | { tag: 'EditTodo'; todoId: string }

function update(msg: Msg, model: Model): Model {
  if (msg.tag === 'OpenTodoMenu') {
    model.todoPopup = { tag: 'Open', todoId: msg.todoId }
    return model
  }
  if (msg.tag === 'CloseTodoMenu') {
    model.todoPopup = { tag: 'Closed' }
    return model
  } else if (msg.tag === 'SetDone') {
    const maybeTodo = model.todoList.find(todo => todo.id === msg.todoId)
    if (maybeTodo) {
      maybeTodo.isDone = msg.isDone
    }
    return model
  } else if (msg.tag === 'DeleteTodo') {
    const maybeIdx = model.todoList.findIndex(
      todo => todo.id === msg.todoId,
    )
    if (maybeIdx > 0) {
      model.todoList.splice(maybeIdx, 1)
    }
    return model
  } else if (msg.tag === 'EditTodo') {
    model.editingTodoId = msg.todoId
    return model
  }
  return exhaustiveCheck(msg)
}

const DispatcherContext = createContext((_: Msg) => {})
const ModelContext = createContext(initialModel)

function useDispatchCallback(
  setModel: React.Dispatch<React.SetStateAction<Model>>,
) {
  return useCallback(
    (msg: Msg) => {
      setModel(model => {
        return produce(model, draft => update(msg, draft))
      })
    },
    [setModel],
  )
}

const AppProvider: React.FC = ({ children }) => {
  const [model, setModel] = useState(initialModel)
  const dispatch = useDispatchCallback(setModel)
  return (
    <DispatcherContext.Provider value={dispatch}>
      <ModelContext.Provider value={model}>
        {children}
      </ModelContext.Provider>
    </DispatcherContext.Provider>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

function AppContent() {
  const model = useContext(ModelContext)
  return (
    <div className="lh-copy" style={{ maxWidth: 500 }}>
      <div className="f4 pv1">TodoList</div>
      <ViewTodoList todoList={model.todoList} />
    </div>
  )
}

function isTodoPopupOpenFor(todoId: TodoId, todoPopup: TodoPopup) {
  return todoPopup.tag === 'Open' && todoPopup.todoId === todoId
}

function ViewTodoList({ todoList }: { todoList: Todo[] }) {
  const model = useContext(ModelContext)

  return (
    <>
      {todoList.map(todo => {
        const menuOpen = isTodoPopupOpenFor(todo.id, model.todoPopup)
        return <TodoItem key={todo.id} todo={todo} menuOpen={menuOpen} />
      })}
    </>
  )
}

function useOpenTodoMenuCallback(todoId: TodoId) {
  const dispatch = useContext(DispatcherContext)
  return useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      dispatch({
        tag: 'OpenTodoMenu',
        todoId: todoId,
      })
    },
    [todoId, dispatch],
  )
}

const TodoItem = React.memo(function TodoItem({
  todo,
  menuOpen,
}: {
  todo: Todo
  menuOpen: boolean
}) {
  const dispatch = useContext(DispatcherContext)
  const openTodoMenuCallback = useOpenTodoMenuCallback(todo.id)
  return (
    <div className="flex">
      <div className="ph1 pv2">
        <input
          type="checkbox"
          className=""
          checked={todo.isDone}
          style={{ width: 24, height: 24 }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            dispatch({
              tag: 'SetDone',
              todoId: todo.id,
              isDone: e.target.checked,
            })
          }}
        />
      </div>
      <div className="ph1 pv1 flex-grow-1 lh-title ">{todo.title}</div>
      <div className="relative">
        <div
          className="ph1 b pointer"
          onClick={openTodoMenuCallback}
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
            if (isHK(['enter', 'space'], e.nativeEvent)) {
              openTodoMenuCallback(e)
            }
          }}
        >
          ...
        </div>
        {menuOpen && <OpenedTodoMenu todoId={todo.id} />}
      </div>
    </div>
  )
})

function OpenedTodoMenu({ todoId }: { todoId: TodoId }) {
  const dispatch = useContext(DispatcherContext)

  const firstFocusableRef: React.RefObject<HTMLDivElement> = useRef(null)
  const rootRef: React.RefObject<HTMLDivElement> = useRef(null)

  useFocusOnMountEffect(firstFocusableRef)

  const onBlurCallback = useCallback(() => {
    setTimeout(() => {
      if (
        rootRef.current &&
        !rootRef.current.contains(document.activeElement)
      ) {
        dispatch({ tag: 'CloseTodoMenu' })
      }
    }, 0)
  }, [rootRef.current])

  return (
    <div
      ref={rootRef}
      className="absolute right-0 top-2 bg-white shadow-1 z-1"
      style={{ width: 200 }}
      onBlur={onBlurCallback}
    >
      <div
        className="ph2 pv1"
        tabIndex={0}
        ref={firstFocusableRef}
        onClick={() => {
          dispatch({ tag: 'DeleteTodo', todoId })
        }}
      >
        Delete
      </div>
      <div className="ph2 pv1" tabIndex={0}>
        MI2
      </div>
    </div>
  )
}

// Hooks

function useFocusOnMountEffect(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (ref.current) {
      ref.current.focus()
    }
  }, [ref, ref.current])
}

render(<App />, document.getElementById('root'))
