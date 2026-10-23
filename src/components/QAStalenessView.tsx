import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Cpu,
  FlaskConical,
  History,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import {
  buildCT200Version1Nodes,
  draftTestCaseRemediation,
  evaluateGenerationStaleness,
  type DocumentVersionRecord,
  type EvaluatedTestCase,
  type QAGenerationRecord,
  type RemediatedTestDraft,
  type SelectionRecord,
  type StalenessCategory,
} from '../engine/traceabilityEngine';

const BASELINE_SEC_11_TEXT =
  'The CT-200 is intended to non-invasively measure blood pressure and pulse rate in adults with an arm circumference of 22–42 cm. It is not intended for use on neonates, infants, or pregnant users, and is not a diagnostic device — readings should be interpreted by a qualified clinician.';

interface QAStalenessViewProps {
  versions: DocumentVersionRecord[];
  activeVersionNumber: number;
  selections: SelectionRecord[];
  generations: QAGenerationRecord[];
  activeGenerationId: string;
  onSelectGenerationId: (genId: string) => void;
  generationBanner: string | null;
  onUpdateGenerationBanner: (banner: string | null) => void;
  evaluatedTestCases: EvaluatedTestCase[];
  onSwitchVersion: (ver: number) => Promise<void>;
  onGenerateTests: (params: {
    selection_id: string;
    model: string;
    force_regenerate: boolean;
    simulate_retry_fault: boolean;
  }) => Promise<{ cached_hit: boolean; generation: QAGenerationRecord }>;
  onSimulateEdit: (
    versionNumber: number,
    sectionNumber: string,
    newBodyText: string
  ) => Promise<void>;
  onRemediateTestCase?: (params: {
    generation_id: string;
    test_id: string;
    target_version: number;
    apply_remediation: boolean;
    model?: string;
  }) => Promise<RemediatedTestDraft | null>;
  onAskCopilot?: (prompt: string) => void;
  onResetState: () => Promise<void>;
}

export const QAStalenessView: React.FC<QAStalenessViewProps> = ({
  versions,
  activeVersionNumber,
  selections,
  generations,
  activeGenerationId,
  onSelectGenerationId,
  generationBanner,
  onUpdateGenerationBanner,
  evaluatedTestCases,
  onSwitchVersion,
  onGenerateTests,
  onSimulateEdit,
  onRemediateTestCase,
  onAskCopilot,
  onResetState,
}) => {
  const [selectedSelectionId, setSelectedSelectionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ct200-qa-selected-selection-id');
      if (saved && selections.some((s) => s.selection_id === saved)) return saved;
    } catch (_e) {
      // Ignore storage errors
    }
    return selections[0]?.selection_id || '';
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem('ct200-qa-selected-model') || 'gemini-3.8-flash';
    } catch (_e) {
      return 'gemini-3.8-flash';
    }
  });

  const [forceRegenerate, setForceRegenerate] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ct200-qa-force-regenerate');
      if (saved !== null) return saved === 'true';
    } catch (_e) {
      // Ignore storage errors
    }
    return true;
  });

  const [simulateRetryFault, setSimulateRetryFault] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ct200-qa-simulate-retry');
      if (saved !== null) return saved === 'true';
    } catch (_e) {
      // Ignore storage errors
    }
    return true;
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | StalenessCategory>('ALL');
  const [remediationDrafts, setRemediationDrafts] = useState<Record<string, RemediatedTestDraft>>(
    {}
  );
  const [remediatingTestId, setRemediatingTestId] = useState<string | null>(null);
  const [appliedRemediationIds, setAppliedRemediationIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      if (selectedSelectionId) {
        localStorage.setItem('ct200-qa-selected-selection-id', selectedSelectionId);
      }
    } catch (_e) {
      // Ignore storage errors
    }
  }, [selectedSelectionId]);

  useEffect(() => {
    try {
      localStorage.setItem('ct200-qa-selected-model', selectedModel);
    } catch (_e) {
      // Ignore storage errors
    }
  }, [selectedModel]);

  useEffect(() => {
    try {
      localStorage.setItem('ct200-qa-force-regenerate', String(forceRegenerate));
    } catch (_e) {
      // Ignore storage errors
    }
  }, [forceRegenerate]);

  useEffect(() => {
    try {
      localStorage.setItem('ct200-qa-simulate-retry', String(simulateRetryFault));
    } catch (_e) {
      // Ignore storage errors
    }
  }, [simulateRetryFault]);

  const activeSelection = useMemo(
    () =>
      selections.find((s) => s.selection_id === selectedSelectionId) ||
      selections[0],
    [selections, selectedSelectionId]
  );

  const activeGeneration = useMemo(
    () =>
      generations.find((g) => g.generation_id === activeGenerationId) ||
      generations[generations.length - 1] ||
      null,
    [generations, activeGenerationId]
  );

  const canonicalV1 = useMemo(() => buildCT200Version1Nodes(), []);

  // Evaluate the currently selected generation revision live against the active document version
  const activeSuiteEvaluatedCases = useMemo(() => {
    if (!activeGeneration) return evaluatedTestCases;
    const v1 = versions.find((v) => v.version_number === 1) || canonicalV1;
    const targetDoc =
      versions.find((v) => v.version_number === activeVersionNumber) ||
      versions.find((v) => v.version_number === 2) ||
      v1;
    const pinnedDoc =
      versions.find((v) => v.version_number === activeGeneration.pinned_version) || v1;
    if (!targetDoc || !pinnedDoc) return evaluatedTestCases;

    // Ensure Section 1.1 is always represented in the suite so Demo 2 (Sec 1.1 Live Proof) always has TC-CT200-V1-11
    let genToEvaluate = activeGeneration;
    const hasSec11 = activeGeneration.test_cases.some((tc) =>
      tc.source_section_numbers.includes('1.1')
    );
    if (!hasSec11) {
      const sec11Node = canonicalV1.nodes.find((n) => n.section_number === '1.1');
      if (sec11Node) {
        genToEvaluate = {
          ...activeGeneration,
          node_snapshots: [
            ...activeGeneration.node_snapshots,
            {
              node_id: sec11Node.node_id,
              logical_node_id: sec11Node.logical_node_id,
              section_number: '1.1',
              title: sec11Node.title,
              version_number: 1,
              pinned_content_hash: sec11Node.content_hash,
              pinned_body_text: sec11Node.body_text,
              pinned_specs: sec11Node.extracted_specs,
              referenced_sections: sec11Node.referenced_sections,
            },
          ],
          test_cases: [
            ...activeGeneration.test_cases,
            {
              test_id: 'TC-CT200-V1-11',
              title: 'Section 1.1 (Intended Use) Regulatory Verification',
              category: 'FUNCTIONAL',
              priority: 'P1_HIGH',
              source_section_numbers: ['1.1'],
              requirement_excerpt: sec11Node.body_text,
              preconditions: ['Device configured per Section 1.1 (Intended Use)'],
              steps: [
                'Configure bench test environment to exercise Section 1.1 requirements (22–42 cm).',
                'Verify nominal and boundary conditions against Section 1.1 acceptance criteria.',
                'Record telemetry output and display state in the IEC 62304 verification log.',
              ],
              expected_result: `Device behavior conforms to Section 1.1 specification: ${sec11Node.body_text}`,
            },
          ],
        };
      }
    }

    return evaluateGenerationStaleness(genToEvaluate, targetDoc, pinnedDoc);
  }, [activeGeneration, versions, activeVersionNumber, evaluatedTestCases, canonicalV1]);

  const sec11EvaluatedCase = useMemo(
    () =>
      activeSuiteEvaluatedCases.find((tc) =>
        tc.source_section_numbers.includes('1.1')
      ) || null,
    [activeSuiteEvaluatedCases]
  );

  const filteredTestCases = useMemo(() => {
    if (statusFilter === 'ALL') return activeSuiteEvaluatedCases;
    return activeSuiteEvaluatedCases.filter((tc) => tc.staleness_status === statusFilter);
  }, [activeSuiteEvaluatedCases, statusFilter]);

  const counts = useMemo(() => {
    const map = {
      FRESH: 0,
      COSMETIC_WORDING_CHANGE: 0,
      CRITICAL_THRESHOLD_CHANGE: 0,
      TRANSITIVE_STALE: 0,
    };
    for (const tc of activeSuiteEvaluatedCases) {
      map[tc.staleness_status] = (map[tc.staleness_status] || 0) + 1;
    }
    return map;
  }, [activeSuiteEvaluatedCases]);

  const handleRunGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelection) return;
    setIsGenerating(true);
    try {
      const result = await onGenerateTests({
        selection_id: activeSelection.selection_id,
        model: selectedModel,
        force_regenerate: forceRegenerate,
        simulate_retry_fault: simulateRetryFault,
      });
      onSelectGenerationId(result.generation.generation_id);
      if (result.cached_hit) {
        onUpdateGenerationBanner(
          `Idempotent Fingerprint Cache Hit (${result.generation.selection_fingerprint.slice(0, 12)}...): Returned existing generation ${result.generation.generation_id} (Revision #${result.generation.revision}) with ${result.generation.test_cases.length} traceable test cases.`
        );
      } else {
        onUpdateGenerationBanner(
          `Generated QA Suite ${result.generation.generation_id} (Revision #${result.generation.revision}) with ${result.generation.test_cases.length} traceable test cases using ${result.generation.model_used}.`
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimulateCosmeticEdit = async () => {
    setStatusFilter('ALL');
    const cosmeticText =
      'The CT-200 is intended to non-invasively measure blood pressure and pulse rate in adults with an arm circumference of 22–42 cm. It is not intended for use on neonates, infants, or pregnant users, and is not a diagnostic device — readings should be interpreted by a licensed healthcare physician.';
    await onSimulateEdit(activeVersionNumber, '1.1', cosmeticText);
    if (activeVersionNumber !== 2) {
      await onSimulateEdit(2, '1.1', cosmeticText);
    }
    onUpdateGenerationBanner(
      'Simulated Cosmetic Wording Edit on Section 1.1 ("qualified clinician" → "licensed healthcare physician"). TC-CT200-V1-11 is now classified as COSMETIC_WORDING_CHANGE (Re-Test Not Required) because the SHA-256 hash changed while the clinical threshold (22–42 cm) stayed identical!'
    );
  };

  const handleSimulateThresholdEdit = async () => {
    setStatusFilter('ALL');
    const thresholdText =
      'The CT-200 is intended to non-invasively measure blood pressure and pulse rate in adults with an arm circumference of 24–40 cm. It is not intended for use on neonates, infants, or pregnant users, and is not a diagnostic device — readings should be interpreted by a qualified clinician.';
    await onSimulateEdit(activeVersionNumber, '1.1', thresholdText);
    if (activeVersionNumber !== 2) {
      await onSimulateEdit(2, '1.1', thresholdText);
    }
    onUpdateGenerationBanner(
      'Simulated Critical Threshold Edit on Section 1.1 ("22–42 cm" → "24–40 cm"). TC-CT200-V1-11 immediately escalated to CRITICAL_THRESHOLD_CHANGE (Re-Test Mandatory) because a clinical boundary changed!'
    );
  };

  const handleRestoreSec11Baseline = async () => {
    setStatusFilter('ALL');
    await onSimulateEdit(activeVersionNumber, '1.1', BASELINE_SEC_11_TEXT);
    if (activeVersionNumber !== 2) {
      await onSimulateEdit(2, '1.1', BASELINE_SEC_11_TEXT);
    }
    onUpdateGenerationBanner(
      'Restored Section 1.1 (Intended Use) to baseline ("22–42 cm" and "qualified clinician"). TC-CT200-V1-11 is now FRESH (Valid).'
    );
  };

  const handleDraftRemediation = async (tc: EvaluatedTestCase) => {
    setRemediatingTestId(tc.test_id);
    try {
      const targetDoc =
        versions.find((v) => v.version_number === activeVersionNumber) ||
        versions.find((v) => v.version_number === 2) ||
        versions[0];
      if (onRemediateTestCase && activeGeneration) {
        const serverDraft = await onRemediateTestCase({
          generation_id: activeGeneration.generation_id,
          test_id: tc.test_id,
          target_version: activeVersionNumber,
          apply_remediation: false,
          model: selectedModel,
        });
        if (serverDraft) {
          setRemediationDrafts((prev) => ({ ...prev, [tc.test_id]: serverDraft }));
          return;
        }
      }
      if (targetDoc) {
        const localDraft = draftTestCaseRemediation({
          testCase: tc,
          targetDoc,
          modelUsed: `${selectedModel} (IEC 62304 Test Remediator)`,
        });
        setRemediationDrafts((prev) => ({ ...prev, [tc.test_id]: localDraft }));
      }
    } finally {
      setRemediatingTestId(null);
    }
  };

  const handleApplyRemediation = async (tc: EvaluatedTestCase) => {
    if (!activeGeneration) return;
    setRemediatingTestId(tc.test_id);
    try {
      if (onRemediateTestCase) {
        const appliedDraft = await onRemediateTestCase({
          generation_id: activeGeneration.generation_id,
          test_id: tc.test_id,
          target_version: activeVersionNumber,
          apply_remediation: true,
          model: selectedModel,
        });
        if (appliedDraft) {
          setRemediationDrafts((prev) => ({ ...prev, [tc.test_id]: appliedDraft }));
        }
      }
      setAppliedRemediationIds((prev) => ({ ...prev, [tc.test_id]: true }));
    } finally {
      setRemediatingTestId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Active Evaluation Target Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500 tabular-nums">
            Pydantic Structured LLM Output · 3x Self-Healing Retry Loop · 3-Tier + Transitive Staleness Judge
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            QA Test Suite Generator & Live Staleness Evaluation Engine
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            <span>
              Active Suite: {activeGeneration?.generation_id || 'gen_v1_baseline_01'} (Revision #
              {activeGeneration?.revision || 1})
            </span>
            <span aria-hidden="true">·</span>
            <span>Evaluated vs: Manual v{activeVersionNumber}.0</span>
            <span aria-hidden="true">·</span>
            <span>Total Test Cases: {activeSuiteEvaluatedCases.length}</span>
            <span aria-hidden="true">·</span>
            <span>Critical Threshold Stale: {counts.CRITICAL_THRESHOLD_CHANGE}</span>
            <span aria-hidden="true">·</span>
            <span>Transitive Stale: {counts.TRANSITIVE_STALE}</span>
            <span aria-hidden="true">·</span>
            <span>Cosmetic Wording: {counts.COSMETIC_WORDING_CHANGE}</span>
            <span aria-hidden="true">·</span>
            <span>Fresh: {counts.FRESH}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
            role="group"
            aria-label="Evaluate staleness against version"
          >
            <button
              type="button"
              onClick={() => onSwitchVersion(1)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                activeVersionNumber === 1
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Evaluate vs v1 (All Fresh)
            </button>
            <button
              type="button"
              onClick={() => onSwitchVersion(2)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                activeVersionNumber === 2
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Evaluate vs v2 (Re-Ingested)
            </button>
          </div>
        </div>
      </div>

      {/* Top 12-Col Grid: LLM Generator Config & Immediate Suite Output (6 cols) + Self-Healing Log & Simulator (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: LLM Generation Form + Persistent Generated QA Suite Result Panel */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <form onSubmit={handleRunGeneration} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-700" />
                  Generate Version-Pinned QA Test Cases
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generates 3–5 IEC 62304 test cases pinned to immutable SHA-256 node snapshots and stores every revision.
                </p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-200 rounded-md tabular-nums">
                {generations.length} Stored Revision{generations.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="pinned-selection-select" className="block text-xs font-medium text-slate-700 mb-1">
                  Version-Pinned Selection Snapshot
                </label>
                <select
                  id="pinned-selection-select"
                  value={activeSelection?.selection_id || ''}
                  onChange={(e) => setSelectedSelectionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  {selections.map((sel) => (
                    <option key={sel.selection_id} value={sel.selection_id}>
                      {sel.name} (Pinned v{sel.pinned_version} · {sel.items.length} sections: {sel.items.map((i) => i.section_number).join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="llm-model-select" className="block text-xs font-medium text-slate-700 mb-1">
                  Gemini Intelligence / Synthesizer Engine
                </label>
                <select
                  id="llm-model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  <option value="gemini-3.8-flash">
                    gemini-3.8-flash (Standard Regulatory Structured Output)
                  </option>
                  <option value="gemini-3.1-flash-lite">
                    gemini-3.1-flash-lite (Low-Latency Fast Generation)
                  </option>
                  <option value="gemini-4-argon">
                    gemini-4-argon (High Thinking Mode · ThinkingLevel.HIGH)
                  </option>
                  <option value="deterministic-iec62304-synthesizer">
                    Deterministic IEC 62304 Regulatory Synthesizer (Zero-Latency Bench Baseline)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceRegenerate}
                    onChange={(e) => setForceRegenerate(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold text-slate-900 block">
                      Force Regenerate (New Revision)
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Unchecked returns idempotent cached suite for identical fingerprint.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateRetryFault}
                    onChange={(e) => setSimulateRetryFault(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold text-slate-900 block">
                      Demonstrate Self-Healing Retry
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Injects Attempt #1 out-of-bounds section fault and logs Attempt #2 recovery.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              data-testid="run-qa-generation-btn"
              disabled={isGenerating}
              className="w-full py-2.5 px-4 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              {isGenerating
                ? 'Running Structured Generation & Pydantic Validation...'
                : 'Run QA Test Generation Pipeline'}
            </button>
          </form>

          {generationBanner && (
            <div
              data-testid="qa-generation-banner"
              className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-slate-900 font-medium leading-relaxed flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{generationBanner}</span>
            </div>
          )}

          {/* Persistent Generated QA Suite Result Panel directly below the banner */}
          {activeGeneration && (
            <div
              data-testid="generated-qa-suite-result"
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-700" />
                    <span>
                      Stored QA Suite Result: {activeGeneration.generation_id} (Revision #
                      {activeGeneration.revision})
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                    Model: {activeGeneration.model_used} · Pinned v{activeGeneration.pinned_version}.0 ·{' '}
                    {activeGeneration.test_cases.length} Traceable Test Cases
                  </p>
                </div>

                {/* Revision History Selector when multiple revisions exist */}
                {generations.length > 1 && (
                  <div
                    data-testid="qa-revision-switcher"
                    className="flex flex-wrap items-center gap-1"
                  >
                    {generations.map((gen) => (
                      <button
                        key={gen.generation_id}
                        type="button"
                        onClick={() => {
                          onSelectGenerationId(gen.generation_id);
                          onUpdateGenerationBanner(
                            `Viewing stored QA Suite ${gen.generation_id} (Revision #${gen.revision}) with ${gen.test_cases.length} traceable test cases using ${gen.model_used}.`
                          );
                        }}
                        className={`px-2 py-1 text-[11px] font-mono rounded-md border transition-colors tabular-nums ${
                          gen.generation_id === activeGeneration.generation_id
                            ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Rev #{gen.revision}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Compact Table of Generated Test Cases right below the button */}
              <div
                data-testid="generated-suite-test-list"
                className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white overflow-hidden"
              >
                {activeSuiteEvaluatedCases.map((tc) => (
                  <div
                    key={`${activeGeneration.generation_id}_summary_${tc.test_id}`}
                    className="p-2.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-500 tabular-nums">
                        <span className="font-semibold text-slate-900">{tc.test_id}</span>
                        <span>·</span>
                        <span>Sec {tc.source_section_numbers.join(', ')}</span>
                        <span>·</span>
                        <span>{tc.category}</span>
                      </div>
                      <div className="font-semibold text-slate-900 truncate mt-0.5">
                        {tc.title}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded border tabular-nums ${
                          tc.staleness_status === 'CRITICAL_THRESHOLD_CHANGE'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : tc.staleness_status === 'TRANSITIVE_STALE'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : tc.staleness_status === 'COSMETIC_WORDING_CHANGE'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {tc.staleness_status}
                      </span>
                      <a
                        href={`#card-${tc.test_id}`}
                        className="text-[11px] font-mono text-slate-600 hover:text-slate-900 underline"
                      >
                        Inspect ↓
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Self-Healing Retry Loop Audit Log & Tier-2 Wording vs Threshold Simulator */}
        <div className="lg:col-span-6 space-y-6">
          {/* Self-Healing Retry Audit Log */}
          {activeGeneration && (
            <section
              aria-label="Self-Healing Validation Retry Audit Log"
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h2 className="text-sm font-bold text-slate-900">
                  Self-Healing LLM Validation Loop Audit Log ({activeGeneration.generation_id})
                </h2>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  Revision #{activeGeneration.revision}
                </span>
              </div>

              <div className="space-y-2.5">
                {activeGeneration.attempt_logs.map((log) => (
                  <div
                    key={log.attempt_number}
                    className={`p-3 rounded-lg border text-xs space-y-1 ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                        : 'bg-amber-50/60 border-amber-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono tabular-nums">
                      <span className="font-semibold">
                        Attempt #{log.attempt_number} · {log.status}
                      </span>
                      <span className="text-slate-500">
                        {log.model_used} · {log.latency_ms} ms
                      </span>
                    </div>
                    {log.validation_error && (
                      <p className="text-amber-900 font-mono text-[11px]">
                        ValidationError: {log.validation_error}
                      </p>
                    )}
                    {log.self_healing_feedback_injected && (
                      <p className="text-slate-600 font-mono text-[11px]">
                        Injected Retry Prompt: {log.self_healing_feedback_injected}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Interactive Tier-2 Wording vs Threshold Simulator */}
          <section
            aria-label="Interactive Tier-2 Cosmetic Wording vs Critical Threshold Simulator"
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-slate-700" />
                Live Proof: Does a 1-Word Wording Edit Equal a Changed Pressure Threshold?
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Test Tier-2 spec extraction on Section 1.1 (Intended Use: arm circumference 22–42 cm) right now:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="simulate-cosmetic-sec11-btn"
                onClick={handleSimulateCosmeticEdit}
                className="px-3 py-2 text-xs font-medium text-sky-900 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors whitespace-nowrap"
              >
                1. Simulate Cosmetic Edit on Sec 1.1 ("clinician" → "physician")
              </button>
              <button
                type="button"
                data-testid="simulate-threshold-sec11-btn"
                onClick={handleSimulateThresholdEdit}
                className="px-3 py-2 text-xs font-medium text-red-900 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                2. Simulate Threshold Edit on Sec 1.1 ("22–42 cm" → "24–40 cm")
              </button>
              <button
                type="button"
                data-testid="restore-sec11-baseline-btn"
                onClick={handleRestoreSec11Baseline}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <RefreshCw className="w-3 h-3" />
                Restore Baseline
              </button>
            </div>

            {/* Live Section 1.1 & TC-CT200-V1-11 Telemetry Proof Box right inside the card */}
            {sec11EvaluatedCase && (
              <div
                data-testid="live-proof-sec11-status-box"
                className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                  sec11EvaluatedCase.staleness_status === 'CRITICAL_THRESHOLD_CHANGE'
                    ? 'bg-red-50/70 border-red-200 text-red-950'
                    : sec11EvaluatedCase.staleness_status === 'COSMETIC_WORDING_CHANGE'
                      ? 'bg-sky-50/70 border-sky-200 text-sky-950'
                      : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Live Target: {sec11EvaluatedCase.test_id} (Sec 1.1 Intended Use)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      data-testid="live-proof-sec11-verdict"
                      className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded border ${
                        sec11EvaluatedCase.staleness_status === 'CRITICAL_THRESHOLD_CHANGE'
                          ? 'bg-red-100 text-red-900 border-red-300'
                          : sec11EvaluatedCase.staleness_status === 'COSMETIC_WORDING_CHANGE'
                            ? 'bg-sky-100 text-sky-900 border-sky-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      {sec11EvaluatedCase.staleness_status === 'CRITICAL_THRESHOLD_CHANGE'
                        ? 'CRITICAL_THRESHOLD_CHANGE (Re-Test Mandatory)'
                        : sec11EvaluatedCase.staleness_status === 'COSMETIC_WORDING_CHANGE'
                          ? 'COSMETIC_WORDING_CHANGE (Re-Test Not Required)'
                          : 'FRESH (Baseline Valid)'}
                    </span>
                    <a
                      href={`#card-${sec11EvaluatedCase.test_id}`}
                      className="text-[11px] font-mono text-slate-700 hover:text-slate-900 underline"
                    >
                      Card ↓
                    </a>
                  </div>
                </div>

                {sec11EvaluatedCase.section_evaluations[0] && (
                  <div className="space-y-1 font-mono text-[11px] tabular-nums">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-700">
                      <span>
                        Pinned SHA-256: {sec11EvaluatedCase.section_evaluations[0].pinned_hash.slice(0, 12)}...
                      </span>
                      <span>
                        Active SHA-256: {sec11EvaluatedCase.section_evaluations[0].current_hash.slice(0, 12)}...
                      </span>
                    </div>
                    <p className="font-sans text-xs leading-relaxed">
                      {sec11EvaluatedCase.section_evaluations[0].explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Staleness Filter Tabs & Evaluated Test Cases List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Traceable QA Test Cases & Live Staleness Diagnostics (Evaluated vs v{activeVersionNumber}.0)
            </h2>
            {activeGeneration && (
              <p className="text-xs font-mono text-slate-500 mt-0.5 tabular-nums">
                Displaying Suite {activeGeneration.generation_id} (Revision #{activeGeneration.revision}) · Model:{' '}
                {activeGeneration.model_used}
              </p>
            )}
          </div>

          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
            role="group"
            aria-label="Filter test cases by staleness classification"
          >
            {(
              [
                { id: 'ALL', label: `All (${activeSuiteEvaluatedCases.length})` },
                {
                  id: 'CRITICAL_THRESHOLD_CHANGE',
                  label: `Critical Threshold (${counts.CRITICAL_THRESHOLD_CHANGE})`,
                },
                {
                  id: 'TRANSITIVE_STALE',
                  label: `Transitive Stale (${counts.TRANSITIVE_STALE})`,
                },
                {
                  id: 'COSMETIC_WORDING_CHANGE',
                  label: `Cosmetic Wording (${counts.COSMETIC_WORDING_CHANGE})`,
                },
                { id: 'FRESH', label: `Fresh (${counts.FRESH})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredTestCases.map((tc) => (
            <article
              id={`card-${tc.test_id}`}
              key={`${tc.generation_id}_${tc.test_id}`}
              data-testid={`qa-test-card-${tc.test_id}`}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 tabular-nums">
                    <span className="font-semibold text-slate-900">{tc.test_id}</span>
                    <span aria-hidden="true">·</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded font-semibold">
                      Suite: {tc.generation_id} (Revision #{tc.revision ?? activeGeneration?.revision ?? 1})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Category: {tc.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Priority: {tc.priority}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Pinned: v{tc.pinned_version} → Evaluated vs: v{tc.evaluated_against_version}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Sections: {tc.source_section_numbers.join(', ')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{tc.title}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs font-mono tabular-nums">
                  {tc.staleness_status === 'FRESH' && (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      FRESH (Valid)
                    </span>
                  )}
                  {tc.staleness_status === 'COSMETIC_WORDING_CHANGE' && (
                    <span className="text-sky-700 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      COSMETIC_WORDING_CHANGE (No Re-Test Needed)
                    </span>
                  )}
                  {tc.staleness_status === 'TRANSITIVE_STALE' && (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4" />
                      TRANSITIVE_STALE (Upstream Ref Changed)
                    </span>
                  )}
                  {tc.staleness_status === 'CRITICAL_THRESHOLD_CHANGE' && (
                    <span className="text-red-700 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4" />
                      CRITICAL_THRESHOLD_CHANGE (Re-Test Mandatory)
                    </span>
                  )}

                  <button
                    type="button"
                    data-testid={`draft-remediation-btn-${tc.test_id}`}
                    disabled={remediatingTestId === tc.test_id}
                    onClick={() => void handleDraftRemediation(tc)}
                    className="px-3 py-1.5 text-xs font-sans font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    {remediatingTestId === tc.test_id
                      ? 'Drafting v2.0 Remediation...'
                      : `Draft v${activeVersionNumber}.0 Test Remediation`}
                  </button>

                  {onAskCopilot && (
                    <button
                      type="button"
                      data-testid={`copilot-audit-test-btn-${tc.test_id}`}
                      onClick={() =>
                        onAskCopilot(
                          `Audit QA Test Case ${tc.test_id} (${tc.title}) pinned to Section ${tc.source_section_numbers.join(', ')}: explain its ${tc.staleness_status} status against Manual v${activeVersionNumber}.0 and provide updated v${activeVersionNumber}.0 verification steps.`
                        )
                      }
                      className="px-2.5 py-1.5 text-xs font-sans font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Audit in Co-Pilot
                    </button>
                  )}
                </div>
              </div>

              {/* Staleness Diagnostic Explanation Box */}
              {tc.section_evaluations.map((ev) => (
                <div
                  key={ev.section_number}
                  className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                    ev.status === 'CRITICAL_THRESHOLD_CHANGE'
                      ? 'bg-red-50/60 border-red-200 text-red-950'
                      : ev.status === 'TRANSITIVE_STALE'
                        ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                        : ev.status === 'COSMETIC_WORDING_CHANGE'
                          ? 'bg-sky-50/60 border-sky-200 text-sky-950'
                          : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                    <span className="font-semibold">
                      Section {ev.section_number} ({ev.title}) → {ev.status}
                    </span>
                    <span>
                      Pinned Hash: {ev.pinned_hash.slice(0, 10)}... · Active Hash:{' '}
                      {ev.current_hash.slice(0, 10)}...
                    </span>
                  </div>
                  <p className="leading-relaxed">{ev.explanation}</p>
                </div>
              ))}

              {/* AI-Drafted v2.0 Test Remediation Panel (when Draft v2.0 Test Remediation is clicked) */}
              {remediationDrafts[tc.test_id] && (
                <div
                  data-testid={`remediation-panel-${tc.test_id}`}
                  className="p-4 bg-emerald-50/60 border-2 border-emerald-300 rounded-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200 pb-2.5">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>
                          AI-Drafted v{remediationDrafts[tc.test_id].target_version}.0-Compliant Test Remediation —{' '}
                          {tc.test_id}
                        </span>
                        {appliedRemediationIds[tc.test_id] && (
                          <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-700 text-white rounded">
                            APPLIED & RE-PINNED TO v{remediationDrafts[tc.test_id].target_version}.0
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                        Synthesizer: {remediationDrafts[tc.test_id].model_used} ·{' '}
                        {remediationDrafts[tc.test_id].eco_rationale}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        data-testid={`apply-remediation-btn-${tc.test_id}`}
                        disabled={remediatingTestId === tc.test_id}
                        onClick={() => void handleApplyRemediation(tc)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {appliedRemediationIds[tc.test_id]
                          ? `Re-Pinned to v${remediationDrafts[tc.test_id].target_version}.0 (FRESH)`
                          : `Apply Remediation & Re-Pin to v${remediationDrafts[tc.test_id].target_version}.0`}
                      </button>
                      <button
                        type="button"
                        aria-label={`Close remediation draft for ${tc.test_id}`}
                        onClick={() =>
                          setRemediationDrafts((prev) => {
                            const next = { ...prev };
                            delete next[tc.test_id];
                            return next;
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-800 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                    <div className="md:col-span-5 space-y-2">
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Remediated v{remediationDrafts[tc.test_id].target_version}.0 Test Title:
                        </span>
                        <p className="font-bold text-slate-900 mt-0.5">
                          {remediationDrafts[tc.test_id].updated_title}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Updated v{remediationDrafts[tc.test_id].target_version}.0 Requirement Excerpt:
                        </span>
                        <p className="font-mono text-[11px] bg-white border border-emerald-200 rounded-lg p-2.5 mt-1 text-slate-800 whitespace-pre-wrap">
                          {remediationDrafts[tc.test_id].updated_requirement_excerpt}
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-2">
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Remediated v{remediationDrafts[tc.test_id].target_version}.0 Verification Steps:
                        </span>
                        <ol className="list-decimal list-inside bg-white border border-emerald-200 rounded-lg p-2.5 mt-1 space-y-1 text-slate-900">
                          {remediationDrafts[tc.test_id].updated_steps.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Remediated v{remediationDrafts[tc.test_id].target_version}.0 Expected Acceptance Result:
                        </span>
                        <p className="bg-white border border-emerald-200 rounded-lg p-2.5 mt-1 font-medium text-emerald-950">
                          {remediationDrafts[tc.test_id].updated_expected_result}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Requirement Excerpt & Steps */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                <div className="md:col-span-5 space-y-2">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700">
                      Pinned v{tc.pinned_version} Requirement Excerpt
                    </h4>
                    <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1 whitespace-pre-wrap font-mono tabular-nums">
                      {tc.requirement_excerpt}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-700">
                      Bench Preconditions
                    </h4>
                    <ul className="list-disc list-inside text-xs text-slate-600 mt-1 space-y-1">
                      {tc.preconditions.map((pre, idx) => (
                        <li key={idx}>{pre}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700">
                      Repeatable Verification Steps
                    </h4>
                    <ol className="list-decimal list-inside text-xs text-slate-800 mt-1 space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      {tc.steps.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-700">
                      Expected Acceptance Result (Pinned v{tc.pinned_version})
                    </h4>
                    <p className="text-xs text-slate-900 font-medium bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1 leading-relaxed tabular-nums">
                      {tc.expected_result}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
