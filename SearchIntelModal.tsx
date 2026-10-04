import React, { useState } from 'react';
import {
  Globe,
  Search,
  ExternalLink,
  Cpu,
  Zap,
  BookOpen,
  Code2,
  Copy,
  Check,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { GroundingSource } from '../types';

interface SearchIntelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCodeSnippet: (code: string) => void;
  platform: string;
}

interface IntelResult {
  query: string;
  summary: string;
  sources: GroundingSource[];
  searchQueries?: string[];
}

export const SearchIntelModal: React.FC<SearchIntelModalProps> = ({
  isOpen,
  onClose,
  onInsertCodeSnippet,
  platform
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IntelResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (searchTarget: string) => {
    if (!searchTarget.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/search-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTarget.trim(), platform })
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Error fetching search intel:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const popularComponents = [
    'MPU6050 6-Axis Gyro & Accel',
    'L298N Dual H-Bridge Motor Driver',
    'HC-SR04 Ultrasonic Distance Sensor',
    'SSD1306 0.96" I2C OLED Display',
    'BME280 Temperature & Humidity Sensor',
    'VL53L1X Time-of-Flight Laser Sensor',
    'SG90 9g Micro Servo Motor',
    'MAX6675 Thermocouple Sensor'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-[#0e1422] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#090d17] border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-blue-500/20">
              <Globe className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Google Search Hardware & Library Intel</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                  gemini-3.5-flash
                </span>
              </div>
              <p className="text-xs text-amber-400 font-medium">Powered by VoltStar • Real-Time Grounding</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-slate-800/80 bg-[#0c1220]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="flex items-center bg-[#131b2c] border border-slate-800 focus-within:border-blue-500/70 rounded-xl px-3 py-2 transition-colors"
          >
            <Search className="w-4 h-4 text-blue-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any sensor, motor driver, or IC (e.g. MPU6050, VL53L1X, TMC2209, MAX6675)..."
              className="w-full bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="ml-2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5 flex-shrink-0 disabled:opacity-40"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Searching...' : 'Google Search'}</span>
            </button>
          </form>

          {/* Quick pills */}
          <div className="mt-3 flex items-center space-x-1.5 flex-wrap gap-y-1.5 text-[11px]">
            <span className="text-slate-400 mr-1 text-[10px] font-semibold uppercase">Popular:</span>
            {popularComponents.map((comp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(comp);
                  handleSearch(comp);
                }}
                className="px-2 py-0.5 bg-[#121929] hover:bg-[#1a253e] text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-blue-500/40 rounded-md transition-all text-[11px]"
              >
                {comp.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <Globe className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-medium">
                Searching Google for technical datasheets, pinouts, and latest Arduino libraries...
              </p>
            </div>
          )}

          {!isLoading && result && (
            <div className="space-y-4">
              {/* Search queries executed */}
              {result.searchQueries && result.searchQueries.length > 0 && (
                <div className="flex items-center space-x-2 text-xs text-blue-300 bg-blue-950/40 border border-blue-800/40 px-3 py-1.5 rounded-lg">
                  <Search className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>
                    Google Search: <strong>{result.searchQueries.join(' • ')}</strong>
                  </span>
                </div>
              )}

              {/* Main Grounded Summary Text */}
              <div className="p-4 bg-[#111728] border border-slate-800 rounded-xl text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                {result.summary}
              </div>

              {/* Verified Sources & Documentation Links */}
              {result.sources && result.sources.length > 0 && (
                <div className="p-4 bg-[#0a0f1c] border border-slate-800 rounded-xl">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span>Verified Web Sources & Official Documentation ({result.sources.length}):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-lg bg-[#111829] hover:bg-[#18233a] border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between text-xs text-cyan-300 transition-all group"
                      >
                        <span className="truncate pr-2">{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && !result && (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
              <p>Type any sensor or motor above to look up pinouts, libraries, and datasheets grounded in Google Search.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#090d16] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Target: {platform} (Auto-Assigned Pins)</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
