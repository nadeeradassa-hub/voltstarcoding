import React from 'react';
import {
  Zap,
  Star,
  Cpu,
  Layers,
  Code2,
  MessageSquare,
  Sparkles,
  LayoutGrid,
  Download,
  Share2,
  Globe
} from 'lucide-react';
import { TargetPlatform } from '../types';

interface HeaderProps {
  platform: TargetPlatform | string;
  onPlatformChange: (p: TargetPlatform) => void;
  activeView: 'split' | 'code' | 'wiring' | 'chat';
  onViewChange: (v: 'split' | 'code' | 'wiring' | 'chat') => void;
  onOpenGenerator: () => void;
  onOpenSearchIntel: () => void;
  isGenerating: boolean;
}

const PLATFORMS: TargetPlatform[] = [
  'Arduino Uno R3',
  'Arduino Nano',
  'ESP32 DevKit V1',
  'Raspberry Pi Pico (RP2040)',
  'STM32 BluePill',
  'Modern C++20 / Robotics'
];

export const Header: React.FC<HeaderProps> = ({
  platform,
  onPlatformChange,
  activeView,
  onViewChange,
  onOpenGenerator,
  onOpenSearchIntel,
  isGenerating
}) => {
  return (
    <header className="bg-[#090d16]/95 backdrop-blur border-b border-slate-800/80 sticky top-0 z-30 px-4 py-2.5">
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Powered by VoltStar */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-amber-400 p-[1.5px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#080c14] rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400 -mr-0.5" />
              <Star className="w-2.5 h-2.5 text-cyan-300 fill-cyan-300 -ml-1 -mt-2" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-extrabold tracking-tight text-white flex items-center">
                VoltStar <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-300 ml-1">Code</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase tracking-wider">
                IDE Studio
              </span>
            </div>

            {/* Required user string: Powered by VoltStar */}
            <div className="flex items-center space-x-1.5 text-[11px] text-amber-400/90 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Powered by VoltStar</span>
            </div>
          </div>
        </div>

        {/* Center: Target Microcontroller / Platform Selector */}
        <div className="flex items-center space-x-2 bg-[#101726] border border-slate-800 rounded-lg px-2.5 py-1">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Target:</span>
          <select
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value as TargetPlatform)}
            className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-2"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p} className="bg-[#101726] text-slate-200">
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* View Layout Tabs */}
        <div className="flex items-center bg-[#0d1322] border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => onViewChange('split')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeView === 'split'
                ? 'bg-[#1a233a] text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Split Code & Wiring Diagram"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Split IDE</span>
          </button>

          <button
            onClick={() => onViewChange('code')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeView === 'code'
                ? 'bg-[#1a233a] text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Full Code Editor"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>

          <button
            onClick={() => onViewChange('wiring')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeView === 'wiring'
                ? 'bg-[#1a233a] text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Full Wiring Schematic & Pinout"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Wiring</span>
          </button>

          <button
            onClick={() => onViewChange('chat')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeView === 'chat'
                ? 'bg-[#1a233a] text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="AI Brainstorm & Chat"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Chat</span>
          </button>
        </div>

        {/* Actions: Google Search Intel & Open Generator */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenSearchIntel}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#111829] hover:bg-[#1a253e] text-blue-300 border border-blue-500/40 text-xs font-semibold transition-all shadow-sm"
            title="Search real-time Google Search data for components, pinouts, and libraries"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Google Search Intel</span>
          </button>

          <button
            onClick={onOpenGenerator}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span>{isGenerating ? 'Generating...' : 'Generate Code & Wiring'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
