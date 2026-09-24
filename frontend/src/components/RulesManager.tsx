import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Shield,
} from 'lucide-react';
import { DetectionRule, IncidentSeverity } from '../types';

interface RulesManagerProps {
  rules: DetectionRule[];
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
  onCreateRule: (rule: Partial<DetectionRule>) => void;
}

export const RulesManager: React.FC<RulesManagerProps> = ({
  rules,
  onToggleRule,
  onDeleteRule,
  onCreateRule,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newRule, setNewRule] = useState<Partial<DetectionRule>>({
    name: '',
    description: '',
    service_name: '*',
    metric_name: 'http_error_rate_pct',
    condition: 'gt',
    threshold: 15.0,
    severity: 'P2_HIGH',
    enabled: true,
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name) return;
    onCreateRule(newRule);
    setShowAddModal(false);
    setNewRule({
      name: '',
      description: '',
      service_name: '*',
      metric_name: 'http_error_rate_pct',
      condition: 'gt',
      threshold: 15.0,
      severity: 'P2_HIGH',
      enabled: true,
    });
  };

  return (
    <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-5 shadow-xs flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#D8D1C5]">
        <div>
          <h2 className="text-sm font-bold text-[#172235] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#183B63]" />
            <span>CONFIGURABLE DETECTION & ANOMALY RULES</span>
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Manage real-time threshold evaluations, pattern signatures, and statistical sensitivity
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#183B63] hover:bg-[#102A46] text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Rule</span>
        </button>
      </div>

      {/* Rules Table */}
      <div className="overflow-x-auto rounded-lg border border-[#D8D1C5]">
        <table className="w-full text-left text-xs text-[#172235]">
          <thead className="bg-[#EAE4D8] text-[#667085] font-mono uppercase text-[10px] border-b border-[#D8D1C5] font-bold">
            <tr>
              <th className="py-2.5 px-3.5">Status</th>
              <th className="py-2.5 px-3.5">Rule Name</th>
              <th className="py-2.5 px-3.5">Service Scope</th>
              <th className="py-2.5 px-3.5">Condition & Metric</th>
              <th className="py-2.5 px-3.5">Threshold</th>
              <th className="py-2.5 px-3.5">Severity</th>
              <th className="py-2.5 px-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D1C5] font-mono text-[11px] bg-[#FBF8F1]">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-[#F0EBE2] transition">
                <td className="py-2.5 px-3.5">
                  <button
                    onClick={() => onToggleRule(rule.id)}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      rule.enabled
                        ? 'bg-[#E4EFEA] text-[#39745A] border border-[#39745A]/40'
                        : 'bg-[#EAE4D8] text-[#8A8F98] border border-[#D8D1C5]'
                    }`}
                  >
                    {rule.enabled ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-[#39745A]" />
                        <span>ACTIVE</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-[#8A8F98]" />
                        <span>MUTED</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="py-2.5 px-3.5 font-sans font-semibold text-[#172235]">
                  <div>{rule.name}</div>
                  <div className="text-[10px] text-[#667085] font-normal">{rule.description}</div>
                </td>
                <td className="py-2.5 px-3.5 text-[#183B63] font-mono font-semibold">
                  {rule.service_name}
                </td>
                <td className="py-2.5 px-3.5 text-[#172235]">
                  {rule.metric_name ? `${rule.metric_name} (${rule.condition})` : rule.pattern || 'Pattern'}
                </td>
                <td className="py-2.5 px-3.5 text-[#172235] font-bold">
                  {rule.threshold}
                </td>
                <td className="py-2.5 px-3.5">
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      rule.severity === 'P1_CRITICAL'
                        ? 'bg-[#F4DEDA] text-[#B73535] border border-[#B73535]/40'
                        : rule.severity === 'P2_HIGH'
                        ? 'bg-[#FAF0E1] text-[#B47A32] border border-[#B47A32]/40'
                        : 'bg-[#DCE7F2] text-[#183B63] border border-[#183B63]/30'
                    }`}
                  >
                    {rule.severity}
                  </span>
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-1 rounded hover:bg-[#F4DEDA] text-[#8A8F98] hover:text-[#B73535] transition"
                    title="Delete rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102A46]/60 backdrop-blur-xs">
          <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#D8D1C5]">
              <h3 className="font-bold text-[#172235] text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#183B63]" />
                <span>Create Detection Rule</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#667085] hover:text-[#172235] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#172235] font-semibold mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g. Memory Spike or Latency SLA Breach"
                  className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2 text-[#172235] focus:outline-none focus:border-[#183B63]"
                />
              </div>

              <div>
                <label className="block text-[#172235] font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="Short description of condition"
                  className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2 text-[#172235] focus:outline-none focus:border-[#183B63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#172235] font-semibold mb-1">Service Scope</label>
                  <select
                    value={newRule.service_name}
                    onChange={(e) => setNewRule({ ...newRule, service_name: e.target.value })}
                    className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2 text-[#172235]"
                  >
                    <option value="*">* (All Services)</option>
                    <option value="k8s-ingress">k8s-ingress</option>
                    <option value="api-gateway">api-gateway</option>
                    <option value="auth-service">auth-service</option>
                    <option value="order-service">order-service</option>
                    <option value="payment-gateway">payment-gateway</option>
                    <option value="worker-queue">worker-queue</option>
                    <option value="postgres-db">postgres-db</option>
                    <option value="redis-cache">redis-cache</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#172235] font-semibold mb-1">Metric</label>
                  <select
                    value={newRule.metric_name}
                    onChange={(e) => setNewRule({ ...newRule, metric_name: e.target.value })}
                    className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2 text-[#172235]"
                  >
                    <option value="http_error_rate_pct">http_error_rate_pct</option>
                    <option value="db_latency_ms">db_latency_ms</option>
                    <option value="payment_latency_ms">payment_latency_ms</option>
                    <option value="latency_p99_ms">latency_p99_ms</option>
                    <option value="cpu_usage_pct">cpu_usage_pct</option>
                    <option value="memory_usage_pct">memory_usage_pct</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#172235] font-semibold mb-1">Operator</label>
                  <select
                    value={newRule.condition}
                    onChange={(e) => setNewRule({ ...newRule, condition: e.target.value as any })}
                    className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2 text-[#172235]"
                  >
                    <option value="gt">&gt; (Greater)</option>
                    <option value="gte">&ge; (GTE)</option>
                    <option value="lt">&lt; (Less)</option>
                    <option value="eq">== (Equal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#172235] font-semibold mb-1">Threshold</label>
                  <input
                    type="number"
                    step="any"
                    value={newRule.threshold}
                    onChange={(e) => setNewRule({ ...newRule, threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2 text-[#172235] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#172235] font-semibold mb-1">Severity</label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as IncidentSeverity })}
                    className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2 text-[#172235]"
                  >
                    <option value="P1_CRITICAL">P1 CRITICAL</option>
                    <option value="P2_HIGH">P2 HIGH</option>
                    <option value="P3_MEDIUM">P3 MEDIUM</option>
                    <option value="P4_LOW">P4 LOW</option>
                  </select>
                </div>
              </div>

              <div className="pt-2.5 flex justify-end space-x-2 border-t border-[#D8D1C5]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-md bg-[#EAE4D8] text-[#172235] hover:bg-[#D8D1C5] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-[#183B63] hover:bg-[#102A46] text-white font-semibold"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
