import React, {
  createContext,
  Dispatch,
  FC,
  memo,
  RefObject,
  SetStateAction,
  SyntheticEvent,
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
import { mergeRight } from 'ramda'
import debounce from 'lodash.debounce'

type TodoId = string

type Todo = {
  id: TodoId
  title: string
  isDone: boolean
}
type EditingTodo = { id: TodoId; title: string }

type TodoPopup = { tag: 'Closed' } | { tag: 'Open'; todoId: string }

type Model = {
  todoPopup: TodoPopup
  todoList: Todo[]
  editingTodo?: EditingTodo | null
}

function createFakeTodo(): Todo {
  return { id: nanoid(), title: faker.hacker.phrase(), isDone: false }
}

const initialTodos: Todo[] = times(createFakeTodo, 10)

const defaultModel: Model = {
  todoPopup: { tag: 'Closed' },
  todoList: initialTodos,
  editingTodo: null,
}

function cacheModel(model: Model) {
  const serializedModel = JSON.stringify(model)
  if (serializedModel) {
    localStorage.setItem('todoist-clone-model', serializedModel)
  }
}

const debouncedCacheModel: typeof cachedModel = debounce(cacheModel, 1000)

function useCacheModelEffect() {
  const model = useContext(ModelContext)
  useEffect(() => {
    debouncedCacheModel(model)
  }, [model])
}

function getCachedModel() {
  return JSON.parse(localStorage.getItem('todoist-clone-model') || '{}')
}

const cachedModel = getCachedModel()

const initialModel = mergeRight(defaultModel, cachedModel)

function exhaustiveCheck(never: never) {
  return never
}

type EditingTodoPartial = Partial<Omit<EditingTodo, 'id'>>
type Msg =
  | { tag: 'OpenTodoMenu'; todoId: string }
  | { tag: 'CloseTodoMenu' }
  | { tag: 'SetDone'; todoId: string; isDone: boolean }
  | { tag: 'DeleteTodo'; todoId: string }
  | { tag: 'EditTodo'; todoId: string }
  | { tag: 'MergeEditingTodo'; editingTodo: EditingTodoPartial }
  | { tag: 'SaveEditingTodo' }
  | { tag: 'CancelEditingTodo' }

function update(msg: Msg, model: Model): void {
  if (msg.tag === 'OpenTodoMenu') {
    model.todoPopup = { tag: 'Open', todoId: msg.todoId }
  } else if (msg.tag === 'CloseTodoMenu') {
    model.todoPopup = { tag: 'Closed' }
  } else if (msg.tag === 'SetDone') {
    const maybeTodo = model.todoList.find(todo => todo.id === msg.todoId)
    if (maybeTodo) {
      maybeTodo.isDone = msg.isDone
    }
  } else if (msg.tag === 'DeleteTodo') {
    const maybeIdx = model.todoList.findIndex(
      todo => todo.id === msg.todoId,
    )
    if (maybeIdx > -1) {
      model.todoList.splice(maybeIdx, 1)
    }
  } else if (msg.tag === 'EditTodo') {
    const maybeTodo = model.todoList.find(todo => todo.id === msg.todoId)
    if (maybeTodo) {
      model.editingTodo = { id: maybeTodo.id, title: maybeTodo.title }
    }
  } else if (msg.tag === 'MergeEditingTodo') {
    if (model.editingTodo) {
      model.editingTodo = { ...model.editingTodo, ...msg.editingTodo }
    }
  } else if (msg.tag === 'SaveEditingTodo') {
    const editingTodo = model.editingTodo
    if (!editingTodo) return
    const maybeTodo = model.todoList.find(
      todo => todo.id === editingTodo.id,
    )
    if (maybeTodo) {
      maybeTodo.title = editingTodo.title
    }
    model.editingTodo = null
  } else if (msg.tag === 'CancelEditingTodo') {
    model.editingTodo = null
  } else {
    return exhaustiveCheck(msg)
  }
}

const DispatcherContext = createContext((_: Msg) => {})
const ModelContext = createContext(initialModel)

function useDispatchCallback(setModel: Dispatch<SetStateAction<Model>>) {
  return useCallback(
    (msg: Msg) => {
      setModel(model => {
        return produce(model, draft => update(msg, draft))
      })
    },
    [setModel],
  )
}

const AppProvider: FC = ({ children }) => {
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
  useCacheModelEffect()
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
        if (model.editingTodo && model.editingTodo.id === todo.id) {
          return (
            <TodoEditItem key={todo.id} editingTodo={model.editingTodo} />
          )
        }
        const menuOpen = isTodoPopupOpenFor(todo.id, model.todoPopup)
        return <TodoItem key={todo.id} todo={todo} menuOpen={menuOpen} />
      })}
    </>
  )
}

function TodoEditItem({ editingTodo }: { editingTodo: EditingTodo }) {
  const dispatch = useContext(DispatcherContext)
  return (
    <div className="flex">
      <div className="ph1 pv2 flex-grow-1">
        <input
          autoFocus={true}
          type="text"
          className="ph1 pv1 w-100 "
          value={editingTodo.title}
          onChange={e => {
            dispatch({
              tag: 'MergeEditingTodo',
              editingTodo: { title: e.target.value },
            })
          }}
        />
        <div className="flex pv1">
          <Button action={() => dispatch({ tag: 'SaveEditingTodo' })}>
            Save
          </Button>
          <Button action={() => dispatch({ tag: 'CancelEditingTodo' })}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

const TodoItem = memo(function TodoItem({
  todo,
  menuOpen,
}: {
  todo: Todo
  menuOpen: boolean
}) {
  const dispatch = useContext(DispatcherContext)

  return (
    <div className="flex">
      <div className="ph1 pv2">
        <input
          type="checkbox"
          className=""
          checked={todo.isDone}
          style={{ width: 24, height: 24 }}
          onChange={e => {
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
          onClick={(e: SyntheticEvent) => {
            e.preventDefault()
            dispatch({
              tag: 'OpenTodoMenu',
              todoId: todo.id,
            })
          }}
          tabIndex={0}
          onKeyDown={e => {
            if (isHK(['enter', 'space'], e.nativeEvent)) {
              dispatch({
                tag: 'OpenTodoMenu',
                todoId: todo.id,
              })
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

  const firstFocusableRef: RefObject<HTMLButtonElement> = useRef(null)
  const rootRef: RefObject<HTMLDivElement> = useRef(null)

  // useFocusOnMountEffect(firstFocusableRef)
  useEffect(() => {
    return () => dispatch({ tag: 'CloseTodoMenu' })
  })

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

  function viewItem([action, label]: [() => void, string], idx: number) {
    return (
      <button
        className="button-reset input-reset bn bg-inherit  ph2 pv1 pointer db w-100 tl"
        tabIndex={0}
        autoFocus={idx === 0}
        ref={idx === 0 ? firstFocusableRef : null}
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
    [() => dispatch({ tag: 'EditTodo', todoId }), 'Edit'],
    [() => dispatch({ tag: 'DeleteTodo', todoId }), 'Delete'],
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
