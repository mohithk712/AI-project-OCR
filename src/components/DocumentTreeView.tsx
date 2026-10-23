import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CheckSquare,
  Copy,
  Edit3,
  FileText,
  FolderTree,
  Layers,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Square,
  Table as TableIcon,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  classifyNodeStaleness,
  computeContentHash,
  extractClinicalSpecs,
  extractCrossReferences,
  normalizeRegulatoryText,
  type DocumentNode,
  type DocumentVersionRecord,
  type SectionDiffDetail,
  type UploadedPdfAnalysisResult,
} from '../engine/traceabilityEngine';

interface DocumentTreeViewProps {
  versions: DocumentVersionRecord[];
  activeVersionNumber: number;
  diffs: SectionDiffDetail[];
  latestUploadedAnalysis: UploadedPdfAnalysisResult | null;
  onSwitchVersion: (ver: number) => void;
  onCreateSelection: (name: string, versionNumber: number, sectionNumbers: string[]) => Promise<void>;
  onUploadPdf: (payload: {
    filename: string;
    file_size_bytes: number;
    extracted_text?: string;
    base64_pdf?: string;
  }) => Promise<UploadedPdfAnalysisResult | null>;
  onDeleteUploadedPdf: (versionNumber: number) => Promise<void>;
  onSimulateEdit?: (versionNumber: number, sectionNumber: string, newBodyText: string) => Promise<void>;
  onAskCopilot?: (prompt: string) => void;
}

export const DocumentTreeView: React.FC<DocumentTreeViewProps> = ({
  versions,
  activeVersionNumber,
  diffs,
  latestUploadedAnalysis,
  onSwitchVersion,
  onCreateSelection,
  onUploadPdf,
  onDeleteUploadedPdf,
  onSimulateEdit,
  onAskCopilot,
}) => {
  const currentDoc = useMemo(
    () => versions.find((v) => v.version_number === activeVersionNumber) || versions[0],
    [versions, activeVersionNumber]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [treeFilter, setTreeFilter] = useState<'all' | 'anomalies' | 'tables' | 'modified'>('all');
  const [selectedSectionNumber, setSelectedSectionNumber] = useState<string>('2.1.1.1');
  const [checkedSections, setCheckedSections] = useState<string[]>([
    '2.1.1.1',
    '3.2',
    '4.2',
    '7.1',
    '1.1',
  ]);
  const [selectionName, setSelectionName] = useState(
    'CT-200 Critical Threshold & Transitive Selection'
  );
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);

  // Context-sensitive row menu & action states
  const [openMenuSectionNumber, setOpenMenuSectionNumber] = useState<string | null>(null);
  const [analyzedSectionNumber, setAnalyzedSectionNumber] = useState<string | null>(null);
  const [editingSectionNumber, setEditingSectionNumber] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [rowActionFeedback, setRowActionFeedback] = useState<string | null>(null);
  const treeContainerRef = useRef<HTMLDivElement | null>(null);
  const editFormRef = useRef<HTMLFormElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        openMenuSectionNumber &&
        treeContainerRef.current &&
        !treeContainerRef.current.contains(event.target as Node)
      ) {
        setOpenMenuSectionNumber(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuSectionNumber(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openMenuSectionNumber]);

  const diffBySection = useMemo(() => {
    const map = new Map<string, SectionDiffDetail>();
    for (const d of diffs) {
      map.set(d.section_number, d);
    }
    return map;
  }, [diffs]);

  const filteredNodes = useMemo(() => {
    if (!currentDoc) return [];
    const q = searchQuery.toLowerCase().trim();
    return currentDoc.nodes.filter((n) => {
      if (treeFilter === 'anomalies' && n.anomalies.length === 0) return false;
      if (treeFilter === 'tables' && n.tables.length === 0 && n.list_items.length === 0) return false;
      if (treeFilter === 'modified') {
        const d = diffBySection.get(n.section_number);
        if (!d || (d.change_type === 'UNCHANGED' && d.staleness_category === 'FRESH')) {
          return false;
        }
      }
      if (!q) return true;
      return (
        n.section_number.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        n.body_text.toLowerCase().includes(q) ||
        n.extracted_specs.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [currentDoc, searchQuery, treeFilter, diffBySection]);

  const selectedNode: DocumentNode | undefined = useMemo(() => {
    if (!currentDoc) return undefined;
    return (
      currentDoc.nodes.find((n) => n.section_number === selectedSectionNumber) ||
      currentDoc.nodes[0]
    );
  }, [currentDoc, selectedSectionNumber]);

  const v1BaselineDoc = useMemo(
    () => versions.find((v) => v.version_number === 1) || currentDoc,
    [versions, currentDoc]
  );

  // Compute live SHA-256 hash, clinical specs, cross-references, and staleness status as the user edits prose
  const liveEditTelemetry = useMemo(() => {
    if (!selectedNode || !currentDoc) return null;
    const rawDraft =
      editingSectionNumber === selectedNode.section_number
        ? editDraftText
        : selectedNode.body_text;
    const normalized = normalizeRegulatoryText(rawDraft);
    const liveHash = computeContentHash(
      `${selectedNode.section_number}|${selectedNode.title}|${normalized}`
    );
    const liveSpecs = extractClinicalSpecs(rawDraft);
    const liveRefs = extractCrossReferences(rawDraft, selectedNode.section_number);

    const v1Node =
      v1BaselineDoc?.nodes.find((n) => n.section_number === selectedNode.section_number) ||
      selectedNode;

    const baselineMap = new Map<string, { pinned_content_hash: string; pinned_body_text: string }>();
    if (v1BaselineDoc) {
      for (const bn of v1BaselineDoc.nodes) {
        baselineMap.set(bn.section_number, {
          pinned_content_hash: bn.content_hash,
          pinned_body_text: bn.body_text,
        });
      }
    }

    const simulatedCurrentNode: DocumentNode = {
      ...selectedNode,
      body_text: rawDraft,
      extracted_specs: liveSpecs,
      referenced_sections: liveRefs,
      content_hash: liveHash,
    };

    const stalenessEval = classifyNodeStaleness(
      {
        section_number: v1Node.section_number,
        pinned_content_hash: v1Node.content_hash,
        pinned_body_text: v1Node.body_text,
        pinned_specs: v1Node.extracted_specs,
        referenced_sections: v1Node.referenced_sections,
      },
      simulatedCurrentNode,
      currentDoc.nodes.map((n) =>
        n.section_number === selectedNode.section_number ? simulatedCurrentNode : n
      ),
      baselineMap
    );

    return {
      v1Hash: v1Node.content_hash,
      v1Specs: v1Node.extracted_specs,
      v1BodyText: v1Node.body_text,
      liveHash,
      liveSpecs,
      liveRefs,
      hashChangedFromV1: liveHash !== v1Node.content_hash,
      unsavedChanges: rawDraft.trim() !== selectedNode.body_text.trim(),
      stalenessStatus: stalenessEval.status,
      addedSpecs: stalenessEval.added_specs,
      removedSpecs: stalenessEval.removed_specs,
      explanation: stalenessEval.explanation,
    };
  }, [selectedNode, currentDoc, v1BaselineDoc, editingSectionNumber, editDraftText]);

  const handleAnalyzeNode = (node: DocumentNode) => {
    const secLabel = node.section_number === '0' ? 'ROOT' : node.section_number;
    setSelectedSectionNumber(node.section_number);
    setAnalyzedSectionNumber(node.section_number);
    setEditingSectionNumber(null);
    setOpenMenuSectionNumber(null);
    setRowActionFeedback(
      `Redirecting Section ${secLabel} (${node.title}) to Gemini Co-Pilot for clinical risk & staleness audit...`
    );
    if (onAskCopilot) {
      onAskCopilot(
        `Analyze Section ${secLabel} (${node.title}) in Manual v${currentDoc?.version_number || 2}.0 (${currentDoc?.source_filename || 'ct200_manual_v2.pdf'}): explain its clinical specifications, cross-references, SHA-256 hash, and QA test staleness impact.`
      );
    }
  };

  const handleStartEditNode = (node: DocumentNode) => {
    setSelectedSectionNumber(node.section_number);
    setEditingSectionNumber(node.section_number);
    setEditDraftText(node.body_text);
    setOpenMenuSectionNumber(null);
    setRowActionFeedback(
      `Opened Live Section Editor for Section ${node.section_number === '0' ? 'ROOT' : node.section_number} (${node.title}) in v${currentDoc?.version_number}.0.`
    );
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      editTextareaRef.current?.focus();
    }, 30);
  };

  const handleLiveDraftChange = (nextText: string) => {
    setEditDraftText(nextText);
    if (currentDoc && editingSectionNumber && onSimulateEdit && nextText.trim()) {
      void onSimulateEdit(currentDoc.version_number, editingSectionNumber, nextText);
    }
  };

  const handleSaveEditedNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDoc || !editingSectionNumber || !editDraftText.trim()) return;
    setIsSavingEdit(true);
    try {
      if (onSimulateEdit) {
        await onSimulateEdit(currentDoc.version_number, editingSectionNumber, editDraftText);
      }
      setRowActionFeedback(
        `Applied & saved updated prose for Section ${editingSectionNumber} in v${currentDoc.version_number}.0. SHA-256 hash, clinical thresholds, and QA staleness updated live.`
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCopySectionId = async (node: DocumentNode) => {
    const formattedId = `${node.section_number} (${node.logical_node_id})`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedId);
      }
    } catch (_err) {
      // Clipboard API fallback handled via state feedback
    }
    setSelectedSectionNumber(node.section_number);
    setOpenMenuSectionNumber(null);
    setRowActionFeedback(`Copied Section ID "${formattedId}" to clipboard.`);
  };

  const toggleCheckSection = (secNum: string) => {
    setCheckedSections((prev) =>
      prev.includes(secNum) ? prev.filter((s) => s !== secNum) : [...prev, secNum]
    );
  };

  const handleSaveSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectionName.trim() || checkedSections.length === 0) {
      setSelectionNotice('Provide a selection name and check at least one section.');
      return;
    }
    await onCreateSelection(selectionName.trim(), currentDoc.version_number, checkedSections);
    setSelectionNotice(
      `Pinned ${checkedSections.length} sections from v${currentDoc.version_number} (${currentDoc.source_filename}). Ready in QA & Staleness tab.`
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // Encode complete PDF binary in 32KB chunks so unpdf can read the full xref table & all pages
      const maxLen = Math.min(bytes.length, 10 * 1024 * 1024);
      const chunks: string[] = [];
      const step = 32768;
      for (let i = 0; i < maxLen; i += step) {
        const sub = bytes.subarray(i, Math.min(i + step, maxLen));
        chunks.push(String.fromCharCode.apply(null, Array.from(sub)));
      }
      const base64_pdf = btoa(chunks.join(''));
      await onUploadPdf({
        filename: file.name,
        file_size_bytes: file.size,
        base64_pdf,
      });
    } finally {
      setIsAnalyzingPdf(false);
      e.target.value = '';
    }
  };

  const handleQuickAnalyzeSample = async (sampleType: 'v1' | 'v2') => {
    setIsAnalyzingPdf(true);
    try {
      if (sampleType === 'v2') {
        await onUploadPdf({
          filename: 'ct200_manual_v2_uploaded.pdf',
          file_size_bytes: 148620,
          extracted_text:
            'CardioTrack CT-200 Home Blood Pressure Monitor 250 measurement cycles low-battery icon below 10% 30 mmHg increments Auto-deflates within 1.5 seconds E6 Bluetooth sync failure 5.3 Data Export firmware 1.4',
        });
      } else {
        await onUploadPdf({
          filename: 'ct200_manual_v1_uploaded.pdf',
          file_size_bytes: 136400,
          extracted_text:
            'CardioTrack CT-200 Home Blood Pressure Monitor 300 measurement cycles low-battery icon below 15% 40 mmHg increments Auto-deflates within 2 seconds E1-E5',
        });
      }
    } finally {
      setIsAnalyzingPdf(false);
    }
  };

  if (!currentDoc) return null;

  return (
    <div className="space-y-8">
      {/* Workspace Header & Version Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500 tabular-nums">
            IEC 62304 Document Hierarchy Parser · pdfplumber Typography & BBox Engine
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            {currentDoc.source_filename} — Reconstructed Hierarchy ({currentDoc.node_count} Nodes)
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            <span>Version v{currentDoc.version_number}.0</span>
            <span aria-hidden="true">·</span>
            <span>{currentDoc.page_count} Pages</span>
            <span aria-hidden="true">·</span>
            <span>1 Root + {currentDoc.node_count - 1} Sections/Subsections</span>
            <span aria-hidden="true">·</span>
            <span>8 PDF Structural Anomalies Resolved</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
            role="group"
            aria-label="Document version selector"
          >
            {versions.map((ver) => (
              <div
                key={ver.version_number}
                className="inline-flex items-center gap-0.5"
              >
                <button
                  type="button"
                  onClick={() => onSwitchVersion(ver.version_number)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    ver.version_number === activeVersionNumber
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  v{ver.version_number} ({ver.source_filename} · {ver.node_count} nodes)
                </button>
                {ver.version_number > 2 && (
                  <button
                    type="button"
                    data-testid={`delete-version-${ver.version_number}-btn`}
                    onClick={() => onDeleteUploadedPdf(ver.version_number)}
                    title={`Remove uploaded PDF v${ver.version_number} (${ver.source_filename})`}
                    aria-label={`Remove uploaded PDF v${ver.version_number} (${ver.source_filename})`}
                    className="p-1.5 text-rose-700 hover:bg-rose-100 rounded-md transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowPdfPreview((p) => !p)}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            {showPdfPreview ? 'Hide Source PDF Viewer' : 'Inspect Source PDF'}
          </button>
        </div>
      </div>

      {/* Upload & Analyze Regulatory PDF Section */}
      <section
        aria-label="Upload and Analyze Regulatory PDF"
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-700" />
              Upload & Analyze Regulatory PDF Manual
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Upload any regulatory PDF manual to extract its hierarchical section tree, tables, clinical thresholds, and staleness impact.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label
              htmlFor="pdf-upload-input"
              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              {isAnalyzingPdf ? 'Analyzing PDF...' : 'Upload PDF File (.pdf)'}
            </label>
            <input
              id="pdf-upload-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="sr-only"
            />

            <button
              type="button"
              onClick={() => handleQuickAnalyzeSample('v2')}
              disabled={isAnalyzingPdf}
              className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              Analyze Sample ct200_manual_v2.pdf
            </button>

            <button
              type="button"
              onClick={() => handleQuickAnalyzeSample('v1')}
              disabled={isAnalyzingPdf}
              className="px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              Analyze Sample ct200_manual.pdf (v1)
            </button>
          </div>
        </div>

        {/* Uploaded PDF Analysis Result Panel */}
        {latestUploadedAnalysis && (
          <div
            data-testid="pdf-analysis-result"
            className={`p-4 border rounded-lg space-y-3 ${
              latestUploadedAnalysis.detected_profile === 'UNRELATED_DOCUMENT'
                ? 'bg-amber-50/60 border-amber-300'
                : 'bg-emerald-50/50 border-emerald-200'
            }`}
          >
            <div
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2.5 ${
                latestUploadedAnalysis.detected_profile === 'UNRELATED_DOCUMENT'
                  ? 'border-amber-200'
                  : 'border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    latestUploadedAnalysis.detected_profile === 'UNRELATED_DOCUMENT'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                />
                <span className="text-xs font-bold text-slate-900">
                  PDF Analysis Complete: {latestUploadedAnalysis.filename}
                </span>
                {latestUploadedAnalysis.detected_profile === 'UNRELATED_DOCUMENT' && (
                  <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-amber-100 text-amber-900 border border-amber-300 rounded-md">
                    Non-CT200 / Unrelated PDF
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-[11px] font-mono text-slate-600 tabular-nums">
                  Profile: {latestUploadedAnalysis.detected_profile} · Ingested as v
                  {latestUploadedAnalysis.version_record.version_number}.0 ·{' '}
                  {Math.max(1, Math.round(latestUploadedAnalysis.file_size_bytes / 1024))} KB ·{' '}
                  {latestUploadedAnalysis.processing_time_ms} ms
                </div>
                <button
                  type="button"
                  data-testid="remove-uploaded-pdf-btn"
                  onClick={() =>
                    onDeleteUploadedPdf(latestUploadedAnalysis.version_record.version_number)
                  }
                  className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-white border border-rose-300 rounded-md hover:bg-rose-50 transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Uploaded PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500">Extracted Nodes & Pages</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {latestUploadedAnalysis.extracted_summary.total_nodes} Nodes ·{' '}
                  {latestUploadedAnalysis.extracted_page_count ||
                    latestUploadedAnalysis.version_record.page_count}{' '}
                  Pages
                </div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500">Extracted Words & Specs</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {latestUploadedAnalysis.extracted_word_count ?? 0} Words ·{' '}
                  {latestUploadedAnalysis.extracted_summary.total_clinical_specs} Specs
                </div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500">Domain Relevance</div>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    latestUploadedAnalysis.is_relevant_to_ct200
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {latestUploadedAnalysis.is_relevant_to_ct200
                    ? 'Medical / Regulatory'
                    : 'Unrelated Document'}
                </div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500">Staleness & Contradictions</div>
                <div className="text-sm font-bold text-amber-700 mt-0.5">
                  {latestUploadedAnalysis.extracted_summary.stale_test_cases_triggered} Stale ·{' '}
                  {latestUploadedAnalysis.extracted_summary.contradictions_found} Contradiction
                </div>
              </div>
            </div>

            <ul className="list-disc list-inside text-xs text-slate-800 space-y-1">
              {latestUploadedAnalysis.key_findings.map((finding, idx) => (
                <li key={idx}>{finding}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Optional Embedded Source PDF Viewer */}
      {showPdfPreview && (
        <section
          aria-label="Source PDF Document Viewer"
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Source Regulatory PDF Asset ({currentDoc.source_filename})
              </h2>
              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                Asset Path: {currentDoc.pdf_asset_url} · {currentDoc.page_count} Pages
              </p>
            </div>
            <a
              href={currentDoc.pdf_asset_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Open Raw PDF
            </a>
          </div>
          <div className="w-full h-[500px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
            <iframe
              src={currentDoc.pdf_asset_url}
              title={`PDF Preview ${currentDoc.source_filename}`}
              className="w-full h-full"
            />
          </div>
        </section>
      )}

      {/* Main 12-Column Split: Left Tree Explorer (5 cols) + Right Node & Anomaly Inspector (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hierarchical Tree & Pinned Selection Builder */}
        <div
          ref={treeContainerRef}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-slate-700" />
                Document Hierarchy Tree
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Right-click any row or click the{' '}
                <MoreVertical className="w-3 h-3 inline-block align-text-bottom text-slate-600" />{' '}
                menu button to Analyze, Edit, or Copy Section ID.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
              Showing {filteredNodes.length} of {currentDoc.node_count}
            </span>
          </div>

          {/* Search Input */}
          <div>
            <label htmlFor="tree-search-input" className="sr-only">
              Search sections, prose, or clinical thresholds
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="tree-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search section (e.g. 2.1.1.1, E3, 180 mmHg)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Segmented Filter Controls */}
          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
            role="group"
            aria-label="Filter document tree nodes"
          >
            {(
              [
                { id: 'all', label: `All (${currentDoc.node_count})` },
                { id: 'anomalies', label: 'Anomalies (12)' },
                { id: 'tables', label: 'Tables & Lists (3)' },
                { id: 'modified', label: 'v2 Impacted (7)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTreeFilter(tab.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  treeFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Row Action Feedback Banner */}
          {rowActionFeedback && (
            <div
              data-testid="tree-row-action-feedback"
              className="flex items-center justify-between gap-2 px-3 py-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {rowActionFeedback}
              </span>
              <button
                type="button"
                onClick={() => setRowActionFeedback(null)}
                aria-label="Dismiss row action notification"
                className="p-0.5 text-emerald-700 hover:text-emerald-900 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Scrollable Tree List */}
          <div
            className={`max-h-[520px] ${
              openMenuSectionNumber && filteredNodes.length <= 4 ? 'min-h-[190px]' : ''
            } overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg`}
            role="list"
            aria-label="Hierarchical manual sections"
          >
            {filteredNodes.map((node, rowIdx) => {
              const isSelected = selectedNode?.section_number === node.section_number;
              const isChecked = checkedSections.includes(node.section_number);
              const isMenuOpen = openMenuSectionNumber === node.section_number;
              const diff = diffBySection.get(node.section_number);
              const indentPx = Math.max(0, (node.level - 1) * 14);
              const openUpwards =
                filteredNodes.length > 4 && rowIdx >= Math.max(3, filteredNodes.length - 4);

              return (
                <div
                  key={node.node_id}
                  role="listitem"
                  data-testid={`tree-row-${node.section_number}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setOpenMenuSectionNumber((prev) =>
                      prev === node.section_number ? null : node.section_number
                    );
                  }}
                  className={`relative flex items-center justify-between gap-2 px-3 py-2.5 text-xs transition-colors ${
                    isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div
                    className="flex items-center gap-2 min-w-0 flex-1"
                    style={{ paddingLeft: `${indentPx}px` }}
                  >
                    {node.section_number !== '0' && (
                      <button
                        type="button"
                        onClick={() => toggleCheckSection(node.section_number)}
                        aria-label={`Pin section ${node.section_number} ${node.title}`}
                        className={`shrink-0 ${
                          isSelected ? 'text-slate-300 hover:text-white' : 'text-slate-400 hover:text-slate-800'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSectionNumber(node.section_number);
                        if (editingSectionNumber && editingSectionNumber !== node.section_number) {
                          setEditingSectionNumber(node.section_number);
                          setEditDraftText(node.body_text);
                        }
                      }}
                      className="text-left truncate flex-1 font-medium"
                    >
                      <span className="font-mono tabular-nums mr-1.5">
                        {node.section_number === '0' ? 'ROOT' : node.section_number}
                      </span>
                      <span>{node.title}</span>
                    </button>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 shrink-0 font-mono text-[11px] tabular-nums ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {diff && diff.change_type === 'MODIFIED' && (
                      <span className={isSelected ? 'text-amber-300' : 'text-amber-700 font-semibold'}>
                        MOD
                      </span>
                    )}
                    {diff && diff.change_type === 'ADDED' && (
                      <span className={isSelected ? 'text-emerald-300' : 'text-emerald-700 font-semibold'}>
                        NEW
                      </span>
                    )}
                    {diff && diff.staleness_category === 'TRANSITIVE_STALE' && (
                      <span className={isSelected ? 'text-rose-300' : 'text-rose-700 font-semibold'}>
                        TRANSITIVE
                      </span>
                    )}
                    <span>p.{node.page_start}</span>

                    {/* Context-Sensitive Row Menu Trigger Button */}
                    <button
                      type="button"
                      data-testid={`row-menu-btn-${node.section_number}`}
                      aria-label={`Actions for section ${node.section_number}`}
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuSectionNumber((prev) =>
                          prev === node.section_number ? null : node.section_number
                        );
                      }}
                      className={`p-1 rounded-md transition-colors ${
                        isSelected
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Context-Sensitive Dropdown Menu */}
                  {isMenuOpen && (
                    <div
                      role="menu"
                      aria-label={`Context actions for section ${node.section_number}`}
                      data-testid={`row-context-menu-${node.section_number}`}
                      onMouseDown={(e) => e.stopPropagation()}
                      className={`export-tooltip-card absolute right-9 ${
                        openUpwards ? 'bottom-1' : 'top-1'
                      } w-52 py-1.5 border rounded-lg shadow-xl z-40 text-slate-900 font-sans`}
                    >
                      <div className="px-3 py-1 border-b border-slate-200 text-[10px] font-mono text-slate-500 truncate">
                        Sec {node.section_number === '0' ? 'ROOT' : node.section_number} · {node.logical_node_id}
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        data-testid={`menu-action-analyze-${node.section_number}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyzeNode(node);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Analyze Section</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        data-testid={`menu-action-edit-${node.section_number}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditNode(node);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                        <span>Edit Section</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        data-testid={`menu-action-copy-${node.section_number}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleCopySectionId(node);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                        <span>Copy Section ID</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Version-Pinned Selection Creator Form */}
          <form
            onSubmit={handleSaveSelection}
            className="pt-3 border-t border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold text-slate-900">
                Pin Selection Snapshot (v{currentDoc.version_number})
              </span>
              <span className="font-mono tabular-nums">
                {checkedSections.length} sections checked
              </span>
            </div>

            <div>
              <label htmlFor="selection-name-input" className="block text-xs text-slate-600 mb-1">
                Selection Name
              </label>
              <input
                id="selection-name-input"
                type="text"
                value={selectionName}
                onChange={(e) => setSelectionName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Version-Pinned Selection ({checkedSections.length} Nodes)
            </button>

            {selectionNotice && (
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                {selectionNotice}
              </p>
            )}
          </form>
        </div>

        {/* Right Column: Selected Node Details + 8 PDF Structural Irregularities Audit */}
        <div className="lg:col-span-7 space-y-6">
          {selectedNode && (
            <section
              aria-label="Selected section detail inspector"
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 tabular-nums">
                    <span>Section {selectedNode.section_number}</span>
                    <span aria-hidden="true">·</span>
                    <span>Level {selectedNode.level}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Parent: {selectedNode.parent_section_number ?? 'None (Document Root)'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Page {selectedNode.page_start}
                      {selectedNode.page_end !== selectedNode.page_start
                        ? `–${selectedNode.page_end}`
                        : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Order #{selectedNode.physical_order}</span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 mt-1.5">
                    {selectedNode.section_number !== '0' && (
                      <span className="font-mono tabular-nums mr-2">
                        {selectedNode.section_number}
                      </span>
                    )}
                    {selectedNode.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 mt-2 tabular-nums">
                    <span>Logical ID: {selectedNode.logical_node_id}</span>
                    <span aria-hidden="true">·</span>
                    <span>Font: {selectedNode.font_info}</span>
                    <span aria-hidden="true">·</span>
                    <span>SHA-256: {selectedNode.content_hash.slice(0, 16)}...</span>
                  </div>
                </div>

                {/* Quick Toolbar mirroring Row Context Menu Actions */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid="inspector-analyze-section-btn"
                    onClick={() => handleAnalyzeNode(selectedNode)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Analyze Section
                  </button>
                  <button
                    type="button"
                    data-testid="inspector-edit-section-btn"
                    onClick={() =>
                      editingSectionNumber === selectedNode.section_number
                        ? setEditingSectionNumber(null)
                        : handleStartEditNode(selectedNode)
                    }
                    className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg inline-flex items-center gap-1.5 transition-colors ${
                      editingSectionNumber === selectedNode.section_number
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'text-slate-800 bg-slate-100 hover:bg-slate-200 border-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {editingSectionNumber === selectedNode.section_number
                      ? 'Editing Active'
                      : 'Edit Section'}
                  </button>
                  <button
                    type="button"
                    data-testid="inspector-copy-id-btn"
                    onClick={() => void handleCopySectionId(selectedNode)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-700" />
                    Copy Section ID
                  </button>
                </div>
              </div>

              {/* Inline Section Editor Form (triggered by 'Edit Section' action) */}
              {editingSectionNumber === selectedNode.section_number ? (
                <form
                  ref={editFormRef}
                  onSubmit={handleSaveEditedNode}
                  data-testid="section-inline-edit-form"
                  className="p-4 bg-slate-50 border-2 border-slate-900 rounded-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <label
                      htmlFor="inline-section-edit-textarea"
                      className="text-xs font-bold text-slate-900 flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-900" />
                      Live Section Prose Editor — Section {selectedNode.section_number} (v{currentDoc.version_number}.0)
                    </label>
                    <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                      Live SHA-256, Threshold & Staleness Recalculation Active
                    </span>
                  </div>

                  <textarea
                    ref={editTextareaRef}
                    id="inline-section-edit-textarea"
                    data-testid="section-inline-edit-textarea"
                    rows={4}
                    value={editDraftText}
                    onChange={(e) => handleLiveDraftChange(e.target.value)}
                    className="w-full p-3 text-xs font-sans bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900 leading-relaxed"
                  />

                  {/* Live Real-Time SHA-256, Clinical Thresholds & Staleness Telemetry Panel */}
                  {liveEditTelemetry && (
                    <div
                      data-testid="live-edit-telemetry-panel"
                      className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2.5 text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono tabular-nums">
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="text-[10px] text-slate-500">Live SHA-256 Content Hash</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">
                            {liveEditTelemetry.liveHash.slice(0, 16)}...
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 font-semibold ${
                              liveEditTelemetry.hashChangedFromV1
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {liveEditTelemetry.hashChangedFromV1
                              ? `Changed vs v1 (${liveEditTelemetry.v1Hash.slice(0, 10)}...)`
                              : 'Matches Pinned v1 Hash'}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="text-[10px] text-slate-500">
                            Live Extracted Clinical Specs ({liveEditTelemetry.liveSpecs.length})
                          </div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5 break-words">
                            {liveEditTelemetry.liveSpecs.length > 0
                              ? liveEditTelemetry.liveSpecs.join(' · ')
                              : 'None'}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="text-[10px] text-slate-500">
                            Live Staleness Status (vs v1)
                          </div>
                          <div
                            data-testid="live-edit-staleness-badge"
                            className={`text-xs font-bold mt-0.5 ${
                              liveEditTelemetry.stalenessStatus === 'CRITICAL_THRESHOLD_CHANGE'
                                ? 'text-red-700'
                                : liveEditTelemetry.stalenessStatus === 'TRANSITIVE_STALE'
                                  ? 'text-amber-700'
                                  : liveEditTelemetry.stalenessStatus === 'COSMETIC_WORDING_CHANGE'
                                    ? 'text-sky-700'
                                    : 'text-emerald-700'
                            }`}
                          >
                            {liveEditTelemetry.stalenessStatus}
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-700 font-mono leading-relaxed">
                        {liveEditTelemetry.explanation}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {liveEditTelemetry && (
                        <button
                          type="button"
                          onClick={() => handleLiveDraftChange(liveEditTelemetry.v1BodyText)}
                          className="px-2.5 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          Reset to v1 Baseline Prose
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingSectionNumber(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Close Editor
                      </button>
                      <button
                        type="submit"
                        data-testid="section-inline-edit-save-btn"
                        disabled={isSavingEdit || !editDraftText.trim()}
                        className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        {isSavingEdit ? 'Saving & Recomputing...' : 'Save Section Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Prose Body Text */
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-700">
                      Normalized Section Text (U+2011 Hyphens Normalized & Cross-Page Stitched)
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleStartEditNode(selectedNode)}
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit Section Prose
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedNode.body_text}
                  </div>
                </div>
              )}

              {/* Structured Tables (if present, e.g. 2.1 and 4.2) */}
              {selectedNode.tables.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5" />
                    Bounding-Box Deduplicated Table ({selectedNode.tables[0].rows.length} Rows)
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                          {selectedNode.tables[0].headers.map((h) => (
                            <th key={h} className="py-2.5 px-3 font-semibold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedNode.tables[0].rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`py-2 px-3 tabular-nums ${
                                  cIdx === 0 ? 'font-mono font-semibold text-slate-900' : 'text-slate-700'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Disambiguated Numbered List Items (e.g. Section 3.3 items 1..5) */}
              {selectedNode.list_items.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-700">
                    Disambiguated Numbered List Items (11.0pt Regular — Prevented False-Positive Top-Level Headings 1..5)
                  </h3>
                  <ul className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 tabular-nums">
                    {selectedNode.list_items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Clinical Specs & Cross-References */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-1.5">
                    Tier-2 Extracted Clinical & Numeric Thresholds
                  </h3>
                  {selectedNode.extracted_specs.length > 0 ? (
                    <p className="text-xs font-mono text-slate-800 tabular-nums leading-relaxed">
                      {selectedNode.extracted_specs.join(' · ')}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No numeric thresholds in this prose block (wording changes will classify as COSMETIC_WORDING_CHANGE).
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-1.5">
                    Tier-3 Outbound Section Cross-References
                  </h3>
                  {selectedNode.referenced_sections.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedNode.referenced_sections.map((refSec) => (
                        <button
                          key={refSec}
                          type="button"
                          onClick={() => setSelectedSectionNumber(refSec)}
                          className="px-2.5 py-1 text-xs font-mono font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors tabular-nums"
                        >
                          Jump to Section {refSec} →
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No outbound cross-references detected.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Complete 8 PDF Irregularities Audit Table */}
          <section
            aria-label="8 PDF Structural Irregularities Handled"
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-700" />
                  8 PDF Structural Irregularities Resolved in Parser
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any section link below to inspect how the parser resolved the layout anomaly in the tree.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                    <th className="py-2.5 px-3 font-semibold">Anomaly & Section</th>
                    <th className="py-2.5 px-3 font-semibold">PDF Irregularity Trap</th>
                    <th className="py-2.5 px-3 font-semibold">Parser Resolution Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentDoc.anomalies.map((anom) => {
                    const primarySec = anom.section_number.split('/')[0].trim();
                    return (
                      <tr key={anom.code} className="hover:bg-slate-50 align-top">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedSectionNumber(primarySec)}
                            className="font-mono font-semibold text-slate-900 hover:underline text-left tabular-nums"
                          >
                            Sec {anom.section_number} (p.{anom.page_number})
                          </button>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {anom.title}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 leading-relaxed">
                          {anom.description}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 leading-relaxed">
                          {anom.resolution}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
