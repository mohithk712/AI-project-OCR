import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitCompare,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type {
  DocumentVersionRecord,
  SectionDiffDetail,
} from '../engine/traceabilityEngine';

interface VersionDiffViewProps {
  versions: DocumentVersionRecord[];
  diffs: SectionDiffDetail[];
  onSimulateEdit: (versionNumber: number, sectionNumber: string, newBodyText: string) => Promise<void>;
  onResetState: () => Promise<void>;
  onAskCopilot: (prompt: string) => void;
}

export const VersionDiffView: React.FC<VersionDiffViewProps> = ({
  versions,
  diffs,
  onSimulateEdit,
  onResetState,
  onAskCopilot,
}) => {
  const [diffFilter, setDiffFilter] = useState<
    'impacted' | 'critical' | 'transitive' | 'added' | 'all'
  >('impacted');

  const v1 = versions.find((v) => v.version_number === 1);
  const v2 = versions.find((v) => v.version_number === 2);

  const impactedDiffs = useMemo(
    () =>
      diffs.filter(
        (d) => d.change_type !== 'UNCHANGED' || d.staleness_category === 'TRANSITIVE_STALE'
      ),
    [diffs]
  );

  const filteredDiffs = useMemo(() => {
    if (diffFilter === 'impacted') return impactedDiffs;
    if (diffFilter === 'critical') {
      return diffs.filter((d) => d.staleness_category === 'CRITICAL_THRESHOLD_CHANGE');
    }
    if (diffFilter === 'transitive') {
      return diffs.filter((d) => d.staleness_category === 'TRANSITIVE_STALE');
    }
    if (diffFilter === 'added') {
      return diffs.filter((d) => d.change_type === 'ADDED');
    }
    return diffs;
  }, [diffs, impactedDiffs, diffFilter]);

  const contradictions = v2?.regulatory_contradictions || [];

  const handleHarmonizeSection41 = async () => {
    await onSimulateEdit(
      2,
      '4.1',
      'If cuff pressure exceeds 299 mmHg at any point, or exceeds 300 mmHg for longer than 3 seconds due to sensor fault, the device immediately triggers an emergency deflation valve, halting inflation and venting the cuff within 1.5 seconds, independent of the main firmware control loop.'
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500 tabular-nums">
            3-Stage Logical Node Matcher · Non-Destructive Re-Ingestion (v1 → v2)
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Cross-Version Specification Diff & Regulatory Contradiction Audit
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            <span>v1: {v1?.node_count || 28} nodes (6 pages)</span>
            <span aria-hidden="true">→</span>
            <span>v2: {v2?.node_count || 29} nodes (7 pages)</span>
            <span aria-hidden="true">·</span>
            <span>4 Modified Sections</span>
            <span aria-hidden="true">·</span>
            <span>1 Added Section (5.3)</span>
            <span aria-hidden="true">·</span>
            <span>2 Transitive Cross-Ref Impacts (7.1, 3.3)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onResetState}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Reset v1 / v2 Baseline
          </button>
          <button
            type="button"
            onClick={() =>
              onAskCopilot(
                'Analyze the IEC 62304 safety impact of the v2 contradiction between Section 4.1 (2 seconds) and Section 4.2 E3 (1.5 seconds), and summarize all 4 threshold modifications.'
              )
            }
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Deep Audit with Gemini Co-Pilot
          </button>
        </div>
      </div>

      {/* Cross-Section Regulatory Contradiction Detector Panel */}
      <section
        aria-label="Automated Cross-Section Regulatory Contradiction Detector"
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-start gap-3">
            {contradictions.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Automated Cross-Section Regulatory Contradiction Detector
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Scans cross-referenced safety interlock parameters across sections to catch partial manual updates in v2.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {contradictions.length > 0 ? (
              <button
                type="button"
                onClick={handleHarmonizeSection41}
                className="px-3.5 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Wrench className="w-3.5 h-3.5" />
                Harmonize Section 4.1 to 1.5 seconds (Simulate ECO Fix)
              </button>
            ) : (
              <span className="text-xs font-mono text-emerald-700 font-semibold tabular-nums">
                RESOLVED · Section 4.1 & 4.2 E3 both aligned at 1.5 seconds
              </span>
            )}
          </div>
        </div>

        {contradictions.length > 0 ? (
          <div className="space-y-4">
            {contradictions.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-red-50/60 border border-red-200 rounded-lg space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-red-800 tabular-nums">
                  <span className="font-semibold">CRITICAL · {c.code}</span>
                  <span aria-hidden="true">·</span>
                  <span>Manual v{c.version_number}.0</span>
                  <span aria-hidden="true">·</span>
                  <span>Parameter: {c.parameter}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-white border border-red-200 rounded-lg">
                    <div className="text-xs font-mono text-slate-500">
                      {c.section_a} (Unupdated in v2)
                    </div>
                    <div className="text-sm font-bold text-red-700 font-mono tabular-nums mt-1">
                      Threshold: {c.section_a_value}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      "...triggers an emergency deflation valve, halting inflation and venting the cuff within 2 seconds..."
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-red-200 rounded-lg">
                    <div className="text-xs font-mono text-slate-500">
                      {c.section_b} (Updated in v2)
                    </div>
                    <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums mt-1">
                      Threshold: {c.section_b_value}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      "E3 | Overpressure condition | Auto-deflates within 1.5 seconds, displays E3"
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed">
                  <span className="font-semibold">Auditor Finding:</span> {c.explanation}{' '}
                  <span className="font-semibold">Recommended Action:</span> {c.recommendation}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
            Zero cross-section regulatory contradictions detected in active v2 state. Section 4.1 Overpressure Protection and Section 4.2 E3 both specify 1.5 seconds auto-deflation.
          </div>
        )}
      </section>

      {/* Filter Bar for Version Diff Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-slate-700" />
            v1 → v2 Logical Node Matcher & Specification Diff Matrix
          </h2>

          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
            role="group"
            aria-label="Filter version diff rows"
          >
            {(
              [
                { id: 'impacted', label: `All Impacted (${impactedDiffs.length})` },
                { id: 'critical', label: 'Critical Threshold (4)' },
                { id: 'transitive', label: 'Transitive Stale (2)' },
                { id: 'added', label: 'Newly Added (1)' },
                { id: 'all', label: `All Nodes (${diffs.length})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDiffFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  diffFilter === f.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Side-by-Side Diff Cards */}
        <div className="space-y-4">
          {filteredDiffs.map((diff) => (
            <div
              key={diff.logical_node_id}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 tabular-nums">
                    <span className="font-semibold text-slate-900">
                      Section {diff.section_number}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{diff.logical_node_id}</span>
                    <span aria-hidden="true">·</span>
                    <span>Matcher: {diff.match_stage}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {diff.section_number} {diff.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                  <span
                    className={`font-semibold ${
                      diff.staleness_category === 'CRITICAL_THRESHOLD_CHANGE'
                        ? 'text-red-700'
                        : diff.staleness_category === 'TRANSITIVE_STALE'
                          ? 'text-amber-700'
                          : diff.staleness_category === 'COSMETIC_WORDING_CHANGE'
                            ? 'text-sky-700'
                            : diff.staleness_category === 'ADDED'
                              ? 'text-emerald-700'
                              : 'text-slate-600'
                    }`}
                  >
                    Status: {diff.staleness_category}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 font-medium">{diff.summary}</p>

              {/* Spec Token Delta Bar */}
              {(diff.removed_specs.length > 0 || diff.added_specs.length > 0) && (
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono tabular-nums">
                  <span className="text-slate-500 font-semibold">Clinical Spec Delta:</span>
                  {diff.removed_specs.length > 0 && (
                    <span className="text-red-700">
                      Removed: [{diff.removed_specs.join(', ')}]
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  {diff.added_specs.length > 0 && (
                    <span className="text-emerald-700 font-semibold">
                      Added: [{diff.added_specs.join(', ')}]
                    </span>
                  )}
                </div>
              )}

              {/* Side-by-Side v1 vs v2 Text Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 tabular-nums">
                    <span>v1 Specification (ct200_manual.pdf)</span>
                    <span>
                      SHA-256: {diff.v1_hash ? `${diff.v1_hash.slice(0, 12)}...` : 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {diff.v1_text || 'Section did not exist in Manual v1.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 tabular-nums">
                    <span>v2 Specification (ct200_manual_v2.pdf)</span>
                    <span>
                      SHA-256: {diff.v2_hash ? `${diff.v2_hash.slice(0, 12)}...` : 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-900 whitespace-pre-wrap leading-relaxed font-medium">
                    {diff.v2_text || 'Section removed in Manual v2.'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
