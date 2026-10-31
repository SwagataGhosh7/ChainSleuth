/**
 * Interactive SVG/Canvas Multi-Hop Transaction Graph Visualizer
 * Force-directed layout mapping wallets, peel hops, mixer pools, and cashout routes.
 * Features Visual Heatmap Overlay scaling with Risk Score relative to Laundering Volume.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Info,
  Filter,
  Eye,
  Tag,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Move,
  Compass,
  Flame,
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../types.js';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onOpenTagModal?: (node: GraphNode) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onOpenTagModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Compute aggregate laundering volume for relative heatmap calculation
  const totalLaunderingVolume = useMemo(() => {
    return edges.reduce((sum, e) => sum + (e.valueMatic || 0), 0) || 1;
  }, [edges]);

  // Position nodes using structured layer topology or force calculation
  const layoutNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];

    const width = 860;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    // Categorize into logical hops
    const rootNode = nodes.find((n) => n.isRoot) || nodes[0];
    const peelNodes = nodes.filter((n) => n.category === 'PEEL_HOP');
    const mixerNodes = nodes.filter((n) => n.category === 'MIXER');
    const burnerNodes = nodes.filter((n) => n.category === 'BURNER');
    const exchangeNodes = nodes.filter((n) => n.category === 'EXCHANGE');
    const others = nodes.filter(
      (n) =>
        !n.isRoot &&
        n.category !== 'PEEL_HOP' &&
        n.category !== 'MIXER' &&
        n.category !== 'BURNER' &&
        n.category !== 'EXCHANGE'
    );

    const positions = new Map<string, { x: number; y: number }>();

    // 1. Root at left-center
    if (rootNode) {
      positions.set(rootNode.id.toLowerCase(), { x: 100, y: centerY });
    }

    // 2. Peel nodes layered horizontally
    peelNodes.forEach((node, idx) => {
      const stepX = 260 + idx * 170;
      const stepY = centerY + (idx % 2 === 0 ? -40 : 40);
      positions.set(node.id.toLowerCase(), { x: stepX, y: stepY });
    });

    // 3. Mixer nodes placed towards top
    mixerNodes.forEach((node, idx) => {
      positions.set(node.id.toLowerCase(), { x: 380 + idx * 140, y: 90 + (idx % 2) * 50 });
    });

    // 4. Burner nodes placed towards right
    burnerNodes.forEach((node, idx) => {
      positions.set(node.id.toLowerCase(), { x: 620, y: 150 + idx * 75 });
    });

    // 5. Exchange cashouts placed at far right
    exchangeNodes.forEach((node, idx) => {
      positions.set(node.id.toLowerCase(), { x: 780, y: 220 + idx * 100 });
    });

    // 6. Others distributed
    others.forEach((node, idx) => {
      positions.set(node.id.toLowerCase(), { x: 180 + idx * 80, y: 380 + (idx % 2) * 40 });
    });

    return nodes.map((node) => {
      const pos = positions.get(node.id.toLowerCase()) || {
        x: centerX + (Math.random() - 0.5) * 300,
        y: centerY + (Math.random() - 0.5) * 200,
      };
      return {
        ...node,
        x: pos.x,
        y: pos.y,
      };
    });
  }, [nodes]);

  const nodePositionMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    layoutNodes.forEach((n) => map.set(n.id.toLowerCase(), { x: n.x || 0, y: n.y || 0 }));
    return map;
  }, [layoutNodes]);

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handlePan = (deltaX: number, deltaY: number) => {
    setPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
  };

  const zoomIn = () => {
    setZoom((z) => Math.min(Math.round((z + 0.2) * 100) / 100, 3.0));
  };

  const zoomOut = () => {
    setZoom((z) => Math.max(Math.round((z - 0.2) * 100) / 100, 0.4));
  };

  const zoomToFit = () => {
    setZoom(0.9);
    setPan({ x: 30, y: 15 });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prevZoom) => {
      const nextZoom = Math.min(Math.max(prevZoom + delta, 0.4), 3.0);
      return Math.round(nextZoom * 100) / 100;
    });
  };

  // Node category styling
  const getNodeFill = (category: GraphNode['category'], isSelected: boolean) => {
    switch (category) {
      case 'EXPLOITER':
        return isSelected ? '#ff7b72' : '#da3633';
      case 'PEEL_HOP':
        return isSelected ? '#d29922' : '#9e6a03';
      case 'MIXER':
        return isSelected ? '#d2a8ff' : '#8957e5';
      case 'EXCHANGE':
        return isSelected ? '#7ee787' : '#238636';
      case 'BURNER':
        return isSelected ? '#ffa657' : '#bd561d';
      default:
        return isSelected ? '#58a6ff' : '#1f6feb';
    }
  };

  const getNodeStroke = (category: GraphNode['category'], isSelected: boolean) => {
    if (isSelected) return '#ffffff';
    switch (category) {
      case 'EXPLOITER':
        return '#ffa198';
      case 'PEEL_HOP':
        return '#f0883e';
      case 'MIXER':
        return '#e2c5ff';
      case 'EXCHANGE':
        return '#aff5b4';
      case 'BURNER':
        return '#ffc680';
      default:
        return '#79c0ff';
    }
  };

  // Heatmap intensity calculation based on wallet's risk score relative to total laundering volume
  const getNodeHeat = (node: GraphNode) => {
    const nodeVol = (node.totalInMatic || 0) + (node.totalOutMatic || 0);
    // Relative volume share compared to graph's major flows
    const volumeRatio = Math.min(1, nodeVol / (totalLaunderingVolume * 0.35 || 1));
    const riskRatio = Math.min(1, Math.max(0, (node.riskScore || 20) / 100));

    // Combined heat intensity (0 to 1) scaling with risk score and volume share
    const intensity = Math.min(1, Math.max(0.12, (riskRatio * 0.65) + (volumeRatio * 0.35)));

    const radius = node.isRoot ? 22 : 17;
    const glowRadius = radius + (intensity * 34);
    const glowOpacity = Math.min(0.85, 0.20 + (intensity * 0.60));

    let glowColor = '#58a6ff';
    if (intensity >= 0.70 || node.riskScore >= 80) {
      glowColor = '#ff7b72'; // Critical threat red
    } else if (intensity >= 0.45 || node.riskScore >= 50) {
      glowColor = '#f0883e'; // Warning amber/orange
    } else {
      glowColor = '#3fb950'; // Low risk green
    }

    return {
      intensity,
      glowRadius,
      glowOpacity,
      glowColor,
    };
  };

  return (
    <div className="relative bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden shadow-inner flex flex-col h-[520px]">
      {/* Visualizer Top Bar Controls */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Title & Filter Info */}
        <div className="bg-[#161b22]/90 backdrop-blur border border-[#30363d] px-3 py-1.5 rounded-lg flex items-center gap-2 pointer-events-auto text-xs font-mono text-[#c9d1d9]">
          <span className="w-2 h-2 rounded-full bg-[#58a6ff] animate-pulse" />
          <span>Interactive Transaction Flow Graph</span>
          {selectedNodeId && (
            <button
              onClick={() => onSelectNode(null)}
              className="ml-2 text-[11px] text-[#58a6ff] hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Zoom & Pan Controls Pod */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Heatmap Overlay Toggle Button */}
          <button
            onClick={() => setShowHeatmap((prev) => !prev)}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all flex items-center gap-1.5 shadow-md ${
              showHeatmap
                ? 'bg-[#ff7b72]/20 text-[#ff7b72] border-[#ff7b72]/50'
                : 'bg-[#161b22]/95 text-[#8b949e] border-[#30363d] hover:text-[#f0f6fc]'
            }`}
            title="Toggle visual heatmap overlay (glow scales with Risk Score relative to Laundering Volume)"
            aria-label="Toggle Heatmap"
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-[#ff7b72] animate-pulse' : 'text-[#8b949e]'}`} />
            <span>Heatmap {showHeatmap ? 'ON' : 'OFF'}</span>
          </button>

          {/* Zoom Buttons & Magnification Level */}
          <div className="bg-[#161b22]/95 backdrop-blur border border-[#30363d] p-1 rounded-lg flex items-center gap-1 shadow-md">
            <button
              onClick={zoomOut}
              className="p-1.5 hover:bg-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] rounded transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              className="text-[11px] font-mono tabular-nums text-[#c9d1d9] px-1.5 min-w-[38px] text-center select-none"
              title="Current Zoom Level"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-1.5 hover:bg-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] rounded transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-[#30363d] mx-0.5" />
            <button
              onClick={zoomToFit}
              className="p-1.5 hover:bg-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] rounded transition-colors"
              title="Fit to Screen"
              aria-label="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 hover:bg-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] rounded transition-colors"
              title="Reset View"
              aria-label="Reset View"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Graph Surface */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg className="w-full h-full block">
          <defs>
            <marker
              id="arrowhead"
              viewBox="0 0 10 10"
              refX="23"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b949e" />
            </marker>

            <marker
              id="arrowhead-suspicious"
              viewBox="0 0 10 10"
              refX="23"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff7b72" />
            </marker>

            {/* Gaussian Blur Filter for the Heatmap Glow */}
            <filter id="heatmap-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Grid Pattern */}
          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            className="transition-transform duration-75"
          >
            {/* Edges */}
            {edges.map((edge) => {
              const sourcePos = nodePositionMap.get(edge.source.toLowerCase());
              const targetPos = nodePositionMap.get(edge.target.toLowerCase());
              if (!sourcePos || !targetPos) return null;

              const isHighlighted =
                selectedNodeId &&
                (selectedNodeId.toLowerCase() === edge.source.toLowerCase() ||
                  selectedNodeId.toLowerCase() === edge.target.toLowerCase());

              const isSuspicious = edge.isSuspicious;

              const midX = (sourcePos.x + targetPos.x) / 2;
              const midY = (sourcePos.y + targetPos.y) / 2;

              return (
                <g key={edge.id} className="transition-opacity duration-200">
                  <line
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke={
                      isSuspicious
                        ? '#ff7b72'
                        : isHighlighted
                        ? '#58a6ff'
                        : '#30363d'
                    }
                    strokeWidth={isHighlighted ? 3 : isSuspicious ? 2 : 1.5}
                    strokeDasharray={edge.heuristicTag === 'MIXER_ROUTING' ? '4 2' : undefined}
                    markerEnd={isSuspicious ? 'url(#arrowhead-suspicious)' : 'url(#arrowhead)'}
                    opacity={selectedNodeId && !isHighlighted ? 0.25 : 0.85}
                  />

                  {/* Transfer Amount Label */}
                  <text
                    x={midX}
                    y={midY - 5}
                    textAnchor="middle"
                    fill={isSuspicious ? '#ffa198' : '#8b949e'}
                    className="text-[9px] font-mono tabular-nums pointer-events-none select-none"
                    opacity={selectedNodeId && !isHighlighted ? 0.2 : 0.9}
                  >
                    {edge.valueMatic >= 1000
                      ? `${(edge.valueMatic / 1000).toFixed(0)}k MATIC`
                      : `${edge.valueMatic.toFixed(0)} MATIC`}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {layoutNodes.map((node) => {
              const isSelected = selectedNodeId?.toLowerCase() === node.id.toLowerCase();
              const isHovered = hoveredNodeId === node.id;
              const isDimmed = selectedNodeId && !isSelected;

              const baseRadius = node.isRoot ? 22 : 17;
              const radius = isHovered ? baseRadius + 2.5 : baseRadius;
              const heat = getNodeHeat(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode(isSelected ? null : node.id);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer select-none"
                  opacity={isDimmed ? 0.35 : 1}
                >
                  {/* Heatmap visual glow overlay */}
                  {showHeatmap && (
                    <circle
                      r={heat.glowRadius}
                      fill={heat.glowColor}
                      opacity={heat.glowOpacity * (isDimmed ? 0.25 : 1)}
                      className="pointer-events-none transition-all duration-300"
                      style={{ filter: 'url(#heatmap-glow)' }}
                    />
                  )}

                  {/* Outer selection ring if selected */}
                  {isSelected && (
                    <>
                      <circle
                        r={baseRadius + 6}
                        fill="none"
                        stroke="#58a6ff"
                        strokeWidth="2"
                        strokeDasharray="5 3"
                        className="animate-pulse pointer-events-none"
                      />
                      <circle
                        r={baseRadius + 9}
                        fill="none"
                        stroke="#58a6ff"
                        strokeWidth="1"
                        strokeOpacity="0.4"
                        className="pointer-events-none"
                      />
                    </>
                  )}

                  {/* Core Node Circle */}
                  <circle
                    r={radius}
                    fill={getNodeFill(node.category, isSelected)}
                    stroke={getNodeStroke(node.category, isSelected)}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-150"
                  />

                  {/* Inner Icon or Category Letter */}
                  <text
                    y={3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    className="text-[10px] font-mono font-bold pointer-events-none select-none"
                  >
                    {node.isRoot
                      ? '⚡'
                      : node.category === 'PEEL_HOP'
                      ? 'HOP'
                      : node.category === 'MIXER'
                      ? 'MIX'
                      : node.category === 'EXCHANGE'
                      ? 'CEX'
                      : node.category === 'BURNER'
                      ? 'BRN'
                      : '0x'}
                  </text>

                  {/* Node Address / Alias Label Below */}
                  <text
                    y={radius + 14}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : '#c9d1d9'}
                    className={`text-[10px] font-mono pointer-events-none select-none transition-colors ${
                      isSelected ? 'font-bold' : ''
                    }`}
                  >
                    {node.alias || node.label || `${node.id.slice(0, 6)}...`}
                  </text>

                  {/* Node Balance Pill Below */}
                  <text
                    y={radius + 26}
                    textAnchor="middle"
                    fill="#8b949e"
                    className="text-[8.5px] font-mono pointer-events-none select-none"
                  >
                    {node.balanceMatic >= 1000
                      ? `${(node.balanceMatic / 1000).toFixed(0)}k MATIC`
                      : `${node.balanceMatic.toFixed(0)} MATIC`}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bottom Category Legend */}
      <div className="absolute bottom-2.5 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none bg-[#161b22]/90 backdrop-blur border border-[#30363d] px-3 py-1.5 rounded-lg text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#da3633]" />
            <span className="text-[#c9d1d9]">Exploit Root</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9e6a03]" />
            <span className="text-[#c9d1d9]">Peel Splitter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8957e5]" />
            <span className="text-[#c9d1d9]">Privacy Mixer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#bd561d]" />
            <span className="text-[#c9d1d9]">Burner Relay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#238636]" />
            <span className="text-[#c9d1d9]">CEX Gateway</span>
          </div>
        </div>

        <span className="text-[#8b949e] hidden md:inline">
          Scroll to zoom · Drag to pan · Click node to inspect
        </span>
      </div>
    </div>
  );
};
