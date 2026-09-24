import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Info,
  CheckCircle2,
  GitMerge,
  UserCheck,
  Search,
  Layers,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus } from '../types';

interface IncidentListProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  onQuickStatusChange: (id: string, status: IncidentStatus) => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onQuickStatusChange,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = incidents.filter((inc) => {
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchRoot = inc.root_cause_service.toLowerCase().includes(q);
      const matchSummary = inc.summary.toLowerCase().includes(q);
      if (!matchTitle && !matchRoot && !matchSummary) return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'P1_CRITICAL':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#F4DEDA] border border-[#B73535] text-[#B73535]">
            <Flame className="w-3 h-3 text-[#B73535]" />
            <span>P1 CRITICAL</span>
          </span>
        );
      case 'P2_HIGH':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF0E1] border border-[#B47A32] text-[#B47A32]">
            <AlertTriangle className="w-3 h-3 text-[#B47A32]" />
            <span>P2 HIGH</span>
          </span>
        );
      case 'P3_MEDIUM':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#DCE7F2] border border-[#183B63]/30 text-[#183B63]">
            <Info className="w-3 h-3 text-[#183B63]" />
            <span>P3 MEDIUM</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#EAE4D8] border border-[#D8D1C5] text-[#667085]">
            <span>P4 LOW</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'TRIGGERED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#F4DEDA] text-[#B73535] border border-[#B73535]/40">TRIGGERED</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[#FAF0E1] text-[#B47A32] border border-[#B47A32]/40">ACKNOWLEDGED</span>;
      case 'INVESTIGATING':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[#DCE7F2] text-[#183B63] border border-[#183B63]/30">INVESTIGATING</span>;
      case 'MITIGATED':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[#E4EFEA] text-[#39745A] border border-[#39745A]/40">MITIGATED</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[#E4EFEA] text-[#39745A] border border-[#39745A]/40">RESOLVED</span>;
    }
  };

  const formatElapsed = (createdSec: number) => {
    const delta = Math.floor(Date.now() / 1000 - createdSec);
    if (delta < 60) return `${delta}s ago`;
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    return `${Math.floor(delta / 3600)}h ago`;
  };

  return (
    <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-5 flex flex-col h-full shadow-xs transition-colors duration-150">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-[#D8D1C5]">
        <div>
          <h2 className="text-sm font-bold text-[#172235] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#183B63]" />
            <span>ACTIVE INCIDENTS</span>
            <span className="px-1.5 py-0.2 text-[11px] bg-[#EAE4D8] text-[#172235] border border-[#D8D1C5] rounded-md font-mono font-bold">
              {filtered.length}
            </span>
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Operational priority ranking sorted by severity, cascade depth and error volume.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8A8F98] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#F0EBE2] text-xs text-[#172235] pl-7 pr-2.5 py-1.5 rounded-md border border-[#D8D1C5] focus:outline-none focus:border-[#183B63] w-36 sm:w-48 font-mono shadow-xs"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#F0EBE2] text-xs text-[#172235] border border-[#D8D1C5] rounded-md px-2 py-1.5 focus:outline-none focus:border-[#183B63] font-medium shadow-xs"
          >
            <option value="ALL">All Severities</option>
            <option value="P1_CRITICAL">P1 Critical</option>
            <option value="P2_HIGH">P2 High</option>
            <option value="P3_MEDIUM">P3 Medium</option>
            <option value="P4_LOW">P4 Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F0EBE2] text-xs text-[#172235] border border-[#D8D1C5] rounded-md px-2 py-1.5 focus:outline-none focus:border-[#183B63] font-medium shadow-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="TRIGGERED">Triggered</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Incidents List */}
      <div className="overflow-y-auto max-h-[620px] space-y-2.5 pt-3.5 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[#667085]">
            <CheckCircle2 className="w-8 h-8 mx-auto text-[#39745A] mb-2 opacity-80" />
            <p className="text-xs font-semibold text-[#172235]">No active incidents matching filters</p>
            <p className="text-[11px] text-[#8A8F98] mt-0.5">Click "RUN FULL INCIDENT DEMO" or select a scenario to test.</p>
          </div>
        ) : (
          filtered.map((inc) => {
            const isSelected = selectedIncidentId === inc.id;
            const isCritical = inc.severity === 'P1_CRITICAL';
            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc.id)}
                className={`p-3.5 rounded-lg border transition cursor-pointer bg-[#FBF8F1] ${
                  isSelected
                    ? 'border-[#183B63] ring-1 ring-[#183B63] shadow-xs'
                    : 'border-[#D8D1C5] hover:border-[#183B63]'
                }`}
              >
                {/* Top Row: Severity, ID, Priority, Status */}
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <div className="flex items-center space-x-2">
                    {getSeverityBadge(inc.severity)}
                    <span className="font-mono text-xs font-bold text-[#172235]">{inc.id}</span>
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-[#EAE4D8] border border-[#D8D1C5] text-[#172235] font-medium">
                      Priority: {inc.priority_score}/100
                    </span>
                    {inc.is_cascading && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-[#DCE7F2] text-[#183B63] border border-[#183B63]/20">
                        <GitMerge className="w-3 h-3 text-[#183B63]" />
                        <span>Cascading Cascade</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-[#8A8F98] font-mono">{formatElapsed(inc.created_at)}</span>
                    {getStatusBadge(inc.status)}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-xs text-[#172235] hover:text-[#183B63] transition line-clamp-1">
                  {inc.title}
                </h3>

                {/* Impact & Cascade Path */}
                <div className="mt-1.5 text-xs text-[#667085] flex items-center flex-wrap gap-1.5">
                  <span className="text-[11px]">Root Origin:</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#EAE4D8] text-[#172235] font-mono text-[11px] font-semibold border border-[#D8D1C5]">
                    {inc.root_cause_service}
                  </span>

                  {inc.impacted_services.length > 1 && (
                    <>
                      <span className="text-[11px] text-[#8A8F98]">→ Cascade:</span>
                      <span className="text-[#172235] font-mono text-[11px] font-medium">
                        {inc.impacted_services.join(' → ')}
                      </span>
                    </>
                  )}
                </div>

                {/* Trigger Reason Preview */}
                {inc.why_created_reasons && inc.why_created_reasons.length > 0 && (
                  <div className={`mt-2 p-2.5 rounded-md border text-[11px] font-mono ${
                    isCritical ? 'bg-[#F4DEDA]/60 border-[#B73535]/30' : 'bg-[#F0EBE2] border-[#D8D1C5]'
                  }`}>
                    <div className="flex items-center space-x-1 text-[10px] font-bold uppercase mb-0.5">
                      {isCritical && <AlertCircle className="w-3 h-3 text-[#B73535]" />}
                      <span className={isCritical ? 'text-[#B73535]' : 'text-[#183B63]'}>
                        TRIGGER REASON:
                      </span>
                    </div>
                    <p className="text-[#172235] line-clamp-1 font-sans">
                      {inc.why_created_reasons[0]}
                    </p>
                  </div>
                )}

                {/* Bottom Row: Correlated count & Quick Actions */}
                <div className="mt-2.5 pt-2 border-t border-[#D8D1C5] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 text-[#667085] text-[11px]">
                    <span className="font-mono">
                      <strong className="text-[#172235]">{inc.events_count}</strong> events grouped
                    </span>
                    {inc.assigned_to && (
                      <span className="flex items-center gap-1 text-[#172235]">
                        <UserCheck className="w-3 h-3 text-[#183B63]" />
                        <span>{inc.assigned_to.split(' ')[0]}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5">
                    {inc.status === 'TRIGGERED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickStatusChange(inc.id, 'ACKNOWLEDGED');
                        }}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-[#FAF0E1] text-[#B47A32] border border-[#B47A32]/40 hover:bg-[#B47A32] hover:text-white transition"
                      >
                        Ack
                      </button>
                    )}
                    {inc.status !== 'RESOLVED' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickStatusChange(inc.id, 'RESOLVED');
                        }}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-[#E4EFEA] text-[#39745A] border border-[#39745A]/40 hover:bg-[#39745A] hover:text-white transition"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#39745A] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Resolved
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-[#8A8F98]" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
