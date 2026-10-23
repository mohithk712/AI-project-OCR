/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import {
  buildCT200Version1Nodes,
  buildCT200Version2Nodes,
  buildRegulatoryAuditReport,
  computeContentHash,
  detectRegulatoryContradictions,
  diffDocumentVersions,
  draftTestCaseRemediation,
  evaluateGenerationStaleness,
  extractClinicalSpecs,
  extractCrossReferences,
  formatExportTooltipSummary,
  normalizeRegulatoryText,
  synthesizeDeterministicTestCases,
  type DocumentVersionRecord,
  type EvaluatedTestCase,
  type NodeSnapshot,
  type QAGenerationRecord,
  type RemediatedTestDraft,
  type SectionDiffDetail,
  type SelectionRecord,
  type UploadedPdfAnalysisResult,
} from './engine/traceabilityEngine';
import { DocumentTreeView } from './components/DocumentTreeView';
import { VersionDiffView } from './components/VersionDiffView';
import { QAStalenessView } from './components/QAStalenessView';
import {
  GeminiCopilotView,
  INITIAL_COPILOT_WELCOME_MESSAGE,
  type ChatMessage,
} from './components/GeminiCopilotView';
import { DeliverablesView } from './components/DeliverablesView';
import { downloadApproachPdf } from './utils/generateApproachPdf';

type ActiveTab = 'tree' | 'diff' | 'staleness' | 'copilot' | 'deliverables';
export type ThemeMode = 'light' | 'dark' | 'system';

function createInitialClientState() {
  const v1 = buildCT200Version1Nodes();
  const v2 = buildCT200Version2Nodes();
  const diffs = diffDocumentVersions(v1, v2);

  const defaultSectionNums = ['2.1.1.1', '3.2', '4.2', '7.1', '1.1'];
  const items: NodeSnapshot[] = defaultSectionNums.map((sec) => {
    const node = v1.nodes.find((n) => n.section_number === sec)!;
    return {
      node_id: node.node_id,
      logical_node_id: node.logical_node_id,
      section_number: node.section_number,
      title: node.title,
      version_number: 1,
      pinned_content_hash: node.content_hash,
      pinned_body_text: node.body_text,
      pinned_specs: node.extracted_specs,
      referenced_sections: node.referenced_sections,
    };
  });

  const fingerprint = computeContentHash(
    `ct200-manual|1|${items.map((i) => `${i.section_number}:${i.pinned_content_hash}`).sort().join(',')}`
  );

  const defaultSelection: SelectionRecord = {
    selection_id: 'sel_v1_safety_and_battery',
    name: 'v1 Safety Interlocks, Inflation & Battery Verification Suite',
    doc_slug: 'ct200-manual',
    pinned_version: 1,
    selection_fingerprint: fingerprint,
    created_at: '2026-10-22T09:02:00.000Z',
    items,
  };

  const synthCases = synthesizeDeterministicTestCases(items);
  const seedGeneration: QAGenerationRecord = {
    generation_id: 'gen_v1_baseline_01',
    selection_id: defaultSelection.selection_id,
    selection_fingerprint: fingerprint,
    doc_slug: 'ct200-manual',
    pinned_version: 1,
    revision: 1,
    model_used: 'gemini-3.8-flash (IEC 62304 Structured Output)',
    created_at: '2026-10-22T09:03:00.000Z',
    cached_hit: false,
    node_snapshots: items,
    test_cases: synthCases,
    attempt_logs: [
      {
        attempt_number: 1,
        model_used: 'gemini-3.8-flash',
        status: 'VALIDATION_FAILED_RETRYING',
        latency_ms: 410,
        validation_error:
          'test_cases[2] cites out-of-bounds section "4.1" not present in pinned selection [2.1.1.1, 3.2, 4.2, 7.1, 1.1].',
        self_healing_feedback_injected:
          '[VALIDATION ERROR ON PREVIOUS ATTEMPT #1]: test_cases[2] cites out-of-bounds section "4.1". Restrict source_section_numbers strictly to [2.1.1.1, 3.2, 4.2, 7.1, 1.1].',
      },
      {
        attempt_number: 2,
        model_used: 'gemini-3.8-flash',
        status: 'SUCCESS',
        latency_ms: 520,
        validation_error: null,
        self_healing_feedback_injected: null,
      },
    ],
  };

  const evaluated = evaluateGenerationStaleness(seedGeneration, v2, v1);

  return {
    active_version_number: 2,
    versions: [v1, v2],
    diffs,
    selections: [defaultSelection],
    generations: [seedGeneration],
    evaluated_test_cases: evaluated,
  };
}

export default function App() {
  const initial = useMemo(() => createInitialClientState(), []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('tree');
  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(
    initial.active_version_number
  );
  const [versions, setVersions] = useState<DocumentVersionRecord[]>(initial.versions);
  const [diffs, setDiffs] = useState<SectionDiffDetail[]>(initial.diffs);
  const [selections, setSelections] = useState<SelectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ct200-qa-selections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as SelectionRecord[];
      }
    } catch (_e) {
      // Ignore storage errors
    }
    return initial.selections;
  });

  const [generations, setGenerations] = useState<QAGenerationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ct200-qa-generations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as QAGenerationRecord[];
      }
    } catch (_e) {
      // Ignore storage errors
    }
    return initial.generations;
  });

  const [activeGenerationId, setActiveGenerationId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ct200-active-generation-id');
      if (saved) return saved;
    } catch (_e) {
      // Ignore storage errors
    }
    return initial.generations[initial.generations.length - 1]?.generation_id || 'gen_v1_baseline_01';
  });

  const [qaGenerationBanner, setQaGenerationBanner] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('ct200-qa-generation-banner');
      if (saved) return saved;
    } catch (_e) {
      // Ignore storage errors
    }
    const latest = initial.generations[initial.generations.length - 1];
    return latest
      ? `Generated QA Suite ${latest.generation_id} (Revision #${latest.revision}) with ${latest.test_cases.length} traceable test cases using ${latest.model_used}.`
      : null;
  });

  const [evaluatedTestCases, setEvaluatedTestCases] = useState<EvaluatedTestCase[]>(
    initial.evaluated_test_cases
  );
  const [copilotPrompt, setCopilotPrompt] = useState<string | null>(null);
  const [isExportTooltipOpen, setIsExportTooltipOpen] = useState<boolean>(false);
  const [latestUploadedAnalysis, setLatestUploadedAnalysis] =
    useState<UploadedPdfAnalysisResult | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('ct200-qa-selections', JSON.stringify(selections));
    } catch (_e) {
      // Ignore storage errors
    }
  }, [selections]);

  useEffect(() => {
    try {
      localStorage.setItem('ct200-qa-generations', JSON.stringify(generations));
    } catch (_e) {
      // Ignore storage errors
    }
  }, [generations]);

  useEffect(() => {
    try {
      if (activeGenerationId) {
        localStorage.setItem('ct200-active-generation-id', activeGenerationId);
      }
    } catch (_e) {
      // Ignore storage errors
    }
  }, [activeGenerationId]);

  useEffect(() => {
    try {
      if (qaGenerationBanner) {
        localStorage.setItem('ct200-qa-generation-banner', qaGenerationBanner);
      }
    } catch (_e) {
      // Ignore storage errors
    }
  }, [qaGenerationBanner]);

  // Persistent Gemini Co-Pilot mode & chat history across tab switches and page reloads
  const [copilotMode, setCopilotMode] = useState<'fast' | 'standard' | 'thinking'>(() => {
    try {
      const savedMode = localStorage.getItem('ct200-copilot-mode');
      if (savedMode === 'fast' || savedMode === 'standard' || savedMode === 'thinking') {
        return savedMode;
      }
    } catch (_e) {
      // Ignore storage errors
    }
    return 'fast';
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem('ct200-copilot-history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as ChatMessage[];
        }
      }
    } catch (_e) {
      // Ignore storage errors
    }
    return [INITIAL_COPILOT_WELCOME_MESSAGE];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ct200-copilot-mode', copilotMode);
    } catch (_e) {
      // Ignore storage errors
    }
  }, [copilotMode]);

  useEffect(() => {
    try {
      localStorage.setItem('ct200-copilot-history', JSON.stringify(chatMessages));
    } catch (_e) {
      // Ignore storage errors
    }
  }, [chatMessages]);

  // Theme management: 'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('ct200-theme-mode');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch (_e) {
      // Ignore storage errors
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      localStorage.setItem('ct200-theme-mode', themeMode);
    } catch (_e) {
      // Ignore storage errors
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark =
        themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);
      document.documentElement.classList.toggle('dark', isDark);
      setResolvedTheme(isDark ? 'dark' : 'light');
    };

    applyTheme();
    const listener = () => {
      if (themeMode === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [themeMode]);

  const applyServerState = (data: {
    active_version_number?: number;
    versions?: DocumentVersionRecord[];
    diffs?: SectionDiffDetail[];
    selections?: SelectionRecord[];
    generations?: QAGenerationRecord[];
    active_generation_id?: string | null;
    last_generation_banner?: string | null;
    evaluated_test_cases?: EvaluatedTestCase[];
    latest_uploaded_analysis?: UploadedPdfAnalysisResult | null;
    chat_history?: ChatMessage[];
  }) => {
    if (typeof data.active_version_number === 'number') {
      setActiveVersionNumber(data.active_version_number);
    }
    if (Array.isArray(data.versions)) setVersions(data.versions);
    if (Array.isArray(data.diffs)) setDiffs(data.diffs);
    if (Array.isArray(data.selections)) setSelections(data.selections);
    if (Array.isArray(data.generations) && data.generations.length > 0) {
      setGenerations((prev) => {
        const byId = new Map<string, QAGenerationRecord>();
        for (const g of prev) byId.set(g.generation_id, g);
        for (const g of data.generations!) byId.set(g.generation_id, g);
        return Array.from(byId.values());
      });
    }
    if (typeof data.active_generation_id === 'string' && data.active_generation_id) {
      setActiveGenerationId((prev) =>
        data.generations && data.generations.length > 1 ? data.active_generation_id! : prev || data.active_generation_id!
      );
    }
    if (typeof data.last_generation_banner === 'string' && data.last_generation_banner) {
      setQaGenerationBanner((prev) =>
        data.generations && data.generations.length > 1 ? data.last_generation_banner! : prev || data.last_generation_banner!
      );
    }
    if (Array.isArray(data.evaluated_test_cases)) {
      setEvaluatedTestCases(data.evaluated_test_cases);
    }
    if (data.latest_uploaded_analysis !== undefined) {
      setLatestUploadedAnalysis(data.latest_uploaded_analysis);
    }
    if (Array.isArray(data.chat_history) && data.chat_history.length > 0) {
      setChatMessages((prev) =>
        data.chat_history!.length >= prev.length ? data.chat_history! : prev
      );
    }
  };

  useEffect(() => {
    fetch('/api/v1/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) applyServerState(data);
      })
      .catch(() => {
        // Keep deterministic initial client state if offline
      });
  }, []);

  const handleClearChatHistory = async () => {
    const resetMessages = [INITIAL_COPILOT_WELCOME_MESSAGE];
    setChatMessages(resetMessages);
    try {
      localStorage.setItem('ct200-copilot-history', JSON.stringify(resetMessages));
    } catch (_e) {
      // Ignore storage errors
    }
    try {
      await fetch('/api/v1/chat/clear', { method: 'POST' });
    } catch (_e) {
      // Ignore network errors
    }
  };

  const handleSwitchVersion = async (targetVer: number) => {
    setActiveVersionNumber(targetVer);
    try {
      const res = await fetch('/api/v1/documents/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_version: targetVer }),
      });
      if (res.ok) {
        const data = await res.json();
        applyServerState(data);
      }
    } catch (_err) {
      const v1 = versions.find((v) => v.version_number === 1)!;
      const targetDoc = versions.find((v) => v.version_number === targetVer) || v1;
      setEvaluatedTestCases(
        generations.flatMap((g) => evaluateGenerationStaleness(g, targetDoc, v1))
      );
    }
  };

  const handleResetState = async () => {
    try {
      localStorage.removeItem('ct200-qa-generations');
      localStorage.removeItem('ct200-qa-selections');
      localStorage.removeItem('ct200-active-generation-id');
      localStorage.removeItem('ct200-qa-generation-banner');
    } catch (_e) {
      // Ignore storage errors
    }
    try {
      const res = await fetch('/api/v1/documents/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_all: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.generations)) setGenerations(data.generations);
        if (data.active_generation_id) setActiveGenerationId(data.active_generation_id);
        if (data.last_generation_banner) setQaGenerationBanner(data.last_generation_banner);
        applyServerState(data);
        return;
      }
    } catch (_err) {
      // Fallback
    }
    const fresh = createInitialClientState();
    setGenerations(fresh.generations);
    setActiveGenerationId(fresh.generations[0].generation_id);
    setQaGenerationBanner(
      `Generated QA Suite ${fresh.generations[0].generation_id} (Revision #${fresh.generations[0].revision}) with ${fresh.generations[0].test_cases.length} traceable test cases using ${fresh.generations[0].model_used}.`
    );
    applyServerState(fresh);
  };

  const handleCreateSelection = async (
    name: string,
    versionNumber: number,
    sectionNumbers: string[]
  ) => {
    try {
      const res = await fetch('/api/v1/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          version_number: versionNumber,
          section_numbers: sectionNumbers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) applyServerState(data.state);
      }
    } catch (_err) {
      // Fallback handled
    }
  };

  const handleGenerateTests = async (params: {
    selection_id: string;
    model: string;
    force_regenerate: boolean;
    simulate_retry_fault: boolean;
  }) => {
    const res = await fetch('/api/v1/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    const genRecord = data.generation as QAGenerationRecord;
    const isCached = Boolean(data.cached_hit);

    if (genRecord) {
      setGenerations((prev) => {
        const exists = prev.some((g) => g.generation_id === genRecord.generation_id);
        return exists
          ? prev.map((g) => (g.generation_id === genRecord.generation_id ? genRecord : g))
          : [...prev, genRecord];
      });
      setActiveGenerationId(genRecord.generation_id);
      const bannerMsg = isCached
        ? `Idempotent Fingerprint Cache Hit (${genRecord.selection_fingerprint.slice(0, 12)}...): Returned existing generation ${genRecord.generation_id} (Revision #${genRecord.revision}) with ${genRecord.test_cases.length} traceable test cases.`
        : `Generated QA Suite ${genRecord.generation_id} (Revision #${genRecord.revision}) with ${genRecord.test_cases.length} traceable test cases using ${genRecord.model_used}.`;
      setQaGenerationBanner(bannerMsg);
    }

    if (data.state) {
      applyServerState(data.state);
    }

    return {
      cached_hit: isCached,
      generation: genRecord,
    };
  };

  const handleSimulateEdit = async (
    versionNumber: number,
    sectionNumber: string,
    newBodyText: string
  ) => {
    const cleanText = newBodyText.trim();
    if (!cleanText) return;

    // 1. Optimistically update client state immediately so UI hashes, specs, diffs, and staleness recalculate in 0ms
    setVersions((prevVersions) => {
      const updatedVersions = prevVersions.map((ver) => {
        if (ver.version_number !== versionNumber) return ver;
        const updatedNodes = ver.nodes.map((node) => {
          if (node.section_number !== sectionNumber) return node;
          const normalized = normalizeRegulatoryText(cleanText);
          return {
            ...node,
            body_text: cleanText,
            extracted_specs: extractClinicalSpecs(cleanText),
            referenced_sections: extractCrossReferences(cleanText, node.section_number),
            content_hash: computeContentHash(`${node.section_number}|${node.title}|${normalized}`),
          };
        });
        return {
          ...ver,
          nodes: updatedNodes,
          regulatory_contradictions: detectRegulatoryContradictions(
            updatedNodes,
            ver.version_number
          ),
        };
      });

      const v1 = updatedVersions.find((v) => v.version_number === 1) || updatedVersions[0];
      const activeDoc =
        updatedVersions.find((v) => v.version_number === versionNumber) ||
        updatedVersions.find((v) => v.version_number === activeVersionNumber) ||
        updatedVersions[1] ||
        v1;
      const compareTarget =
        activeDoc.version_number === 1 ? updatedVersions.find((v) => v.version_number === 2) || v1 : activeDoc;

      setDiffs(diffDocumentVersions(v1, compareTarget));
      setEvaluatedTestCases(
        generations.flatMap((g) => {
          const pinnedDoc =
            updatedVersions.find((v) => v.version_number === g.pinned_version) || v1;
          return evaluateGenerationStaleness(g, activeDoc, pinnedDoc);
        })
      );

      return updatedVersions;
    });

    try {
      const res = await fetch('/api/v1/nodes/simulate-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_number: versionNumber,
          section_number: sectionNumber,
          new_body_text: cleanText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        applyServerState(data);
      }
    } catch (_err) {
      // Optimistic client state already applied
    }
  };

  const handleRemediateTestCase = async (params: {
    generation_id: string;
    test_id: string;
    target_version: number;
    apply_remediation: boolean;
    model?: string;
  }): Promise<RemediatedTestDraft | null> => {
    try {
      const res = await fetch('/api/v1/remediate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.generation && params.apply_remediation) {
          const updatedGen = data.generation as QAGenerationRecord;
          setGenerations((prev) =>
            prev.map((g) => (g.generation_id === updatedGen.generation_id ? updatedGen : g))
          );
        }
        if (data.state) {
          applyServerState(data.state);
        }
        return data.draft as RemediatedTestDraft;
      }
    } catch (_err) {
      // Fallback to local deterministic remediation
    }

    const gen =
      generations.find((g) => g.generation_id === params.generation_id) ||
      generations[generations.length - 1];
    if (!gen) return null;
    const v1 = versions.find((v) => v.version_number === 1) || versions[0];
    const targetDoc =
      versions.find((v) => v.version_number === params.target_version) ||
      versions.find((v) => v.version_number === 2) ||
      v1;
    const pinnedDoc = versions.find((v) => v.version_number === gen.pinned_version) || v1;
    const evaluated = evaluateGenerationStaleness(gen, targetDoc, pinnedDoc);
    const tc = evaluated.find((t) => t.test_id === params.test_id) || evaluated[0];
    if (!tc) return null;

    const draft = draftTestCaseRemediation({
      testCase: tc,
      targetDoc,
      modelUsed: `${params.model || 'gemini-3.8-flash'} (IEC 62304 Test Remediator)`,
    });

    if (params.apply_remediation) {
      setGenerations((prev) =>
        prev.map((g) => {
          if (g.generation_id !== gen.generation_id) return g;
          const updatedTestCases = g.test_cases.map((item) =>
            item.test_id === tc.test_id
              ? {
                  ...item,
                  title: draft.updated_title,
                  requirement_excerpt: draft.updated_requirement_excerpt,
                  preconditions: draft.updated_preconditions,
                  steps: draft.updated_steps,
                  expected_result: draft.updated_expected_result,
                }
              : item
          );
          const updatedSnapshots = g.node_snapshots.map((snap) => {
            if (tc.source_section_numbers.includes(snap.section_number)) {
              const updatedNode = targetDoc.nodes.find(
                (n) => n.section_number === snap.section_number
              );
              if (updatedNode) {
                return {
                  ...snap,
                  version_number: targetDoc.version_number,
                  pinned_content_hash: updatedNode.content_hash,
                  pinned_body_text: updatedNode.body_text,
                  pinned_specs: updatedNode.extracted_specs,
                  referenced_sections: updatedNode.referenced_sections,
                };
              }
            }
            return snap;
          });
          return {
            ...g,
            test_cases: updatedTestCases,
            node_snapshots: updatedSnapshots,
          };
        })
      );
      setQaGenerationBanner(
        `Applied v${targetDoc.version_number}.0 Remediation to ${tc.test_id} and re-pinned SHA-256 snapshot in Suite ${gen.generation_id}.`
      );
    }

    return draft;
  };

  const handleAskCopilot = (prompt: string) => {
    setCopilotPrompt(prompt);
    setActiveTab('copilot');
  };

  const handleUploadPdf = async (payload: {
    filename: string;
    file_size_bytes: number;
    extracted_text?: string;
    base64_pdf?: string;
  }): Promise<UploadedPdfAnalysisResult | null> => {
    const res = await fetch('/api/v1/documents/upload-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.state) applyServerState(data.state);
      if (data.analysis) setLatestUploadedAnalysis(data.analysis);
      return data.analysis as UploadedPdfAnalysisResult;
    }
    return null;
  };

  const handleDeleteUploadedPdf = async (versionNumber: number) => {
    try {
      const res = await fetch('/api/v1/documents/delete-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_number: versionNumber }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) applyServerState(data.state);
        return;
      }
    } catch (_err) {
      // Fallback for offline state
    }
  };

  const currentAuditReport = useMemo(
    () =>
      buildRegulatoryAuditReport({
        activeVersionNumber,
        versions,
        diffs,
        evaluatedTestCases,
      }),
    [activeVersionNumber, versions, diffs, evaluatedTestCases]
  );

  const tooltipSummary = useMemo(
    () => formatExportTooltipSummary(currentAuditReport),
    [currentAuditReport]
  );

  const handleExportRegulatoryReport = () => {
    const jsonString = JSON.stringify(currentAuditReport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ct200-regulatory-audit-v${activeVersionNumber}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-theme-mode={themeMode}
      data-resolved-theme={resolvedTheme}
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900 transition-colors duration-150"
    >
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-50">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('tree');
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
        >
          CardioTrack CT-200 Traceability
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Workspace Views"
          className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto"
        >
          {(
            [
              { id: 'tree', label: 'Document Tree' },
              { id: 'diff', label: 'Version Diff' },
              { id: 'staleness', label: 'QA & Staleness' },
              { id: 'copilot', label: 'Gemini Co-Pilot' },
              { id: 'deliverables', label: 'Deliverables' },
            ] as const
          ).map((navItem) => (
            <a
              key={navItem.id}
              href={`#${navItem.id}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(navItem.id);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === navItem.id
                  ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2 decoration-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              {navItem.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 primary action with Hover-Card / Tooltip */}
        <div
          className="relative flex items-center shrink-0"
          onMouseEnter={() => setIsExportTooltipOpen(true)}
          onMouseLeave={() => setIsExportTooltipOpen(false)}
        >
          <button
            type="button"
            aria-describedby="export-report-tooltip"
            onClick={handleExportRegulatoryReport}
            onFocus={() => setIsExportTooltipOpen(true)}
            onBlur={() => setIsExportTooltipOpen(false)}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Regulatory Report
          </button>

          {/* Hover-Card / Tooltip displaying current findings summary */}
          <div
            id="export-report-tooltip"
            role="tooltip"
            aria-hidden={!isExportTooltipOpen}
            className={`export-tooltip-card absolute right-0 top-full mt-2 w-80 p-3.5 border rounded-xl shadow-xl z-50 ${
              isExportTooltipOpen
                ? 'opacity-100 pointer-events-auto block'
                : 'opacity-0 pointer-events-none hidden'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {tooltipSummary.status === 'STALE_DETECTED' ? (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-left">
                <p className="text-xs font-bold text-slate-900 font-display">
                  {tooltipSummary.headline}
                </p>
                <p className="text-[11px] font-mono text-slate-600 tabular-nums leading-relaxed">
                  {tooltipSummary.detailLine}
                </p>
                <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {tooltipSummary.contradictionLine}
                </p>
                <div className="pt-1.5 mt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500 tabular-nums">
                  <span>Target: ct200-regulatory-audit-v{activeVersionNumber}.json</span>
                  <span>IEC 62304</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-6 space-y-6">
        {/* Global Workspace Status & Theme Mode Switcher Bar (Light / Dark / System) */}
        <div
          aria-label="Workspace Audit Status and Appearance Toolbar"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600 tabular-nums">
            <span className="font-semibold text-slate-900">
              Live Audit Status (v{activeVersionNumber}.0):
            </span>
            <span
              className={
                tooltipSummary.status === 'STALE_DETECTED'
                  ? 'text-amber-700 font-semibold'
                  : 'text-emerald-700 font-semibold'
              }
            >
              {tooltipSummary.headline}
            </span>
            <span aria-hidden="true">·</span>
            <span>{tooltipSummary.detailLine}</span>
          </div>

          {/* Quick Approach PDF Download + Theme Selector */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => downloadApproachPdf()}
              className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              title="Download 5-page Assignment Approach Document PDF with Flowcharts for Google Form Submission"
            >
              <FileText className="w-3.5 h-3.5 text-sky-700" />
              Download Approach PDF (GForm)
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-medium">Theme:</span>
              <div
                role="group"
                aria-label="Theme mode selector"
                className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
              >
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  aria-pressed={themeMode === 'light'}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    themeMode === 'light'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  aria-pressed={themeMode === 'dark'}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    themeMode === 'dark'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('system')}
                  aria-pressed={themeMode === 'system'}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    themeMode === 'system'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  System
                </button>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'tree' && (
          <DocumentTreeView
            versions={versions}
            activeVersionNumber={activeVersionNumber}
            diffs={diffs}
            latestUploadedAnalysis={latestUploadedAnalysis}
            onSwitchVersion={handleSwitchVersion}
            onCreateSelection={handleCreateSelection}
            onUploadPdf={handleUploadPdf}
            onDeleteUploadedPdf={handleDeleteUploadedPdf}
            onSimulateEdit={handleSimulateEdit}
            onAskCopilot={handleAskCopilot}
          />
        )}

        {activeTab === 'diff' && (
          <VersionDiffView
            versions={versions}
            diffs={diffs}
            onSimulateEdit={handleSimulateEdit}
            onResetState={handleResetState}
            onAskCopilot={handleAskCopilot}
          />
        )}

        {activeTab === 'staleness' && (
          <QAStalenessView
            versions={versions}
            activeVersionNumber={activeVersionNumber}
            selections={selections}
            generations={generations}
            activeGenerationId={activeGenerationId}
            onSelectGenerationId={setActiveGenerationId}
            generationBanner={qaGenerationBanner}
            onUpdateGenerationBanner={setQaGenerationBanner}
            evaluatedTestCases={evaluatedTestCases}
            onSwitchVersion={handleSwitchVersion}
            onGenerateTests={handleGenerateTests}
            onSimulateEdit={handleSimulateEdit}
            onRemediateTestCase={handleRemediateTestCase}
            onAskCopilot={handleAskCopilot}
            onResetState={handleResetState}
          />
        )}

        {activeTab === 'copilot' && (
          <GeminiCopilotView
            messages={chatMessages}
            onUpdateMessages={setChatMessages}
            mode={copilotMode}
            onChangeMode={setCopilotMode}
            onClearHistory={handleClearChatHistory}
            initialPrompt={copilotPrompt}
            onClearInitialPrompt={() => setCopilotPrompt(null)}
          />
        )}

        {activeTab === 'deliverables' && <DeliverablesView />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 font-mono tabular-nums">
          <span>
            CardioTrack CT-200 Regulatory Document Traceability & Staleness Engine · IEC 62304 / ISO 13485
          </span>
          <span>
            v1 (28 Nodes, 6 Pages) · v2 (29 Nodes, 7 Pages) · 3-Tier + Transitive Staleness Judge
          </span>
        </div>
      </footer>
    </div>
  );
}
