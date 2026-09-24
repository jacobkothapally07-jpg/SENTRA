import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Terminal,
  Sliders,
  Shield,
  Flame,
  GitMerge,
  Cpu,
} from 'lucide-react';
import {
  Incident,
  IncidentStatus,
  ServiceNode,
  DetectionRule,
  SystemStats,
  NormalizedEvent,
} from './types';
import { ThemeMode } from './theme';
import { api } from './services/api';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { IncidentList } from './components/IncidentList';
import { IncidentDetail } from './components/IncidentDetail';
import { TopologyView } from './components/TopologyView';
import { LiveEventStream } from './components/LiveEventStream';
import { RulesManager } from './components/RulesManager';
import { ArchitectureView } from './components/ArchitectureView';
import { EventInjectorModal } from './components/EventInjectorModal';

export function App() {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('naval-cream');
  const [activeTab, setActiveTab] = useState<'incidents' | 'topology' | 'events' | 'rules' | 'architecture'>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<ServiceNode[]>([]);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isInjectorOpen, setIsInjectorOpen] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [demoBannerMessage, setDemoBannerMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const handleSelectTheme = (theme: ThemeMode) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sentra_theme', theme);
  };

  useEffect(() => {
    const saved = (localStorage.getItem('sentra_theme') as ThemeMode) || 'naval-cream';
    setCurrentTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const refreshAll = async () => {
    try {
      const [incRes, svcRes, statRes, rulesRes, evtRes] = await Promise.all([
        api.getIncidents(),
        api.getTopology(),
        api.getStats(),
        api.getRules(),
        api.getEvents(80),
      ]);
      setIncidents(incRes);
      setServices(svcRes);
      setStats(statRes);
      setRules(rulesRes);
      setEvents(evtRes);
    } catch (err) {
      console.error('Error fetching engine state', err);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWs = () => {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INITIAL_SNAPSHOT') {
            if (data.incidents) setIncidents(data.incidents);
            if (data.services) setServices(data.services);
            if (data.stats) setStats(data.stats);
          } else if (data.type === 'INCIDENT_UPDATE') {
            const updated: Incident = data.incident;
            setIncidents((prev) => {
              const existingIdx = prev.findIndex((i) => i.id === updated.id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = updated;
                return next;
              }
              return [updated, ...prev];
            });
          } else if (data.type === 'NEW_EVENT') {
            if (isStreaming) {
              setEvents((prev) => [data.event, ...prev.slice(0, 150)]);
            }
          } else if (data.type === 'EVENT_REPEATED') {
            setEvents((prev) =>
              prev.map((e) => (e.id === data.event_id ? { ...e, repeat_count: data.repeat_count } : e))
            );
          } else if (data.type === 'TELEMETRY_SNAPSHOT') {
            if (data.stats) setStats(data.stats);
            if (data.services) setServices(data.services);
          } else if (data.type === 'DEMO_STEP_UPDATE') {
            setDemoBannerMessage(data.message);
            if (data.stats) setStats(data.stats);
            refreshAll();
          }
        } catch (err) {
          console.error('WebSocket parse error', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        setTimeout(connectWs, 2000);
      };

      socket.onerror = () => {
        setIsConnected(false);
      };
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isStreaming]);

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setIsDetailOpen(true);
  };

  const handleQuickStatusChange = async (id: string, status: IncidentStatus) => {
    try {
      const updated = await api.updateIncidentStatus(id, status);
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleUpdateStatusInDetail = async (id: string, status: IncidentStatus, assignedTo?: string) => {
    try {
      const updated = await api.updateIncidentStatus(id, status, assignedTo);
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      console.error('Failed to update status in detail', err);
    }
  };

  const handleAddNote = async (id: string, author: string, text: string) => {
    try {
      const updated = await api.addIncidentNote(id, author, text);
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      console.error('Failed to add note', err);
    }
  };

  const handleTriggerScenario = async (scenario: string) => {
    try {
      await api.triggerScenario(scenario);
      refreshAll();
    } catch (err) {
      console.error('Failed to trigger scenario', err);
    }
  };

  const handleStartDemo = async () => {
    try {
      await api.startDemo();
      setActiveTab('incidents');
    } catch (err) {
      console.error('Failed to start demo', err);
    }
  };

  const handleStopDemo = async () => {
    try {
      await api.stopDemo();
      setDemoBannerMessage(null);
      refreshAll();
    } catch (err) {
      console.error('Failed to stop demo', err);
    }
  };

  const handleToggleSimulator = async () => {
    try {
      if (stats?.simulator_running) {
        await api.stopSimulator();
      } else {
        await api.startSimulator(stats?.events_per_second || 4);
      }
      refreshAll();
    } catch (err) {
      console.error('Failed to toggle simulator', err);
    }
  };

  const handleChangeRate = async (rate: number) => {
    try {
      await api.setSimulatorRate(rate);
      setStats((prev) => (prev ? { ...prev, events_per_second: rate } : prev));
    } catch (err) {
      console.error('Failed to change rate', err);
    }
  };

  const handleReset = async () => {
    try {
      await api.resetState();
      setSelectedIncidentId(null);
      setIsDetailOpen(false);
      setDemoBannerMessage(null);
      refreshAll();
    } catch (err) {
      console.error('Failed to reset state', err);
    }
  };

  const handleToggleRule = async (id: string) => {
    try {
      const updated = await api.toggleRule(id);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error('Failed to toggle rule', err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await api.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete rule', err);
    }
  };

  const handleCreateRule = async (rule: Partial<DetectionRule>) => {
    try {
      const created = await api.createRule(rule);
      setRules((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to create rule', err);
    }
  };

  const handleSelectServiceFromTopology = (serviceName: string) => {
    setActiveTab('incidents');
  };

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;
  const activeIncidentCount = incidents.filter((i) => i.status !== 'RESOLVED').length;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F3EEE5] text-[#172235] transition-colors duration-150">
      {/* Header */}
      <Header
        stats={stats}
        isConnected={isConnected}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
        onTriggerScenario={handleTriggerScenario}
        onToggleSimulator={handleToggleSimulator}
        onReset={handleReset}
        onChangeRate={handleChangeRate}
        onOpenInjector={() => setIsInjectorOpen(true)}
        onStartDemo={handleStartDemo}
        onStopDemo={handleStopDemo}
      />

      {/* DEMO RUNNING BANNER */}
      {stats?.is_demo_running && (
        <div className="bg-[#183B63] text-white px-6 py-2 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="font-bold uppercase tracking-wider text-[#DCE7F2]">DEMO IN PROGRESS (Stage {stats.demo_step}/10):</span>
            <span className="text-white font-medium">{demoBannerMessage || 'Executing incident lifecycle...'}</span>
          </div>
          <button
            onClick={handleStopDemo}
            className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#FBF8F1] text-[#183B63] font-bold hover:bg-[#EAE4D8] transition"
          >
            Stop
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 space-y-4">
        {/* KPI Stats Bar */}
        <StatsBar stats={stats} services={services} />

        {/* Minimal Navigation Bar */}
        <div className="flex items-center justify-between border-b border-[#D8D1C5] pb-0 flex-wrap gap-2">
          <nav className="flex space-x-6 flex-wrap">
            <button
              onClick={() => setActiveTab('incidents')}
              className={`flex items-center space-x-2 pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                activeTab === 'incidents'
                  ? 'border-[#183B63] text-[#183B63]'
                  : 'border-transparent text-[#667085] hover:text-[#172235]'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${activeTab === 'incidents' ? 'text-[#183B63]' : 'text-[#8A8F98]'}`} />
              <span>INCIDENTS</span>
              {activeIncidentCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-[#F4DEDA] text-[#B73535] border border-[#B73535]/30 font-bold">
                  {activeIncidentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('topology')}
              className={`flex items-center space-x-2 pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                activeTab === 'topology'
                  ? 'border-[#183B63] text-[#183B63]'
                  : 'border-transparent text-[#667085] hover:text-[#172235]'
              }`}
            >
              <GitMerge className={`w-3.5 h-3.5 ${activeTab === 'topology' ? 'text-[#183B63]' : 'text-[#8A8F98]'}`} />
              <span>TOPOLOGY & CASCADE</span>
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`flex items-center space-x-2 pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                activeTab === 'events'
                  ? 'border-[#183B63] text-[#183B63]'
                  : 'border-transparent text-[#667085] hover:text-[#172235]'
              }`}
            >
              <Terminal className={`w-3.5 h-3.5 ${activeTab === 'events' ? 'text-[#183B63]' : 'text-[#8A8F98]'}`} />
              <span>LIVE TELEMETRY</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center space-x-2 pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                activeTab === 'rules'
                  ? 'border-[#183B63] text-[#183B63]'
                  : 'border-transparent text-[#667085] hover:text-[#172235]'
              }`}
            >
              <Sliders className={`w-3.5 h-3.5 ${activeTab === 'rules' ? 'text-[#183B63]' : 'text-[#8A8F98]'}`} />
              <span>DETECTION RULES ({rules.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center space-x-2 pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                activeTab === 'architecture'
                  ? 'border-[#183B63] text-[#183B63]'
                  : 'border-transparent text-[#667085] hover:text-[#172235]'
              }`}
            >
              <Cpu className={`w-3.5 h-3.5 ${activeTab === 'architecture' ? 'text-[#183B63]' : 'text-[#8A8F98]'}`} />
              <span>SYSTEM ARCHITECTURE</span>
            </button>
          </nav>

          {/* Active Scenario Indicator */}
          {stats?.active_scenario && (
            <div className="flex items-center space-x-2 px-3 py-1 mb-2 rounded-md border border-[#B47A32]/50 bg-[#FAF0E1] text-[#B47A32] text-xs font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#B47A32] animate-pulse"></span>
              <span>Scenario: {stats.active_scenario}</span>
            </div>
          )}
        </div>

        {/* View Routing */}
        <div className="pt-2">
          {activeTab === 'incidents' && (
            <IncidentList
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={handleSelectIncident}
              onQuickStatusChange={handleQuickStatusChange}
            />
          )}

          {activeTab === 'topology' && (
            <TopologyView
              services={services}
              activeIncidents={incidents.filter((i) => i.status !== 'RESOLVED')}
              onSelectService={handleSelectServiceFromTopology}
            />
          )}

          {activeTab === 'events' && (
            <LiveEventStream
              events={events}
              isStreaming={isStreaming}
              onToggleStream={() => setIsStreaming(!isStreaming)}
            />
          )}

          {activeTab === 'rules' && (
            <RulesManager
              rules={rules}
              onToggleRule={handleToggleRule}
              onDeleteRule={handleDeleteRule}
              onCreateRule={handleCreateRule}
            />
          )}

          {activeTab === 'architecture' && <ArchitectureView />}
        </div>
      </main>

      {/* Incident Deep Dive Modal */}
      {isDetailOpen && (
        <IncidentDetail
          incident={selectedIncident}
          onClose={() => setIsDetailOpen(false)}
          onUpdateStatus={handleUpdateStatusInDetail}
          onAddNote={handleAddNote}
        />
      )}

      {/* Manual Event Injector Modal */}
      <EventInjectorModal
        isOpen={isInjectorOpen}
        onClose={() => setIsInjectorOpen(false)}
        onSuccess={refreshAll}
      />

      {/* Footer */}
      <footer className="border-t border-[#D8D1C5] bg-[#FBF8F1] py-3.5 px-6 text-xs text-[#667085] flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-[#183B63]" />
          <span className="font-semibold text-[#172235]">Sentra</span>
          <span>• Incident Response Platform</span>
        </div>
        <div className="text-[11px] text-[#667085]">
          Team 1234FORGE • <strong>Jacob Kothapally</strong> (Lead), Vedasri, Akshaya, Amith, Sai Srujan
        </div>
      </footer>
    </div>
  );
}

export default App;
