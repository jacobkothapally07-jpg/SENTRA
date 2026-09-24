import React from 'react';
import {
  Layers,
  Cpu,
  Shield,
  Terminal,
  Activity,
  GitMerge,
  Brain,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const pipelineStages = [
    {
      step: '1. Ingestion',
      title: 'Multi-Source Event Stream',
      desc: 'Heterogeneous microservices (DB, Payment, Orders, Ingress, Auth, Queues) streaming real-time metrics & logs.',
      icon: <Terminal className="w-4 h-4 text-[#183B63]" />,
      tech: 'FastAPI / AsyncIO / WebSockets',
    },
    {
      step: '2. Normalization',
      title: 'Schema Normalizer',
      desc: 'Standardizes varied log formats into unified OpenTelemetry / ECS NormalizedEvent structures.',
      icon: <Layers className="w-4 h-4 text-[#183B63]" />,
      tech: 'Pydantic v2 / In-Memory Buffer',
    },
    {
      step: '3. Detection',
      title: 'Hybrid Anomaly Detectors',
      desc: 'Dual-engine: Configurable threshold rules + Online EWMA / 3-Sigma Z-Score + Scikit-Learn Isolation Forest.',
      icon: <Activity className="w-4 h-4 text-[#B47A32]" />,
      tech: 'NumPy / Scikit-Learn / EWMA',
    },
    {
      step: '4. REG Engine',
      title: 'Runtime Evidence Graph (Central Innovation)',
      desc: 'Dynamic 5-factor relationship scoring (Temporal, Hop Dist, Semantic, Statistical, Propagation) + False-Correlation Prevention.',
      icon: <GitMerge className="w-4 h-4 text-[#183B63]" />,
      tech: 'Adaptive Multi-Signal Graph',
    },
    {
      step: '5. AI Analyst',
      title: 'Root Cause & Remediation',
      desc: 'Synthesizes Probable Root Cause, blast radius, evidence points, and actionable SRE playbooks (100% offline fallback).',
      icon: <Brain className="w-4 h-4 text-[#183B63]" />,
      tech: 'Gemini 1.5 Flash / Heuristic Engine',
    },
    {
      step: '6. Operations',
      title: 'Command Center Dashboard',
      desc: 'Interactive triage, priority queue, topology cascade viewer, SRE assignment, and audit trail in Naval Cream.',
      icon: <Shield className="w-4 h-4 text-[#39745A]" />,
      tech: 'React / TypeScript / Tailwind',
    },
  ];

  return (
    <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#D8D1C5] flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#172235] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#183B63]" />
            <span>SENTRA SYSTEM ARCHITECTURE & PROCESSING PIPELINE</span>
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            End-to-end real-time stream processing, anomaly detection, Runtime Evidence Graph correlation, and response flow
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#EAE4D8] text-[#172235] border border-[#D8D1C5] font-semibold">
          Sub-5ms Event Processing Latency
        </span>
      </div>

      {/* Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pipelineStages.map((stg, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5] hover:border-[#183B63] transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#EAE4D8] text-[#183B63] border border-[#D8D1C5]">
                  {stg.step}
                </span>
                <div className="p-1 rounded bg-[#EAE4D8] border border-[#D8D1C5]">
                  {stg.icon}
                </div>
              </div>
              <h3 className="font-semibold text-xs text-[#172235]">{stg.title}</h3>
              <p className="text-xs text-[#667085] mt-1 leading-relaxed">{stg.desc}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#D8D1C5] flex items-center justify-between text-[10px] font-mono text-[#8A8F98]">
              <span>Stack:</span>
              <span className="text-[#172235] font-semibold">{stg.tech}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Extensibility Note */}
      <div className="p-3 rounded-lg bg-[#F0EBE2] border border-[#D8D1C5] text-xs font-mono text-[#667085]">
        <span className="text-[#172235] font-bold block mb-0.5">Architecture Extensibility:</span>
        <p className="leading-relaxed">
          The pipeline utilizes decoupled interfaces allowing zero-code migration from in-memory ring buffers to
          Apache Kafka / Redis Streams, OpenTelemetry collectors, and Prometheus exporters for enterprise deployments.
        </p>
      </div>
    </div>
  );
};
