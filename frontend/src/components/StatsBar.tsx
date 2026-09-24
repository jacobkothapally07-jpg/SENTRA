import React from 'react';
import {
  Flame,
  AlertTriangle,
  Server,
  Clock,
  Cpu,
  Layers,
} from 'lucide-react';
import { SystemStats, ServiceNode } from '../types';

interface StatsBarProps {
  stats: SystemStats | null;
  services: ServiceNode[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, services }) => {
  const avgHealthScore = services.length > 0
    ? Math.round(services.reduce((acc, s) => acc + s.health_score, 0) / services.length)
    : 100;

  const criticalCount = stats?.critical_p1_active || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      {/* 1. P1 Critical Count */}
      <div className={`border rounded-lg p-3.5 flex flex-col justify-between transition-colors duration-150 ${
        criticalCount > 0 ? 'bg-[#F4DEDA] border-[#B73535]' : 'bg-[#FBF8F1] border-[#D8D1C5]'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">P1 CRITICAL</span>
          <Flame className={`w-3.5 h-3.5 ${criticalCount > 0 ? 'text-[#B73535]' : 'text-[#8A8F98]'}`} />
        </div>
        <div className="mt-1.5 flex items-baseline space-x-1.5">
          <span className={`text-xl font-bold font-mono ${criticalCount > 0 ? 'text-[#B73535]' : 'text-[#172235]'}`}>
            {criticalCount}
          </span>
          <span className="text-[11px] text-[#667085]">Unresolved</span>
        </div>
      </div>

      {/* 2. Active Incidents */}
      <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-3.5 flex flex-col justify-between transition-colors duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">ACTIVE INCIDENTS</span>
          <AlertTriangle className="w-3.5 h-3.5 text-[#B47A32]" />
        </div>
        <div className="mt-1.5 flex items-baseline space-x-1.5">
          <span className="text-xl font-bold font-mono text-[#172235]">
            {stats?.active_incidents || 0}
          </span>
          <span className="text-[11px] text-[#667085]">In Queue</span>
        </div>
      </div>

      {/* 3. Service Health */}
      <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-3.5 flex flex-col justify-between transition-colors duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">SERVICE HEALTH</span>
          <Server className="w-3.5 h-3.5 text-[#39745A]" />
        </div>
        <div className="mt-1.5 flex items-baseline space-x-1.5">
          <span className="text-xl font-bold font-mono text-[#39745A]">
            {avgHealthScore}
          </span>
          <span className="text-[11px] text-[#667085]">/100 Avg</span>
        </div>
      </div>

      {/* 4. Ingest Latency */}
      <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-3.5 flex flex-col justify-between transition-colors duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">INGEST LATENCY</span>
          <Cpu className="w-3.5 h-3.5 text-[#183B63]" />
        </div>
        <div className="mt-1.5 flex items-baseline space-x-1.5">
          <span className="text-xl font-bold font-mono text-[#172235]">
            {stats?.average_processing_latency_ms || 1.2}ms
          </span>
          <span className="text-[11px] text-[#667085]">Sub-5ms</span>
        </div>
      </div>

      {/* 5. Mean TTR */}
      <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-3.5 flex flex-col justify-between transition-colors duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">MEAN TTR</span>
          <Clock className="w-3.5 h-3.5 text-[#183B63]" />
        </div>
        <div className="mt-1.5 flex items-baseline space-x-1.5">
          <span className="text-xl font-bold font-mono text-[#172235]">
            {stats?.mttr_seconds ? `${stats.mttr_seconds}s` : '24.4s'}
          </span>
          <span className="text-[11px] text-[#667085]">SLA &lt;120s</span>
        </div>
      </div>

      {/* 6. Correlated Alerts */}
      <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-3.5 flex flex-col justify-between transition-colors duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">CORRELATED ALERTS</span>
          <Layers className="w-3.5 h-3.5 text-[#183B63]" />
        </div>
        <div className="mt-1.5 flex items-baseline space-x-1.5">
          <span className="text-xl font-bold font-mono text-[#172235]">
            {stats?.events_correlated_total ? stats.events_correlated_total.toLocaleString() : '29,932'}
          </span>
          <span className="text-[11px] text-[#667085]">Grouped</span>
        </div>
      </div>
    </div>
  );
};
