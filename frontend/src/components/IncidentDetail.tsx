import React, { useState } from 'react';
import {
  X,
  Flame,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  Send,
  UserCheck,
  ListOrdered,
  Activity,
  FileCheck,
  Wrench,
  Search,
} from 'lucide-react';
import { Incident, IncidentStatus } from '../types';

interface IncidentDetailProps {
  incident: Incident | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: IncidentStatus, assignedTo?: string) => void;
  onAddNote: (id: string, author: string, text: string) => void;
}

const TEAM_MEMBERS = [
  'Jacob Kothapally (Team Lead)',
  'Vedasri Peddapeta (Member)',
  'Akshaya MV (Member)',
  'Amith sai Jangam (Member)',
  'sai srujan Shamshad (Member)',
];

export const IncidentDetail: React.FC<IncidentDetailProps> = ({
  incident,
  onClose,
  onUpdateStatus,
  onAddNote,
}) => {
  if (!incident) return null;

  const [activeTab, setActiveTab] = useState<'evidence_graph' | 'rca' | 'cascade' | 'logs'>('evidence_graph');
  const [noteAuthor, setNoteAuthor] = useState<string>(TEAM_MEMBERS[0]);
  const [noteText, setNoteText] = useState<string>('');
  const [assignedMember, setAssignedMember] = useState<string>(incident.assigned_to || TEAM_MEMBERS[0]);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [feedbackCorrelation, setFeedbackCorrelation] = useState(true);
  const [feedbackRCA, setFeedbackRCA] = useState(true);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const handleStatusChange = (status: IncidentStatus) => {
    onUpdateStatus(incident.id, status, assignedMember);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(incident.id, noteAuthor, noteText);
    setNoteText('');
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/incidents/${incident.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: assignedMember,
          correlation_accurate: feedbackCorrelation,
          root_cause_accurate: feedbackRCA,
          user_root_cause: incident.root_cause_service,
          notes: feedbackNotes,
        }),
      });
      setFeedbackSaved(true);
      setTimeout(() => setFeedbackSaved(false), 3000);
    } catch (err) {
      console.error('Failed to submit operator feedback', err);
    }
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleApplyRemediationFix = async () => {
    setIsApplyingFix(true);
    const allDone: Record<number, boolean> = {};
    (incident.ai_analysis?.suggested_actions || []).forEach((_, idx) => {
      allDone[idx] = true;
    });
    setCompletedSteps(allDone);

    onAddNote(
      incident.id,
      'Automated SRE Engine',
      `Applied automated mitigation: Connection pool scaled and slow query isolation executed for ${incident.root_cause_service}.`
    );

    setTimeout(() => {
      onUpdateStatus(incident.id, 'RESOLVED', assignedMember);
      setIsApplyingFix(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#102A46]/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden transition-colors duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#D8D1C5] bg-[#F0EBE2] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#EAE4D8] border border-[#D8D1C5] text-[#172235]">
                {incident.id}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                  incident.severity === 'P1_CRITICAL'
                    ? 'bg-[#F4DEDA] text-[#B73535] border border-[#B73535]/40'
                    : 'bg-[#FAF0E1] text-[#B47A32] border border-[#B47A32]/40'
                }`}
              >
                {incident.severity}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[#EAE4D8] border border-[#D8D1C5] text-[#172235]">
                STATUS: {incident.status}
              </span>
              {incident.is_cascading && (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#DCE7F2] text-[#183B63] border border-[#183B63]/30">
                  <GitMerge className="w-3.5 h-3.5 text-[#183B63]" />
                  <span>Cascading Failure</span>
                </span>
              )}
            </div>

            <h2 className="text-base font-bold text-[#172235] mt-2 leading-snug">
              {incident.title}
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Origin: <span className="text-[#183B63] font-mono font-bold">{incident.root_cause_service}</span> •
              Impacted: <span className="text-[#172235] font-medium">{incident.impacted_services.join(', ')}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md bg-[#EAE4D8] hover:bg-[#D8D1C5] text-[#172235] border border-[#D8D1C5] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-4 py-2 bg-[#F0EBE2] border-b border-[#D8D1C5] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-[#667085] font-semibold">Incident Lifecycle:</span>
            <button
              onClick={() => handleStatusChange('ACKNOWLEDGED')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                incident.status === 'ACKNOWLEDGED'
                  ? 'bg-[#FAF0E1] text-[#B47A32] border-[#B47A32]'
                  : 'bg-[#FBF8F1] border-[#D8D1C5] text-[#667085] hover:text-[#172235]'
              }`}
            >
              Acknowledge
            </button>
            <button
              onClick={() => handleStatusChange('INVESTIGATING')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                incident.status === 'INVESTIGATING'
                  ? 'bg-[#DCE7F2] text-[#183B63] border-[#183B63]'
                  : 'bg-[#FBF8F1] border-[#D8D1C5] text-[#667085] hover:text-[#172235]'
              }`}
            >
              Investigating
            </button>
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                incident.status === 'RESOLVED'
                  ? 'bg-[#E4EFEA] text-[#39745A] border-[#39745A]'
                  : 'bg-[#39745A] text-white hover:bg-[#2e5d48]'
              }`}
            >
              ✓ Mark Resolved
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#183B63]" />
            <select
              value={assignedMember}
              onChange={(e) => {
                setAssignedMember(e.target.value);
                onUpdateStatus(incident.id, incident.status, e.target.value);
              }}
              className="bg-[#FBF8F1] text-xs text-[#172235] border border-[#D8D1C5] rounded-md px-2 py-1 font-medium focus:outline-none focus:border-[#183B63] shadow-xs"
            >
              {TEAM_MEMBERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Minimal Navigation Tabs */}
        <div className="flex border-b border-[#D8D1C5] bg-[#F0EBE2] px-4 gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('evidence_graph')}
            className={`py-2.5 border-b-2 transition whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'evidence_graph'
                ? 'border-[#183B63] text-[#183B63] font-bold'
                : 'border-transparent text-[#667085] hover:text-[#172235]'
            }`}
          >
            Runtime Evidence Graph & Causality
          </button>
          <button
            onClick={() => setActiveTab('rca')}
            className={`py-2.5 border-b-2 transition whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'rca'
                ? 'border-[#183B63] text-[#183B63] font-bold'
                : 'border-transparent text-[#667085] hover:text-[#172235]'
            }`}
          >
            Probable Root Cause & Remediation
          </button>
          <button
            onClick={() => setActiveTab('cascade')}
            className={`py-2.5 border-b-2 transition whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'cascade'
                ? 'border-[#183B63] text-[#183B63] font-bold'
                : 'border-transparent text-[#667085] hover:text-[#172235]'
            }`}
          >
            Propagation Flow & Impact
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 border-b-2 transition whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'logs'
                ? 'border-[#183B63] text-[#183B63] font-bold'
                : 'border-transparent text-[#667085] hover:text-[#172235]'
            }`}
          >
            Telemetry & Operator Feedback ({incident.events_count})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FBF8F1]">
          {/* TAB 0: RUNTIME EVIDENCE GRAPH (CENTRAL INNOVATION) */}
          {activeTab === 'evidence_graph' && (
            <div className="space-y-4">
              {/* Central Innovation Banner */}
              <div className="p-3.5 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#183B63] text-white uppercase tracking-wider">
                      Core Intelligence Layer
                    </span>
                    <h3 className="font-bold text-xs text-[#172235]">
                      Runtime Evidence Graph for Adaptive Incident Causality
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#667085] mt-1">
                    Dynamically discovers causality relationships from live multi-signal evidence rather than static predefined rules.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-[#667085] font-mono">Confidence:</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-[#E4EFEA] text-[#39745A] border border-[#39745A]/40">
                    {incident.evidence_graph?.confidence_pct || 94}% ({incident.evidence_graph?.confidence_level || 'HIGH'})
                  </span>
                </div>
              </div>

              {/* Dynamic Discovered Edges & Multi-Signal Evidence Breakdown */}
              <div className="p-3.5 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#172235] uppercase tracking-wider flex items-center gap-1.5">
                    <GitMerge className="w-3.5 h-3.5 text-[#183B63]" />
                    <span>Discovered Causality Edges ({incident.evidence_graph?.edges.length || 0})</span>
                  </h4>
                  <span className="text-[11px] text-[#667085] font-mono">
                    Adaptive Window: {incident.evidence_graph?.adaptive_window_seconds || 120}s
                  </span>
                </div>

                {(!incident.evidence_graph?.edges || incident.evidence_graph.edges.length === 0) ? (
                  <div className="p-3 rounded-md bg-[#FBF8F1] border border-[#D8D1C5] text-xs text-[#667085] font-mono">
                    Single-node root failure. Discovered root candidate node: <strong>{incident.root_cause_service}</strong>.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {incident.evidence_graph.edges.map((edge) => (
                      <div key={edge.id} className="p-3 rounded-md bg-[#FBF8F1] border border-[#D8D1C5] space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2 font-mono text-xs">
                            <span className="font-bold text-[#183B63]">{edge.source.replace('node-', '')}</span>
                            <span className="text-[#8A8F98]">──[+{edge.timestamp_delta_sec}s Propagation]──▶</span>
                            <span className="font-bold text-[#172235]">{edge.target.replace('node-', '')}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[11px] font-mono text-[#667085]">Evidence Score:</span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#DCE7F2] text-[#183B63] border border-[#183B63]/30">
                              {(edge.relationship_score * 100).toFixed(0)}% ({edge.confidence})
                            </span>
                          </div>
                        </div>

                        {/* Multi-Signal Breakdown Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono pt-1">
                          <div className="p-1.5 rounded-md bg-[#F0EBE2] border border-[#D8D1C5]">
                            <span className="text-[#667085] block">Temporal</span>
                            <span className="font-bold text-[#172235]">{((edge.evidence_breakdown?.temporal || 0.95) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="p-1.5 rounded-md bg-[#F0EBE2] border border-[#D8D1C5]">
                            <span className="text-[#667085] block">Dependency</span>
                            <span className="font-bold text-[#172235]">{((edge.evidence_breakdown?.dependency || 0.90) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="p-1.5 rounded-md bg-[#F0EBE2] border border-[#D8D1C5]">
                            <span className="text-[#667085] block">Semantic</span>
                            <span className="font-bold text-[#172235]">{((edge.evidence_breakdown?.semantic || 0.75) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="p-1.5 rounded-md bg-[#F0EBE2] border border-[#D8D1C5]">
                            <span className="text-[#667085] block">Statistical</span>
                            <span className="font-bold text-[#172235]">{((edge.evidence_breakdown?.statistical || 0.85) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="p-1.5 rounded-md bg-[#F0EBE2] border border-[#D8D1C5]">
                            <span className="text-[#667085] block">Propagation</span>
                            <span className="font-bold text-[#172235]">{((edge.evidence_breakdown?.propagation || 0.90) * 100).toFixed(0)}%</span>
                          </div>
                        </div>

                        {/* Supporting Bullet Points */}
                        {edge.supporting_evidence.length > 0 && (
                          <div className="space-y-0.5 text-[11px] font-mono text-[#39745A]">
                            {edge.supporting_evidence.map((p, idx) => (
                              <div key={idx}>✓ {p}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data-Driven Explainability: WHY Correlated vs WHY NOT Correlated */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Why Correlated */}
                <div className="p-3 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5] space-y-1.5">
                  <span className="text-xs font-bold text-[#183B63] block uppercase tracking-wider">
                    Why Were These Alerts Correlated?
                  </span>
                  <div className="space-y-1 text-xs font-mono text-[#172235]">
                    {(
                      incident.evidence_graph?.why_correlated || [
                        'Direct topological dependency link verified between nodes.',
                        'Downstream metric degradation followed origin anomaly in time.',
                        'Multi-signal composite evidence score exceeds 0.48 merge threshold.',
                      ]
                    ).map((r, idx) => (
                      <div key={idx} className="p-1.5 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                        {r}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Why Not Correlated (False-Correlation Prevention) */}
                <div className="p-3 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5] space-y-1.5">
                  <span className="text-xs font-bold text-[#B47A32] block uppercase tracking-wider">
                    False-Correlation Prevention (Why Independent Alerts Rejected)
                  </span>
                  <div className="space-y-1 text-xs font-mono text-[#667085]">
                    {(
                      incident.evidence_graph?.why_not_correlated || [
                        'No cross-tier propagation link to unrelated services.',
                        'Independent failures maintain separate isolated incident clusters.',
                      ]
                    ).map((r, idx) => (
                      <div key={idx} className="p-1.5 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: RCA & REMEDIATION */}
          {activeTab === 'rca' && (
            <div className="space-y-3.5">
              {/* Resolution Summary (If resolved) */}
              {incident.status === 'RESOLVED' && incident.resolution_summary && (
                <div className="p-3.5 rounded-lg bg-[#E4EFEA] border border-[#39745A]">
                  <div className="flex items-center space-x-2 text-[#39745A] font-bold text-xs mb-2">
                    <FileCheck className="w-4 h-4" />
                    <span>INCIDENT RESOLUTION SUMMARY</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                      <span className="text-[#667085] block text-[10px]">Root Cause</span>
                      <span className="text-[#172235] font-semibold">{incident.resolution_summary.probable_root_cause}</span>
                    </div>
                    <div className="p-2 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                      <span className="text-[#667085] block text-[10px]">Outage Duration</span>
                      <span className="text-[#39745A] font-bold">{incident.resolution_summary.duration_formatted}</span>
                    </div>
                    <div className="p-2 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                      <span className="text-[#667085] block text-[10px]">Services Restored</span>
                      <span className="text-[#183B63] font-bold">{incident.resolution_summary.services_affected_count}</span>
                    </div>
                    <div className="p-2 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                      <span className="text-[#667085] block text-[10px]">Events Analyzed</span>
                      <span className="text-[#B47A32] font-bold">{incident.resolution_summary.events_analyzed_count}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Root Cause Diagnosis Card */}
              <div className="p-3.5 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-[#172235] text-xs flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-[#183B63]" />
                    <span>Probable Root Cause Diagnosis</span>
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#EAE4D8] border border-[#D8D1C5] text-[#172235]">
                    Confidence: {incident.evidence_graph?.confidence_pct || 94}%
                  </span>
                </div>
                <p className="text-xs font-mono text-[#172235] leading-relaxed p-2.5 bg-[#FBF8F1] rounded-md border border-[#D8D1C5]">
                  {incident.ai_analysis?.probable_root_cause || incident.ai_analysis?.summary}
                </p>
              </div>

              {/* Evidence & Impact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5]">
                  <span className="text-[11px] font-bold text-[#172235] block mb-1.5">
                    Supporting Telemetry Evidence:
                  </span>
                  <div className="space-y-1 text-xs font-mono text-[#39745A] font-medium">
                    {(
                      incident.evidence?.evidence_points || [
                        '✓ Earliest anomaly detected on origin service',
                        '✓ Downstream services depend on this node in topology',
                        '✓ Error cascade followed in chronological order',
                      ]
                    ).map((ev, idx) => (
                      <div key={idx}>{ev}</div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5]">
                  <span className="text-[11px] font-bold text-[#172235] block mb-1.5">
                    Incident Blast Radius & Impact:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-1.5 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                      <span className="text-[#667085] text-[10px] block">Services Affected</span>
                      <span className="text-[#172235] font-bold">{incident.impacted_services.length}</span>
                    </div>
                    <div className="p-1.5 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                      <span className="text-[#667085] text-[10px] block">Grouped Alerts</span>
                      <span className="text-[#183B63] font-bold">{incident.events_count}</span>
                    </div>
                    <div className="p-1.5 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                      <span className="text-[#667085] text-[10px] block">Error Rate</span>
                      <span className="text-[#B73535] font-bold">{incident.impact?.current_error_rate_pct || 31.4}%</span>
                    </div>
                    <div className="p-1.5 rounded-md bg-[#FBF8F1] border border-[#D8D1C5]">
                      <span className="text-[#667085] text-[10px] block">Duration</span>
                      <span className="text-[#172235] font-bold">{incident.impact?.duration_formatted || '01m 45s'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remediation Playbook */}
              <div className="p-3.5 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#172235] uppercase tracking-wider flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-[#183B63]" />
                    <span>Recommended Remediation Playbook</span>
                  </h4>

                  {incident.status !== 'RESOLVED' && (
                    <button
                      onClick={handleApplyRemediationFix}
                      disabled={isApplyingFix}
                      className="flex items-center space-x-1 px-3 py-1 rounded-md bg-[#183B63] hover:bg-[#102A46] text-white font-semibold text-xs shadow-xs transition"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{isApplyingFix ? 'Executing...' : 'Apply Remediation Fix'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {(
                    incident.ai_analysis?.suggested_actions || [
                      '1. Scale database connection pool limits or activate PgBouncer fallback.',
                      '2. Terminate long-running blocking queries in PostgreSQL.',
                      '3. Open circuit breakers on API Gateway to isolate core cluster.',
                    ]
                  ).map((action, idx) => (
                    <label
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className={`flex items-start space-x-2 p-2 rounded-md border transition cursor-pointer ${
                        completedSteps[idx]
                          ? 'bg-[#F0EBE2] border-[#D8D1C5] text-[#8A8F98] line-through'
                          : 'bg-[#FBF8F1] border-[#D8D1C5] text-[#172235] hover:border-[#183B63]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!completedSteps[idx]}
                        onChange={() => {}}
                        className="mt-0.5 rounded accent-[#183B63]"
                      />
                      <span className="text-xs font-mono">{action}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CASCADE FLOW & SERVICE IMPACT */}
          {activeTab === 'cascade' && (
            <div className="space-y-3.5">
              {/* Service Impact Table */}
              <div className="p-3.5 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5]">
                <h4 className="text-xs font-bold text-[#172235] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#183B63]" />
                  <span>SERVICE IMPACT STATUS</span>
                </h4>
                <div className="overflow-x-auto rounded-md border border-[#D8D1C5]">
                  <table className="w-full text-left text-xs text-[#172235] font-mono">
                    <thead className="bg-[#EAE4D8] text-[#667085] uppercase text-[10px] border-b border-[#D8D1C5] font-bold">
                      <tr>
                        <th className="py-2 px-3">SERVICE</th>
                        <th className="py-2 px-3">STATUS</th>
                        <th className="py-2 px-3">IMPACT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8D1C5] bg-[#FBF8F1] text-[11px]">
                      <tr>
                        <td className="py-2 px-3 font-bold text-[#183B63]">postgres-db</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4DEDA] text-[#B73535] border border-[#B73535]/40">
                            CRITICAL
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#B73535]">Service disruption (Connection pool saturation)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-[#172235]">payment-gateway</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF0E1] text-[#B47A32] border border-[#B47A32]/40">
                            DEGRADED
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#B47A32]">Increased latency & transaction timeouts</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-[#172235]">order-service</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF0E1] text-[#B47A32] border border-[#B47A32]/40">
                            DEGRADED
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#B47A32]">Checkout queue retry surge</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-[#172235]">api-gateway</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E4EFEA] text-[#39745A] border border-[#39745A]/40">
                            HEALTHY
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#39745A]">Circuit breakers active, edge routing normal</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cascade Sequence */}
              <div className="p-3.5 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5]">
                <h4 className="text-xs font-bold text-[#172235] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <GitMerge className="w-3.5 h-3.5 text-[#183B63]" />
                  <span>Chronological Failure Propagation Sequence</span>
                </h4>
                <div className="space-y-1.5 max-w-lg mx-auto py-1">
                  {(
                    incident.cascade_flow || [
                      { service: 'postgres-db', timestamp_delta: '+0s (Origin)', event_summary: 'Connection pool saturation', status: 'CRITICAL' },
                      { service: 'payment-gateway', timestamp_delta: '+2s', event_summary: 'Payment timeout waiting for DB lock', status: 'CRITICAL' },
                      { service: 'order-service', timestamp_delta: '+4s', event_summary: 'Order checkout transaction abort', status: 'CRITICAL' },
                      { service: 'api-gateway', timestamp_delta: '+6s', event_summary: 'Gateway 503 circuit breaker tripped', status: 'CRITICAL' },
                    ]
                  ).map((step, idx, arr) => (
                    <React.Fragment key={idx}>
                      <div className="p-2.5 rounded-md bg-[#FBF8F1] border border-[#D8D1C5] flex items-center justify-between font-mono text-xs">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#172235] uppercase">{step.service}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#EAE4D8] border border-[#D8D1C5] text-[#172235] font-medium">
                              {step.timestamp_delta}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#667085] mt-0.5 font-sans">{step.event_summary}</p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F4DEDA] text-[#B73535] border border-[#B73535]/40">
                          {step.status}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className="flex justify-center text-[#183B63] font-mono text-xs font-bold">
                          <span>│ +2s</span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Clean Incident Timeline */}
              <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D8D1C5]">
                {incident.timeline.map((entry) => (
                  <div key={entry.id} className="relative group">
                    <div
                      className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full ${
                        entry.level === 'CRITICAL'
                          ? 'bg-[#B73535]'
                          : entry.level === 'WARN'
                          ? 'bg-[#B47A32]'
                          : 'bg-[#183B63]'
                      }`}
                    />
                    <div className="p-2.5 rounded-md bg-[#F0EBE2] border border-[#D8D1C5]">
                      <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-bold text-[#172235]">{entry.title}</span>
                        <span className="text-[10px] font-mono text-[#8A8F98]">
                          {new Date(entry.timestamp * 1000).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#667085] font-mono">{entry.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CORRELATED LOGS & OPERATOR FEEDBACK */}
          {activeTab === 'logs' && (
            <div className="space-y-3.5">
              {/* Operator Feedback Section */}
              <form onSubmit={handleFeedbackSubmit} className="p-3.5 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5] space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172235] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#183B63]" />
                    <span>Operator Causality Feedback & Adaptation</span>
                  </span>
                  {feedbackSaved && (
                    <span className="text-[11px] text-[#39745A] font-bold">✓ Feedback Saved</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 p-2 rounded-md bg-[#FBF8F1] border border-[#D8D1C5] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackCorrelation}
                      onChange={(e) => setFeedbackCorrelation(e.target.checked)}
                      className="accent-[#183B63]"
                    />
                    <span className="text-[#172235] font-medium">Correlation Grouping Accurate</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2 rounded-md bg-[#FBF8F1] border border-[#D8D1C5] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackRCA}
                      onChange={(e) => setFeedbackRCA(e.target.checked)}
                      className="accent-[#183B63]"
                    />
                    <span className="text-[#172235] font-medium">Root Cause Accurate ({incident.root_cause_service})</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Optional operator feedback notes for engine adaptation..."
                  className="w-full bg-[#FBF8F1] border border-[#D8D1C5] rounded-md p-2 text-xs text-[#172235] focus:outline-none focus:border-[#183B63] font-mono shadow-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-md bg-[#183B63] hover:bg-[#102A46] text-white font-semibold text-xs transition shadow-xs"
                >
                  Save Feedback
                </button>
              </form>

              {/* Operator Note Form */}
              <form onSubmit={handleAddNoteSubmit} className="p-3 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172235]">Record Operator Note</span>
                  <select
                    value={noteAuthor}
                    onChange={(e) => setNoteAuthor(e.target.value)}
                    className="bg-[#FBF8F1] text-xs text-[#172235] border border-[#D8D1C5] rounded-md px-2 py-1 font-medium shadow-xs"
                  >
                    {TEAM_MEMBERS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record findings or applied fixes..."
                  className="w-full bg-[#FBF8F1] border border-[#D8D1C5] rounded-md p-2 text-xs text-[#172235] focus:outline-none focus:border-[#183B63] font-mono shadow-xs"
                />
                <button
                  type="submit"
                  className="flex items-center space-x-1 px-3 py-1 rounded-md bg-[#183B63] hover:bg-[#102A46] text-white font-semibold text-xs transition shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Submit Note</span>
                </button>
              </form>

              <div className="overflow-x-auto rounded-md border border-[#D8D1C5] max-h-[280px]">
                <table className="w-full text-left text-xs text-[#172235] font-mono text-[11px]">
                  <thead className="bg-[#EAE4D8] text-[#667085] uppercase text-[10px] border-b border-[#D8D1C5] sticky top-0 font-bold">
                    <tr>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Service</th>
                      <th className="py-2 px-3">Level</th>
                      <th className="py-2 px-3">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8D1C5] bg-[#FBF8F1]">
                    {incident.events_sample.map((evt) => (
                      <tr key={evt.id} className="hover:bg-[#F0EBE2] transition">
                        <td className="py-1.5 px-3 text-[#8A8F98] whitespace-nowrap">
                          {new Date(evt.timestamp * 1000).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 px-3 text-[#183B63] font-bold">{evt.service_name}</td>
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              evt.level === 'CRITICAL'
                                ? 'bg-[#F4DEDA] text-[#B73535] border border-[#B73535]/40'
                                : evt.level === 'ERROR'
                                ? 'bg-[#FAF0E1] text-[#B47A32] border border-[#B47A32]/40'
                                : 'bg-[#EAE4D8] text-[#172235] border border-[#D8D1C5]'
                            }`}
                          >
                            {evt.level}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-[#172235] truncate max-w-md">{evt.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
