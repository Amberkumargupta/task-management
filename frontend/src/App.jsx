import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import "./App.css";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE,
});

const TOKEN_KEY = "ttm_token";
const USER_KEY = "ttm_user";

const emptyAuthForm = {
  name: "",
  email: "",
  password: "",
  role: "Member",
};

const emptyProjectForm = {
  title: "",
  description: "",
  members: [],
};

const emptyTaskForm = {
  title: "",
  description: "",
  project: "",
  assignedTo: "",
  dueDate: "",
  status: "Todo",
};

const blankNotice = { type: "", text: "" };

const safeJsonParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const stripUser = (value) => {
  if (!value) {
    return null;
  }

  const cloned = { ...value };
  delete cloned.password;
  return cloned;
};

const formatDate = (value) => {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const compareDates = (left, right) => new Date(right) - new Date(left);

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(() => stripUser(safeJsonParse(localStorage.getItem(USER_KEY))));
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(blankNotice);

  const isAdmin = user?.role === "Admin";

  const authHeaders = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};

  const selectedProject = useMemo(() => {
    return projects.find((project) => project._id === taskForm.project) || projects[0] || null;
  }, [projects, taskForm.project]);

  const stats = useMemo(() => {
    const todo = tasks.filter((task) => task.status === "Todo").length;
    const inProgress = tasks.filter((task) => task.status === "In Progress").length;
    const completed = tasks.filter((task) => task.status === "Completed").length;
    const overdue = tasks.filter((task) => {
      if (!task.dueDate || task.status === "Completed") {
        return false;
      }

      return new Date(task.dueDate).getTime() < Date.now();
    }).length;

    return {
      projects: projects.length,
      tasks: tasks.length,
      todo,
      inProgress,
      completed,
      overdue,
    };
  }, [projects, tasks]);

  const sortedProjects = useMemo(
    () => [...projects].sort((left, right) => compareDates(left.createdAt, right.createdAt)),
    [projects]
  );

  const sortedTasks = useMemo(
    () => [...tasks].sort((left, right) => compareDates(left.createdAt, right.createdAt)),
    [tasks]
  );

  useEffect(() => {
    if (!token) {
      setProjects([]);
      setTasks([]);
      setUsers([]);
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [projectResponse, taskResponse, userResponse] = await Promise.all([
          api.get("/api/projects", { headers: authHeaders }),
          api.get("/api/tasks", { headers: authHeaders }),
          isAdmin ? api.get("/api/users", { headers: authHeaders }) : Promise.resolve({ data: [] }),
        ]);

        const nextProjects = Array.isArray(projectResponse.data) ? projectResponse.data : [];
        const nextTasks = Array.isArray(taskResponse.data) ? taskResponse.data : [];
        const nextUsers = Array.isArray(userResponse.data) ? userResponse.data : [];

        setProjects(nextProjects);
        setTasks(nextTasks);
        setUsers(nextUsers);

        if (!taskForm.project && nextProjects.length > 0) {
          setTaskForm((current) => ({
            ...current,
            project: nextProjects[0]._id,
          }));
        }
      } catch (error) {
        const status = error?.response?.status;
        const message = error?.response?.data?.message || error.message || "Unable to load dashboard";

        if (status === 401) {
          handleLogout();
          setNotice({
            type: "error",
            text: "Session expired. Please sign in again.",
          });
          return;
        }

        setNotice({
          type: "error",
          text: message,
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  useEffect(() => {
    if (projects.length === 0) {
      return;
    }

    const projectExists = projects.some((project) => project._id === taskForm.project);

    if (!projectExists) {
      setTaskForm((current) => ({
        ...current,
        project: projects[0]._id,
      }));
    }
  }, [projects, taskForm.project]);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleProjectChange = (event) => {
    const { name, value, selectedOptions } = event.target;

    if (name === "members") {
      const members = Array.from(selectedOptions, (option) => option.value);

      setProjectForm((current) => ({
        ...current,
        members,
      }));
      return;
    }

    setProjectForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleTaskChange = (event) => {
    const { name, value } = event.target;

    setTaskForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setNotice(blankNotice);
    setSaving(true);

    try {
      if (authMode === "signup") {
        await api.post("/api/auth/signup", authForm);
        setNotice({
          type: "success",
          text: "Signup completed. You can now log in.",
        });
        setAuthMode("login");
        setAuthForm((current) => ({
          ...emptyAuthForm,
          email: current.email,
        }));
        return;
      }

      const response = await api.post("/api/auth/login", {
        email: authForm.email,
        password: authForm.password,
      });

      const nextUser = stripUser(response.data.user);
      setToken(response.data.token);
      setUser(nextUser);
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setNotice({
        type: "success",
        text: `Welcome back${nextUser?.name ? `, ${nextUser.name}` : ""}.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.response?.data?.message || error.message || "Authentication failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const refreshDashboard = async () => {
    if (!token) {
      return;
    }

    const [projectResponse, taskResponse, userResponse] = await Promise.all([
      api.get("/api/projects", { headers: authHeaders }),
      api.get("/api/tasks", { headers: authHeaders }),
      isAdmin ? api.get("/api/users", { headers: authHeaders }) : Promise.resolve({ data: [] }),
    ]);

    setProjects(Array.isArray(projectResponse.data) ? projectResponse.data : []);
    setTasks(Array.isArray(taskResponse.data) ? taskResponse.data : []);
    setUsers(Array.isArray(userResponse.data) ? userResponse.data : []);
  };

  const handleProjectSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      setNotice({
        type: "error",
        text: "Only Admin users can create projects.",
      });
      return;
    }

    setNotice(blankNotice);
    setSaving(true);

    try {
      await api.post(
        "/api/projects",
        {
          title: projectForm.title,
          description: projectForm.description,
          members: projectForm.members,
        },
        {
          headers: authHeaders,
        }
      );

      setProjectForm(emptyProjectForm);
      await refreshDashboard();
      setNotice({
        type: "success",
        text: "Project created successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.response?.data?.message || error.message || "Project creation failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      setNotice({
        type: "error",
        text: "Only Admin users can create tasks.",
      });
      return;
    }

    setNotice(blankNotice);
    setSaving(true);

    try {
      await api.post(
        "/api/tasks",
        {
          title: taskForm.title,
          description: taskForm.description,
          project: taskForm.project,
          assignedTo: taskForm.assignedTo || undefined,
          dueDate: taskForm.dueDate || undefined,
          status: taskForm.status,
        },
        {
          headers: authHeaders,
        }
      );

      setTaskForm((current) => ({
        ...emptyTaskForm,
        project: current.project,
      }));
      await refreshDashboard();
      setNotice({
        type: "success",
        text: "Task created successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.response?.data?.message || error.message || "Task creation failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
    setProjects([]);
    setTasks([]);
    setUsers([]);
    setAuthForm(emptyAuthForm);
    setProjectForm(emptyProjectForm);
    setTaskForm(emptyTaskForm);
    setNotice({
      type: "success",
      text: "Signed out successfully.",
    });
  };

  const resolveUserName = (value) => {
    if (!value) {
      return "Unassigned";
    }

    if (typeof value === "object") {
      return value.name || value.email || "Assigned user";
    }

    const match = users.find((entry) => entry._id === value);
    return match?.name || match?.email || "Assigned user";
  };

  const resolveProjectName = (value) => {
    if (!value) {
      return "No project";
    }

    if (typeof value === "object") {
      return value.title || "Untitled project";
    }

    const match = projects.find((entry) => entry._id === value);
    return match?.title || "Untitled project";
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.status === "Completed") {
      return false;
    }

    return new Date(task.dueDate).getTime() < Date.now();
  };

  const myTasks = useMemo(() => {
    if (!user?._id) {
      return [];
    }

    return tasks.filter((task) => String(task.assignedTo?._id || task.assignedTo) === String(user._id));
  }, [tasks, user]);

  return (
    <div className="app-shell">
      {!token ? (
        <main className="auth-layout">
          <section className="auth-hero">
            <span className="eyebrow">
              <Sparkles size={16} /> Full-stack assignment ready
            </span>
            <h1>Team Task Manager</h1>
            <p>
              Sign in to manage projects, assign tasks, and track progress with Admin and Member access.
            </p>

            <div className="feature-grid">
              <article>
                <LayoutDashboard size={20} />
                <h2>Role-based dashboard</h2>
                <p>Separate views for Admin and Member users keep the workflow clear.</p>
              </article>
              <article>
                <FolderKanban size={20} />
                <h2>Projects and teams</h2>
                <p>Create projects and include the right team members for each deliverable.</p>
              </article>
              <article>
                <Clock3 size={20} />
                <h2>Live status tracking</h2>
                <p>See Todo, In Progress, Completed, and overdue work in one place.</p>
              </article>
            </div>
          </section>

          <section className="auth-card">
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                className={authMode === "login" ? "tab active" : "tab"}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === "signup" ? "tab active" : "tab"}
                onClick={() => setAuthMode("signup")}
              >
                Signup
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <header className="form-header">
                <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
                <p>
                  {authMode === "login"
                    ? "Use your email and password to open the dashboard."
                    : "Create a new Admin or Member account for the team."}
                </p>
              </header>

              {notice.text ? <div className={`notice ${notice.type}`}>{notice.text}</div> : null}

              {authMode === "signup" ? (
                <label className="field">
                  <span>Name</span>
                  <input
                    name="name"
                    value={authForm.name}
                    onChange={handleAuthChange}
                    placeholder="Jane Doe"
                    required
                  />
                </label>
              ) : null}

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  placeholder="jane@company.com"
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  placeholder="••••••••"
                  required
                />
              </label>

              {authMode === "signup" ? (
                <label className="field">
                  <span>Role</span>
                  <select name="role" value={authForm.role} onChange={handleAuthChange}>
                    <option value="Member">Member</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>
              ) : null}

              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" size={18} /> : null}
                {authMode === "login" ? "Login" : "Create account"}
              </button>

              <p className="microcopy">
                After signup, use the same credentials to log in and reach the dashboard.
              </p>
            </form>
          </section>
        </main>
      ) : (
        <main className="dashboard-layout">
          <header className="topbar">
            <div>
              <span className="eyebrow">
                <ShieldCheck size={16} /> {user?.role || "Member"} workspace
              </span>
              <h1>Team Task Manager</h1>
              <p>
                Welcome back{user?.name ? `, ${user.name}` : ""}. Manage projects, tasks, and progress from one place.
              </p>
            </div>

            <button className="secondary-button" type="button" onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </button>
          </header>

          {notice.text ? <div className={`notice ${notice.type}`}>{notice.text}</div> : null}

          <section className="hero-panel">
            <div>
              <span className="eyebrow">
                <BarChart3 size={16} /> Live overview
              </span>
              <h2>Monitor projects, task status, and overdue work in real time.</h2>
              <p>
                This frontend connects directly to your Express and MongoDB backend using role-based auth.
              </p>
            </div>

            <div className="hero-summary">
              <div>
                <strong>{stats.projects}</strong>
                <span>Projects</span>
              </div>
              <div>
                <strong>{stats.tasks}</strong>
                <span>Tasks</span>
              </div>
              <div>
                <strong>{stats.overdue}</strong>
                <span>Overdue</span>
              </div>
            </div>
          </section>

          <section className="stats-grid">
            <article className="stat-card">
              <LayoutDashboard size={22} />
              <div>
                <span>Total tasks</span>
                <strong>{stats.tasks}</strong>
              </div>
            </article>
            <article className="stat-card">
              <FolderKanban size={22} />
              <div>
                <span>Projects</span>
                <strong>{stats.projects}</strong>
              </div>
            </article>
            <article className="stat-card">
              <Clock3 size={22} />
              <div>
                <span>In progress</span>
                <strong>{stats.inProgress}</strong>
              </div>
            </article>
            <article className="stat-card">
              <CheckCircle2 size={22} />
              <div>
                <span>Completed</span>
                <strong>{stats.completed}</strong>
              </div>
            </article>
          </section>

          <section className="workspace-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">
                    <Users size={16} /> Projects and teams
                  </span>
                  <h2>Projects</h2>
                  <p>Admins can create projects and attach team members from the current user list.</p>
                </div>
                <span className="badge muted">{sortedProjects.length} active</span>
              </div>

              {isAdmin ? (
                <form className="form-stack" onSubmit={handleProjectSubmit}>
                  <label className="field">
                    <span>Project title</span>
                    <input
                      name="title"
                      value={projectForm.title}
                      onChange={handleProjectChange}
                      placeholder="Website redesign"
                      required
                    />
                  </label>

                  <label className="field">
                    <span>Description</span>
                    <textarea
                      name="description"
                      rows="3"
                      value={projectForm.description}
                      onChange={handleProjectChange}
                      placeholder="Briefly describe the goals and scope."
                    />
                  </label>

                  <label className="field">
                    <span>Team members</span>
                    <select
                      multiple
                      name="members"
                      value={projectForm.members}
                      onChange={handleProjectChange}
                    >
                      {users.length > 0 ? (
                        users.map((teamMember) => (
                          <option key={teamMember._id} value={teamMember._id}>
                            {teamMember.name} ({teamMember.role})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No users available yet
                        </option>
                      )}
                    </select>
                    <span className="helper-text">Hold Ctrl or Cmd to select multiple members.</span>
                  </label>

                  <button className="primary-button" type="submit" disabled={saving}>
                    <Plus size={18} /> Create project
                  </button>
                </form>
              ) : (
                <div className="empty-state">
                  <AlertTriangle size={18} />
                  <p>Only Admin users can create projects. You can still review the project list below.</p>
                </div>
              )}

              <div className="card-list">
                {sortedProjects.length > 0 ? (
                  sortedProjects.map((project) => (
                    <article className="item-card" key={project._id}>
                      <div className="item-topline">
                        <div>
                          <h3>{project.title}</h3>
                          <p>{project.description || "No description provided."}</p>
                        </div>
                        <span className="badge">{project.members?.length || 0} members</span>
                      </div>

                      <div className="meta-grid">
                        <span>
                          <strong>Created by</strong>
                          {project.createdBy?.name || "System"}
                        </span>
                        <span>
                          <strong>Created</strong>
                          {formatDate(project.createdAt)}
                        </span>
                      </div>

                      <div className="member-chips">
                        {(project.members || []).length > 0 ? (
                          project.members.map((member) => (
                            <span className="chip" key={member._id || member.email || member.name}>
                              {member.name || member.email}
                            </span>
                          ))
                        ) : (
                          <span className="chip muted">No members assigned</span>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <FolderKanban size={18} />
                    <p>No projects yet. Create the first project to start the workflow.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">
                    <CheckCircle2 size={16} /> Status tracking
                  </span>
                  <h2>Tasks</h2>
                  <p>Create tasks, assign them to members, and watch status change across the board.</p>
                </div>
                <span className="badge muted">{stats.todo} todo</span>
              </div>

              {isAdmin ? (
                <form className="form-stack" onSubmit={handleTaskSubmit}>
                  <label className="field">
                    <span>Task title</span>
                    <input
                      name="title"
                      value={taskForm.title}
                      onChange={handleTaskChange}
                      placeholder="Build authentication screens"
                      required
                    />
                  </label>

                  <label className="field">
                    <span>Description</span>
                    <textarea
                      name="description"
                      rows="3"
                      value={taskForm.description}
                      onChange={handleTaskChange}
                      placeholder="Add acceptance criteria, edge cases, or links."
                    />
                  </label>

                  <div className="field-grid">
                    <label className="field">
                      <span>Project</span>
                      <select name="project" value={taskForm.project} onChange={handleTaskChange} required>
                        {projects.length > 0 ? (
                          projects.map((project) => (
                            <option key={project._id} value={project._id}>
                              {project.title}
                            </option>
                          ))
                        ) : (
                          <option value="">Create a project first</option>
                        )}
                      </select>
                    </label>

                    <label className="field">
                      <span>Assigned to</span>
                      <select name="assignedTo" value={taskForm.assignedTo} onChange={handleTaskChange}>
                        <option value="">Unassigned</option>
                        {users.length > 0 ? (
                          users.map((teamMember) => (
                            <option key={teamMember._id} value={teamMember._id}>
                              {teamMember.name} ({teamMember.role})
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No users available
                          </option>
                        )}
                      </select>
                    </label>

                    <label className="field">
                      <span>Status</span>
                      <select name="status" value={taskForm.status} onChange={handleTaskChange}>
                        <option value="Todo">Todo</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Due date</span>
                      <input type="date" name="dueDate" value={taskForm.dueDate} onChange={handleTaskChange} />
                    </label>
                  </div>

                  <button className="primary-button" type="submit" disabled={saving || !selectedProject}>
                    <Plus size={18} /> Create task
                  </button>
                </form>
              ) : (
                <div className="empty-state">
                  <AlertTriangle size={18} />
                  <p>Only Admin users can create tasks. You can still review task progress below.</p>
                </div>
              )}

              <div className="card-list">
                {sortedTasks.length > 0 ? (
                  sortedTasks.map((task) => (
                    <article className="item-card task-card" key={task._id}>
                      <div className="item-topline">
                        <div>
                          <h3>{task.title}</h3>
                          <p>{task.description || "No description provided."}</p>
                        </div>

                        <div className="status-stack">
                          <span className={`badge status ${task.status.replace(/\s+/g, "-").toLowerCase()}`}>
                            {task.status}
                          </span>
                          {isOverdue(task) ? <span className="badge danger">Overdue</span> : null}
                        </div>
                      </div>

                      <div className="meta-grid">
                        <span>
                          <strong>Project</strong>
                          {resolveProjectName(task.project)}
                        </span>
                        <span>
                          <strong>Assigned to</strong>
                          {resolveUserName(task.assignedTo)}
                        </span>
                        <span>
                          <strong>Due</strong>
                          {formatDate(task.dueDate)}
                        </span>
                        <span>
                          <strong>Created</strong>
                          {formatDate(task.createdAt)}
                        </span>
                      </div>

                      {user?._id && String(task.assignedTo?._id || task.assignedTo) === String(user._id) ? (
                        <div className="assignment-note">
                          <CheckCircle2 size={16} />
                          <span>This task is assigned to you.</span>
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <CheckCircle2 size={18} />
                    <p>No tasks yet. Create the first task to start tracking work.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="workspace-grid compact">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">
                    <Clock3 size={16} /> My workload
                  </span>
                  <h2>Assigned to you</h2>
                  <p>Quick view of tasks currently assigned to the logged-in user.</p>
                </div>
                <span className="badge muted">{myTasks.length} items</span>
              </div>

              <div className="card-list">
                {myTasks.length > 0 ? (
                  myTasks.map((task) => (
                    <article className="mini-row" key={task._id}>
                      <div>
                        <strong>{task.title}</strong>
                        <p>{resolveProjectName(task.project)}</p>
                      </div>
                      <span className={`badge status ${task.status.replace(/\s+/g, "-").toLowerCase()}`}>
                        {task.status}
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <Users size={18} />
                    <p>No tasks are assigned to you yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="panel panel-note">
              <span className="eyebrow">
                <Sparkles size={16} /> Deployment-ready
              </span>
              <h2>Built for Railway deployment</h2>
              <p>
                Set <code>VITE_API_URL</code> to your Railway backend URL and the dashboard will use that API at runtime.
              </p>
              <ul>
                <li>Signup and login flow backed by JWT auth.</li>
                <li>Admin-only project and task creation.</li>
                <li>Live counts for Todo, In Progress, Completed, and overdue tasks.</li>
              </ul>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;