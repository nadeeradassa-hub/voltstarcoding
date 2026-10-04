import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Radio,
  Send,
  Minimize2,
  Maximize2,
  Trash2
} from 'lucide-react';
import { CodeDiagnostic } from '../types';

interface CompilerConsoleProps {
  platform: string;
  diagnostics: CodeDiagnostic[];
  isCompiling: boolean;
  onRunCompile: () => void;
}

export const CompilerConsole: React.FC<CompilerConsoleProps> = ({
  platform,
  diagnostics,
  isCompiling,
  onRunCompile
}) => {
  const [activeTab, setActiveTab] = useState<'compiler' | 'serial' | 'diagnostics'>('compiler');
  const [serialLogs, setSerialLogs] = useState<string[]>([
    '[00:00:01.002] ⚡ VoltStar Code - Serial Console Connected (115200 baud)',
    '[00:00:01.120] [VoltStar] System Boot: Hardware peripherals initialized.',
    '[00:00:02.000] [VoltStar #1] Temp: 24.50 °C | Hum: 55.0 % | Alert: NORMAL ✓',
    '[00:00:03.000] [VoltStar #2] Temp: 24.80 °C | Hum: 54.8 % | Alert: NORMAL ✓',
    '[00:00:04.000] [VoltStar #3] Temp: 25.10 °C | Hum: 54.2 % | Alert: NORMAL ✓'
  ]);
  const [serialInput, setSerialInput] = useState('');
  const [isSerialStreaming, setIsSerialStreaming] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const serialEndRef = useRef<HTMLDivElement>(null);

  // Simulated live serial output generator
  useEffect(() => {
    if (!isSerialStreaming) return;

    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      const temp = (24 + Math.random() * 2.5).toFixed(2);
      const hum = (53 + Math.random() * 4).toFixed(1);

      setSerialLogs((prev) => {
        const next = [
          ...prev.slice(-40),
          `[${timeStr}] [VoltStar] Temp: ${temp} °C | Hum: ${hum} % | Status: OPERATIONAL ✓`
        ];
        return next;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [isSerialStreaming]);

  useEffect(() => {
    if (activeTab === 'serial') {
      serialEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serialLogs, activeTab]);

  const handleSendSerial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim()) return;

    const now = new Date().toTimeString().split(' ')[0];
    const cmd = serialInput.trim();
    setSerialLogs((prev) => [
      ...prev,
      `[${now}] > USER_COMMAND: ${cmd}`,
      `[${now}] [VoltStar ACK]: Command "${cmd}" processed.`
    ]);
    setSerialInput('');
  };

  const hasErrors = diagnostics.some((d) => d.severity === 'error');

  return (
    <div className="bg-[#090d17] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col transition-all">
      {/* Console Header Tabs */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#060911] border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('compiler')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'compiler'
                ? 'bg-[#131b29] text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Virtual Build Console</span>
          </button>

          <button
            onClick={() => setActiveTab('serial')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'serial'
                ? 'bg-[#131b29] text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Serial Monitor</span>
            {isSerialStreaming && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'diagnostics'
                ? 'bg-[#131b29] text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Diagnostics ({diagnostics.length})</span>
          </button>
        </div>

        {/* Console Action Buttons */}
        <div className="flex items-center space-x-2">
          {activeTab === 'compiler' && (
            <button
              onClick={onRunCompile}
              disabled={isCompiling}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-[11px] font-medium transition-all disabled:opacity-50"
            >
              <Play className="w-3 h-3 text-cyan-400" />
              <span>{isCompiling ? 'Building...' : 'Simulate Build'}</span>
            </button>
          )}

          {activeTab === 'serial' && (
            <>
              <button
                onClick={() => setIsSerialStreaming(!isSerialStreaming)}
                className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700"
              >
                {isSerialStreaming ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={() => setSerialLogs([])}
                className="p-1 text-slate-400 hover:text-white"
                title="Clear serial"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-500 hover:text-slate-300 text-xs"
            title={isCollapsed ? 'Expand Console' : 'Collapse Console'}
          >
            {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Console Content */}
      {!isCollapsed && (
        <div className="h-44 overflow-y-auto p-3 font-mono-code text-xs bg-[#070b13]">
          {activeTab === 'compiler' && (
            <div className="space-y-1.5 text-slate-300">
              <div className="text-slate-500 text-[11px]">
                Target: {platform} | Compiler: GNU G++ 13.2.0 (xtensa/avr-elf)
              </div>
              <div className="text-cyan-400">
                ⚡ Initializing VoltStar Embedded Toolchain...
              </div>
              <div>Compiling project files with flags: -O2 -std=gnu++20 -Wall -Wextra</div>
              <div className="text-slate-400">Linking object files: main.o wire.o hardware.o</div>

              {hasErrors ? (
                <div className="p-2 my-1 bg-rose-950/40 border border-rose-800 text-rose-300 rounded text-xs space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Build Warning: Code contains syntax issues</span>
                  </div>
                  <div>Check line diagnostics above to correct statements before flashing.</div>
                </div>
              ) : (
                <div className="p-2 my-1 bg-emerald-950/30 border border-emerald-800/60 text-emerald-300 rounded text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Virtual compilation successful! Flash verification: Passed.</span>
                </div>
              )}

              {/* Memory stats gauge */}
              <div className="grid grid-cols-2 gap-3 pt-2 mt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Program Storage (Flash):</span>
                    <span className="text-cyan-400 font-semibold">248,832 bytes (19%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: '19%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Dynamic Memory (SRAM):</span>
                    <span className="text-emerald-400 font-semibold">21,450 bytes (6.5%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '6.5%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'serial' && (
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-1 overflow-y-auto pr-1">
                {serialLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed text-[11px] ${
                      log.includes('CRITICAL') || log.includes('Error')
                        ? 'text-rose-400'
                        : log.includes('USER_COMMAND')
                        ? 'text-cyan-300 font-semibold'
                        : log.includes('VoltStar #')
                        ? 'text-emerald-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {log}
                  </div>
                ))}
                <div ref={serialEndRef} />
              </div>

              {/* Serial Sender Input */}
              <form onSubmit={handleSendSerial} className="flex items-center space-x-2 pt-2 border-t border-slate-800 mt-2">
                <input
                  type="text"
                  placeholder="Send serial command (e.g., PING, STATUS)..."
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  className="flex-1 bg-[#101726] border border-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-1.5">
              {diagnostics.length === 0 ? (
                <div className="text-emerald-400 flex items-center space-x-2 py-4 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No static analysis errors or warnings detected!</span>
                </div>
              ) : (
                diagnostics.map((diag, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border text-xs flex items-start space-x-2 ${
                      diag.severity === 'error'
                        ? 'bg-rose-950/20 border-rose-800/60 text-rose-300'
                        : 'bg-amber-950/20 border-amber-800/60 text-amber-300'
                    }`}
                  >
                    <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                      Line {diag.line}
                    </span>
                    <div className="flex-1">
                      <span>{diag.message}</span>
                      {diag.fixSuggestion && (
                        <div className="text-slate-400 text-[11px] mt-0.5 font-mono">
                          Fix: {diag.fixSuggestion}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
