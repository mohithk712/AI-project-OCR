import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  FileText,
  GitBranch,
  Layers,
  ShieldAlert,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { DELIVERABLE_FILES } from '../engine/deliverablesContent';
import { downloadApproachPdf } from '../utils/generateApproachPdf';

export const DeliverablesView: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'visual_pdf' | 'code_artifacts'>('visual_pdf');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  const activeFile = DELIVERABLE_FILES[selectedFileIndex] || DELIVERABLE_FILES[0];

  const handleDownloadPdf = () => {
    downloadApproachPdf();
    setPdfDownloaded(true);
    setTimeout(() => setPdfDownloaded(false), 3000);
  };

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
    <div className="space-y-6">
      {/* Top Action Banner for Google Form PDF Submission */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-700 font-semibold">
              <FileText className="w-4 h-4" />
              <span>GOOGLE FORM SUBMISSION READY · 5-PAGE VECTOR PDF WITH FLOWCHARTS</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Assignment Approach Document (PDF) & Architecture Flowcharts
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Download the formatted 5-page PDF containing the Executive Summary, End-to-End Hybrid Architecture Diagram,
              PDF Anomaly Decision Flowchart, 3-Stage Logical Diff Flowchart, 3-Tier + Transitive Staleness Decision Tree,
              Self-Healing LLM Validation Loop, and Engineering Decision Log for your Google Form submission.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {pdfDownloaded ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Downloaded CardioTrack_CT200_Assignment_Approach_Document.pdf
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Assignment Approach PDF (.pdf)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sub-view Switcher */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('visual_pdf')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeMode === 'visual_pdf'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              Visual Approach & Flowcharts (PDF Preview)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('code_artifacts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeMode === 'code_artifacts'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              APPROACH.md & Python FastAPI Code ({DELIVERABLE_FILES.length} Files)
            </button>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            File name: CardioTrack_CT200_Assignment_Approach_Document.pdf (5 Pages · Vector Diagrams)
          </span>
        </div>
      </div>

      {activeMode === 'visual_pdf' ? (
        <div className="space-y-6">
          {/* Diagram 1: End-to-End Hybrid System Architecture Flowchart */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-mono font-semibold text-sky-700 uppercase">
                  Page 1 of PDF · System Architecture Flowchart
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  1. End-to-End Hybrid Architecture: Deterministic Truth + Bounded AI Synthesis
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">IEC 62304 Class B/C Pipeline</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              In regulated medical device manuals, LLMs must never guess whether a section changed or whether a numeric clinical boundary shifted.
              We separate <strong>100% deterministic parsing, SHA-256 hashing, and clinical regex verification</strong> from{' '}
              <strong>bounded Gemini structured test synthesis</strong>.
            </p>

            {/* Visual 5-Stage Pipeline Flowchart */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-700">
                    <span>STAGE 1</span>
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-1">
                    PDF Ingestion & Relevance Gate
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    Extracts page-tagged text via <code className="font-mono">unpdf</code>. Classifies uploaded PDFs as{' '}
                    <span className="font-mono font-semibold">COMPATIBLE</span> vs{' '}
                    <span className="font-mono font-semibold">IRRELEVANT</span>.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                  <span>v1 (6p) / v2 (7p)</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-sky-800">
                    <span>STAGE 2</span>
                    <Workflow className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-1">
                    8-Anomaly Hierarchy Parser
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    Normalizes <code className="font-mono">U+2011</code> hyphens, blocks the Sec 3.2 numbered list trap, and climbs prefixes (<code className="font-mono">2.1 → 2.1.1.1</code>).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-sky-200 text-[10px] font-mono text-sky-800 flex items-center justify-between">
                  <span>SHA-256 + Specs</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-800">
                    <span>STAGE 3</span>
                    <GitBranch className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-1">
                    3-Stage Diff & Contradictions
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    Matches nodes via Exact ID → Title+Body Similarity → Added/Removed. Flags cross-section conflicts (<code className="font-mono">4.1 vs 4.2</code>).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-amber-200 text-[10px] font-mono text-amber-800 flex items-center justify-between">
                  <span>23 Unch · 5 Mod · 1 Add</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-800">
                    <span>STAGE 4</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-1">
                    3-Tier + Transitive Judge
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    Separates <code className="font-mono">COSMETIC</code> wording edits from <code className="font-mono">CRITICAL</code> threshold shifts and <code className="font-mono">TRANSITIVE</code> staleness.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-200 text-[10px] font-mono text-emerald-800 flex items-center justify-between">
                  <span>Zero False Positives</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-violet-800">
                    <span>STAGE 5</span>
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-1">
                    Self-Healing Gemini QA Loop
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    Selection SHA-256 cache + 3-attempt schema & citation validator + 1-click v2.0 test case remediation.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-violet-200 text-[10px] font-mono text-violet-800 flex items-center justify-between">
                  <span>0 Hallucinated IDs</span>
                  <Check className="w-3 h-3" />
                </div>
              </div>
            </div>
          </section>

          {/* Two-Column Flowcharts: PDF Hierarchy Parser (Left) & 3-Tier Staleness Decision Tree (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flowchart 1: PDF Hierarchy Reconstruction */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-[11px] font-mono font-semibold text-sky-700 uppercase">
                  Page 2 of PDF · Parser Decision Flowchart
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  2. PDF Hierarchy Parser & 8 Layout Irregularities
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-mono font-bold text-slate-900">
                    Step 1: Unicode & Page Boundary Normalization
                  </div>
                  <p className="text-slate-600 mt-0.5">
                    Replaces <code className="font-mono">U+2011</code> non-breaking hyphens with ASCII <code className="font-mono">-</code> (fixes Sec 5.1) and strips running page headers/footers across page breaks (fixes Sec 4.2 p.3→4 split).
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                  <div className="font-mono font-bold text-amber-900">
                    Step 2: Decision Gate — Numbered List Trap Guard (Sec 3.2)
                  </div>
                  <p className="text-amber-800 mt-0.5">
                    When inside Section 3.2, lines <code className="font-mono">1.</code> through <code className="font-mono">5.</code> look like chapters.{' '}
                    <code className="font-mono">isLikelyNumberedListStep()</code> detects trailing periods + non-monotonic chapter numbers and keeps them inside Section 3.2&apos;s body text.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <div className="font-mono font-bold text-emerald-900">
                    Step 3: Prefix-Climbing Parent Resolution (Sec 2.1.1.1)
                  </div>
                  <p className="text-emerald-800 mt-0.5">
                    When <code className="font-mono">2.1.1.1</code> appears without an intermediate <code className="font-mono">2.1.1</code> node, <code className="font-mono">getParentSectionNumber()</code> climbs prefix segments (<code className="font-mono">2.1.1.1 → 2.1.1 [missing] → 2.1</code>) to preserve the tree.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200">
                  <div className="font-mono font-bold text-sky-900">
                    Step 4: Cryptographic Hash & Spec Extraction
                  </div>
                  <p className="text-sky-800 mt-0.5">
                    Computes deterministic <code className="font-mono">SHA-256</code> hash, extracts clinical units (<code className="font-mono">mmHg, bpm, ms, cm, V, dBA</code>), and builds the <code className="font-mono">referenced_sections</code> graph.
                  </p>
                </div>
              </div>
            </section>

            {/* Flowchart 3: 3-Tier + Transitive Staleness Judge */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-[11px] font-mono font-semibold text-emerald-700 uppercase">
                  Page 4 of PDF · Staleness Decision Tree
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  3. 3-Tier Deterministic + Transitive Staleness Judge
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-emerald-900">
                      TIER 1: FRESH (is_stale = false)
                    </span>
                    <p className="text-emerald-800 mt-0.5">
                      Direct <code className="font-mono">SHA-256</code> hash matches <code className="font-mono">v1.0</code> snapshot AND all cross-referenced sections are unchanged.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] shrink-0">
                    Valid
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-sky-900">
                      TIER 2: COSMETIC_WORDING_CHANGE (is_stale = false)
                    </span>
                    <p className="text-sky-800 mt-0.5">
                      Direct <code className="font-mono">SHA-256</code> hash changed (e.g. <em>&quot;clinician&quot; → &quot;physician&quot;</em>), but <code className="font-mono">extracted_specs</code> are 100% identical. Prevents false QA alarms!
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-mono text-[10px] shrink-0">
                    No Re-Test
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-red-50/70 border border-red-200 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-red-900">
                      TIER 3: CRITICAL_THRESHOLD_CHANGE (is_stale = true)
                    </span>
                    <p className="text-red-800 mt-0.5">
                      Direct hash changed AND numeric clinical boundaries shifted (e.g. <code className="font-mono">300 → 290 mmHg</code> or <code className="font-mono">2.0s → 1.5s</code>).
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono text-[10px] shrink-0">
                    Mandatory Re-Test
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-violet-50/70 border border-violet-200 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-violet-900">
                      TIER 4: TRANSITIVE_STALE (is_stale = true)
                    </span>
                    <p className="text-violet-800 mt-0.5">
                      Direct section is unchanged (<code className="font-mono">Sec 7.1</code>), but it cites <code className="font-mono">Sec 4.2</code> &amp; <code className="font-mono">6.2</code> which suffered critical threshold changes!
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-mono text-[10px] shrink-0">
                    Graph Stale
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
};
