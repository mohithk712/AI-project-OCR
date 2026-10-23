import React, { useState } from 'react';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import { DELIVERABLE_FILES } from '../engine/deliverablesContent';

export const DeliverablesView: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const activeFile = DELIVERABLE_FILES[selectedFileIndex] || DELIVERABLE_FILES[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedFile(activeFile.filename);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (_err) {
      // Fallback if clipboard blocked in iframe
    }
  };

  const handleDownload = () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filename.replace(/\//g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500 tabular-nums">
            Tri9T AI Engineering Internship Deliverables · Approach Document, Decision Log & Python FastAPI Reference
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            APPROACH.md (Decision Log) & Python FastAPI Repository Export
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Inspect, copy, or download the complete Approach Document (including the required Decision Log) and Python FastAPI modules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left File Selector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h2 className="text-xs font-semibold text-slate-700 px-2 py-1">
            Deliverable Artifacts ({DELIVERABLE_FILES.length})
          </h2>
          <div className="space-y-1">
            {DELIVERABLE_FILES.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedFileIndex(idx)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex flex-col gap-1 ${
                  idx === selectedFileIndex
                    ? 'bg-slate-900 text-white'
                    : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <span className="font-mono font-semibold flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                  {file.filename}
                </span>
                <span
                  className={`text-[11px] leading-snug ${
                    idx === selectedFileIndex ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {file.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Code / Markdown Viewer */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-mono font-bold text-slate-900">
                {activeFile.path}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeFile.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                {copiedFile === activeFile.filename ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy File
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Download {activeFile.filename}
              </button>
            </div>
          </div>

          <pre className="p-5 text-xs font-mono text-slate-800 bg-white overflow-x-auto max-h-[600px] leading-relaxed whitespace-pre-wrap">
            {activeFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
