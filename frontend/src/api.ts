const BASE = 'https://pandoralk.pandoralk.workers.dev';

async function req(path: string, method = 'GET', body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  getEmployees: () => req('/employees').then(d => d.employees),
  createEmployee: (data: object) => req('/employees', 'POST', data).then(d => d.employee),
  updateEmployee: (id: number, data: object) => req(`/employees/${id}`, 'PUT', data).then(d => d.employee),
  deleteEmployee: (id: number) => req(`/employees/${id}`, 'DELETE'),

  getEvaluations: (params?: { month?: string; employeeId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.month) qs.set('month', params.month);
    if (params?.employeeId) qs.set('employeeId', String(params.employeeId));
    return req(`/evaluations?${qs}`).then(d => d.evaluations);
  },
  getEvaluation: (id: number) => req(`/evaluations/${id}`).then(d => d.evaluation),
  createEvaluation: (data: object) => req('/evaluations', 'POST', data).then(d => d.evaluation),
  updateEvaluation: (id: number, data: object) => req(`/evaluations/${id}`, 'PUT', data).then(d => d.evaluation),
  deleteEvaluation: (id: number) => req(`/evaluations/${id}`, 'DELETE'),

  getDashboard: (month?: string) => req(`/dashboard${month ? `?month=${month}` : ''}`),

  getReport: (type: string, month?: string) =>
    req(`/reports/${type}${month ? `?month=${month}` : ''}`).then(d => d.data),
};
