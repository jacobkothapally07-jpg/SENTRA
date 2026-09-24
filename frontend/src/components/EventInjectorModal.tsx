import React, { useState } from 'react';
import { PlusCircle, Send, X } from 'lucide-react';
import { api } from '../services/api';

interface EventInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EventInjectorModal: React.FC<EventInjectorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [service, setService] = useState('postgres-db');
  const [level, setLevel] = useState('CRITICAL');
  const [metricName, setMetricName] = useState('db_connection_utilization_pct');
  const [metricValue, setMetricValue] = useState('97.5');
  const [message, setMessage] = useState('Manual Injection: Database connection pool saturated (>95% utilization)');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.ingestEvent({
        service_name: service,
        level: level as any,
        metric_name: metricName || undefined,
        metric_value: metricValue ? parseFloat(metricValue) : undefined,
        message: message,
        source_id: `${service}-manual-node`,
        environment: 'production',
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to inject event', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102A46]/60 backdrop-blur-xs">
      <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg w-full max-w-lg p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D8D1C5]">
          <h3 className="font-bold text-[#172235] text-base flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-[#183B63]" />
            <span>Manual Event / Anomaly Injector</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-md bg-[#EAE4D8] hover:bg-[#D8D1C5] text-[#172235]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#172235] font-semibold mb-1">Target Service</label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2.5 text-[#172235]"
              >
                <option value="k8s-ingress">k8s-ingress</option>
                <option value="api-gateway">api-gateway</option>
                <option value="auth-service">auth-service</option>
                <option value="payment-gateway">payment-gateway</option>
                <option value="worker-queue">worker-queue</option>
                <option value="postgres-db">postgres-db</option>
                <option value="redis-cache">redis-cache</option>
              </select>
            </div>

            <div>
              <label className="block text-[#172235] font-semibold mb-1">Log / Event Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2.5 text-[#172235]"
              >
                <option value="CRITICAL">CRITICAL (Trigger P1)</option>
                <option value="ERROR">ERROR (Trigger P2)</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#172235] font-semibold mb-1">Metric Name (Optional)</label>
              <input
                type="text"
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
                placeholder="e.g. latency_p99_ms"
                className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2.5 text-[#172235] focus:outline-none focus:border-[#183B63] font-mono"
              />
            </div>

            <div>
              <label className="block text-[#172235] font-semibold mb-1">Metric Value</label>
              <input
                type="number"
                step="any"
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                placeholder="e.g. 98.5"
                className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2.5 text-[#172235] focus:outline-none focus:border-[#183B63] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#172235] font-semibold mb-1">Event Message Payload</label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-[#F0EBE2] border border-[#D8D1C5] rounded-md p-2.5 text-[#172235] focus:outline-none focus:border-[#183B63] font-mono"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-[#D8D1C5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-[#EAE4D8] text-[#172235] hover:bg-[#D8D1C5] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-md bg-[#183B63] hover:bg-[#102A46] text-white font-semibold shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Ingesting...' : 'Inject into Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
