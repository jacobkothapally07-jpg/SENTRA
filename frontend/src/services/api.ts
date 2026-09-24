import {
  Incident,
  IncidentStatus,
  IncidentSeverity,
  DetectionRule,
  ServiceNode,
  SystemStats,
  NormalizedEvent,
  AuditLogEntry,
} from '../types';

const API_BASE = '/api';

export const api = {
  getStats: async (): Promise<SystemStats> => {
    const res = await fetch(`${API_BASE}/stats`);
    return res.json();
  },

  startDemo: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/demo/start`, { method: 'POST' });
    return res.json();
  },

  stopDemo: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/demo/stop`, { method: 'POST' });
    return res.json();
  },

  getIncidents: async (params?: { status?: string; severity?: string; service?: string }): Promise<Incident[]> => {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/incidents?${query}`);
    return res.json();
  },

  getIncidentById: async (id: string): Promise<Incident> => {
    const res = await fetch(`${API_BASE}/incidents/${id}`);
    if (!res.ok) throw new Error('Incident not found');
    return res.json();
  },

  updateIncidentStatus: async (
    id: string,
    status: IncidentStatus,
    assignedTo?: string,
    operator?: string
  ): Promise<Incident> => {
    const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, assigned_to: assignedTo, operator }),
    });
    return res.json();
  },

  addIncidentNote: async (id: string, author: string, text: string): Promise<Incident> => {
    const res = await fetch(`${API_BASE}/incidents/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, text }),
    });
    return res.json();
  },

  recordFeedback: async (
    id: string,
    feedback: {
      operator: string;
      correlation_accurate: boolean;
      root_cause_accurate: boolean;
      user_root_cause?: string;
      notes?: string;
    }
  ): Promise<Incident> => {
    const res = await fetch(`${API_BASE}/incidents/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    return res.json();
  },

  getEvents: async (
    limit: number = 100,
    service?: string,
    level?: string,
    anomaliesOnly: boolean = false
  ): Promise<NormalizedEvent[]> => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (service && service !== 'ALL') params.append('service', service);
    if (level && level !== 'ALL') params.append('level', level);
    if (anomaliesOnly) params.append('anomalies_only', 'true');
    const res = await fetch(`${API_BASE}/events?${params.toString()}`);
    return res.json();
  },

  ingestEvent: async (event: Partial<NormalizedEvent>): Promise<NormalizedEvent> => {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    return res.json();
  },

  getRules: async (): Promise<DetectionRule[]> => {
    const res = await fetch(`${API_BASE}/rules`);
    return res.json();
  },

  createRule: async (rule: Partial<DetectionRule>): Promise<DetectionRule> => {
    const res = await fetch(`${API_BASE}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    return res.json();
  },

  updateRule: async (id: string, rule: DetectionRule): Promise<DetectionRule> => {
    const res = await fetch(`${API_BASE}/rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    return res.json();
  },

  toggleRule: async (id: string): Promise<DetectionRule> => {
    const res = await fetch(`${API_BASE}/rules/${id}/toggle`, {
      method: 'PATCH',
    });
    return res.json();
  },

  deleteRule: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/rules/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  getTopology: async (): Promise<ServiceNode[]> => {
    const res = await fetch(`${API_BASE}/topology`);
    return res.json();
  },

  getAuditTrail: async (): Promise<AuditLogEntry[]> => {
    const res = await fetch(`${API_BASE}/audit`);
    return res.json();
  },

  startSimulator: async (eps: number = 4): Promise<any> => {
    const res = await fetch(`${API_BASE}/simulator/start?eps=${eps}`, { method: 'POST' });
    return res.json();
  },

  stopSimulator: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/simulator/stop`, { method: 'POST' });
    return res.json();
  },

  setSimulatorRate: async (rate: number): Promise<any> => {
    const res = await fetch(`${API_BASE}/simulator/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate }),
    });
    return res.json();
  },

  triggerScenario: async (scenario: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/simulator/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    return res.json();
  },

  resetState: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/simulator/reset`, { method: 'POST' });
    return res.json();
  },
};
