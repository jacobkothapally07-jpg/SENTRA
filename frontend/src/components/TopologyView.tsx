import React from 'react';
import {
  Server,
  Database,
  Cpu,
  Zap,
  Layers,
  ArrowDown,
} from 'lucide-react';
import { ServiceNode, Incident } from '../types';

interface TopologyViewProps {
  services: ServiceNode[];
  activeIncidents: Incident[];
  onSelectService: (serviceName: string) => void;
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  services,
  onSelectService,
}) => {
  const getServiceIcon = (tier: string) => {
    switch (tier) {
      case 'database':
        return <Database className="w-4 h-4 text-[#183B63]" />;
      case 'cache':
        return <Zap className="w-4 h-4 text-[#B47A32]" />;
      case 'edge':
      case 'gateway':
        return <Server className="w-4 h-4 text-[#183B63]" />;
      default:
        return <Cpu className="w-4 h-4 text-[#183B63]" />;
    }
  };

  const getNodeBorder = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'border-[#B73535] bg-[#F4DEDA] text-[#B73535] shadow-xs';
      case 'DEGRADED':
        return 'border-[#B47A32] bg-[#FAF0E1] text-[#B47A32] shadow-xs';
      default:
        return 'border-[#D8D1C5] bg-[#FBF8F1] text-[#172235] hover:border-[#183B63] shadow-xs';
    }
  };

  const edgeTier = services.filter((s) => s.tier === 'edge');
  const gatewayTier = services.filter((s) => s.tier === 'gateway');
  const coreTier = services.filter((s) => s.tier === 'core' || s.tier === 'critical_core' || s.tier === 'async_worker');
  const dataTier = services.filter((s) => s.tier === 'database' || s.tier === 'cache');

  return (
    <div className="bg-[#FBF8F1] border border-[#D8D1C5] rounded-lg p-5 shadow-xs flex flex-col">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#D8D1C5] mb-5 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#172235] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#183B63]" />
            <span>SERVICE MESH DEPENDENCY & CASCADE GRAPH</span>
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Topology map with live health scores and dependency propagation paths
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-xs">
          <span className="flex items-center space-x-1 text-[#39745A]">
            <span className="w-2 h-2 rounded-full bg-[#39745A]"></span>
            <span>Healthy (80–100)</span>
          </span>
          <span className="flex items-center space-x-1 text-[#B47A32]">
            <span className="w-2 h-2 rounded-full bg-[#B47A32]"></span>
            <span>Degraded (50–79)</span>
          </span>
          <span className="flex items-center space-x-1 text-[#B73535] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#B73535]"></span>
            <span>Critical (&lt;50)</span>
          </span>
        </div>
      </div>

      {/* Tiered Architectural Layout on Warm Cream Canvas */}
      <div className="space-y-4 bg-[#F3EEE5] p-5 rounded-lg border border-[#D8D1C5]">
        {/* Tier 1: Ingress */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#667085] mb-1.5">
            Tier 1: Edge & Ingress
          </span>
          <div className="flex justify-center gap-4 w-full">
            {edgeTier.map((node) => (
              <ServiceCard key={node.id} node={node} onSelect={onSelectService} getBorder={getNodeBorder} getIcon={getServiceIcon} />
            ))}
          </div>
          <ArrowDown className="w-3.5 h-3.5 text-[#183B63] my-1 opacity-60" />
        </div>

        {/* Tier 2: API Gateway */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#667085] mb-1.5">
            Tier 2: API Gateway Layer
          </span>
          <div className="flex justify-center gap-4 w-full">
            {gatewayTier.map((node) => (
              <ServiceCard key={node.id} node={node} onSelect={onSelectService} getBorder={getNodeBorder} getIcon={getServiceIcon} />
            ))}
          </div>
          <ArrowDown className="w-3.5 h-3.5 text-[#183B63] my-1 opacity-60" />
        </div>

        {/* Tier 3: Core Application Services */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#667085] mb-1.5">
            Tier 3: Core Business Services
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl">
            {coreTier.map((node) => (
              <ServiceCard key={node.id} node={node} onSelect={onSelectService} getBorder={getNodeBorder} getIcon={getServiceIcon} />
            ))}
          </div>
          <ArrowDown className="w-3.5 h-3.5 text-[#183B63] my-1 opacity-60" />
        </div>

        {/* Tier 4: Data & Cache */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#667085] mb-1.5">
            Tier 4: Persistence & Cache
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
            {dataTier.map((node) => (
              <ServiceCard key={node.id} node={node} onSelect={onSelectService} getBorder={getNodeBorder} getIcon={getServiceIcon} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ServiceCardProps {
  node: ServiceNode;
  onSelect: (id: string) => void;
  getBorder: (status: string) => string;
  getIcon: (tier: string) => React.ReactNode;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ node, onSelect, getBorder, getIcon }) => {
  const isCritical = node.status === 'CRITICAL';
  const isDegraded = node.status === 'DEGRADED';

  return (
    <div
      onClick={() => onSelect(node.name)}
      className={`p-3 rounded-lg border transition cursor-pointer w-full max-w-xs ${getBorder(
        node.status
      )}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-[#EAE4D8] border border-[#D8D1C5]">
            {getIcon(node.tier)}
          </div>
          <div>
            <h4 className="font-semibold text-xs font-mono text-[#172235]">{node.name}</h4>
            <span className="text-[10px] uppercase text-[#667085] font-mono">{node.tier}</span>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`text-xs font-bold font-mono ${
              node.health_score >= 80 ? 'text-[#39745A]' : node.health_score >= 50 ? 'text-[#B47A32]' : 'text-[#B73535]'
            }`}
          >
            {node.health_score}
          </span>
          <span className="text-[9px] text-[#667085] block">/100</span>
        </div>
      </div>

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-[#D8D1C5] text-[10px] font-mono">
        <div>
          <span className="text-[#667085] block">Latency</span>
          <span className={node.latency_ms > 300 ? 'text-[#B73535] font-semibold' : 'text-[#172235]'}>
            {node.latency_ms.toFixed(0)}ms
          </span>
        </div>
        <div>
          <span className="text-[#667085] block">Error Rate</span>
          <span className={node.error_rate_pct > 5 ? 'text-[#B73535] font-semibold' : 'text-[#172235]'}>
            {node.error_rate_pct.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-[#667085] block">CPU</span>
          <span className={node.cpu_pct > 80 ? 'text-[#B73535] font-semibold' : 'text-[#172235]'}>
            {node.cpu_pct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};
