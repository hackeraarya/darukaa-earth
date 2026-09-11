import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import MapView from "./components/MapView";
import {
  createProject as createProjectRequest,
  createSite,
  getProjects,
  getSimulation,
  getSites,
  login,
  register,
  saveSimulation,
  updateSite,
  deleteSite,
} from "./api";
import {
  LayoutDashboard,
  Map,
  FolderKanban,
  Leaf,
  TreePine,
  Settings,
} from "lucide-react";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("darukaa_token"));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("darukaa_user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showSimulator, setShowSimulator] = useState(false);
  const [area, setArea] = useState(0);
  const [scenario, setScenario] = useState("Moderate");
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [sites, setSites] = useState([]);
  const [activeSite, setActiveSite] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [siteName, setSiteName] = useState("Restoration Site");

  useEffect(() => {
    if (!token) return;
    getProjects(token)
      .then((loadedProjects) => {
        setProjects(loadedProjects);
        setSelectedProjectId((currentId) => currentId || loadedProjects[0]?.id || null);
      })
      .catch((error) => setAuthError(error.message));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedProjectId) {
      return;
    }
    getSites(selectedProjectId, token)
      .then((loadedSites) => {
        setSites(loadedSites);
        setActiveSite((currentSite) => currentSite || loadedSites[0] || null);
      })
      .catch((error) => setAuthError(error.message));
  }, [token, selectedProjectId]);

  useEffect(() => {
    if (!activeSite || !token) return;
    getSimulation(activeSite.id, scenario, token)
      .then(setSimulation)
      .catch((error) => setAuthError(error.message));
  }, [activeSite, scenario, token]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      if (authMode === "register") {
        await register({ email: authEmail, name: authName, password: authPassword });
      }
      const result = await login({ email: authEmail, password: authPassword });
      localStorage.setItem("darukaa_token", result.access_token);
      localStorage.setItem("darukaa_user", JSON.stringify(result.user));
      setToken(result.access_token);
      setUser(result.user);
      setAuthPassword("");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name.");
      return;
    }
  
    try {
      const newProject = await createProjectRequest({
        name: projectName,
        description: projectDescription || null,
        status: "Planning",
      }, token);
      setProjects((currentProjects) => [newProject, ...currentProjects]);
      setSelectedProjectId(newProject.id);
      setProjectName("");
      setProjectDescription("");
      setShowProjectForm(false);
    } catch (error) {
      setAuthError(error.message);
    }
  };
  const scenarioRates = {
    Conservative: 35,
    Moderate: 50,
    Aggressive: 70,
  };
  
  const carbonRate = scenarioRates[scenario];
  
  const localYearlyCarbon = Array.from({ length: 10 }, (_, index) => {
    const year = index + 1;
  
    return {
      year,
      carbon: Math.round(area * carbonRate * year),
    };
  });
  
  const yearlyCarbon = simulation?.yearly_carbon || localYearlyCarbon;
  const totalCarbon = simulation?.total_carbon || yearlyCarbon[9].carbon;

  const carbonChartData = {
    labels: yearlyCarbon.map((item) => `Year ${item.year}`),
    datasets: [
      {
        label: "Estimated Carbon Sequestration (tonnes)",
        data: yearlyCarbon.map((item) => item.carbon),
        borderColor: "#27764a",
        backgroundColor: "rgba(39, 118, 74, 0.18)",
        pointBackgroundColor: "#27764a",
        pointBorderColor: "#ffffff",
        pointRadius: 4,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const carbonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#506158",
          boxWidth: 12,
          font: { size: 11 },
        },
      },
      title: {
        display: true,
        text: "Simulated 10-Year Carbon Projection",
        color: "#1d3b28",
        font: { size: 14, weight: "600" },
      },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${Number(context.parsed.y).toLocaleString()} tonnes (estimated)`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Year",
          color: "#718078",
        },
        ticks: { color: "#7b857f" },
        grid: { color: "#e8eee9" },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Estimated Carbon Sequestration (tonnes)",
          color: "#718078",
        },
        ticks: { color: "#7b857f" },
        grid: { color: "#e8eee9" },
      },
    },
  };
  
  const biodiversityScore = simulation?.biodiversity_score || Math.min(
    100,
    Math.round(
      35 +
        area * 1.2 +
        (scenario === "Moderate"
          ? 15
          : scenario === "Aggressive"
          ? 25
          : 8)
    )
  );

  const saveSite = async (geometry, siteId) => {
    if (!geometry || !selectedProjectId) return;
    try {
      if (siteId) {
        const updatedSite = await updateSite(siteId, { name: siteName, geometry }, token);
        setSites((currentSites) => currentSites.map((site) => site.id === siteId ? updatedSite : site));
        setActiveSite(updatedSite);
        setArea(updatedSite.area_km2);
      } else {
        const savedSite = await createSite(selectedProjectId, {
          name: siteName,
          geometry,
        }, token);
        setSites((currentSites) => [...currentSites, savedSite]);
        setActiveSite(savedSite);
        setArea(savedSite.area_km2);
      }
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const removeSite = async (siteId) => {
    if (!siteId) return;
    try {
      await deleteSite(siteId, token);
      setSites((currentSites) => currentSites.filter((site) => site.id !== siteId));
      setActiveSite(null);
      setArea(0);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const persistSimulation = async () => {
    if (!activeSite) {
      setAuthError("Save a site before saving its simulation.");
      return;
    }
    try {
      await saveSimulation(activeSite.id, scenario, token);
      setShowSimulator(false);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  return (
    <div className="app">
      {!token && (
        <div className="modal-overlay auth-overlay">
          <form className="modal auth-modal" onSubmit={handleAuth}>
            <div className="modal-header">
              <div>
                <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
                <p>Sign in to manage restoration projects and sites.</p>
              </div>
            </div>
            {authMode === "register" && (
              <div className="form-group">
                <label>Name</label>
                <input value={authName} onChange={(event) => setAuthName(event.target.value)} required />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} minLength="8" required />
            </div>
            {authError && <p className="api-error">{authError}</p>}
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                {authMode === "login" ? "Register" : "Sign in"}
              </button>
              <button type="submit" className="create-button" disabled={loading}>
                {loading ? "Connecting..." : authMode === "login" ? "Sign in" : "Create account"}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Project Creation Modal */}
      {showProjectForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Create Restoration Project</h2>
                <p>
                  Set up a new project for your restoration site.
                </p>
              </div>

              <button
                className="close-button"
                onClick={() => setShowProjectForm(false)}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label>Project Name</label>

              <input
                type="text"
                placeholder="e.g. Western Forest Restoration"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Description</label>

              <textarea
                placeholder="Describe the restoration project..."
                value={projectDescription}
                onChange={(e) =>
                  setProjectDescription(e.target.value)
                }
              />
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowProjectForm(false)}
              >
                Cancel
              </button>

              <button
                className="create-button"
                onClick={createProject}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Site Simulator Modal */}
{showSimulator && (
  <div className="modal-overlay">
    <div className="modal simulator-modal">
      <div className="modal-header">
        <div>
          <h2>Restoration Site Simulator</h2>
          <p>
            Simulated estimates based on site area and restoration scenario.
          </p>
        </div>

        <button
          className="close-button"
          onClick={() => setShowSimulator(false)}
        >
          ×
        </button>
      </div>

      <div className="form-group">
        <label>Site Area (km²)</label>

        <input
          type="number"
          min="0.1"
          step="0.1"
          value={area}
          onChange={(e) => setArea(Number(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label>Restoration Scenario</label>

        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
        >
          <option>Conservative</option>
          <option>Moderate</option>
          <option>Aggressive</option>
        </select>
      </div>

      <div className="simulation-results">
        <div className="result-box">
          <span>10-Year Carbon</span>
          <strong>{totalCarbon.toLocaleString()} t</strong>
        </div>

        <div className="result-box">
          <span>Biodiversity Score</span>
          <strong>{biodiversityScore}/100</strong>
        </div>
      </div>

      <div className="carbon-chart-section">
        <h3>10-Year Estimated Carbon Sequestration</h3>
        <p className="carbon-chart-caption">
          Simulated / estimated projection based on site area and restoration
          scenario. Not measured carbon credits.
        </p>
        <div className="carbon-chart-wrap">
          <Line data={carbonChartData} options={carbonChartOptions} />
        </div>
      </div>

      <div className="projection-table">
        <h3>10-Year Carbon Projection</h3>

        {yearlyCarbon.map((item) => (
          <div className="projection-row" key={item.year}>
            <span>Year {item.year}</span>

            <div className="projection-bar">
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (item.carbon / totalCarbon) * 100
                  )}%`,
                }}
              ></div>
            </div>

            <strong>
              {item.carbon.toLocaleString()} t
            </strong>
          </div>
        ))}
      </div>

      <div className="simulation-note">
        ⚠️ These are simulated estimates for planning purposes,
        not measured carbon credits.
      </div>

      <div className="modal-actions">
        <button
          className="cancel-button"
          onClick={() => setShowSimulator(false)}
        >
          Close
        </button>

        <button
          className="create-button"
          onClick={persistSimulation}
        >
          Save Simulation
        </button>
      </div>
    </div>
  </div>
)}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">
            <Leaf size={22} />
          </div>

          <div>
            <h2>Darukaa.Earth</h2>
            <span>Restoration Simulator</span>
          </div>
        </div>

        <nav className="navigation">
          <button className="nav-item active">
            <LayoutDashboard size={19} />
            Dashboard
          </button>

          <button className="nav-item">
            <Map size={19} />
            Map Explorer
          </button>

          <button className="nav-item">
            <FolderKanban size={19} />
            Projects
          </button>

          <button className="nav-item">
            <TreePine size={19} />
            Biodiversity
          </button>

          <button className="nav-item">
            <Settings size={19} />
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-avatar">{user?.name?.slice(0, 1).toUpperCase() || "A"}</div>

          <div>
            <strong>{user?.name || "Project Manager"}</strong>
            <span>{user?.email || "Restoration workspace"}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Restoration Dashboard</h1>
            <p>
              Explore restoration sites and simulate their carbon impact.
            </p>
          </div>

          <button
            className="new-project-button"
            onClick={() => setShowProjectForm(true)}
            disabled={!token}
          >
            + New Project
          </button>
        </header>

        {/* Statistics */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FolderKanban size={22} />
            </div>

            <div>
              <span>Active Projects</span>
              <h2>{projects.length}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Map size={22} />
            </div>

            <div>
              <span>Total Sites</span>
              <h2>{projects.reduce((total, project) => total + project.site_count, 0)}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Leaf size={22} />
            </div>

            <div>
              <span>Total Area</span>
              <h2>{projects.reduce((total, project) => total + project.site_count, 0) ? area.toFixed(1) : "0.0"} km²</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <TreePine size={22} />
            </div>

            <div>
              <span>Projected Carbon</span>
              <h2>{Math.round(totalCarbon).toLocaleString()} t</h2>
            </div>
          </div>
        </section>

        {/* Dashboard */}
        <section className="dashboard-grid">
        <div className="map-card">
  <div className="card-header">
    <div>
      <h2>Restoration Sites</h2>
      <p>Interactive project map</p>
    </div>
            <select value={selectedProjectId || ""} onChange={(event) => setSelectedProjectId(Number(event.target.value) || null)} disabled={!projects.length}>
              {!projects.length && <option value="">Create a project first</option>}
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
  </div>

  <div className="map-container">
    <MapView
      onAreaCalculated={setArea}
      onGeometryChanged={saveSite}
      onSiteDeleted={removeSite}
      savedSites={sites}
    />
  </div>

  <div className="site-area-display">
    <div>
      <label htmlFor="site-name">Site name</label>
      <input
        id="site-name"
        value={siteName}
        onChange={(event) => setSiteName(event.target.value)}
      />
      <span>Selected Site Area</span>
      <strong>{area.toFixed(2)} km²</strong>
    </div>

    <button
      className="view-map-button"
      onClick={() => setShowSimulator(true)}
    >
      Simulate Site
    </button>
  </div>
</div>

          <div className="simulation-card">
            <div className="card-header">
              <div>
                <h2>Carbon Projection</h2>
                <p>10-year simulated estimate</p>
              </div>
            </div>

            <div className="chart-placeholder">
              <div className="chart-line"></div>

              <div className="chart-labels">
                <span>Year 1</span>
                <span>Year 5</span>
                <span>Year 10</span>
              </div>
            </div>

            <div className="projection-value">
              <span>Projected Carbon Yield</span>
              <strong>18,420 tonnes</strong>
            </div>
          </div>
        </section>

        {/* Recent Projects */}
<section className="projects-card">
  <div className="card-header">
    <div>
      <h2>Recent Projects</h2>
      <p>Your latest restoration projects</p>
    </div>

    <button className="view-all-button">
      View All
    </button>
  </div>

  {projects.map((project) => (
    <div className="project-row" key={project.id}>
      <div className="project-info">
        <div className="project-icon">
          <Leaf size={20} />
        </div>

        <div>
          <strong>{project.name}</strong>

          <span>
            {project.site_count} sites
          </span>
        </div>
      </div>

      <span
        className={`status ${
          project.status === "Active"
            ? "active-status"
            : "planning-status"
        }`}
      >
        {project.status}
      </span>
    </div>
  ))}
</section>
        <footer>
          <span>Darukaa.Earth</span>
          <span>
            Simulated estimates • For planning purposes
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;