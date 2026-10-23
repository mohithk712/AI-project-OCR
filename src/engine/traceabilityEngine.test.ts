import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeUploadedPdfDocument,
  answerRegulatoryQueryFromGraph,
  buildCT200Version1Nodes,
  buildCT200Version2Nodes,
  buildRegulatoryAuditReport,
  classifyNodeStaleness,
  computeContentHash,
  diffDocumentVersions,
  draftTestCaseRemediation,
  evaluateGenerationStaleness,
  extractClinicalSpecs,
  extractCrossReferences,
  formatExportTooltipSummary,
  normalizeRegulatoryText,
  removeUploadedPdfVersion,
  resolveNearestAncestorSection,
  synthesizeDeterministicTestCases,
  validateGeneratedTestCases,
  type QAGenerationRecord,
} from './traceabilityEngine';

test('1. PDF Hierarchy Reconstruction & 8 Structural Irregularities (v1 = 28 nodes, v2 = 29 nodes)', () => {
  const v1 = buildCT200Version1Nodes();
  const v2 = buildCT200Version2Nodes();

  assert.equal(v1.node_count, 28, 'v1 must contain 28 hierarchical nodes (1 root + 27 sections/subsections)');
  assert.equal(v2.node_count, 29, 'v2 must contain 29 hierarchical nodes (including newly added 5.3 Data Export)');

  // Anomaly 1: Multi-line root title merged at level 0
  const root = v1.nodes.find((n) => n.section_number === '0');
  assert.ok(root);
  assert.equal(root.level, 0);
  assert.ok(root.title.includes('CardioTrack CT-200 Home Blood Pressure Monitor'));

  // Anomaly 2: Skipped hierarchy level 2.1 -> 2.1.1.1 attached to 2.1 with level=4
  const batteryNode = v1.nodes.find((n) => n.section_number === '2.1.1.1');
  assert.ok(batteryNode);
  assert.equal(batteryNode.level, 4);
  assert.equal(batteryNode.parent_section_number, '2.1');

  // Anomaly 3: Inconsistent heading font size on 3.2 (11pt Bold still parsed at level=2 under parent 3)
  const inflationNode = v1.nodes.find((n) => n.section_number === '3.2');
  assert.ok(inflationNode);
  assert.equal(inflationNode.level, 2);
  assert.equal(inflationNode.parent_section_number, '3');

  // Anomaly 4: Out-of-order section numbering on Page 3 (3.4 appears physically before 3.3)
  const sec34 = v1.nodes.find((n) => n.section_number === '3.4');
  const sec33 = v1.nodes.find((n) => n.section_number === '3.3');
  assert.ok(sec34 && sec33);
  assert.ok(sec34.physical_order < sec33.physical_order, '3.4 must precede 3.3 in physical reading order');

  // Anomaly 5: Numbered list false-positive trap inside 3.3 (5 blood pressure categories kept in list_items)
  assert.equal(sec33.list_items.length, 5);
  assert.ok(sec33.list_items[0].includes('1. Normal: systolic < 120'));

  // Anomaly 6: Duplicate section headings (4.2 Error Codes vs 7.1 Error Codes)
  const sec42 = v1.nodes.find((n) => n.section_number === '4.2');
  const sec71 = v1.nodes.find((n) => n.section_number === '7.1');
  assert.ok(sec42 && sec71);
  assert.equal(sec42.title, 'Error Codes');
  assert.equal(sec71.title, 'Error Codes');
  assert.notEqual(sec42.logical_node_id, sec71.logical_node_id);
  assert.equal(sec42.logical_node_id, '4.2::error-codes');
  assert.equal(sec71.logical_node_id, '7.1::error-codes');
});

test('2. Unicode Hyphen Normalization & Prefix-Climbing Ancestor Resolution', () => {
  const withNonBreakingHyphen = 'The CT\u2011200 displays a low\u2011battery icon.';
  const withAsciiHyphen = 'The CT-200 displays a low-battery icon.';
  assert.equal(normalizeRegulatoryText(withNonBreakingHyphen), withAsciiHyphen);
  assert.equal(computeContentHash(withNonBreakingHyphen), computeContentHash(withAsciiHyphen));

  const existing = new Set(['0', '1', '2', '2.1']);
  const resolved = resolveNearestAncestorSection('2.1.1.1', existing);
  assert.equal(resolved.parentSection, '2.1');
  assert.deepEqual(resolved.skippedIntermediate, ['2.1.1']);
});

test('3. Non-Destructive v1 -> v2 Diff & 3-Stage Logical Node Matcher', () => {
  const v1 = buildCT200Version1Nodes();
  const v2 = buildCT200Version2Nodes();
  const diffs = diffDocumentVersions(v1, v2);

  const modified = diffs.filter((d) => d.change_type === 'MODIFIED').map((d) => d.section_number);
  assert.deepEqual(modified.sort(), ['2.1.1.1', '3.2', '4.2', '4.3']);

  const added = diffs.filter((d) => d.change_type === 'ADDED').map((d) => d.section_number);
  assert.deepEqual(added, ['5.3']);

  const transitive = diffs.filter((d) => d.staleness_category === 'TRANSITIVE_STALE').map((d) => d.section_number);
  assert.ok(transitive.includes('7.1'), '7.1 must be flagged as TRANSITIVE_STALE because it references 4.2');
  assert.ok(transitive.includes('3.3'), '3.3 must be flagged as TRANSITIVE_STALE because it references 4.3');
});

test('4. Automated Cross-Section Regulatory Contradiction Detector (4.1 vs 4.2 E3 in v2)', () => {
  const v1 = buildCT200Version1Nodes();
  const v2 = buildCT200Version2Nodes();

  assert.equal(v1.regulatory_contradictions.length, 0, 'v1 has consistent 2 seconds deflation in both 4.1 and 4.2 E3');
  assert.equal(v2.regulatory_contradictions.length, 1, 'v2 must flag SPEC_THRESHOLD_MISMATCH between 4.1 (2 seconds) and 4.2 E3 (1.5 seconds)');
  assert.equal(v2.regulatory_contradictions[0].code, 'SPEC_THRESHOLD_MISMATCH');
  assert.equal(v2.regulatory_contradictions[0].section_a_value, '2 seconds');
  assert.equal(v2.regulatory_contradictions[0].section_b_value, '1.5 seconds');
});

test('5. Three-Tier + Transitive Staleness Classification (FRESH, COSMETIC_WORDING_CHANGE, CRITICAL_THRESHOLD_CHANGE, TRANSITIVE_STALE)', () => {
  const v1 = buildCT200Version1Nodes();
  const v2 = buildCT200Version2Nodes();

  const targetSections = ['2.1.1.1', '3.2', '4.2', '7.1', '1.1'];
  const snapshots = targetSections.map((sec) => {
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

  const testCases = synthesizeDeterministicTestCases(snapshots);
  const generation: QAGenerationRecord = {
    generation_id: 'gen_test_01',
    selection_id: 'sel_test_01',
    selection_fingerprint: 'fp_01',
    doc_slug: 'ct200-manual',
    pinned_version: 1,
    revision: 1,
    model_used: 'deterministic-iec62304-synthesizer',
    created_at: '2026-10-22T09:10:00.000Z',
    node_snapshots: snapshots,
    test_cases: testCases,
    attempt_logs: [],
  };

  // Evaluate against v1 -> all FRESH
  const evalV1 = evaluateGenerationStaleness(generation, v1, v1);
  assert.ok(evalV1.every((tc) => tc.staleness_status === 'FRESH' && !tc.is_stale));

  // Evaluate against v2 -> 2.1.1.1, 3.2, 4.2 are CRITICAL_THRESHOLD_CHANGE; 7.1 is TRANSITIVE_STALE; 1.1 is FRESH
  const evalV2 = evaluateGenerationStaleness(generation, v2, v1);
  const bySection = new Map(evalV2.map((tc) => [tc.source_section_numbers[0], tc]));

  assert.equal(bySection.get('2.1.1.1')?.staleness_status, 'CRITICAL_THRESHOLD_CHANGE');
  assert.equal(bySection.get('3.2')?.staleness_status, 'CRITICAL_THRESHOLD_CHANGE');
  assert.equal(bySection.get('4.2')?.staleness_status, 'CRITICAL_THRESHOLD_CHANGE');
  assert.equal(bySection.get('7.1')?.staleness_status, 'TRANSITIVE_STALE');
  assert.equal(bySection.get('1.1')?.staleness_status, 'FRESH');

  // Verify COSMETIC_WORDING_CHANGE when prose changes but numeric thresholds remain identical
  const node11 = v1.nodes.find((n) => n.section_number === '1.1')!;
  const cosmeticBody = node11.body_text.replace('qualified clinician', 'licensed healthcare physician');
  const cosmeticNode = {
    ...node11,
    body_text: cosmeticBody,
    extracted_specs: extractClinicalSpecs(cosmeticBody),
    content_hash: computeContentHash(`1.1|${node11.title}|${normalizeRegulatoryText(cosmeticBody)}`),
  };
  const cosmeticEval = classifyNodeStaleness(
    snapshots.find((s) => s.section_number === '1.1')!,
    cosmeticNode,
    v1.nodes
  );
  assert.equal(cosmeticEval.status, 'COSMETIC_WORDING_CHANGE');
});

test('6. Self-Healing LLM Schema & Out-of-Bounds Section Validation', () => {
  const allowed = ['2.1.1.1', '3.2', '4.2', '7.1'];
  const tooFew = validateGeneratedTestCases({ test_cases: [] }, allowed);
  assert.equal(tooFew.valid, false);

  const outOfBounds = validateGeneratedTestCases(
    {
      test_cases: [
        {
          title: 'TC1',
          source_section_numbers: ['9.9'],
          requirement_excerpt: 'req',
          steps: ['step 1', 'step 2'],
          expected_result: 'exp',
        },
        {
          title: 'TC2',
          source_section_numbers: ['3.2'],
          requirement_excerpt: 'req',
          steps: ['step 1', 'step 2'],
          expected_result: 'exp',
        },
        {
          title: 'TC3',
          source_section_numbers: ['4.2'],
          requirement_excerpt: 'req',
          steps: ['step 1', 'step 2'],
          expected_result: 'exp',
        },
      ],
    },
    allowed
  );
  assert.equal(outOfBounds.valid, false);
  if (!outOfBounds.valid) {
    assert.ok(outOfBounds.error_message.includes('9.9'));
  }

  const crossRefs = extractCrossReferences(
    'Along with a classification indicator (see 2.1, 4.3 for related specifications)',
    '3.3'
  );
  assert.deepEqual(crossRefs, ['2.1', '4.3']);
});

test('7. Regulatory Audit Report JSON Builder (buildRegulatoryAuditReport)', () => {
  const v1 = buildCT200Version1Nodes();
  const v2 = buildCT200Version2Nodes();
  const diffs = diffDocumentVersions(v1, v2);
  const targetSections = ['2.1.1.1', '3.2', '4.2', '7.1', '1.1'];
  const snapshots = targetSections.map((sec) => {
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

  const generation: QAGenerationRecord = {
    generation_id: 'gen_audit_01',
    selection_id: 'sel_audit_01',
    selection_fingerprint: 'fp_audit',
    doc_slug: 'ct200-manual',
    pinned_version: 1,
    revision: 1,
    model_used: 'gemini-3.8-flash',
    created_at: '2026-10-22T09:10:00.000Z',
    node_snapshots: snapshots,
    test_cases: synthesizeDeterministicTestCases(snapshots),
    attempt_logs: [],
  };

  const evaluated = evaluateGenerationStaleness(generation, v2, v1);
  const report = buildRegulatoryAuditReport({
    activeVersionNumber: 2,
    versions: [v1, v2],
    diffs,
    evaluatedTestCases: evaluated,
    generatedAt: '2026-10-22T11:20:00.000Z',
  });

  assert.equal(report.report_type, 'IEC_62304_STALENESS_AUDIT_TRAIL');
  assert.equal(report.evaluated_against_version, 2);
  assert.equal(report.summary.total_test_cases, 5);
  assert.equal(report.summary.stale_count, 4);
  assert.equal(report.summary.fresh_count, 1);
  assert.equal(report.summary.critical_threshold_changes, 3);
  assert.equal(report.summary.transitive_stale_count, 1);
  assert.equal(report.summary.regulatory_contradictions_count, 1);

  const staleTooltip = formatExportTooltipSummary(report);
  assert.equal(staleTooltip.status, 'STALE_DETECTED');
  assert.equal(staleTooltip.headline, '4 stale test cases found');

  const evaluatedV1 = evaluateGenerationStaleness(generation, v1, v1);
  const reportV1 = buildRegulatoryAuditReport({
    activeVersionNumber: 1,
    versions: [v1, v2],
    diffs,
    evaluatedTestCases: evaluatedV1,
    generatedAt: '2026-10-22T11:20:00.000Z',
  });
  const syncTooltip = formatExportTooltipSummary(reportV1);
  assert.equal(syncTooltip.status, 'SYNCHRONIZED');
  assert.equal(syncTooltip.headline, 'System fully synchronized');
});

test('8. Uploaded PDF Analysis & Hierarchy Extraction (analyzeUploadedPdfDocument)', () => {
  const v1 = buildCT200Version1Nodes();
  const analysisV2 = analyzeUploadedPdfDocument({
    filename: 'ct200_manual_v2_field_release.pdf',
    fileSizeBytes: 148200,
    extractedText: '250 measurement cycles 5.3 Data Export Auto-deflates within 1.5 seconds',
    nextVersionNumber: 3,
    baselineV1: v1,
    existingGenerations: [],
  });

  assert.equal(analysisV2.detected_profile, 'CT200_V2');
  assert.equal(analysisV2.extracted_summary.total_nodes, 29);
  assert.equal(analysisV2.extracted_summary.contradictions_found, 1);
  assert.ok(analysisV2.key_findings.some((f) => f.includes('SPEC_THRESHOLD_MISMATCH')));
});

test('9. Uploaded PDF Removal & State Rollback (removeUploadedPdfVersion)', () => {
  const v1 = buildCT200Version1Nodes();
  const v2 = buildCT200Version2Nodes();
  const wrongPdfAnalysis = analyzeUploadedPdfDocument({
    filename: 'wrong_uploaded_manual.pdf',
    fileSizeBytes: 98000,
    extractedText: '250 measurement cycles 5.3 Data Export Auto-deflates within 1.5 seconds',
    nextVersionNumber: 3,
    baselineV1: v1,
    existingGenerations: [],
  });

  const v3 = wrongPdfAnalysis.version_record;
  const initialVersions = [v1, v2, v3];
  const analysesMap = { 3: wrongPdfAnalysis };

  // Attempting to delete baseline v1 or v2 must be rejected
  const blockedDelete = removeUploadedPdfVersion({
    versionNumberToDelete: 1,
    versions: initialVersions,
    activeVersionNumber: 3,
    selections: [],
    analysesByVersion: analysesMap,
  });
  assert.equal(blockedDelete.deleted, false);
  assert.equal(blockedDelete.versions.length, 3);

  // Deleting uploaded v3 removes it and rolls activeVersionNumber back to v2
  const removedResult = removeUploadedPdfVersion({
    versionNumberToDelete: 3,
    versions: initialVersions,
    activeVersionNumber: 3,
    selections: [],
    analysesByVersion: analysesMap,
  });
  assert.equal(removedResult.deleted, true);
  assert.equal(removedResult.deletedVersion?.source_filename, 'wrong_uploaded_manual.pdf');
  assert.equal(removedResult.versions.length, 2);
  assert.equal(removedResult.activeVersionNumber, 2);
  assert.equal(removedResult.latestUploadedAnalysis, null);
});

test('10. Irrelevant / Arbitrary PDF Parsing & Query-Driven Co-Pilot Synthesizer', () => {
  const v1 = buildCT200Version1Nodes();
  const v2 = buildCT200Version2Nodes();

  const irrelevantPdf = analyzeUploadedPdfDocument({
    filename: 'linear_algebra_syllabus.pdf',
    fileSizeBytes: 54000,
    pageTexts: [
      'Linear Algebra CS-101 Syllabus\n1. Course Overview\nVectors, matrices, and eigenvalues.\n2. Grading Policy\nMidterm exam and final project.',
    ],
    nextVersionNumber: 3,
    baselineV1: v1,
    existingGenerations: [],
  });

  // Must NOT clone the 29 CT-200 v2 nodes; must extract only the actual syllabus sections
  assert.equal(irrelevantPdf.detected_profile, 'UNRELATED_DOCUMENT');
  assert.equal(irrelevantPdf.is_relevant_to_ct200, false);
  assert.equal(irrelevantPdf.extracted_summary.total_nodes, 4); // Root + Preamble + 1. Course Overview + 2. Grading Policy
  assert.ok(
    irrelevantPdf.version_record.nodes.some((n) => n.title.includes('Course Overview')),
    'Uploaded PDF node tree must contain actual headings from the uploaded PDF'
  );
  assert.ok(
    irrelevantPdf.key_findings.some((f) => f.includes('UNRELATED DOCUMENT')),
    'Key findings must explicitly flag unrelated documents'
  );

  // Query-driven synthesizer must directly answer conceptual/example queries and section queries
  const conceptReply = answerRegulatoryQueryFromGraph({
    query: 'explain a simple understanding cocnept with real time example',
    versions: [v1, v2],
    activeVersionNumber: 2,
  });
  assert.ok(conceptReply.includes('Simple Concept Explanation with a Real-Time Example'));

  const sectionReply = answerRegulatoryQueryFromGraph({
    query: 'what are the operating temperature and humidity conditions in 2.2?',
    versions: [v1, v2],
    activeVersionNumber: 2,
  });
  assert.ok(sectionReply.includes('Section 2.2'));

  // Verify revision and model_used metadata are preserved on EvaluatedTestCase
  const snap = ['2.1.1.1', '3.2', '4.2', '7.1', '1.1'].map((sec) => {
    const n = v1.nodes.find((node) => node.section_number === sec)!;
    return {
      node_id: n.node_id,
      logical_node_id: n.logical_node_id,
      section_number: n.section_number,
      title: n.title,
      version_number: 1,
      pinned_content_hash: n.content_hash,
      pinned_body_text: n.body_text,
      pinned_specs: n.extracted_specs,
      referenced_sections: n.referenced_sections,
    };
  });
  const rev11Gen: QAGenerationRecord = {
    generation_id: 'gen_v1_r11_mvjy9g77',
    selection_id: 'sel_v1_safety_and_battery',
    selection_fingerprint: 'fp_rev11',
    doc_slug: 'ct200-manual',
    pinned_version: 1,
    revision: 11,
    model_used: 'gemini-3.8-flash',
    created_at: '2026-10-22T12:45:00.000Z',
    node_snapshots: snap,
    test_cases: synthesizeDeterministicTestCases(snap),
    attempt_logs: [],
  };
  const evaluatedRev11 = evaluateGenerationStaleness(rev11Gen, v2, v1);
  assert.equal(evaluatedRev11.length, 5);
  assert.equal(evaluatedRev11[0].generation_id, 'gen_v1_r11_mvjy9g77');
  assert.equal(evaluatedRev11[0].revision, 11);
  assert.equal(evaluatedRev11[0].model_used, 'gemini-3.8-flash');

  // Verify Draft v2.0 Test Remediation produces v2.0-compliant steps and expected result
  const batteryCase = evaluatedRev11.find((tc) => tc.source_section_numbers.includes('2.1.1.1'))!;
  const remBattery = draftTestCaseRemediation({
    testCase: batteryCase,
    targetDoc: v2,
  });
  assert.ok(remBattery.updated_title.includes('250 Cycles'));
  assert.ok(remBattery.updated_expected_result.includes('250 measurement cycles'));
  assert.ok(remBattery.updated_expected_result.includes('10%'));

  // Verify Analyze Section query in Co-Pilot returns exact section clinical risk & staleness audit
  const sec32Audit = answerRegulatoryQueryFromGraph({
    query:
      'Analyze Section 3.2 (Cuff Inflation Sequence) in Manual v2.0 (ct200_manual_v2.pdf): explain its clinical specifications, cross-references, SHA-256 hash, and QA test staleness impact.',
    versions: [v1, v2],
    activeVersionNumber: 2,
  });
  assert.ok(sec32Audit.includes('Section 3.2: Cuff Inflation Sequence'));
  assert.ok(sec32Audit.includes('30 mmHg'));
  assert.ok(sec32Audit.includes('CRITICAL_THRESHOLD_CHANGE'));
});
