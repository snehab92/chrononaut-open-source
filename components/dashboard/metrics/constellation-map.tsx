"use client";

import { useState, useMemo } from "react";
import { Leaf, Star, Shield, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface AssessmentInsight {
  id?: string;
  source_assessments: string[];
  content: string;
  severity: "gentle" | "notable" | "significant";
}

interface AssessmentStatus {
  executive_function: { complete: boolean; score?: number };
  self_compassion: { complete: boolean; score?: number };
  strengths: { complete: boolean; score?: number; count?: number };
  values_alignment: { complete: boolean; score?: number };
}

interface ConstellationMapProps {
  assessmentStatus: AssessmentStatus;
  insights: AssessmentInsight[];
  className?: string;
}

interface NodeConfig {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeColor: string;
  bgColor: string;
  x: number;
  y: number;
}

// ============================================================================
// Node Positions (diamond layout)
// ============================================================================

const NODE_CONFIG: NodeConfig[] = [
  {
    id: "executive_function",
    label: "Executive Function",
    shortLabel: "EF",
    icon: Zap,
    color: "#3B82F6",
    activeColor: "text-blue-500",
    bgColor: "bg-blue-100",
    x: 160,
    y: 50,
  },
  {
    id: "strengths",
    label: "Strengths",
    shortLabel: "STR",
    icon: Star,
    color: "#8B5CF6",
    activeColor: "text-purple-500",
    bgColor: "bg-purple-100",
    x: 280,
    y: 140,
  },
  {
    id: "values_alignment",
    label: "Values",
    shortLabel: "VAL",
    icon: Leaf,
    color: "#F59E0B",
    activeColor: "text-amber-500",
    bgColor: "bg-amber-100",
    x: 160,
    y: 230,
  },
  {
    id: "self_compassion",
    label: "Self-Compassion",
    shortLabel: "SC",
    icon: Shield,
    color: "#14B8A6",
    activeColor: "text-teal-500",
    bgColor: "bg-teal-100",
    x: 40,
    y: 140,
  },
];

// ============================================================================
// Main Component
// ============================================================================

export function ConstellationMap({
  assessmentStatus,
  insights,
  className,
}: ConstellationMapProps) {
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Map insights to connections
  const connections = useMemo(() => {
    const conns: Array<{
      id: string;
      from: NodeConfig;
      to: NodeConfig;
      insights: AssessmentInsight[];
      hasInsights: boolean;
    }> = [];

    // Create all possible connections
    for (let i = 0; i < NODE_CONFIG.length; i++) {
      for (let j = i + 1; j < NODE_CONFIG.length; j++) {
        const fromNode = NODE_CONFIG[i];
        const toNode = NODE_CONFIG[j];
        const connId = `${fromNode.id}-${toNode.id}`;

        // Find insights that connect these two nodes
        const relatedInsights = insights.filter(
          (ins) =>
            ins.source_assessments.includes(fromNode.id) &&
            ins.source_assessments.includes(toNode.id)
        );

        // Also include single-source insights for each node
        const fromInsights = insights.filter(
          (ins) =>
            ins.source_assessments.length === 1 &&
            ins.source_assessments.includes(fromNode.id)
        );
        const toInsights = insights.filter(
          (ins) =>
            ins.source_assessments.length === 1 &&
            ins.source_assessments.includes(toNode.id)
        );

        const allInsights = [...relatedInsights];

        conns.push({
          id: connId,
          from: fromNode,
          to: toNode,
          insights: allInsights,
          hasInsights: allInsights.length > 0,
        });
      }
    }

    return conns;
  }, [insights]);

  // Get node by ID
  const getNodeStatus = (id: string) => {
    switch (id) {
      case "executive_function":
        return assessmentStatus.executive_function;
      case "self_compassion":
        return assessmentStatus.self_compassion;
      case "strengths":
        return assessmentStatus.strengths;
      case "values_alignment":
        return assessmentStatus.values_alignment;
      default:
        return { complete: false };
    }
  };

  // Get selected insight content
  const selectedInsights = selectedConnection
    ? connections.find((c) => c.id === selectedConnection)?.insights || []
    : [];

  // Single-assessment insights (not connections)
  const singleInsights = insights.filter((ins) => ins.source_assessments.length === 1);

  return (
    <div className={cn("relative", className)}>
      {/* SVG Constellation */}
      <div className="relative">
        <svg viewBox="0 0 320 300" className="w-full h-auto" style={{ maxHeight: "320px" }}>
          <defs>
            {/* Glow filter for active elements */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Gradient for insight connections */}
            <linearGradient id="insightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D4A84B" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Connection lines */}
          {connections.map((conn) => {
            const fromStatus = getNodeStatus(conn.from.id);
            const toStatus = getNodeStatus(conn.to.id);
            const bothComplete = fromStatus.complete && toStatus.complete;
            const isSelected = selectedConnection === conn.id;
            const isHovered =
              hoveredNode === conn.from.id || hoveredNode === conn.to.id;

            if (!bothComplete && !conn.hasInsights) return null;

            return (
              <g key={conn.id}>
                {/* Clickable area (invisible wider line) */}
                <line
                  x1={conn.from.x}
                  y1={conn.from.y}
                  x2={conn.to.x}
                  y2={conn.to.y}
                  stroke="transparent"
                  strokeWidth="20"
                  className="cursor-pointer"
                  onClick={() =>
                    conn.hasInsights &&
                    setSelectedConnection(isSelected ? null : conn.id)
                  }
                />
                {/* Visible line */}
                <line
                  x1={conn.from.x}
                  y1={conn.from.y}
                  x2={conn.to.x}
                  y2={conn.to.y}
                  stroke={
                    conn.hasInsights
                      ? isSelected
                        ? "#D4A84B"
                        : "#8B9A8F"
                      : "#E8DCC4"
                  }
                  strokeWidth={conn.hasInsights ? (isSelected ? 3 : 2) : 1}
                  strokeDasharray={conn.hasInsights ? "none" : "4,4"}
                  opacity={isHovered || isSelected ? 1 : conn.hasInsights ? 0.7 : 0.3}
                  className="transition-all duration-200"
                  filter={isSelected ? "url(#glow)" : undefined}
                />
                {/* Insight indicator dot at midpoint */}
                {conn.hasInsights && (
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedConnection(isSelected ? null : conn.id)}
                  >
                    <circle
                      cx={(conn.from.x + conn.to.x) / 2}
                      cy={(conn.from.y + conn.to.y) / 2}
                      r={isSelected ? 12 : 8}
                      fill={isSelected ? "#D4A84B" : "#FDFBF7"}
                      stroke="#D4A84B"
                      strokeWidth="2"
                      className="transition-all duration-200"
                      filter={isSelected ? "url(#glow)" : undefined}
                    />
                    <text
                      x={(conn.from.x + conn.to.x) / 2}
                      y={(conn.from.y + conn.to.y) / 2 + 4}
                      textAnchor="middle"
                      className="text-[10px] font-bold pointer-events-none"
                      fill={isSelected ? "white" : "#D4A84B"}
                    >
                      {conn.insights.length}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {NODE_CONFIG.map((node) => {
            const status = getNodeStatus(node.id);
            const Icon = node.icon;
            const isHovered = hoveredNode === node.id;
            const isInSelectedConnection = selectedConnection?.includes(node.id);

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Outer glow for completed */}
                {status.complete && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="38"
                    fill="none"
                    stroke={node.color}
                    strokeWidth="2"
                    opacity={isHovered || isInSelectedConnection ? 0.5 : 0.2}
                    className="transition-opacity duration-200"
                  />
                )}

                {/* Main circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="32"
                  fill={status.complete ? "#FDFBF7" : "#F5F0E6"}
                  stroke={status.complete ? node.color : "#D4C5A9"}
                  strokeWidth={status.complete ? 3 : 1.5}
                  className="transition-all duration-200"
                  filter={isHovered || isInSelectedConnection ? "url(#glow)" : undefined}
                />

                {/* Score arc for completed assessments */}
                {status.complete && status.score !== undefined && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="28"
                    fill="none"
                    stroke={node.color}
                    strokeWidth="4"
                    strokeDasharray={`${(Math.min(status.score, 100) / 100) * 176} 176`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${node.x} ${node.y})`}
                    opacity="0.6"
                  />
                )}

                {/* Icon */}
                <foreignObject x={node.x - 14} y={node.y - 14} width="28" height="28">
                  <div className="flex items-center justify-center w-full h-full">
                    <Icon
                      className={cn(
                        "h-6 w-6 transition-colors",
                        status.complete ? node.activeColor : "text-[#C4B89B]"
                      )}
                    />
                  </div>
                </foreignObject>

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 50}
                  textAnchor="middle"
                  className={cn(
                    "text-[11px] font-medium transition-colors",
                    status.complete ? "fill-[#1E3D32]" : "fill-[#8B9A8F]"
                  )}
                >
                  {node.shortLabel === "EF" ? "Executive" : node.label}
                </text>
                {node.shortLabel === "EF" && (
                  <text
                    x={node.x}
                    y={node.y + 62}
                    textAnchor="middle"
                    className={cn(
                      "text-[11px] font-medium",
                      status.complete ? "fill-[#1E3D32]" : "fill-[#8B9A8F]"
                    )}
                  >
                    Function
                  </text>
                )}

                {/* Completion badge */}
                {status.complete && (
                  <>
                    <circle cx={node.x + 24} cy={node.y - 24} r="8" fill="#2D5A47" />
                    <path
                      d={`M${node.x + 20} ${node.y - 24} l3 3 l5 -5`}
                      stroke="white"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Insight Panel - shows when connection is selected */}
      {selectedConnection && selectedInsights.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {connections
                .find((c) => c.id === selectedConnection)
                ?.from && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${connections.find((c) => c.id === selectedConnection)?.from.color}20`,
                    color: connections.find((c) => c.id === selectedConnection)?.from.color,
                  }}
                >
                  {connections.find((c) => c.id === selectedConnection)?.from.label}
                </span>
              )}
              <span className="text-[#8B9A8F]">+</span>
              {connections
                .find((c) => c.id === selectedConnection)
                ?.to && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${connections.find((c) => c.id === selectedConnection)?.to.color}20`,
                    color: connections.find((c) => c.id === selectedConnection)?.to.color,
                  }}
                >
                  {connections.find((c) => c.id === selectedConnection)?.to.label}
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedConnection(null)}
              className="p-1 rounded-full hover:bg-amber-100 transition-colors"
            >
              <X className="h-4 w-4 text-[#8B9A8F]" />
            </button>
          </div>
          <div className="space-y-2">
            {selectedInsights.map((insight, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-lg text-sm",
                  insight.severity === "gentle" && "bg-green-50 text-green-800 border border-green-100",
                  insight.severity === "notable" && "bg-amber-50 text-amber-800 border border-amber-100",
                  insight.severity === "significant" && "bg-red-50 text-red-800 border border-red-100"
                )}
              >
                {insight.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single-assessment insights */}
      {singleInsights.length > 0 && !selectedConnection && (
        <div className="mt-4 space-y-2">
          {singleInsights.map((insight, i) => {
            const node = NODE_CONFIG.find((n) =>
              insight.source_assessments.includes(n.id)
            );
            return (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-lg text-sm border",
                  insight.severity === "gentle" && "bg-green-50 text-green-800 border-green-100",
                  insight.severity === "notable" && "bg-amber-50 text-amber-800 border-amber-100",
                  insight.severity === "significant" && "bg-red-50 text-red-800 border-red-100"
                )}
              >
                {node && (
                  <span
                    className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2"
                    style={{
                      backgroundColor: `${node.color}20`,
                      color: node.color,
                    }}
                  >
                    {node.label}
                  </span>
                )}
                <p>{insight.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {insights.length === 0 && (
        <p className="mt-4 text-center text-sm text-[#8B9A8F]">
          Complete more assessments to discover cross-domain insights
        </p>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-[#8B9A8F]">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#D4A84B] rounded" />
          Click connection for insights
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#E8DCC4] rounded border-dashed" />
          No insights yet
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Mini Constellation for Dashboard Cards
// ============================================================================

export function MiniConstellation({
  completedCount,
  className,
}: {
  completedCount: number;
  className?: string;
}) {
  const nodes = [
    { x: 20, y: 10, complete: completedCount >= 1 },
    { x: 35, y: 20, complete: completedCount >= 2 },
    { x: 20, y: 30, complete: completedCount >= 3 },
    { x: 5, y: 20, complete: completedCount >= 4 },
  ];

  return (
    <svg viewBox="0 0 40 40" className={cn("w-8 h-8", className)}>
      {nodes.map((node, i) =>
        nodes.slice(i + 1).map((otherNode, j) => (
          <line
            key={`${i}-${j}`}
            x1={node.x}
            y1={node.y}
            x2={otherNode.x}
            y2={otherNode.y}
            stroke={node.complete && otherNode.complete ? "#D4A84B" : "#E8DCC4"}
            strokeWidth={node.complete && otherNode.complete ? 1.5 : 0.5}
            opacity={node.complete && otherNode.complete ? 0.8 : 0.3}
          />
        ))
      )}
      {nodes.map((node, i) => (
        <circle
          key={i}
          cx={node.x}
          cy={node.y}
          r={4}
          fill={node.complete ? "#2D5A47" : "#E8DCC4"}
          className="transition-all duration-300"
        />
      ))}
    </svg>
  );
}
