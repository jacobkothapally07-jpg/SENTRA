import React, { useState } from 'react';
import {
  Terminal,
  Search,
  Activity,
  Pause,
  Play,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { NormalizedEvent } from '../types';

interface LiveEventStreamProps {
  events: NormalizedEvent[];
  isStreaming: boolean;
  onToggleStream: () => void;
}

export const LiveEventStream: React.FC<LiveEventStreamProps> = ({
  events,
  isStreaming,
  onToggleStream,
}) => {
  const [search, setSearch] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');

  const filteredEvents = events.filter((evt) => {
    if (levelFilter !== 'ALL' && evt.level !== levelFilter) return false;
    if (serviceFilter !== 'ALL' && evt.service_name !== serviceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchMsg = evt.message.toLowerCase().includes(q);
      const matchSvc = evt.service_name.toLowerCase().includes(q);
      const matchSrc = evt.source_id.toLowerCase().includes(q);
      if (!matchMsg && !matchSvc && !matchSrc) return false;
    }
    return true;
  });

  const chartData = events
    .slice(0, 35)
    .reverse()
    .map((e, idx) => ({
      index: idx,
      time: new Date(e.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: e.metric_value || (e.level === 'CRITICAL' ? 100 : e.level === 'ERROR' ? 60 : 20),
      service: e.service_name,
    }));

  return (
    <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-5 shadow-xs flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#D8D1C5]">
        <div>
          <h2 className="text-sm font-bold text-[#172235] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#183B63]" />
            <span>NORMALIZED TELEMETRY & EVENT STREAM</span>
            <span className="px-1.5 py-0.2 text-[11px] bg-[#EAE4D8] border border-[#D8D1C5] text-[#172235] rounded-md font-mono">
              {events.length} in buffer
            </span>
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Normalized OpenTelemetry stream across microservices with online noise reduction
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 text-[#8A8F98] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#F0EBE2] text-xs text-[#172235] pl-7 pr-2.5 py-1.5 rounded-md border border-[#D8D1C5] focus:outline-none focus:border-[#183B63] w-36 sm:w-48 font-mono shadow-xs"
            />
          </div>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="bg-[#F0EBE2] text-xs text-[#172235] border border-[#D8D1C5] rounded-md px-2 py-1.5 focus:outline-none focus:border-[#183B63] font-medium shadow-xs"
          >
            <option value="ALL">All Services</option>
            <option value="k8s-ingress">k8s-ingress</option>
            <option value="api-gateway">api-gateway</option>
            <option value="auth-service">auth-service</option>
            <option value="order-service">order-service</option>
            <option value="payment-gateway">payment-gateway</option>
            <option value="worker-queue">worker-queue</option>
            <option value="postgres-db">postgres-db</option>
            <option value="redis-cache">redis-cache</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-[#F0EBE2] text-xs text-[#172235] border border-[#D8D1C5] rounded-md px-2 py-1.5 focus:outline-none focus:border-[#183B63] font-medium shadow-xs"
          >
            <option value="ALL">All Levels</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
          </select>

          <button
            onClick={onToggleStream}
            className={`p-1.5 rounded-md border transition ${
              isStreaming
                ? 'bg-[#F0EBE2] border-[#D8D1C5] text-[#172235] hover:bg-[#EAE4D8]'
                : 'bg-[#E4EFEA] border-[#39745A] text-[#39745A]'
            }`}
            title={isStreaming ? 'Pause live stream' : 'Resume live stream'}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Telemetry Trend Chart */}
      <div className="bg-[#F0EBE2] border border-[#D8D1C5] rounded-lg p-3.5">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="font-semibold text-[#172235] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#183B63]" />
            <span>Real-Time Metric Fluctuations & Spikes</span>
          </span>
          <span className="font-mono text-[#667085] text-[10px]">Sliding Window: 35 points</span>
        </div>
        <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#183B63" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#183B63" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#8A8F98" fontSize={9} tickLine={false} />
              <YAxis stroke="#8A8F98" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FBF8F1', borderColor: '#D8D1C5', fontSize: '11px', color: '#172235', borderRadius: '6px' }}
                labelStyle={{ color: '#667085' }}
              />
              <Area type="monotone" dataKey="value" stroke="#183B63" strokeWidth={1.5} fillOpacity={1} fill="url(#metricGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto rounded-lg border border-[#D8D1C5] max-h-[440px]">
        <table className="w-full text-left text-xs text-[#172235]">
          <thead className="bg-[#EAE4D8] sticky top-0 text-[#667085] font-mono uppercase text-[10px] border-b border-[#D8D1C5] z-10 font-bold">
            <tr>
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Service</th>
              <th className="py-2 px-3">Node Source</th>
              <th className="py-2 px-3">Level</th>
              <th className="py-2 px-3">Metric</th>
              <th className="py-2 px-3">Message Content</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D1C5] font-mono text-[11px] bg-[#FBF8F1]">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[#8A8F98]">
                  No matching events found in active buffer.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#F0EBE2] transition">
                  <td className="py-1.5 px-3 text-[#8A8F98] whitespace-nowrap">
                    {new Date(evt.timestamp * 1000).toLocaleTimeString()}
                  </td>
                  <td className="py-1.5 px-3 text-[#183B63] font-semibold whitespace-nowrap">
                    {evt.service_name}
                  </td>
                  <td className="py-1.5 px-3 text-[#667085] whitespace-nowrap">
                    {evt.source_id}
                  </td>
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        evt.level === 'CRITICAL'
                          ? 'bg-[#F4DEDA] text-[#B73535] border border-[#B73535]/40'
                          : evt.level === 'ERROR'
                          ? 'bg-[#FAF0E1] text-[#B47A32] border border-[#B47A32]/40'
                          : evt.level === 'WARN'
                          ? 'bg-[#FAF0E1] text-[#B47A32] border border-[#B47A32]/40'
                          : 'bg-[#EAE4D8] text-[#172235] border border-[#D8D1C5]'
                      }`}
                    >
                      {evt.level}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-[#183B63] whitespace-nowrap font-medium">
                    {evt.metric_name ? `${evt.metric_name} = ${evt.metric_value}` : '—'}
                  </td>
                  <td className="py-1.5 px-3 text-[#172235] truncate max-w-md">
                    {evt.message}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
