import React, { useState } from 'react';
import {
  Zap,
  Sparkles,
  X,
  Cpu,
  Layers,
  CheckCircle2,
  Code2,
  Wand2,
  HelpCircle
} from 'lucide-react';
import { TargetPlatform } from '../types';
import { QUICK_STARTER_IDEAS } from '../utils/defaultProjects';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, platform: TargetPlatform, projectType: string) => void;
  isGenerating: boolean;
  currentPlatform: TargetPlatform;
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  currentPlatform
}) => {
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState<TargetPlatform>(currentPlatform || 'Arduino Uno R3');
  const [projectType, setProjectType] = useState('Motors & Sensors (Arduino Uno)');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), platform, projectType);
  };

  const handleSelectStarter = (starter: typeof QUICK_STARTER_IDEAS[0]) => {
    setPrompt(starter.prompt);
    setPlatform(starter.platform as TargetPlatform);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#0e1422] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#090d17] border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Zap className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>VoltStar AI Generator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                  Arduino Uno & C++
                </span>
              </h2>
              <p className="text-xs text-amber-400/90 font-medium">Powered by VoltStar</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Microcontroller & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Target Board / Platform</span>
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as TargetPlatform)}
                className="w-full bg-[#131b2c] border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:border-cyan-500 focus:outline-none"
              >
                <option value="Arduino Uno R3">Arduino Uno R3 (Primary Flagship)</option>
                <option value="Arduino Nano">Arduino Nano (ATmega328P)</option>
                <option value="ESP32 DevKit V1">ESP32 DevKit V1 (WiFi + BLE)</option>
                <option value="Raspberry Pi Pico (RP2040)">Raspberry Pi Pico (RP2040 Dual ARM)</option>
                <option value="STM32 BluePill">STM32 BluePill (Cortex-M3)</option>
                <option value="Modern C++20 / Robotics">Modern C++20 / Robotics Algorithm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Project Architecture Domain</span>
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full bg-[#131b2c] border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:border-cyan-500 focus:outline-none"
              >
                <option value="Motors & Sensors (Arduino Uno)">Motors & Sensors (PWM, Servo, Ultrasonic)</option>
                <option value="Robotics & Motion Control">Robotics & Autonomous Navigation</option>
                <option value="Industrial & Automation">Industrial Relay & Sensor Automation</option>
                <option value="Embedded & IoT">Environmental & Telemetry Monitoring</option>
                <option value="High-Performance Modern C++">Modern C++ Embedded Control</option>
              </select>
            </div>
          </div>

          {/* Automatic Pin Allocation Guarantee Callout */}
          <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-start space-x-2.5 text-xs text-amber-200">
            <Zap className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Automatic Hardware Pin Allocation:</strong>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                VoltStar AI automatically determines and wires the exact Arduino Uno pins for any motor, sensor, or display you mention. You never have to manually pick or guess pins!
              </p>
            </div>
          </div>

          {/* Prompt Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Describe what motor, sensor, or circuit you want the AI to create:
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Build an autonomous obstacle-avoiding rover with HC-SR04 ultrasonic distance sensor, L298N dual DC motor driver, SG90 pan servo, and alert buzzer on Arduino Uno..."
              className="w-full bg-[#131b2c] border border-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-xl p-3 focus:border-cyan-500 focus:outline-none leading-relaxed resize-none"
            />
          </div>

          {/* Quick Starter Inspiration Pills */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Or pick an instant project starter:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_STARTER_IDEAS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectStarter(item)}
                  className="p-2.5 rounded-lg bg-[#111726] hover:bg-[#18233a] border border-slate-800 hover:border-cyan-500/50 text-left transition-all text-xs"
                >
                  <span className="font-semibold text-cyan-300 block truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {item.tag} • {item.platform}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Generates C++ Code + Interactive Wiring Schematic</span>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center space-x-2"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>{isGenerating ? 'Generating System...' : 'Generate Code & Wiring Diagram'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
