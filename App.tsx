import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { CodeEditor } from './components/CodeEditor';
import { WiringDiagramViewer } from './components/WiringDiagramViewer';
import { ChatPanel } from './components/ChatPanel';
import { CompilerConsole } from './components/CompilerConsole';
import { GeneratorModal } from './components/GeneratorModal';
import { SearchIntelModal } from './components/SearchIntelModal';
import { ProjectData, TargetPlatform, CodeDiagnostic, ChatMessage } from './types';
import { DEFAULT_ARDUINO_UNO_PROJECT } from './utils/defaultProjects';
import {
  Zap,
  Sparkles,
  Layers,
  Code2,
  Cpu,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Globe
} from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<ProjectData>(DEFAULT_ARDUINO_UNO_PROJECT);
  const [code, setCode] = useState<string>(DEFAULT_ARDUINO_UNO_PROJECT.code);
  const [platform, setPlatform] = useState<TargetPlatform>('Arduino Uno R3');
  const [activeView, setActiveView] = useState<'split' | 'code' | 'wiring' | 'chat'>('split');
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isSearchIntelOpen, setIsSearchIntelOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [diagnostics, setDiagnostics] = useState<CodeDiagnostic[]>([]);
  const [quickPromptInput, setQuickPromptInput] = useState('');

  // Chat conversation state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `⚡ **Welcome to VoltStar Code!** (Powered by VoltStar)\n\nI am your Arduino Uno systems engineer, grounded with **live Google Search data** for up-to-date documentation, libraries, and datasheets.\n\nAll motor & sensor pins are **automatically allocated** for you:\n- **DC Motors (L298N)**: Auto-assigned to Timer 0 PWM Pin D5 (Speed) & D7, D8 (Direction).\n- **Servo Motors (SG90)**: Auto-assigned to Timer 1 PWM Pin D9.\n- **Ultrasonic Sensors (HC-SR04)**: Auto-assigned to Pin D11 (Trig) & D12 (Echo).\n- **Analog Sensors**: Auto-assigned to Pin A0.\n- **Buzzers & LEDs**: Auto-assigned to Pins D4 & D13.\n\nAsk questions with live Google citations, or click **"Generate Code & Wiring"** to build!`,
      sources: [
        { title: 'Arduino Uno R3 Official Documentation', uri: 'https://docs.arduino.cc/hardware/uno-rev3/' },
        { title: 'Arduino Language Reference', uri: 'https://www.arduino.cc/reference/en/' }
      ],
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  // Fast client-side syntax verification for instant real-time error detection
  const performClientLint = useCallback((sourceCode: string): CodeDiagnostic[] => {
    const diags: CodeDiagnostic[] = [];
    const lines = sourceCode.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Check missing semicolon on statements
      if (
        trimmed.length > 0 &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*') &&
        !trimmed.endsWith('{') &&
        !trimmed.endsWith('}') &&
        !trimmed.endsWith(';') &&
        !trimmed.endsWith(':') &&
        !trimmed.endsWith('\\') &&
        (trimmed.includes('=') ||
          trimmed.includes('return ') ||
          trimmed.includes('pinMode(') ||
          trimmed.includes('digitalWrite(') ||
          trimmed.includes('Serial.print'))
      ) {
        diags.push({
          line: lineNum,
          severity: 'error',
          message: 'Expected ";" at the end of statement',
          fixSuggestion: `${trimmed};`
        });
      }

      // Check blocking delay()
      if (trimmed.includes('delay(') && !trimmed.startsWith('//')) {
        diags.push({
          line: lineNum,
          severity: 'warning',
          message: 'Blocking delay() call detected. Recommended: use millis() non-blocking timer.',
          fixSuggestion: '// Non-blocking timer replacement recommended'
        });
      }
    });

    return diags;
  }, []);

  // Run client linting automatically when code changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const clientDiags = performClientLint(code);
      setDiagnostics((prev) => {
        // Keep deep server diagnostics if lines match, otherwise update with instant client checks
        if (clientDiags.length > 0) return clientDiags;
        return prev.filter((d) => d.severity === 'info');
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [code, performClientLint]);

  // Handler: Generate C++ Code & Wire Diagram
  const handleGenerate = async (
    promptText: string,
    targetPlatform: TargetPlatform,
    projectType: string = 'Embedded & IoT'
  ) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          platform: targetPlatform,
          projectType
        })
      });

      if (!res.ok) {
        throw new Error(`Generation failed: ${res.statusText}`);
      }

      const data: ProjectData = await res.json();
      setProject(data);
      setCode(data.code);
      setPlatform(data.targetPlatform as TargetPlatform);

      // Perform instant diagnostics on new code
      const instantDiags = performClientLint(data.code);
      setDiagnostics(instantDiags);

      // Add notification to chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: `gen-${Date.now()}`,
          role: 'assistant',
          content: `⚡ **Generated C++ Project & Wiring Diagram!**\n\n**Title:** ${data.projectTitle}\n**Platform:** ${data.targetPlatform}\n\n${data.summary}\n\n*Code and interactive schematic are loaded into the IDE.*`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      setIsGeneratorModalOpen(false);
      setQuickPromptInput('');
    } catch (err) {
      console.error('Error generating project:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Chat with VoltStar AI with Google Search Grounding
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map((m) => ({
            role: m.role,
            content: m.content
          })),
          currentCode: code,
          platform
        })
      });

      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          sources: data.sources,
          searchQueries: data.searchQueries,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } catch (err) {
      console.error('Error in chat:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚡ **VoltStar Code Assistant**\n\nI can help you build this project! Click **"Generate Code & Wiring"** above, or refine your idea here.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handler: Generate directly from an assistant chat idea
  const handleGenerateFromIdea = (ideaText: string) => {
    const cleanPrompt = ideaText
      .replace(/[*#]/g, '')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .slice(0, 3)
      .join(' ');

    handleGenerate(cleanPrompt || ideaText, platform);
  };

  // Handler: Run Deep Static Linter via Gemini
  const handleRunLinter = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, platform })
      });

      if (!res.ok) throw new Error('Static analysis failed');
      const data = await res.json();

      if (data.diagnostics) {
        setDiagnostics(data.diagnostics);
      }
    } catch (err) {
      console.error('Error running linter:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler: Virtual Compile
  const handleRunCompile = () => {
    setIsCompiling(true);
    setTimeout(() => {
      setIsCompiling(false);
    }, 1200);
  };

  const handleApplyFix = (fixedCode: string) => {
    setCode(fixedCode);
    setDiagnostics(performClientLint(fixedCode));
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Main Navigation Header */}
      <Header
        platform={platform}
        onPlatformChange={(newP) => setPlatform(newP)}
        activeView={activeView}
        onViewChange={(v) => setActiveView(v)}
        onOpenGenerator={() => setIsGeneratorModalOpen(true)}
        onOpenSearchIntel={() => setIsSearchIntelOpen(true)}
        isGenerating={isGenerating}
      />

      {/* Quick Prompt & Generation Bar */}
      <div className="bg-[#0b101d] border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quick input bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (quickPromptInput.trim()) {
                handleGenerate(quickPromptInput.trim(), platform);
              }
            }}
            className="w-full sm:flex-1 flex items-center bg-[#111728] border border-slate-800 focus-within:border-cyan-500/60 rounded-xl px-3 py-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-400 mr-2 flex-shrink-0 animate-pulse" />
            <input
              type="text"
              value={quickPromptInput}
              onChange={(e) => setQuickPromptInput(e.target.value)}
              placeholder={`Describe your Arduino Uno motors & sensors (e.g. "DC motor rover with L298N driver, SG90 servo, HC-SR04 ultrasonic distance sensor, and buzzer on Arduino Uno")...`}
              className="w-full bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!quickPromptInput.trim() || isGenerating}
              className="ml-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5 flex-shrink-0 disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>{isGenerating ? 'Generating...' : 'Generate Code & Wiring'}</span>
            </button>
          </form>

          {/* Search Intel & current project info */}
          <div className="hidden lg:flex items-center space-x-3 text-xs text-slate-400 flex-shrink-0">
            <button
              onClick={() => setIsSearchIntelOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-600/50 rounded-lg text-blue-300 text-xs transition-colors"
              title="Lookup sensor datasheets, pinouts, and libraries using live Google Search"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Search Grounding (gemini-3.5-flash)</span>
            </button>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-medium">Powered by VoltStar</span>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-4 flex flex-col gap-4">
        {/* View Mode: Split IDE (Code Editor + Wiring Diagram) */}
        {activeView === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
            {/* Left 6 or 7 cols: Dark C++ Code Editor */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              <CodeEditor
                code={code}
                onChange={setCode}
                diagnostics={diagnostics}
                onRunLinter={handleRunLinter}
                onApplyFix={handleApplyFix}
                isAnalyzing={isAnalyzing}
                platform={platform}
                projectTitle={project.projectTitle}
              />
              <CompilerConsole
                platform={platform}
                diagnostics={diagnostics}
                isCompiling={isCompiling}
                onRunCompile={handleRunCompile}
              />
            </div>

            {/* Right 6 or 5 cols: Interactive Wiring Diagram Viewer */}
            <div className="lg:col-span-6 flex flex-col">
              <WiringDiagramViewer
                spec={project.wiringDiagram}
                pinTable={project.pinTable}
                bom={project.bom}
                potentialIssues={project.potentialIssues}
                platform={platform}
              />
            </div>
          </div>
        )}

        {/* View Mode: Code IDE Only */}
        {activeView === 'code' && (
          <div className="flex flex-col gap-4 flex-1">
            <CodeEditor
              code={code}
              onChange={setCode}
              diagnostics={diagnostics}
              onRunLinter={handleRunLinter}
              onApplyFix={handleApplyFix}
              isAnalyzing={isAnalyzing}
              platform={platform}
              projectTitle={project.projectTitle}
            />
            <CompilerConsole
              platform={platform}
              diagnostics={diagnostics}
              isCompiling={isCompiling}
              onRunCompile={handleRunCompile}
            />
          </div>
        )}

        {/* View Mode: Wiring Diagram Only */}
        {activeView === 'wiring' && (
          <div className="flex-1">
            <WiringDiagramViewer
              spec={project.wiringDiagram}
              pinTable={project.pinTable}
              bom={project.bom}
              potentialIssues={project.potentialIssues}
              platform={platform}
            />
          </div>
        )}

        {/* View Mode: AI Chat & Architect */}
        {activeView === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
            <div className="lg:col-span-7 flex flex-col">
              <ChatPanel
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onGenerateFromIdea={handleGenerateFromIdea}
                isLoading={isChatLoading}
                onClearChat={() => setChatMessages([])}
                platform={platform}
              />
            </div>
            <div className="lg:col-span-5 flex flex-col">
              <WiringDiagramViewer
                spec={project.wiringDiagram}
                pinTable={project.pinTable}
                bom={project.bom}
                potentialIssues={project.potentialIssues}
                platform={platform}
              />
            </div>
          </div>
        )}
      </main>

      {/* Generator Prompt Modal */}
      <GeneratorModal
        isOpen={isGeneratorModalOpen}
        onClose={() => setIsGeneratorModalOpen(false)}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        currentPlatform={platform}
      />

      {/* Google Search Grounding Hardware & Library Intel Modal */}
      <SearchIntelModal
        isOpen={isSearchIntelOpen}
        onClose={() => setIsSearchIntelOpen(false)}
        onInsertCodeSnippet={(snippet) => setCode((prev) => `${snippet}\n\n${prev}`)}
        platform={platform}
      />
    </div>
  );
}
