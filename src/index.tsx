import * as React from 'react'
import { FC, forwardRef } from 'react'
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
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import {
  AddingTodo,
  EditingTodo,
  todoMenuAnchorDomIdFor,
  maybeAddingTodo,
  maybeEditingTodoFor,
  Project,
  ProjectId,
  ProjectList,
  Todo,
  TodoFormFields,
  TodoId,
} from './overmind/state'
import { TodoMenuAction } from './overmind/todoMenu/actions'
import { config, useOvermind } from './overmind'
import MUIButton, { ButtonProps } from '@material-ui/core/Button'

const { memo, useEffect, useState } = React

const overmind = createOvermind(config)

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
      <Btn onClick={() => actions.addFakeProjectClicked()}>
        Add Fake Project
      </Btn>
      <div className="f4 pv1">TodoList</div>
      <ViewTodoList todoList={state.todoList} />
      {addingTodo ? (
        <ViewAddTodoForm addingTodo={addingTodo} />
      ) : (
        <>
          <Btn
            size="small"
            color="primary"
            onClick={() => actions.addTodoClicked()}
          >
            Add Task
          </Btn>
          <Btn onClick={() => actions.addFakeTodoClicked()}>
            Add Fake Task
          </Btn>
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
  const { actions, reaction } = useOvermind()

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  useEffect(() =>
    reaction(
      state => state.currentTodoMenuAnchorDomId,
      state => {
        // @ts-ignore
        setAnchorEl(document.getElementById(state.currentTodoMenuAnchorDomId))
      },
      { immediate: true },
    ),
  )

  const itemAction = (action: TodoMenuAction) => () =>
    actions.todoMenuItemClicked(action)
  return (
    <Menu
      anchorEl={anchorEl}
      open={!!anchorEl}
      keepMounted={true}
      onClose={() => actions.todoMenuClose()}
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
      <div className="relative">
        <IconButton
          id={todoMenuAnchorDomIdFor(todo.id)}
          size="small"
          onClick={() => actions.todoMenuOpen(todo.id)}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  )
})

function Btn(props: ButtonProps) {
  return <MUIButton size="small" color="primary" {...props} />
}

render(<App />, document.getElementById('root'))
