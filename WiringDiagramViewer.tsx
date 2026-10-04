import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Monitor,
  Thermometer,
  Volume2,
  Lightbulb,
  Radio,
  Zap,
  Activity,
  Layers,
  Table,
  CheckSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { WiringDiagramSpec, PinTableRow, BomItem } from '../types';

interface WiringDiagramViewerProps {
  spec: WiringDiagramSpec;
  pinTable: PinTableRow[];
  bom: BomItem[];
  potentialIssues: string[];
  platform: string;
}

export const WiringDiagramViewer: React.FC<WiringDiagramViewerProps> = ({
  spec,
  pinTable,
  bom,
  potentialIssues,
  platform
}) => {
  const [activeTab, setActiveTab] = useState<'schematic' | 'pinTable' | 'bom' | 'safety'>('schematic');
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [animateCurrent, setAnimateCurrent] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Helper icon getter
  const getComponentIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'monitor':
        return <Monitor className="w-4 h-4 text-cyan-400" />;
      case 'thermometer':
        return <Thermometer className="w-4 h-4 text-emerald-400" />;
      case 'volume-2':
        return <Volume2 className="w-4 h-4 text-amber-400" />;
      case 'lightbulb':
        return <Lightbulb className="w-4 h-4 text-yellow-300" />;
      case 'radio':
        return <Radio className="w-4 h-4 text-purple-400" />;
      case 'activity':
        return <Activity className="w-4 h-4 text-rose-400" />;
      default:
        return <Cpu className="w-4 h-4 text-blue-400" />;
    }
  };

  // Dimensions & board layout coordinates
  const canvasWidth = 880;
  const canvasHeight = Math.max(620, (spec.components?.length || 4) * 145 + 100);

  const boardWidth = 230;
  const boardHeight = Math.max(460, (spec.board?.pins?.length || 14) * 22 + 120);
  const boardX = 50;
  const boardY = 40;

  // Compute coordinate of each board pin
  const boardPinCoords = useMemo(() => {
    const coords: Record<string, { x: number; y: number }> = {};
    const pins = spec.board?.pins || [];
    const pinSpacing = (boardHeight - 80) / Math.max(pins.length, 1);

    pins.forEach((pin, index) => {
      coords[pin] = {
        x: boardX + boardWidth,
        y: boardY + 50 + index * pinSpacing
      };
    });
    return coords;
  }, [spec.board, boardWidth, boardHeight, boardX, boardY]);

  // Compute coordinate of each component's pins
  const componentPinCoords = useMemo(() => {
    const coords: Record<string, Record<string, { x: number; y: number }>> = {};
    (spec.components || []).forEach((comp, cIdx) => {
      const compX = comp.x || 540;
      const compY = comp.y || 40 + cIdx * 140;
      coords[comp.id] = {};

      const pinHeaderTop = comp.assignedPin ? 62 : 45;
      const pinSpacing = 22;
      (comp.pins || []).forEach((pName, pIdx) => {
        coords[comp.id][pName] = {
          x: compX,
          y: compY + pinHeaderTop + pIdx * pinSpacing
        };
      });
    });
    return coords;
  }, [spec.components]);

  // Generate smooth cubic bezier SVG path between board pin and component pin
  const generateWirePath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const dx = Math.abs(end.x - start.x) * 0.55;
    return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
  };

  return (
    <div className="flex flex-col bg-[#0d121c] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl h-full min-h-[580px]">
      {/* Viewer Header Navigation */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#090d16] border-b border-slate-800/90 gap-2">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('schematic')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'schematic'
                ? 'bg-[#151d2d] text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive Schematic</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 text-cyan-300 rounded border border-cyan-800/50">
              {spec.connections?.length || 0} Nets
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pinTable')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'pinTable'
                ? 'bg-[#151d2d] text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pinout Table</span>
          </button>

          <button
            onClick={() => setActiveTab('bom')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'bom'
                ? 'bg-[#151d2d] text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>BOM & Parts ({bom?.length || 0})</span>
          </button>

          {potentialIssues?.length > 0 && (
            <button
              onClick={() => setActiveTab('safety')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'safety'
                  ? 'bg-[#151d2d] text-rose-400 border border-rose-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Hardware Safety ({potentialIssues.length})</span>
            </button>
          )}
        </div>

        {/* View Controls */}
        <div className="flex items-center space-x-2 text-xs">
          {activeTab === 'schematic' && (
            <>
              {/* Electric pulse toggle */}
              <button
                onClick={() => setAnimateCurrent(!animateCurrent)}
                className={`flex items-center space-x-1.5 px-2 py-1 rounded border text-[11px] font-medium transition-all ${
                  animateCurrent
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700'
                }`}
                title="Toggle animated current flow pulses"
              >
                <Zap className={`w-3 h-3 ${animateCurrent ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                <span>{animateCurrent ? 'Live Wires' : 'Static Wires'}</span>
              </button>

              {/* Zoom controls */}
              <div className="flex items-center border border-slate-800 rounded bg-[#111827] px-1 py-0.5">
                <button
                  onClick={() => setZoomLevel(Math.max(0.7, zoomLevel - 0.1))}
                  className="px-1.5 text-slate-400 hover:text-white"
                  title="Zoom out"
                >
                  -
                </button>
                <span className="text-[10px] text-slate-400 font-mono px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(1.4, zoomLevel + 0.1))}
                  className="px-1.5 text-slate-400 hover:text-white"
                  title="Zoom in"
                >
                  +
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auto-Assigned Pin Quick Header Banner */}
      <div className="px-3.5 py-1.5 bg-[#090d18] border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>Auto-Assigned Pins:</span>
          </span>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            VoltStar auto-allocates every motor & sensor pin without manual selection
          </span>
        </div>

        <div className="flex items-center space-x-1.5 flex-wrap">
          {(spec.components || []).map((comp) =>
            comp.assignedPin ? (
              <span
                key={comp.id}
                className="text-[10px] font-mono bg-cyan-950/80 border border-cyan-800/70 text-cyan-300 px-2 py-0.5 rounded-md flex items-center space-x-1"
              >
                <strong className="text-slate-200">{comp.name.split(' ')[0]}:</strong>
                <span className="text-amber-400 font-bold">{comp.assignedPin}</span>
              </span>
            ) : null
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="relative flex-1 overflow-auto bg-[#070b14] bg-schematic-grid">
        {activeTab === 'schematic' && (
          <div
            className="p-6 transition-transform origin-top-left"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Interactive SVG Diagram */}
            <svg
              width={canvasWidth}
              height={canvasHeight}
              className="overflow-visible select-none"
              style={{ minWidth: `${canvasWidth}px` }}
            >
              <defs>
                {/* Glow Filter for Hovered Wires */}
                <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Connections (Wires) Layer */}
              <g className="wires-group">
                {(spec.connections || []).map((conn, idx) => {
                  const start = boardPinCoords[conn.fromPin];
                  const compPins = componentPinCoords[conn.toComponentId];
                  const end = compPins ? compPins[conn.toPin] : null;

                  if (!start || !end) return null;

                  const isHovered =
                    hoveredPin === conn.fromPin ||
                    hoveredComponentId === conn.toComponentId;

                  const pathD = generateWirePath(start, end);

                  return (
                    <g
                      key={`wire-${idx}`}
                      className="cursor-pointer group"
                      onMouseEnter={() => {
                        setHoveredPin(conn.fromPin);
                        setHoveredComponentId(conn.toComponentId);
                      }}
                      onMouseLeave={() => {
                        setHoveredPin(null);
                        setHoveredComponentId(null);
                      }}
                    >
                      {/* Thicker transparent hit area for easy hover */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="14"
                      />

                      {/* Main Solid Wire Core */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={conn.color || '#3b82f6'}
                        strokeWidth={isHovered ? '4' : '2.5'}
                        strokeLinecap="round"
                        className="transition-all duration-200"
                        filter={isHovered ? 'url(#wire-glow)' : undefined}
                        opacity={isHovered ? 1 : 0.85}
                      />

                      {/* Animated Current Pulse Overlay */}
                      {animateCurrent && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={isHovered ? '2.5' : '1.8'}
                          strokeLinecap="round"
                          className="animate-wire-current pointer-events-none"
                          opacity={isHovered ? 0.95 : 0.45}
                        />
                      )}

                      {/* Wire Label Pill */}
                      {isHovered && conn.label && (
                        <foreignObject
                          x={(start.x + end.x) / 2 - 60}
                          y={(start.y + end.y) / 2 - 14}
                          width="120"
                          height="28"
                          className="pointer-events-none"
                        >
                          <div className="bg-slate-900/95 border border-cyan-500/70 text-cyan-200 text-[10px] px-2 py-0.5 rounded-full text-center shadow-lg font-mono">
                            {conn.label}
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Arduino Uno Microcontroller Board (Left Side) */}
              <g
                transform={`translate(${boardX}, ${boardY})`}
                className="microcontroller-board"
              >
                {/* Arduino Uno Authentic Teal/Blue PCB Body */}
                <rect
                  width={boardWidth}
                  height={boardHeight}
                  rx="12"
                  className="fill-[#006f75] stroke-[#00a2aa]"
                  strokeWidth="2.5"
                  filter="drop-shadow(0 12px 28px rgba(0,0,0,0.65))"
                />

                {/* Silver USB Type-B Port on Top-Left */}
                <rect
                  x="-12"
                  y="18"
                  width="28"
                  height="34"
                  rx="3"
                  className="fill-[#94a3b8] stroke-[#cbd5e1]"
                  strokeWidth="1.5"
                />
                <rect
                  x="-16"
                  y="26"
                  width="6"
                  height="18"
                  className="fill-[#475569]"
                />

                {/* Black DC Barrel Power Jack on Bottom-Left */}
                <rect
                  x="-14"
                  y={boardHeight - 65}
                  width="26"
                  height="38"
                  rx="4"
                  className="fill-[#0f172a] stroke-[#334155]"
                  strokeWidth="1.5"
                />
                <circle
                  cx="-2"
                  cy={boardHeight - 46}
                  r="5"
                  className="fill-[#1e293b]"
                />

                {/* Board Top Header Strip */}
                <rect
                  x="14"
                  y="12"
                  width={boardWidth - 28}
                  height="30"
                  rx="6"
                  className="fill-[#004e53] stroke-[#008187]"
                />
                <text
                  x={boardWidth / 2}
                  y="32"
                  textAnchor="middle"
                  className="fill-cyan-200 font-extrabold text-[13px] tracking-wide"
                >
                  ⚡ {spec.board?.name || 'Arduino Uno R3'}
                </text>

                {/* Subtitle / Powered by VoltStar */}
                <text
                  x={boardWidth / 2}
                  y="52"
                  textAnchor="middle"
                  className="fill-amber-300 font-mono text-[9px] font-bold uppercase tracking-wider"
                >
                  Powered by VoltStar
                </text>

                {/* ATmega328P DIP-28 Microcontroller Chip in Center */}
                <g transform={`translate(24, ${boardHeight / 2 - 65})`}>
                  {/* DIP socket */}
                  <rect
                    width={boardWidth - 76}
                    height="125"
                    rx="5"
                    className="fill-[#090d16] stroke-[#334155]"
                    strokeWidth="1.5"
                  />
                  {/* Notch on top */}
                  <path
                    d={`M ${(boardWidth - 76) / 2 - 8} 0 A 8 8 0 0 0 ${(boardWidth - 76) / 2 + 8} 0 Z`}
                    className="fill-[#1e293b]"
                  />
                  {/* IC Silver pins on left and right */}
                  {[...Array(7)].map((_, i) => (
                    <g key={i}>
                      <rect x="-4" y={15 + i * 15} width="4" height="6" className="fill-[#cbd5e1]" />
                      <rect x={boardWidth - 76} y={15 + i * 15} width="4" height="6" className="fill-[#cbd5e1]" />
                    </g>
                  ))}
                  <text
                    x={(boardWidth - 76) / 2}
                    y="60"
                    textAnchor="middle"
                    className="fill-slate-300 font-mono text-[10px] font-bold"
                  >
                    ATmega328P
                  </text>
                  <text
                    x={(boardWidth - 76) / 2}
                    y="76"
                    textAnchor="middle"
                    className="fill-amber-400 font-mono text-[9px] font-semibold"
                  >
                    16 MHz Crystal
                  </text>
                  <text
                    x={(boardWidth - 76) / 2}
                    y="92"
                    textAnchor="middle"
                    className="fill-cyan-300 font-mono text-[8px]"
                  >
                    VoltStar Firmware
                  </text>
                </g>

                {/* Arduino Uno Pin Headers along the right edge */}
                {(spec.board?.pins || []).map((pinName, pIdx) => {
                  const pinSpacing = (boardHeight - 80) / Math.max(spec.board.pins.length, 1);
                  const pinY = 50 + pIdx * pinSpacing;
                  const isHovered = hoveredPin === pinName;

                  const isPower = pinName.includes('5V') || pinName.includes('3.3V') || pinName.includes('VIN');
                  const isGnd = pinName.includes('GND');
                  const isI2C = pinName.includes('SDA') || pinName.includes('SCL');
                  const isPWM = pinName.includes('~');

                  return (
                    <g
                      key={`b-pin-${pIdx}`}
                      transform={`translate(${boardWidth}, ${pinY})`}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredPin(pinName)}
                      onMouseLeave={() => setHoveredPin(null)}
                    >
                      {/* Metallic female pin header receptacle */}
                      <rect
                        x="-12"
                        y="-8"
                        width="12"
                        height="16"
                        rx="2"
                        className={`transition-colors ${
                          isHovered
                            ? 'fill-amber-400 stroke-white'
                            : 'fill-[#090d16] stroke-slate-700'
                        }`}
                        strokeWidth="1.2"
                      />

                      {/* Small circular contact terminal */}
                      <circle
                        cx="0"
                        cy="0"
                        r={isHovered ? '5' : '3.5'}
                        className={`transition-all ${
                          isHovered
                            ? 'fill-amber-300 stroke-amber-100'
                            : isPower
                            ? 'fill-rose-500'
                            : isGnd
                            ? 'fill-slate-400'
                            : isPWM
                            ? 'fill-amber-400'
                            : isI2C
                            ? 'fill-emerald-400'
                            : 'fill-cyan-400'
                        }`}
                        strokeWidth="1.5"
                      />

                      {/* Pin Label text inside the board */}
                      <text
                        x="-18"
                        y="4"
                        textAnchor="end"
                        className={`text-[11px] font-mono transition-colors ${
                          isHovered
                            ? 'fill-amber-300 font-bold'
                            : isPower
                            ? 'fill-rose-300 font-semibold'
                            : isGnd
                            ? 'fill-slate-300'
                            : isPWM
                            ? 'fill-amber-300 font-semibold'
                            : isI2C
                            ? 'fill-emerald-300 font-semibold'
                            : 'fill-white'
                        }`}
                      >
                        {pinName}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Peripheral Components: Motors, Sensors, Buzzers, Displays (Right Side) */}
              <g className="peripheral-components">
                {(spec.components || []).map((comp, cIdx) => {
                  const compX = comp.x || 540;
                  const compY = comp.y || 40 + cIdx * 140;
                  const compWidth = 260;
                  const compHeight = Math.max(
                    110,
                    65 + (comp.pins?.length || 2) * 22
                  );
                  const isHovered = hoveredComponentId === comp.id;

                  return (
                    <g
                      key={`comp-${comp.id}`}
                      transform={`translate(${compX}, ${compY})`}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredComponentId(comp.id)}
                      onMouseLeave={() => setHoveredComponentId(null)}
                    >
                      {/* Component Card Background */}
                      <rect
                        width={compWidth}
                        height={compHeight}
                        rx="9"
                        className={`transition-all duration-200 ${
                          isHovered
                            ? 'fill-[#18263f] stroke-cyan-400 shadow-xl'
                            : 'fill-[#101726] stroke-slate-800'
                        }`}
                        strokeWidth={isHovered ? '2' : '1.2'}
                        filter="drop-shadow(0 6px 16px rgba(0,0,0,0.5))"
                      />

                      {/* Header bar */}
                      <rect
                        x="0"
                        y="0"
                        width={compWidth}
                        height="32"
                        rx="9"
                        className="fill-[#0c1322]"
                      />

                      {/* Title & Icon */}
                      <foreignObject x="10" y="5" width="240" height="24">
                        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 truncate">
                          {getComponentIcon(comp.icon)}
                          <span className="truncate">{comp.name}</span>
                        </div>
                      </foreignObject>

                      {/* Prominent Auto-Assigned Pin Badge */}
                      {comp.assignedPin && (
                        <foreignObject x="10" y="34" width="240" height="22">
                          <div className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300 font-bold truncate">
                            <Zap className="w-3 h-3 fill-amber-300 text-amber-300 flex-shrink-0" />
                            <span className="truncate">Auto Pin: {comp.assignedPin}</span>
                          </div>
                        </foreignObject>
                      )}

                      {/* Component Pins on the left edge */}
                      {(comp.pins || []).map((pName, pIdx) => {
                        const pinHeaderTop = comp.assignedPin ? 62 : 45;
                        const pinY = pinHeaderTop + pIdx * 22;
                        const isPower = pName.includes('V') || pName.includes('3V') || pName.includes('+');
                        const isGnd = pName.includes('GND') || pName.includes('-');

                        return (
                          <g key={`cp-${pIdx}`} transform={`translate(0, ${pinY})`}>
                            {/* Pin terminal dot */}
                            <circle
                              cx="0"
                              cy="0"
                              r="4"
                              className={
                                isPower
                                  ? 'fill-rose-500'
                                  : isGnd
                                  ? 'fill-slate-400'
                                  : 'fill-cyan-400'
                              }
                            />

                            {/* Pin label inside the card */}
                            <text
                              x="12"
                              y="4"
                              textAnchor="start"
                              className="fill-slate-300 font-mono text-[11px]"
                            >
                              {pName}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}

        {/* Tab 2: Pinout Connection Matrix Table */}
        {activeTab === 'pinTable' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Hardware Pin Assignment Matrix</h3>
                <p className="text-xs text-slate-400">
                  Direct connection guide between {spec.board?.name || platform} and connected modules.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-md">
                Powered by VoltStar
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090d16] text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Board Pin</th>
                    <th className="py-2.5 px-3">Target Component</th>
                    <th className="py-2.5 px-3">Component Pin</th>
                    <th className="py-2.5 px-3">Wire Color</th>
                    <th className="py-2.5 px-3">Signal Type</th>
                    <th className="py-2.5 px-3">Engineering Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {pinTable.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-amber-400">
                        {row.boardPin}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-200">
                        {row.component}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {row.componentPin}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: row.wireColor }}
                          />
                          <span className="text-[10px] text-slate-300">{row.wireColor}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            row.signalType.includes('POWER')
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                              : row.signalType.includes('GROUND')
                              ? 'bg-slate-900 text-slate-400 border border-slate-700'
                              : row.signalType.includes('PWM')
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                              : row.signalType.includes('I2C')
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                          }`}
                        >
                          {row.signalType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                        {row.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Bill of Materials (BOM) */}
        {activeTab === 'bom' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Hardware Bill of Materials (BOM)</h3>
                <p className="text-xs text-slate-400">
                  Required parts and procurement specifications for this build.
                </p>
              </div>
              <span className="text-xs text-slate-400">Total Items: {bom.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bom.map((item, bIdx) => (
                <div
                  key={bIdx}
                  className="p-3.5 bg-[#111726] border border-slate-800/90 rounded-lg hover:border-slate-700 transition-colors flex items-start space-x-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 flex-shrink-0 font-bold text-xs">
                    {item.quantity}x
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-200 truncate">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-cyan-400 font-mono mt-0.5">
                      Spec: {item.spec}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Role: {item.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Hardware Safety & Gotchas */}
        {activeTab === 'safety' && (
          <div className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-rose-300 flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-rose-400" />
                <span>Critical Hardware & Electrical Gotchas</span>
              </h3>
              <p className="text-xs text-slate-400">
                Electrical considerations, logic level voltage boundaries, and circuit protection.
              </p>
            </div>

            <div className="space-y-3">
              {potentialIssues.map((issue, iIdx) => (
                <div
                  key={iIdx}
                  className="p-3.5 bg-rose-950/20 border border-rose-900/60 rounded-lg text-xs text-rose-200 flex items-start space-x-2.5"
                >
                  <Info className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{issue}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#080c14] border-t border-slate-800/80 text-[11px] text-slate-400">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Automatic Pin Allocation Engine Active</span>
        </span>
        <span className="font-medium text-slate-300">
          Powered by VoltStar
        </span>
      </div>
    </div>
  );
};
