import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Copy,
  Check,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Wand2,
  Play,
  Maximize2,
  Minimize2,
  FileCode,
  Sparkles,
  RefreshCw,
  Search,
  Code2
} from 'lucide-react';
import { CodeDiagnostic } from '../types';

interface CodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  diagnostics: CodeDiagnostic[];
  onRunLinter: () => void;
  onApplyFix: (fixedCode: string) => void;
  isAnalyzing: boolean;
  platform: string;
  projectTitle: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  diagnostics,
  onRunLinter,
  onApplyFix,
  isAnalyzing,
  platform,
  projectTitle
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'main.cpp' | 'config.h'>('main.cpp');
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<CodeDiagnostic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(13);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeOverlayRef = useRef<HTMLDivElement>(null);

  // Synchronize scroll between textarea and syntax highlight overlay
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (codeOverlayRef.current) {
      codeOverlayRef.current.scrollTop = e.currentTarget.scrollTop;
      codeOverlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const isArduino = platform.toLowerCase().includes('arduino');
    const filename = isArduino ? `${projectTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ino` : 'main.cpp';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Support Tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const lines = useMemo(() => code.split('\n'), [code]);

  // Map diagnostics by line number for fast gutter lookup
  const diagnosticsByLine = useMemo(() => {
    const map = new Map<number, CodeDiagnostic>();
    diagnostics.forEach((diag) => {
      // Keep error precedence over warning
      const existing = map.get(diag.line);
      if (!existing || diag.severity === 'error') {
        map.set(diag.line, diag);
      }
    });
    return map;
  }, [diagnostics]);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  // Lightweight robust C++ syntax highlighter
  const renderHighlightedLine = (lineText: string, lineIndex: number) => {
    if (!lineText) return <span className="inline-block">&nbsp;</span>;

    // Comments check
    const trimmed = lineText.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return <span className="text-slate-500 italic">{lineText}</span>;
    }

    // Preprocessor directive
    if (trimmed.startsWith('#')) {
      const parts = lineText.split(/(#\w+|"[^"]*"|<[^>]*>)/g);
      return (
        <span>
          {parts.map((part, pIdx) => {
            if (part.startsWith('#')) {
              return <span key={pIdx} className="text-rose-400 font-semibold">{part}</span>;
            }
            if (part.startsWith('<') || part.startsWith('"')) {
              return <span key={pIdx} className="text-amber-300">{part}</span>;
            }
            return <span key={pIdx} className="text-slate-300">{part}</span>;
          })}
        </span>
      );
    }

    // Tokenized line parsing
    const tokenRegex = /(\/\/[^\n]*)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|(\b(?:class|struct|namespace|template|typename|public|private|protected|virtual|override|constexpr|const|void|int|float|double|bool|uint8_t|uint16_t|uint32_t|size_t|auto|nullptr|true|false|if|else|for|while|return|switch|case|break|using|static|inline|volatile)\b)|(\b(?:Serial|Wire|pinMode|digitalWrite|digitalRead|analogRead|analogWrite|millis|micros|delay|HIGH|LOW|OUTPUT|INPUT|INPUT_PULLUP|std|vector|string|F)\b)|(\b\d+(?:\.\d+)?(?:f|u|l|ul)?\b)|([{}()[\],;=+\-*/%&|^!<>]+)/g;

    const tokens: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(lineText)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(
          <span key={`txt-${lastIndex}`} className="text-slate-200">
            {lineText.substring(lastIndex, match.index)}
          </span>
        );
      }

      const [full, comment, stringLiteral, keyword, embeddedSymbol, number, punct] = match;

      if (comment) {
        tokens.push(<span key={`tok-${match.index}`} className="text-slate-500 italic">{full}</span>);
      } else if (stringLiteral) {
        tokens.push(<span key={`tok-${match.index}`} className="text-emerald-300">{full}</span>);
      } else if (keyword) {
        tokens.push(<span key={`tok-${match.index}`} className="text-rose-400 font-medium">{full}</span>);
      } else if (embeddedSymbol) {
        tokens.push(<span key={`tok-${match.index}`} className="text-sky-400 font-medium">{full}</span>);
      } else if (number) {
        tokens.push(<span key={`tok-${match.index}`} className="text-amber-300">{full}</span>);
      } else if (punct) {
        tokens.push(<span key={`tok-${match.index}`} className="text-slate-400">{full}</span>);
      } else {
        tokens.push(<span key={`tok-${match.index}`} className="text-slate-200">{full}</span>);
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < lineText.length) {
      tokens.push(
        <span key={`tail-${lastIndex}`} className="text-slate-200">
          {lineText.substring(lastIndex)}
        </span>
      );
    }

    return <span>{tokens}</span>;
  };

  const isArduino = platform.toLowerCase().includes('arduino');
  const mainTabName = isArduino ? 'sketch.ino' : 'main.cpp';

  return (
    <div
      className={`flex flex-col bg-[#0d121c] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-2 z-50 rounded-xl' : 'h-full min-h-[580px]'
      }`}
    >
      {/* Top IDE Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#090d16] border-b border-slate-800/90 gap-2">
        {/* File Tabs */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('main.cpp')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'main.cpp'
                ? 'bg-[#151d2d] text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>{mainTabName}</span>
            {errorCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('config.h')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'config.h'
                ? 'bg-[#151d2d] text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-slate-400" />
            <span>pins_config.h</span>
          </button>
        </div>

        {/* Diagnostic Status Indicator */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#131b29] border border-slate-800">
            {errorCount === 0 && warningCount === 0 ? (
              <span className="flex items-center text-emerald-400 space-x-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>C++ Syntax Clean</span>
              </span>
            ) : (
              <div className="flex items-center space-x-2">
                {errorCount > 0 && (
                  <span className="flex items-center text-rose-400 space-x-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>{errorCount} {errorCount === 1 ? 'Error' : 'Errors'}</span>
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="flex items-center text-amber-400 space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{warningCount} {warningCount === 1 ? 'Warn' : 'Warns'}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* AI Static Linter Button */}
          <button
            onClick={onRunLinter}
            disabled={isAnalyzing}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-500/40 rounded-md transition-all text-xs font-medium disabled:opacity-50"
            title="Perform deep C++ static analysis and hardware pin verification"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{isAnalyzing ? 'Analyzing...' : 'Deep Scan'}</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showSearch ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Search code"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Font sizing */}
          <div className="hidden sm:flex items-center border border-slate-800 rounded-md px-1 bg-[#111827]">
            <button
              onClick={() => setFontSize(Math.max(11, fontSize - 1))}
              className="px-1.5 py-0.5 text-slate-400 hover:text-slate-200 text-xs font-mono"
              title="Decrease font size"
            >
              A-
            </button>
            <span className="text-[10px] text-slate-500 px-1">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(18, fontSize + 1))}
              className="px-1.5 py-0.5 text-slate-400 hover:text-slate-200 text-xs font-mono"
              title="Increase font size"
            >
              A+
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md text-xs transition-colors border border-slate-700/60"
            title="Copy C++ Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md text-xs transition-colors border border-slate-700/60"
            title="Download source code"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Optional Search Bar */}
      {showSearch && (
        <div className="flex items-center px-4 py-1.5 bg-[#111726] border-b border-slate-800 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search code tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-slate-200 text-xs focus:outline-none w-64 placeholder-slate-500"
          />
          {searchQuery && (
            <span className="text-[11px] text-slate-400 ml-auto">
              Matches: {lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase())).length}
            </span>
          )}
        </div>
      )}

      {/* Selected Diagnostic Popover Banner */}
      {selectedDiagnostic && (
        <div
          className={`flex items-start justify-between px-4 py-2 border-b text-xs transition-all ${
            selectedDiagnostic.severity === 'error'
              ? 'bg-rose-950/40 border-rose-800/70 text-rose-200'
              : 'bg-amber-950/40 border-amber-800/70 text-amber-200'
          }`}
        >
          <div className="flex items-start space-x-2">
            {selectedDiagnostic.severity === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <span className="font-semibold mr-1.5">
                Line {selectedDiagnostic.line} [{selectedDiagnostic.severity.toUpperCase()}]:
              </span>
              <span>{selectedDiagnostic.message}</span>
              {selectedDiagnostic.fixSuggestion && (
                <div className="mt-1 font-mono text-[11px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded inline-block border border-slate-700/50">
                  Fix: {selectedDiagnostic.fixSuggestion}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {selectedDiagnostic.fixSuggestion && (
              <button
                onClick={() => {
                  const lineNum = selectedDiagnostic.line;
                  const newLines = [...lines];
                  if (lineNum <= newLines.length) {
                    newLines[lineNum - 1] = selectedDiagnostic.fixSuggestion!;
                    onApplyFix(newLines.join('\n'));
                    setSelectedDiagnostic(null);
                  }
                }}
                className="flex items-center space-x-1 px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium"
              >
                <Wand2 className="w-3 h-3" />
                <span>Auto-Apply Fix</span>
              </button>
            )}
            <button
              onClick={() => setSelectedDiagnostic(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main IDE Body: Line Numbers + Code Canvas */}
      <div className="relative flex-1 flex overflow-hidden font-mono-code">
        {/* Line Numbers Gutter */}
        <div className="select-none bg-[#090d16] border-r border-slate-800/80 py-3 px-2 text-right text-slate-600 min-w-[54px] flex flex-col items-end">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const diag = diagnosticsByLine.get(lineNum);
            return (
              <div
                key={lineNum}
                onClick={() => diag && setSelectedDiagnostic(diag)}
                className={`relative flex items-center justify-end w-full cursor-pointer group leading-relaxed`}
                style={{ fontSize: `${fontSize}px`, height: `${fontSize * 1.5}px` }}
              >
                {diag && (
                  <span
                    className={`absolute -left-1 w-2.5 h-2.5 rounded-full flex items-center justify-center transition-transform hover:scale-125 ${
                      diag.severity === 'error' ? 'bg-rose-500' : 'bg-amber-400'
                    }`}
                    title={`Line ${lineNum}: ${diag.message}`}
                  />
                )}
                <span
                  className={`transition-colors group-hover:text-slate-300 ${
                    diag?.severity === 'error'
                      ? 'text-rose-400 font-bold'
                      : diag?.severity === 'warning'
                      ? 'text-amber-400'
                      : 'text-slate-600'
                  }`}
                >
                  {lineNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Code Canvas Container */}
        <div className="relative flex-1 overflow-auto bg-[#0a0f1a]">
          {/* Syntax Highlighted Visual Layer */}
          <div
            ref={codeOverlayRef}
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none py-3 px-4 select-none whitespace-pre overflow-hidden"
            style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.5}px` }}
          >
            {lines.map((lineText, lIdx) => {
              const lineNum = lIdx + 1;
              const diag = diagnosticsByLine.get(lineNum);
              const isMatch = searchQuery && lineText.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <div
                  key={lIdx}
                  className={`w-full ${
                    diag?.severity === 'error'
                      ? 'bg-rose-500/10 border-b border-rose-500/20'
                      : diag?.severity === 'warning'
                      ? 'bg-amber-500/5'
                      : isMatch
                      ? 'bg-yellow-500/15'
                      : ''
                  }`}
                  style={{ height: `${fontSize * 1.5}px` }}
                >
                  {renderHighlightedLine(lineText, lIdx)}
                </div>
              );
            })}
          </div>

          {/* Editable Transparent Textarea Overlay */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-cyan-400 py-3 px-4 font-mono-code resize-none border-none outline-none whitespace-pre overflow-auto z-10 selection:bg-cyan-500/20 selection:text-white"
            style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.5}px` }}
          />
        </div>
      </div>

      {/* Editor Status Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#080c14] border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 font-mono text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>{isArduino ? 'Arduino C++ (avr-g++)' : 'C++20 / Embedded G++'}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span>Target: <strong className="text-amber-300 font-semibold">{platform}</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-300 font-mono text-[10px]">
            {isArduino ? 'ATmega328P @ 16MHz • 5V • Pins Auto-Assigned' : 'Auto Pins Active'}
          </span>
          <span className="text-slate-600">|</span>
          <span>Spaces: 4</span>
        </div>

        <div className="flex items-center space-x-3">
          <span>{lines.length} lines</span>
          <span>{code.length} chars</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400">VoltStar Linter Active</span>
        </div>
      </div>
    </div>
  );
};
