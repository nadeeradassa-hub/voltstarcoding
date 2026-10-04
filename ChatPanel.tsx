import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  Lightbulb,
  ArrowRight,
  Trash2,
  Cpu,
  CornerDownLeft,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Search
} from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onGenerateFromIdea: (ideaPrompt: string) => void;
  isLoading: boolean;
  onClearChat: () => void;
  platform: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onGenerateFromIdea,
  isLoading,
  onClearChat,
  platform
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const starterBrainstormIdeas = [
    {
      title: 'L298N Dual DC Motor Driver',
      prompt: `What are the auto-assigned Arduino Uno PWM pins and direction pins for an L298N dual DC motor driver?`
    },
    {
      title: 'HC-SR04 Ultrasonic & SG90 Servo',
      prompt: `How do I connect an HC-SR04 ultrasonic distance sensor and SG90 servo to Arduino Uno with non-blocking timing?`
    },
    {
      title: 'Latest I2C OLED & BME280 Libraries',
      prompt: `What are the latest stable Arduino libraries for SSD1306 OLED and BME280 sensor, and what are their auto-assigned pins?`
    },
    {
      title: 'MPU6050 Gyro & PID Stabilizer',
      prompt: `Search current documentation for MPU6050 6-axis accelerometer/gyro on Arduino Uno and show the auto-assigned pins and wire connections.`
    }
  ];

  return (
    <div className="flex flex-col bg-[#0d121c] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl h-full min-h-[580px]">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#090d16] border-b border-slate-800/90">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Zap className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-slate-200">VoltStar AI Architect</h3>
              {/* Google Search Grounding Active Badge */}
              <span className="flex items-center space-x-1 text-[10px] px-2 py-0.5 bg-blue-950/80 text-blue-300 border border-blue-600/50 rounded-full font-semibold shadow-sm">
                <Globe className="w-3 h-3 text-blue-400" />
                <span>Google Search Grounded</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Powered by VoltStar • Target: {platform} • Auto Pin Allocation Active
            </p>
          </div>
        </div>

        <button
          onClick={onClearChat}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800/60 transition-colors"
          title="Reset conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#090d17]/60">
        {messages.length === 0 && (
          <div className="py-6 px-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mx-auto mb-3">
              <Lightbulb className="w-6 h-6 text-cyan-400" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">
              Brainstorm & Search Hardware with Live Google Search
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
              Ask about any motor, sensor, or library. VoltStar AI uses live Google Search data to find exact pinouts, up-to-date documentation, and automatically allocates pins.
            </p>

            {/* Quick Starters */}
            <div className="mt-5 grid grid-cols-1 gap-2 text-left max-w-md mx-auto">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Suggested Brainstorming Prompts:
              </span>
              {starterBrainstormIdeas.map((idea, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(idea.prompt)}
                  className="p-2.5 rounded-lg bg-[#111726] hover:bg-[#162035] border border-slate-800 hover:border-cyan-500/40 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 block">
                      {idea.title}
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      {idea.prompt}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 flex-shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'bg-[#121929] border border-slate-800 text-slate-200 shadow-md'
                }`}
              >
                {/* Search Queries Executed Badge (if any) */}
                {!isUser && msg.searchQueries && msg.searchQueries.length > 0 && (
                  <div className="mb-2 flex items-center space-x-1.5 text-[10px] text-blue-300 bg-blue-950/50 border border-blue-800/40 px-2 py-0.5 rounded-md">
                    <Search className="w-3 h-3 text-blue-400" />
                    <span>Google Search: <em>{msg.searchQueries.join(' • ')}</em></span>
                  </div>
                )}

                {/* Content with pre-formatted whitespace */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {/* Grounded Google Search Sources & Citations */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800">
                    <div className="flex items-center space-x-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      <Globe className="w-3 h-3 text-blue-400" />
                      <span>Verified Google Search Sources:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#0a0f1c] hover:bg-[#131f38] border border-slate-700/70 hover:border-cyan-500/50 text-[10px] text-cyan-300 transition-colors truncate max-w-[280px]"
                          title={src.uri}
                        >
                          <span className="truncate">{src.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Actions for Assistant message */}
                {!isUser && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* Generate Button right from this Idea */}
                    <button
                      onClick={() => onGenerateFromIdea(msg.content)}
                      className="flex items-center space-x-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-md font-bold text-[11px] transition-all shadow-sm"
                      title="Use this AI idea to generate C++ code and wiring diagram"
                    >
                      <Zap className="w-3 h-3 fill-slate-950" />
                      <span>Generate Code & Wiring</span>
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#121929] border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-400 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-blue-400 animate-spin" />
              <span>Searching Google & formulating grounded C++ code and pinouts...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#0a0e18] border-t border-slate-800">
        <div className="relative flex items-end bg-[#131b2c] border border-slate-800 focus-within:border-cyan-500/60 rounded-xl p-2 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask VoltStar AI about ${platform} motors, sensors, libraries, or pinouts (Google Search grounded)...`}
            rows={2}
            className="flex-1 bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none px-2 py-1 leading-relaxed"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-40 disabled:hover:from-cyan-500 disabled:hover:to-blue-600 transition-all ml-1.5 flex-shrink-0"
            title="Send (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
          <span className="flex items-center space-x-1">
            <Globe className="w-3 h-3 text-blue-400" />
            <span>Search Grounding Active (gemini-3.5-flash)</span>
          </span>
          <span className="text-amber-400/80 font-medium">Powered by VoltStar</span>
        </div>
      </form>
    </div>
  );
};

