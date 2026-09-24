import React, { useState } from 'react';
import {
  Shield,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Radio,
  PlusCircle,
  PlayCircle,
  StopCircle,
  Palette,
} from 'lucide-react';
import { SystemStats } from '../types';
import { ThemeMode, THEME_OPTIONS } from '../theme';

interface HeaderProps {
  stats: SystemStats | null;
  isConnected: boolean;
  currentTheme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
  onTriggerScenario: (scenario: string) => void;
  onToggleSimulator: () => void;
  onReset: () => void;
  onChangeRate: (rate: number) => void;
  onOpenInjector: () => void;
  onStartDemo: () => void;
  onStopDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  isConnected,
  currentTheme,
  onSelectTheme,
  onTriggerScenario,
  onToggleSimulator,
  onReset,
  onOpenInjector,
  onStartDemo,
  onStopDemo,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('');

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      onTriggerScenario(val);
      setSelectedScenario('');
    }
  };

  const systemStatus = stats?.global_system_status || 'OPERATIONAL';

  const getSystemStatusBadge = () => {
    switch (systemStatus) {
      case 'CRITICAL':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#F4DEDA] border border-[#B73535] text-[#B73535] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#B73535]"></span>
            <span>SYSTEM CRITICAL</span>
          </div>
        );
      case 'INCIDENT_DETECTED':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#FAF0E1] border border-[#B47A32] text-[#B47A32] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#B47A32]"></span>
            <span>INCIDENT ACTIVE</span>
          </div>
        );
      case 'DEGRADED':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#FAF0E1] border border-[#B47A32]/60 text-[#B47A32] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#B47A32]"></span>
            <span>DEGRADED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#E4EFEA] border border-[#39745A]/40 text-[#39745A] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#39745A]"></span>
            <span>OPERATIONAL</span>
          </div>
        );
    }
  };

  return (
    <header className="theme-header border-b theme-border sticky top-0 z-40 px-5 py-2.5 transition-colors duration-150">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Product Name */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#183B63] flex items-center justify-center text-white font-bold text-sm shadow-xs">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base tracking-tight text-[#183B63]">
                Sentra
              </h1>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-[#EAE4D8] border border-[#D8D1C5] text-[#172235]">
                Incident Response Platform
              </span>
            </div>
            <p className="text-[11px] text-[#667085]">
              Team 1234FORGE • Real-Time Telemetry & Anomaly Engine
            </p>
          </div>
        </div>

        {/* Center: Status & Theme Selector */}
        <div className="flex items-center space-x-2.5 flex-wrap">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#F0EBE2] border border-[#D8D1C5] text-[11px] text-[#667085]">
            <Radio className={`w-3 h-3 ${isConnected ? 'text-[#39745A]' : 'text-[#8A8F98]'}`} />
            <span>{isConnected ? 'Stream Connected' : 'Disconnected'}</span>
          </div>

          {getSystemStatusBadge()}

          {/* Theme Selector Dropdown */}
          <div className="relative flex items-center">
            <div className="flex items-center space-x-1.5 bg-[#F0EBE2] border border-[#D8D1C5] rounded-md px-2.5 py-1 text-xs text-[#172235]">
              <Palette className="w-3.5 h-3.5 text-[#183B63]" />
              <span className="text-[10px] text-[#667085] uppercase font-bold">Theme:</span>
              <select
                value={currentTheme}
                onChange={(e) => onSelectTheme(e.target.value as ThemeMode)}
                className="bg-transparent text-xs text-[#172235] focus:outline-none cursor-pointer pr-1 font-medium"
              >
                {THEME_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id} className="text-[#172235] bg-[#FBF8F1]">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right: Operational Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Main Demo Button */}
          {stats?.is_demo_running ? (
            <button
              onClick={onStopDemo}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#B73535] hover:bg-[#962B2B] text-white text-xs font-semibold shadow-xs transition"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Stop Demo (Stage {stats.demo_step}/10)</span>
            </button>
          ) : (
            <button
              onClick={onStartDemo}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#183B63] hover:bg-[#102A46] text-white text-xs font-semibold shadow-xs transition"
              title="Run 2-minute incident lifecycle demo"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>RUN FULL INCIDENT DEMO</span>
            </button>
          )}

          {/* Scenario Trigger */}
          <div className="relative">
            <select
              value={selectedScenario}
              onChange={handleScenarioChange}
              className="bg-[#FBF8F1] text-xs text-[#172235] border border-[#D8D1C5] hover:border-[#183B63] rounded-md px-2.5 py-1.5 appearance-none pr-7 cursor-pointer focus:outline-none focus:border-[#183B63] font-medium shadow-xs"
            >
              <option value="" disabled>SIMULATE SCENARIO...</option>
              <option value="cascading_failure" className="text-[#172235] bg-[#FBF8F1]">Cascading Outage (Primary Demo)</option>
              <option value="false_correlation_prevention" className="text-[#172235] bg-[#FBF8F1]">False-Correlation Test (DB + Ingress Concurrent)</option>
              <option value="database_failure" className="text-[#172235] bg-[#FBF8F1]">Database Connection Exhaustion</option>
              <option value="payment_failure" className="text-[#172235] bg-[#FBF8F1]">Payment Gateway Latency Spike</option>
              <option value="auth_failure" className="text-[#172235] bg-[#FBF8F1]">Authentication Failure</option>
              <option value="network_latency" className="text-[#172235] bg-[#FBF8F1]">Ingress Traffic Spike</option>
            </select>
            <Zap className="w-3 h-3 text-[#667085] absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Inject Event */}
          <button
            onClick={onOpenInjector}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-[#FBF8F1] hover:bg-[#EAE4D8] border border-[#D8D1C5] text-[#172235] text-xs font-medium transition shadow-xs"
            title="Inject custom telemetry event"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#183B63]" />
            <span>INJECT</span>
          </button>

          {/* Stream Play/Pause */}
          <button
            onClick={onToggleSimulator}
            className="p-1.5 rounded-md border border-[#D8D1C5] bg-[#FBF8F1] hover:bg-[#EAE4D8] text-[#172235] text-xs transition shadow-xs"
            title={stats?.simulator_running ? 'Pause stream' : 'Resume stream'}
          >
            {stats?.simulator_running ? <Pause className="w-3.5 h-3.5 text-[#B47A32]" /> : <Play className="w-3.5 h-3.5 text-[#39745A]" />}
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-md border border-[#D8D1C5] bg-[#FBF8F1] hover:bg-[#EAE4D8] text-[#172235] text-xs transition shadow-xs"
            title="Reset system state"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#667085]" />
          </button>
        </div>
      </div>
    </header>
  );
};
