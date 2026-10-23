import React, { useEffect, useRef, useState } from 'react';
import { Bolt, BrainCircuit, MessageSquare, Send, Sparkles, Trash2 } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
  latency_ms?: number;
  timestamp: string;
}

export const INITIAL_COPILOT_WELCOME_MESSAGE: ChatMessage = {
  id: 'msg_welcome',
  role: 'assistant',
  content:
    'Welcome to the CardioTrack CT-200 Regulatory & Compliance Co-Pilot (IEC 62304 / ISO 13485).\n\n' +
    'I have full context over Manual v1 (28 nodes) and Manual v2 (29 nodes), including:\n' +
    '• The 8 resolved PDF typography and layout anomalies\n' +
    '• All 4 Critical Threshold Modifications (2.1.1.1, 3.2, 4.2, 4.3) and newly added Section 5.3 (Data Export)\n' +
    '• Tier-3 Transitive Staleness on Section 7.1 (referencing modified Section 4.2)\n' +
    '• The Cross-Section Regulatory Contradiction between Section 4.1 (2 seconds) and Section 4.2 E3 (1.5 seconds)\n\n' +
    'Select a response mode above (Low-Latency gemini-3.1-flash-lite, Standard gemini-3.8-flash, or High Thinking gemini-4-argon) and ask any regulatory or architecture question.',
  model_used: 'System Context Initialized',
  latency_ms: 12,
  timestamp: '09:00:00',
};

interface GeminiCopilotViewProps {
  messages: ChatMessage[];
  onUpdateMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  mode: 'fast' | 'standard' | 'thinking';
  onChangeMode: (mode: 'fast' | 'standard' | 'thinking') => void;
  onClearHistory: () => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export const GeminiCopilotView: React.FC<GeminiCopilotViewProps> = ({
  messages,
  onUpdateMessages,
  mode,
  onChangeMode,
  onClearHistory,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const processQueue = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsSending(true);

    while (queueRef.current.length > 0) {
      const nextPrompt = queueRef.current.shift()!;
      setQueuedCount(queueRef.current.length);

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        content: nextPrompt,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };

      const nextHistory = [...messagesRef.current, userMsg];
      messagesRef.current = nextHistory;
      onUpdateMessages(nextHistory);

      try {
        const activeMode = modeRef.current;
        const response = await fetch('/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: activeMode,
            messages: nextHistory,
          }),
        });
        const data = await response.json();
        const assistantMsg: ChatMessage = {
          id: `asst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          content: data.reply || 'Completed regulatory analysis.',
          model_used: data.model_used || activeMode,
          latency_ms: data.latency_ms ?? 12,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        };
        const updatedHistory = Array.isArray(data.chat_history)
          ? (data.chat_history as ChatMessage[])
          : [...messagesRef.current, assistantMsg];
        messagesRef.current = updatedHistory;
        onUpdateMessages(updatedHistory);
      } catch (_err) {
        const errMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Unable to reach regulatory chat endpoint. Please verify server status.',
          model_used: 'error',
          timestamp: new Date().toLocaleTimeString(),
        };
        const updatedHistory = [...messagesRef.current, errMsg];
        messagesRef.current = updatedHistory;
        onUpdateMessages(updatedHistory);
      }
    }

    processingRef.current = false;
    setIsSending(false);
  };

  const sendPrompt = (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;
    queueRef.current.push(trimmed);
    setQueuedCount(queueRef.current.length);
    setInput('');
    void processQueue();
  };

  useEffect(() => {
    if (initialPrompt) {
      sendPrompt(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPrompt(input);
  };

  return (
    <div className="space-y-6">
      {/* Header & Model Mode Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500 tabular-nums">
            Multi-Turn Regulatory Assistant · Server-Side @google/genai Integration
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Gemini IEC 62304 & ISO 13485 Compliance Co-Pilot
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Switch between Low-Latency (`gemini-3.1-flash-lite`), Standard (`gemini-3.8-flash`), and High Thinking (`gemini-4-argon` with `ThinkingLevel.HIGH`).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
            role="group"
            aria-label="Select Gemini Co-Pilot intelligence mode"
          >
            <button
              type="button"
              onClick={() => onChangeMode('fast')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                mode === 'fast'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Bolt className="w-3.5 h-3.5" />
              Low-Latency (gemini-3.1-flash-lite)
            </button>

            <button
              type="button"
              onClick={() => onChangeMode('standard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                mode === 'standard'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Standard (gemini-3.8-flash)
            </button>

            <button
              type="button"
              onClick={() => onChangeMode('thinking')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                mode === 'thinking'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              High Thinking (gemini-4-argon · HIGH)
            </button>
          </div>

          <button
            type="button"
            data-testid="clear-chat-history-btn"
            onClick={onClearHistory}
            disabled={messages.length <= 1}
            className="px-3 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-50 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History ({messages.length})
          </button>
        </div>
      </div>

      {/* Quick Regulatory Audit Prompts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 mr-1">Quick Audits:</span>
        {[
          'Audit the Section 4.1 (2s) vs Section 4.2 E3 (1.5s) contradiction in Manual v2',
          'Why is Section 7.1 flagged as TRANSITIVE_STALE when its SHA-256 hash did not change?',
          'Explain how the parser resolves all 8 PDF structural anomalies in ct200_manual.pdf',
          'Summarize all v1 -> v2 specification diffs and their IEC 62304 re-test impact',
        ].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendPrompt(q)}
            className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Scrollable Multi-Turn Conversation Thread */}
      <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[540px]">
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4"
          role="log"
          aria-label="Regulatory Co-Pilot conversation thread"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 mb-1 tabular-nums">
                <span className="font-semibold text-slate-700">
                  {msg.role === 'user' ? 'QA Engineer' : 'Gemini Regulatory Co-Pilot'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{msg.timestamp}</span>
                {msg.model_used && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{msg.model_used}</span>
                  </>
                )}
                {msg.latency_ms !== undefined && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{msg.latency_ms} ms</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-3xl rounded-xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-900'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="text-xs font-mono text-slate-500 animate-pulse">
              Running {mode === 'thinking' ? 'gemini-4-argon (ThinkingLevel.HIGH)' : mode === 'fast' ? 'gemini-3.1-flash-lite (Low-Latency)' : 'gemini-3.8-flash'} regulatory analysis
              {queuedCount > 0 ? ` (${queuedCount} queued)...` : '...'}
            </div>
          )}
        </div>

        {/* Chat Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3 rounded-b-xl"
        >
          <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
          <label htmlFor="copilot-chat-input" className="sr-only">
            Ask a regulatory compliance or traceability question
          </label>
          <input
            id="copilot-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about CT-200 v1/v2 diffs, Section 4.1 vs 4.2 E3 contradiction, or PDF anomalies..."
            className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Queue Message' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
};
