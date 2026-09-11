const API_BASE_URL = import.meta.env.VITE_API_URL;

async function request(path, options = {}, token) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL is not configured.");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "The request could not be completed.");
  }
  return payload;
}

export const register = (data) => request("/auth/register", {
  method: "POST",
  body: JSON.stringify(data),
});

export const login = (data) => request("/auth/login", {
  method: "POST",
  body: JSON.stringify(data),
});

export const getProjects = (token) => request("/projects", {}, token);

export const createProject = (data, token) => request("/projects", {
  method: "POST",
  body: JSON.stringify(data),
}, token);

export const getSites = (projectId, token) => request(
  `/projects/${projectId}/sites`,
  {},
  token,
);

export const createSite = (projectId, data, token) => request(
  `/projects/${projectId}/sites`,
  {
    method: "POST",
    body: JSON.stringify(data),
  },
  token,
);

export const getSimulation = (siteId, scenario, token) => request(
  `/sites/${siteId}/simulation?scenario=${encodeURIComponent(scenario)}`,
  {},
  token,
);

export const updateSite = (siteId, data, token) => request(
  `/sites/${siteId}`,
  { method: "PATCH", body: JSON.stringify(data) },
  token,
);

export const deleteSite = (siteId, token) => request(
  `/sites/${siteId}`,
  { method: "DELETE" },
  token,
);

export const saveSimulation = (siteId, scenario, token) => request(
  `/sites/${siteId}/simulation`,
  { method: "POST", body: JSON.stringify({ scenario }) },
  token,
);
