import * as React from 'react'
import { FC } from 'react'
import { render } from 'react-dom'
import 'tachyons'
import './index.css'
import { createOvermind } from 'overmind'
import { Provider } from 'overmind-react'
import materialColorHash from 'material-color-hash'
import CssBaseline from '@material-ui/core/CssBaseline'
import IconButton from '@material-ui/core/IconButton'
import DeleteIcon from '@material-ui/icons/Delete'
import MoreHorizIcon from '@material-ui/icons/MoreHoriz'
import ScheduleIcon from '@material-ui/icons/Schedule'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import {
  AddingTodo,
  EditingTodo,
  maybeAddingTodo,
  maybeEditingTodoFor,
  Project,
  ProjectId,
  ProjectList,
  Todo,
  TodoFormFields,
  TodoId,
  todoMenuAnchorDomIdFor,
} from './overmind/state'
import { TodoMenuAction } from './overmind/todoMenu/actions'
import { config, useOvermind } from './overmind'
import MUIButton, { ButtonProps } from '@material-ui/core/Button'
import { DueAtPayload } from './overmind/actions'

const { memo, useEffect, useState } = React

const overmind = createOvermind(config)

function App() {
  return (
    <Provider value={overmind}>
      <CssBaseline />

      <AppContent />
    </Provider>
  )
}

function AppContent() {
  const { state } = useOvermind()

  return (
    <div className="pl2 lh-copy" style={{ maxWidth: 500 }}>
      <div className="f4 pv1">ProjectList</div>
      <ViewProjectList projectList={state.projectList} />

      <div className="f4 pv1">TodoList</div>
      <ViewTodoList todoList={state.todoList} />
    </div>
  )
}

function ViewProjectList({ projectList }: { projectList: Project[] }) {
  const { actions } = useOvermind()

  return (
    <>
      {projectList.map(project => {
        return (
          <ViewProjectItem
            key={ProjectId.toString(project.id)}
            project={project}
          />
        )
      })}
      <Btn onClick={() => actions.addFakeProjectClicked()}>
        Add Fake Project
      </Btn>
    </>
  )
}

const ViewProjectItem: FC<{
  project: Project
}> = function ViewProjectItem({ project }) {
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
    actions,
  } = useOvermind()
  const addingTodo = maybeAddingTodo(inlineTodoForm)
  return (
    <>
      {todoList.map(todo => {
        const editingTodo = maybeEditingTodoFor(todo.id, inlineTodoForm)
        if (editingTodo) {
          return (
            <ViewEditTodoForm
              key={TodoId.toString(todo.id)}
              editingTodo={editingTodo}
            />
          )
        } else {
          const projectTitle = ProjectList.findTitleByIdOrInbox(
            todo.projectId,
          )(projectList)
          return (
            <ViewTodoItem
              key={TodoId.toString(todo.id)}
              todo={todo}
              projectTitle={projectTitle}
            />
          )
        }
      })}
      {addingTodo ? (
        <ViewAddTodoForm addingTodo={addingTodo} />
      ) : (
        <>
          <Btn onClick={() => actions.addTodoClicked()}>Add Task</Btn>
          <Btn onClick={() => actions.addFakeTodoClicked()}>
            Add Fake Task
          </Btn>
        </>
      )}

      <ViewTodoItemContextMenu />
    </>
  )
}

function ViewTodoItemContextMenu() {
  const { actions, reaction } = useOvermind()

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  useEffect(() =>
    reaction(
      state => state.currentTodoMenuAnchorDomId,
      state => {
        setAnchorEl(
          // @ts-ignore
          document.getElementById(state.currentTodoMenuAnchorDomId),
        )
      },
      { immediate: true },
    ),
  )

  const itemAction = (action: TodoMenuAction) => () => {
    actions.todoMenu.itemClicked(action)
  }
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

function ViewAddTodoForm({ addingTodo }: { addingTodo: AddingTodo }) {
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
          <Btn onClick={() => actions.saveInlineTodoFormClicked()}>
            Save
          </Btn>
          <Btn onClick={() => actions.cancelInlineTodoFormClicked()}>
            Cancel
          </Btn>
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

  return (
    <div className="flex">
      <div className="ph1 pv2">
        <input
          type="checkbox"
          className=""
          checked={todo.isDone}
          style={{ width: 24, height: 24 }}
          onChange={e =>
            actions.setDone({ todoId: todo.id, isDone: e.target.checked })
          }
        />
      </div>
      <div
        className="ph1 pv1 flex-grow-1 lh-title"
        onClick={() => actions.editTodoClicked(todo.id)}
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
      <ViewTodoItemSchedule todoId={todo.id} />
      <div className="relative">
        <IconButton
          id={todoMenuAnchorDomIdFor(todo.id)}
          size="small"
          onClick={() => actions.todoMenu.open(todo.id)}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  )
})

function ViewTodoItemSchedule({ todoId }: { todoId: TodoId }) {
  const { actions } = useOvermind()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const setDueAt = (dueAt: DueAtPayload) => () => {
    actions.setDueAt({ dueAt, todoId })
    setAnchorEl(null)
  }

  return (
    <div>
      <IconButton
        size="small"
        onClick={e => {
          setAnchorEl(e.currentTarget)
        }}
      >
        <ScheduleIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        keepMounted={true}
        onClose={() => {
          setAnchorEl(null)
        }}
      >
        <MenuItem onClick={setDueAt('Yesterday')}>Yesterday</MenuItem>
        <MenuItem onClick={setDueAt('Today')}>Today</MenuItem>
        <MenuItem onClick={setDueAt('Tomorrow')}>Tomorrow</MenuItem>
      </Menu>
    </div>
  )
}

function Btn(props: ButtonProps) {
  return <MUIButton size="small" color="primary" {...props} />
}

render(<App />, document.getElementById('root'))
