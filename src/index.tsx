import * as React from 'react'
import { ButtonHTMLAttributes, FC } from 'react'
import { render } from 'react-dom'
import 'tachyons'
import './index.css'
import { createOvermind, IConfig, json } from 'overmind'
import { createHook, Provider } from 'overmind-react'
import materialColorHash from 'material-color-hash'
import CssBaseline from '@material-ui/core/CssBaseline'
import IconButton from '@material-ui/core/IconButton'
import DeleteIcon from '@material-ui/icons/Delete'
import MoreHorizIcon from '@material-ui/icons/MoreHoriz'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import pick from 'ramda/es/pick'
import {
  AddingTodo,
  defaultState,
  EditingTodo,
  getTodoMenuAnchorDomIdFor,
  maybeAddingTodo,
  maybeEditingTodoFor,
  Project,
  ProjectId,
  ProjectList,
  State,
  Todo,
  TodoFormFields,
  TodoId,
} from './state'
import { TodoMenuAction } from './actions/todo-menu'
import * as actions from './actions'

const { memo, useEffect, useState } = React

const debounce = require('lodash.debounce')

function cacheStoreState(state: State) {
  const serializedModel = JSON.stringify(state)
  if (serializedModel) {
    localStorage.setItem('todoist-clone-model', serializedModel)
  }
}
const debouncedCacheStoreState = debounce(cacheStoreState, 1000)
function getCachedState() {
  const parsedState = JSON.parse(
    localStorage.getItem('todoist-clone-model') || '{}',
  )
  return pick(Object.keys(defaultState), parsedState)
}

import * as todoMenu from './actions/todo-menu'
const config = {
  state: {
    ...defaultState,
    ...getCachedState(),
  },
  actions: { ...actions, todoMenu },
  effects: {},
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
    state: { inlineTodoForm, projectList },
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
    actions,
    state: { todoMenuAnchorElId },
  } = useOvermind()

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setAnchorEl(document.getElementById(todoMenuAnchorElId))
  }, [todoMenuAnchorElId])

  const itemAction = (action: TodoMenuAction) => () =>
    actions.todoMenu.itemClicked(action)
  return (
    <Menu
      anchorEl={anchorEl}
      open={!!anchorEl}
      keepMounted={true}
      onClose={() => actions.todoMenu.close()}
    >
      <MenuItem onClick={itemAction('Edit')}>Edit</MenuItem>
      <MenuItem onClick={itemAction('Delete')}>Delete</MenuItem>
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

const ViewTodoItem: FC<{
  todo: Todo
  projectTitle: string
}> = memo(function ViewTodoItem({ todo, projectTitle }) {
  const { actions } = useOvermind()

  const todoId = todo.id

  function openTodoMenu() {
    actions.todoMenu.open(todoId)
  }

  function setDone(isDone: boolean) {
    actions.setDone({
      todoId,
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
      <div className="ph1 pv1">
        <div
          className="f7 bn bw1 br-pill ph1 ttc lh-copy truncate"
          style={materialColorHash(projectTitle, 700)}
        >
          {projectTitle}
        </div>
      </div>
      <div className="relative">
        <IconButton
          id={getTodoMenuAnchorDomIdFor(todoId)}
          size="small"
          onClick={() => openTodoMenu()}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  )
})

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
