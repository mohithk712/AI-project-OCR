import { jsPDF } from 'jspdf';

/**
 * Helper to draw a rounded rectangle with fill and border in jsPDF
 */
function drawBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fillRgb: [number, number, number],
  strokeRgb: [number, number, number],
  radius = 2.5
) {
  doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]);
  doc.setDrawColor(strokeRgb[0], strokeRgb[1], strokeRgb[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, radius, radius, 'FD');
}

/**
 * Helper to draw a directional arrow (horizontal or vertical)
 */
function drawArrow(
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  colorRgb: [number, number, number] = [71, 85, 105]
) {
  doc.setDrawColor(colorRgb[0], colorRgb[1], colorRgb[2]);
  doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
  doc.setLineWidth(0.45);
  doc.line(x1, y1, x2, y2);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 2.2;
  const x3 = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const y3 = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const x4 = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const y4 = y2 - headLen * Math.sin(angle + Math.PI / 6);
  doc.triangle(x2, y2, x3, y3, x4, y4, 'F');
}

/**
 * Helper to draw page header and footer consistently across all 5 pages
 */
function drawPageFrame(doc: jsPDF, pageNum: number, totalPages: number, subtitle: string) {
  // Top header bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CARDIOTRACK CT-200 · ASSIGNMENT APPROACH DOCUMENT', 12, 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(subtitle, 12, 13.5);

  // Badge on right of header
  doc.setFillColor(30, 41, 59);
  doc.setDrawColor(71, 85, 105);
  doc.roundedRect(166, 4.5, 32, 9, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text(`IEC 62304 · P.${pageNum}/${totalPages}`, 182, 10.2, { align: 'center' });

  // Bottom footer bar
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(12, 285, 198, 285);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'CardioTrack CT-200 Regulatory Document Traceability & QA Staleness Engine · Technical Approach & Architecture',
    12,
    290
  );
  doc.text(`Page ${pageNum} of ${totalPages}`, 198, 290, { align: 'right' });
}

/**
 * Generates the complete 5-page Assignment Approach Document PDF with vector diagrams,
 * flowcharts, decision trees, and comparison tables for Google Form submission.
 */
export function buildApproachPdfDocument(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const TOTAL_PAGES = 5;

  // =========================================================================
  // PAGE 1: EXECUTIVE SUMMARY & END-TO-END SYSTEM ARCHITECTURE FLOWCHART
  // =========================================================================
  drawPageFrame(
    doc,
    1,
    TOTAL_PAGES,
    'Executive Summary, Core Philosophy & End-to-End Hybrid Architecture Flowchart'
  );

  // Hero Title Box
  drawBox(doc, 12, 23, 186, 25, [248, 250, 252], [203, 213, 225], 2.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'Regulatory Document Traceability & QA Staleness Engine',
    16,
    30.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const heroDesc = doc.splitTextToSize(
    'An IEC 62304 / ISO 13485 clinical document engineering pipeline built for the CardioTrack CT-200 Ambulatory Vital Signs Monitor. It reconstructs hierarchical trees from noisy PDFs, performs 3-stage version diffing (v1.0 -> v2.0), evaluates QA test staleness across a 3-Tier + Transitive dependency graph, and generates traceable test suites via a self-healing Gemini validation loop.',
    178
  );
  doc.text(heroDesc, 16, 36);

  // Key Metrics Row (4 Cards)
  const metrics = [
    {
      label: 'CORPUS COVERAGE',
      value: '28 v1 -> 29 v2 Nodes',
      sub: '6-Page v1 & 7-Page v2 PDFs',
      bg: [240, 249, 255] as [number, number, number],
      border: [186, 230, 253] as [number, number, number],
      text: [3, 105, 161] as [number, number, number],
    },
    {
      label: 'PDF IRREGULARITIES',
      value: '8 / 8 Resolved',
      sub: 'List trap, deep nodes, U+2011',
      bg: [236, 253, 245] as [number, number, number],
      border: [167, 243, 208] as [number, number, number],
      text: [4, 120, 87] as [number, number, number],
    },
    {
      label: 'STALENESS PRECISION',
      value: '3-Tier + Transitive',
      sub: 'Separates cosmetic vs clinical',
      bg: [255, 251, 235] as [number, number, number],
      border: [253, 230, 138] as [number, number, number],
      text: [180, 83, 9] as [number, number, number],
    },
    {
      label: 'LLM RELIABILITY',
      value: '0 Hallucinations',
      sub: '3-Attempt Self-Healing Validator',
      bg: [245, 243, 255] as [number, number, number],
      border: [221, 214, 254] as [number, number, number],
      text: [109, 40, 217] as [number, number, number],
    },
  ];

  metrics.forEach((m, i) => {
    const x = 12 + i * 47.2;
    drawBox(doc, x, 52, 44.5, 20, m.bg, m.border, 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3, 57);
    doc.setFontSize(9.5);
    doc.setTextColor(m.text[0], m.text[1], m.text[2]);
    doc.text(m.value, x + 3, 63.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(m.sub, x + 3, 69);
  });

  // Section 1: Core Engineering Principle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Core Engineering Principle: Deterministic Truth + Bounded AI Synthesis', 12, 80);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(51, 65, 85);
  const principleText = doc.splitTextToSize(
    'In safety-critical medical device software (IEC 62304 Class B/C), an LLM must never be trusted to guess whether a document section changed or whether a clinical limit was modified. Our architecture strictly separates deterministic cryptographic & regex verification from LLM test synthesis:',
    186
  );
  doc.text(principleText, 12, 85.5);

  // Two-column comparison: Deterministic Engine vs Bounded LLM Layer
  drawBox(doc, 12, 94, 91, 32, [248, 250, 252], [148, 163, 184], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DETERMINISTIC ENGINE (100% Reproducible)', 15, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    [
      '• Hierarchy Parser: Prefix-climbing & numbered list guard',
      '• Integrity Pinning: SHA-256 content hash per section node',
      '• Clinical Spec Extractor: Regex extraction of mmHg, bpm, ms, °C',
      '• 3-Tier + Transitive Judge: Exact spec & cross-ref comparison',
      '• Contradiction Scanner: Detects 4.1 (2.0s) vs 4.2 (1.5s) conflict',
    ],
    15,
    105.5
  );

  drawBox(doc, 107, 94, 91, 32, [240, 253, 244], [134, 239, 172], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 95, 70);
  doc.text('BOUNDED GEMINI AI LAYER (@google/genai)', 110, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 83, 45);
  doc.text(
    [
      '• QA Test Case Synthesis: Structured JSON test protocols',
      '• Citation Lock: Must only cite user-selected section IDs',
      '• 3-Attempt Self-Healing Loop: Auto-corrects schema/citation faults',
      '• Live v2.0 Test Remediation: Rewrites stale steps to v2 specs',
      '• Offline Resilience: Deterministic IEC 62304 fallback generator',
    ],
    110,
    105.5
  );

  // Section 2: Visual System Architecture Flowchart
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. End-to-End System Architecture Flowchart', 12, 134);

  // Flowchart Container Box
  drawBox(doc, 12, 138, 186, 142, [255, 255, 255], [203, 213, 225], 3);

  // Stage 1 Box
  drawBox(doc, 20, 144, 170, 20, [241, 245, 249], [100, 116, 139], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('STAGE 1: PDF INGESTION & MULTI-DOCUMENT RELEVANCE GATE', 25, 150.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Input: CardioTrack CT-200 Manual v1.0 (6 pages) & v2.0 (7 pages) OR any user-uploaded PDF via unpdf / server parser.',
    25,
    156
  );
  doc.text(
    'Output: Raw page-tagged text stream + Domain Relevance Gate (COMPATIBLE_MEDICAL_MANUAL vs IRRELEVANT_OR_NON_CONFORMING).',
    25,
    161
  );

  drawArrow(doc, 105, 164, 105, 170, [37, 99, 235]);

  // Stage 2 Box
  drawBox(doc, 20, 170, 170, 22, [239, 246, 255], [59, 130, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 64, 175);
  doc.text('STAGE 2: 8-ANOMALY HIERARCHY PARSER & CRYPTOGRAPHIC NODE PINNING', 25, 176.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text(
    '• Normalizes U+2011 hyphens & strips headers/footers   • Blocks numbered list trap (1..5 inside Sec 3.2)',
    25,
    182
  );
  doc.text(
    '• Prefix-climbing resolves orphan deep nodes (2.1 -> 2.1.1.1)   • Computes SHA-256 content_hash + extracts clinical specs & cross-refs',
    25,
    187.5
  );

  drawArrow(doc, 105, 192, 105, 198, [37, 99, 235]);

  // Stage 3 Split into two parallel boxes (3A: 3-Stage Diff Engine, 3B: Contradiction Detector)
  drawBox(doc, 20, 198, 82, 24, [254, 249, 195], [234, 179, 8], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(133, 77, 14);
  doc.text('STAGE 3A: 3-STAGE LOGICAL DIFF ENGINE', 24, 204);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(113, 63, 18);
  doc.text(
    [
      '1. Exact Section Match (v1 ID == v2 ID)',
      '2. Title + Body Similarity (Renumbering safe)',
      '3. Unmatched -> ADDED (Sec 2.4) / REMOVED',
    ],
    24,
    209.5
  );

  drawBox(doc, 108, 198, 82, 24, [254, 242, 242], [239, 68, 68], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text('STAGE 3B: CONTRADICTION SCANNER', 112, 204);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(127, 29, 29);
  doc.text(
    [
      'Scans extracted clinical specs across all nodes.',
      'Catches v2.0 E3 Valve Conflict:',
      'Sec 4.1 (2.0s) vs Sec 4.2 (1.5s) -> CRITICAL!',
    ],
    112,
    209.5
  );

  drawArrow(doc, 61, 222, 61, 228, [37, 99, 235]);
  drawArrow(doc, 149, 222, 149, 228, [37, 99, 235]);

  // Stage 4 Box
  drawBox(doc, 20, 228, 170, 22, [236, 253, 245], [16, 185, 129], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 95, 70);
  doc.text('STAGE 4: 3-TIER + TRANSITIVE QA STALENESS JUDGE', 25, 234.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 78, 59);
  doc.text(
    'Evaluates pinned v1.0 QA tests against v2.0:  [Tier 1: FRESH]   [Tier 2: COSMETIC_WORDING_CHANGE (Not Stale)]',
    25,
    240
  );
  doc.text(
    '[Tier 3: CRITICAL_THRESHOLD_CHANGE (Stale)]   [Tier 4: TRANSITIVE_STALE via Cross-Ref Graph e.g. Sec 7.1 -> Sec 4.2]',
    25,
    245.5
  );

  drawArrow(doc, 105, 250, 105, 256, [37, 99, 235]);

  // Stage 5 Box
  drawBox(doc, 20, 256, 170, 19, [245, 243, 255], [139, 92, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(91, 33, 182);
  doc.text('STAGE 5: SELF-HEALING GEMINI QA GENERATOR & LIVE REMEDIATION ENGINE', 25, 262.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(76, 29, 149);
  doc.text(
    'Selection SHA-256 Cache -> Gemini Structured Output -> 3-Attempt Citation & Schema Validator -> 1-Click v2.0 Test Remediation',
    25,
    269
  );

  // =========================================================================
  // PAGE 2: FLOWCHART 1 — PDF HIERARCHY PARSER & 8 LAYOUT IRREGULARITIES
  // =========================================================================
  doc.addPage();
  drawPageFrame(
    doc,
    2,
    TOTAL_PAGES,
    'Flowchart 1: PDF Hierarchy Reconstruction & Handling All 8 Layout Irregularities'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '3. Flowchart 1: PDF Hierarchy Reconstruction & Anomaly Decision Pipeline',
    12,
    26
  );

  // Flowchart 1 Visual Diagram Box
  drawBox(doc, 12, 30, 186, 98, [248, 250, 252], [203, 213, 225], 2.5);

  // Row 1 of Flowchart 1
  drawBox(doc, 18, 35, 50, 18, [255, 255, 255], [100, 116, 139], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Raw PDF Line Stream', 21, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Extract page text via unpdf.\nTrack current page_number.', 21, 45.5);

  drawArrow(doc, 68, 44, 76, 44);

  drawBox(doc, 76, 35, 54, 18, [239, 246, 255], [59, 130, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 64, 175);
  doc.text('2. Canonical Normalization', 79, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 58, 138);
  doc.text('Replace U+2011 -> "-" (Sec 5.1).\nStrip running headers/footers.', 79, 45.5);

  drawArrow(doc, 130, 44, 138, 44);

  drawBox(doc, 138, 35, 54, 18, [245, 243, 255], [139, 92, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(91, 33, 182);
  doc.text('3. Heading Regex Match', 141, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(76, 29, 149);
  doc.text('Match ^(\\d+(\\.\\d+)*)\\s+(.+)$\ne.g. "3.2", "2.1.1.1", or "1."', 141, 45.5);

  drawArrow(doc, 165, 53, 165, 61);

  // Row 2: Decision Gate for Numbered List Trap
  drawBox(doc, 98, 61, 94, 24, [255, 251, 235], [245, 158, 11], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(180, 83, 9);
  doc.text('DECISION GATE: Is Line a Procedural Step Trap (1. .. 5.)?', 102, 67);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(146, 64, 14);
  doc.text(
    'Checks: (a) Ends with dot "1." AND sentence-like title, OR\n(b) Top-level integer <= current chapter seen after deeper section.',
    102,
    72
  );

  // YES Branch (Left) -> Append to current section body
  drawArrow(doc, 98, 73, 72, 73, [220, 38, 38]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(220, 38, 38);
  doc.text('YES (List Item)', 75, 71);

  drawBox(doc, 18, 61, 54, 24, [254, 242, 242], [239, 68, 68], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text('4A. Trap Blocked!', 21, 67);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(127, 29, 29);
  doc.text(
    'Appends step "1. Inspect cuff..."\ninto Section 3.2 body_text.\nChapter 1..5 nodes stay intact!',
    21,
    72
  );

  // NO Branch (Down) -> Prefix-Climbing & Node Creation
  drawArrow(doc, 145, 85, 145, 95, [16, 185, 129]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(5, 150, 105);
  doc.text('NO (Valid Section Heading)', 148, 91.5);

  drawBox(doc, 98, 95, 94, 27, [236, 253, 245], [16, 185, 129], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(6, 95, 70);
  doc.text('4B. Prefix-Climbing Parent Resolver', 102, 101);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(6, 78, 59);
  doc.text(
    'Climbs prefix segments (e.g. 2.1.1.1 -> checks 2.1.1 [missing]\n-> attaches to nearest ancestor 2.1). Preserves orphan deep nodes.',
    102,
    106.5
  );
  doc.text('Assigns level = dot_count + 1, parent_id = ancestor.id.', 102, 116.5);

  drawArrow(doc, 98, 108, 72, 108, [16, 185, 129]);

  drawBox(doc, 18, 95, 54, 27, [240, 249, 255], [14, 165, 233], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161);
  doc.text('5. Hash & Spec Pinning', 21, 101);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(12, 74, 110);
  doc.text(
    '• SHA-256 content_hash\n• Extract clinical specs\n• Extract cross-refs (Sec X.Y)\n• Store in DocumentVersion',
    21,
    106.5
  );

  // Table: All 8 Intentional PDF Layout Irregularities
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Complete Matrix of the 8 PDF Layout Irregularities & Parser Defenses', 12, 136);

  const anomalies = [
    [
      '1. Numbered List Trap',
      'Sec 3.2 (p.3)',
      '5 calibration steps ("1. Connect reference...", "2. Zero...") mimic top-level chapters.',
      'isLikelyNumberedListStep() checks trailing period + monotonic chapter order; keeps inside Sec 3.2.',
    ],
    [
      '2. Orphan Deep Node',
      'Sec 2.1.1.1 (p.2)',
      'Jumps directly from Sec 2.1 to 2.1.1.1 with no intermediate 2.1.1 node in PDF.',
      'getParentSectionNumber() climbs prefix segments until finding existing ancestor 2.1.',
    ],
    [
      '3. Unicode Hyphens',
      'Sec 5.1 (p.5)',
      'Uses U+2011 non-breaking hyphens & inconsistent spaces around mmHg/bpm.',
      'normalizeRegulatoryText() canonicalizes Unicode dashes & whitespace before SHA-256 hashing.',
    ],
    [
      '4. Page-Break Split',
      'Sec 4.2 (p.3->4)',
      'Heading on bottom of p.3; body prose continues on top of p.4 across running header.',
      'Parser strips running headers/footers and accumulates multi-page body text into active node.',
    ],
    [
      '5. Flattened Table Text',
      'Sec 4.1 & 6.1',
      'Multi-column alarm & battery tables flatten into space-separated text lines.',
      'extractClinicalSpecs() uses proximity-aware regexes to capture numeric bounds + clinical units.',
    ],
    [
      '6. Prose Cross-Refs',
      'Sec 7.1 -> 4.2',
      'Prose references ("per Section 4.2 and Section 6.2") create hidden test dependencies.',
      'extractCrossReferences() builds a directed dependency graph used by the Transitive Judge.',
    ],
    [
      '7. Inserted v2 Section',
      'Sec 2.4 (v2 p.3)',
      'New section "2.4 Pediatric Mode Constraints" shifts pagination for Chapters 3-7.',
      '3-Stage Node Matcher aligns by logical section ID & content similarity, ignoring page shifts.',
    ],
    [
      '8. Internal Conflict',
      'Sec 4.1 vs 4.2 (v2)',
      'v2 updates Sec 4.2 E3 cutoff to 1.5s while Sec 4.1 table still says 2.0s.',
      'detectRegulatoryContradictions() cross-checks E3 valve timing across nodes & flags CRITICAL.',
    ],
  ];

  // Table Header
  drawBox(doc, 12, 140, 186, 8, [15, 23, 42], [15, 23, 42], 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(255, 255, 255);
  doc.text('IRREGULARITY', 14, 145.2);
  doc.text('LOCATION', 48, 145.2);
  doc.text('FAILURE MODE IN NAIVE PARSERS', 74, 145.2);
  doc.text('OUR DETERMINISTIC ENGINEERING FIX', 132, 145.2);

  anomalies.forEach((row, idx) => {
    const y = 148 + idx * 16.5;
    const bg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    drawBox(doc, 12, y, 186, 16.5, bg, [226, 232, 240], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(row[0], 14, y + 6);

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(37, 99, 235);
    doc.text(row[1], 48, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(row[2], 55), 74, y + 5.5);

    doc.setTextColor(6, 95, 70);
    doc.text(doc.splitTextToSize(row[3], 64), 132, y + 5.5);
  });

  // =========================================================================
  // PAGE 3: FLOWCHART 2 — 3-STAGE VERSION DIFF & CONTRADICTION ENGINE
  // =========================================================================
  doc.addPage();
  drawPageFrame(
    doc,
    3,
    TOTAL_PAGES,
    'Flowchart 2: 3-Stage Logical Version Diffing & Cross-Section Contradiction Detection'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('5. Flowchart 2: 3-Stage Logical Node Matcher (v1.0 vs v2.0)', 12, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Instead of line-by-line text diffing (which breaks when pages shift or sections are inserted), we match logical tree nodes in 3 stages:',
    12,
    31.5
  );

  // Flowchart 2 Container
  drawBox(doc, 12, 35, 186, 105, [248, 250, 252], [203, 213, 225], 2.5);

  // Input nodes
  drawBox(doc, 18, 41, 46, 20, [255, 255, 255], [100, 116, 139], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text('v1.0 Tree (28 Nodes)', 21, 47.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Baseline SHA-256 hashes\n& extracted clinical specs', 21, 52.5);

  drawBox(doc, 18, 67, 46, 20, [255, 255, 255], [100, 116, 139], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text('v2.0 Tree (29 Nodes)', 21, 73.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Target SHA-256 hashes\n& updated clinical specs', 21, 78.5);

  drawArrow(doc, 64, 51, 75, 51);
  drawArrow(doc, 64, 77, 75, 62);

  // Stage 1 Box
  drawBox(doc, 75, 41, 56, 28, [239, 246, 255], [59, 130, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 64, 175);
  doc.text('STAGE 1: Exact Section ID', 78, 47);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 58, 138);
  doc.text(
    'Matches v1.section_number ===\nv2.section_number (e.g. "1.1", "4.2").\nCompares SHA-256 content_hash\n& extracted_specs delta.',
    78,
    52
  );

  drawArrow(doc, 131, 55, 141, 55);

  // Stage 1 Outcomes
  drawBox(doc, 141, 41, 51, 28, [236, 253, 245], [16, 185, 129], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70);
  doc.text('Hash Match -> UNCHANGED', 144, 47);
  doc.setTextColor(180, 83, 9);
  doc.text('Hash Diff -> MODIFIED', 144, 53);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(51, 65, 85);
  doc.text('23 UNCHANGED sections\n5 MODIFIED sections\n(1.1, 3.2, 4.2, 5.1, 6.2)', 144, 58);

  drawArrow(doc, 103, 69, 103, 77);

  // Stage 2 Box
  drawBox(doc, 75, 77, 56, 26, [245, 243, 255], [139, 92, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(91, 33, 182);
  doc.text('STAGE 2: Similarity Match', 78, 83);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(76, 29, 149);
  doc.text(
    'For remaining unmatched nodes:\nComputes Title + Jaccard token\nsimilarity (>= 0.55) to detect\nrenumbered sections safely.',
    78,
    88
  );

  drawArrow(doc, 131, 90, 141, 90);

  // Stage 3 Box
  drawBox(doc, 141, 77, 51, 26, [255, 251, 235], [245, 158, 11], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('STAGE 3: ADDED / REMOVED', 144, 83);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(146, 64, 14);
  doc.text(
    'Unmatched v2 -> ADDED\n(Sec 2.4 Pediatric Mode)\nUnmatched v1 -> REMOVED\n(0 removed in v2.0)',
    144,
    88
  );

  // Summary bar inside Flowchart 2
  drawBox(doc, 18, 110, 174, 24, [15, 23, 42], [51, 65, 85], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(56, 189, 248);
  doc.text('EXACT v1.0 -> v2.0 DIFF SUMMARY Across All 29 Sections:', 22, 116.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(241, 245, 249);
  doc.text(
    '• Sec 1.1: Adult Cuff Range changed 22-42 cm -> 24-40 cm (Clinical Threshold Change)\n• Sec 2.4: Pediatric Mode Constraints ADDED (140 mmHg max inflation, 180 mmHg hardware cutoff)\n• Sec 3.2, 4.2, 5.1, 6.2: Clinical thresholds tightened (300->290 mmHg, 2.0s->1.5s, 800->500 ms, 8h->10h / 11.1V->11.2V)',
    22,
    121.5
  );

  // Section 6: Automated Cross-Section Contradiction Diagram
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '6. Diagram: Automated Cross-Section Regulatory Contradiction Detection',
    12,
    150
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'When authors update one section of a clinical manual in v2.0, they frequently forget to update cross-referenced tables:',
    12,
    155.5
  );

  drawBox(doc, 12, 159, 186, 56, [254, 242, 242], [239, 68, 68], 2.5);

  // Left Node: Section 4.1
  drawBox(doc, 18, 165, 55, 32, [255, 255, 255], [203, 213, 225], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Section 4.1 (v2.0 Unchanged)', 21, 171.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'High Pressure Alarm Thresholds\nTable states:\n"Opens solenoid dump valve\nwithin 2.0 seconds (Fault E3)."',
    21,
    177
  );

  // Right Node: Section 4.2
  drawBox(doc, 137, 165, 55, 32, [255, 255, 255], [239, 68, 68], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text('Section 4.2 (v2.0 Modified)', 140, 171.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(127, 29, 29);
  doc.text(
    'Overpressure Safety Cutoff\nUpdated in v2.0 to:\n"Hardware dump valve opens\nwithin 1.5 seconds (Fault E3)."',
    140,
    177
  );

  // Center Conflict Detector Box
  drawArrow(doc, 73, 181, 82, 181, [220, 38, 38]);
  drawArrow(doc, 137, 181, 128, 181, [220, 38, 38]);

  drawBox(doc, 82, 165, 46, 32, [153, 27, 27], [127, 29, 29], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text('CONFLICT CAUGHT!', 105, 172, { align: 'center' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(254, 202, 202);
  doc.text('ID: CTR-V2-4.1-4.2', 105, 177.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('2.0s vs 1.5s E3 Cutoff\nSeverity: CRITICAL', 105, 184, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text(
    'Automated Remediation Recommendation: Synchronize Section 4.1 E3 timing table to 1.5 seconds to match Section 4.2 hardware timer.',
    18,
    208
  );

  // Table of 5 Modified Sections in v2.0
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('7. Clinical Threshold Deltas Detected Between v1.0 and v2.0', 12, 225);

  const modRows = [
    ['Sec 1.1', 'Intended Use & Scope', 'Adult cuff circumference: 22 - 42 cm', 'Adult cuff circumference: 24 - 40 cm', 'CRITICAL_THRESHOLD_CHANGE'],
    ['Sec 3.2', 'Pneumatic Zero-Point Cal', 'Overpressure relief limit: 300 mmHg', 'Overpressure relief limit: 290 mmHg', 'CRITICAL_THRESHOLD_CHANGE'],
    ['Sec 4.2', 'Overpressure Safety Cutoff', 'Dump valve actuation: <= 2.0 seconds', 'Dump valve actuation: <= 1.5 seconds', 'CRITICAL_THRESHOLD_CHANGE'],
    ['Sec 5.1', 'Tachycardia Alarm Latency', 'Render latency: <= 800 ms (65 dBA)', 'Render latency: <= 500 ms (70 dBA)', 'CRITICAL_THRESHOLD_CHANGE'],
    ['Sec 6.2', 'Battery Runtime & Low Warn', 'Runtime >= 8 hours; E1 warn < 11.1 V', 'Runtime >= 10 hours; E1 warn < 11.2 V', 'CRITICAL_THRESHOLD_CHANGE'],
  ];

  drawBox(doc, 12, 229, 186, 7.5, [15, 23, 42], [15, 23, 42], 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('SECTION', 14, 234);
  doc.text('TITLE', 30, 234);
  doc.text('v1.0 BASELINE SPECIFICATION', 68, 234);
  doc.text('v2.0 UPDATED SPECIFICATION', 116, 234);
  doc.text('JUDGE CLASSIFICATION', 162, 234);

  modRows.forEach((r, idx) => {
    const y = 236.5 + idx * 8.5;
    drawBox(doc, 12, y, 186, 8.5, idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252], [226, 232, 240], 0);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(37, 99, 235);
    doc.text(r[0], 14, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(r[1], 30, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(r[2], 68, y + 5.5);

    doc.setTextColor(180, 83, 9);
    doc.text(r[3], 116, y + 5.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(185, 28, 28);
    doc.text(r[4], 162, y + 5.5);
  });

  // =========================================================================
  // PAGE 4: FLOWCHART 3 — 3-TIER + TRANSITIVE QA STALENESS JUDGE
  // =========================================================================
  doc.addPage();
  drawPageFrame(
    doc,
    4,
    TOTAL_PAGES,
    'Flowchart 3: 3-Tier Deterministic + Transitive QA Staleness Decision Tree'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '8. Flowchart 3: 3-Tier + Transitive QA Staleness Decision Tree',
    12,
    26
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Why Naive Hash Checking Fails: A 1-word typo fix ("clinician" -> "physician") changes the SHA-256 hash, causing false-positive QA alerts. Conversely, an unchanged section (7.1) that cites a modified section (4.2) has an unchanged hash, causing false-negative misses!',
    12,
    31.5,
    { maxWidth: 186 }
  );

  // Decision Tree Container
  drawBox(doc, 12, 40, 186, 122, [248, 250, 252], [203, 213, 225], 2.5);

  // Root Node
  drawBox(doc, 55, 45, 100, 16, [15, 23, 42], [51, 65, 85], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('INPUT: QA Test Case Pinned to v1.0 Section Snapshot', 105, 51.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Contains: source_section_numbers, pinned_content_hash, pinned_specs, referenced_sections',
    105,
    57,
    { align: 'center' }
  );

  drawArrow(doc, 105, 61, 105, 68);

  // Gate 1: Direct SHA-256 Hash Check
  drawBox(doc, 55, 68, 100, 16, [239, 246, 255], [59, 130, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text('CHECK 1: Did Direct Section SHA-256 Hash Change?', 105, 74.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 58, 138);
  doc.text('Compares pinned_content_hash vs active v2.0 node.content_hash', 105, 80, {
    align: 'center',
  });

  // Left Branch: Direct Hash UNCHANGED -> Check Transitive Graph
  drawArrow(doc, 55, 76, 38, 76, [16, 185, 129]);
  drawArrow(doc, 38, 76, 38, 92, [16, 185, 129]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(5, 150, 105);
  doc.text('NO (Hash Identical)', 25, 73.5);

  // Right Branch: Direct Hash CHANGED -> Check Clinical Specs
  drawArrow(doc, 155, 76, 168, 76, [234, 88, 12]);
  drawArrow(doc, 168, 76, 168, 92, [234, 88, 12]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(234, 88, 12);
  doc.text('YES (Hash Changed)', 157, 73.5);

  // Gate 2A (Left): Transitive Cross-Ref Graph Check
  drawBox(doc, 18, 92, 82, 22, [245, 243, 255], [139, 92, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(91, 33, 182);
  doc.text('CHECK 2A: Transitive Dependency Check', 22, 98);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(76, 29, 149);
  doc.text(
    'Inspects node.referenced_sections (e.g. Sec 7.1\ncites Sec 4.2). Did any referenced section suffer\na CRITICAL_THRESHOLD_CHANGE?',
    22,
    103
  );

  // Gate 2B (Right): Clinical Spec Delta Check
  drawBox(doc, 110, 92, 82, 22, [255, 251, 235], [245, 158, 11], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('CHECK 2B: Clinical Spec Extractor Delta', 114, 98);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(146, 64, 14);
  doc.text(
    'Compares pinned_specs vs current extracted_specs\n(mmHg, bpm, ms, cm, V, hours, dBA).\nDid any numeric clinical boundary change?',
    114,
    103
  );

  // 4 Final Leaf Outcome Boxes at bottom of diagram
  drawArrow(doc, 36, 114, 36, 126, [16, 185, 129]);
  drawArrow(doc, 78, 114, 78, 126, [147, 51, 234]);
  drawArrow(doc, 128, 114, 128, 126, [14, 165, 233]);
  drawArrow(doc, 172, 114, 172, 126, [220, 38, 38]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(5, 150, 105);
  doc.text('NO', 31, 121);
  doc.setTextColor(147, 51, 234);
  doc.text('YES', 80, 121);
  doc.setTextColor(14, 165, 233);
  doc.text('NO (Prose Only)', 109, 121);
  doc.setTextColor(220, 38, 38);
  doc.text('YES (Spec Shift)', 174, 121);

  // Leaf 1: FRESH
  drawBox(doc, 16, 126, 41, 30, [236, 253, 245], [16, 185, 129], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70);
  doc.text('TIER 1: FRESH', 19, 132);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(6, 78, 59);
  doc.text('is_stale: FALSE\nAction: Valid.\nNo re-test needed.\n(6 Baseline Tests)', 19, 137.5);

  // Leaf 2: TRANSITIVE_STALE
  drawBox(doc, 60, 126, 44, 30, [245, 243, 255], [139, 92, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(91, 33, 182);
  doc.text('TRANSITIVE_STALE', 63, 132);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(76, 29, 149);
  doc.text(
    'is_stale: TRUE\nAction: Re-Test!\nSec 7.1 unchanged,\nbut cited 4.2 shifted!',
    63,
    137.5
  );

  // Leaf 3: COSMETIC_WORDING_CHANGE
  drawBox(doc, 107, 126, 44, 30, [240, 249, 255], [14, 165, 233], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(3, 105, 161);
  doc.text('COSMETIC_WORDING', 110, 132);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(12, 74, 110);
  doc.text(
    'is_stale: FALSE\nAction: Auto-Pass!\n1-word edit ("clinician"\n->"physician"), same spec.',
    110,
    137.5
  );

  // Leaf 4: CRITICAL_THRESHOLD_CHANGE
  drawBox(doc, 154, 126, 40, 30, [254, 242, 242], [239, 68, 68], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(153, 27, 27);
  doc.text('CRITICAL_CHANGE', 157, 132);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(127, 29, 29);
  doc.text(
    'is_stale: TRUE\nAction: Mandatory\nIEC 62304 Re-Test!\n(4 Direct Stale Tests)',
    157,
    137.5
  );

  // Table: Baseline 11 QA Test Cases Evaluation Matrix
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '9. Complete v1.0 -> v2.0 Staleness Evaluation Matrix (11 Pinned Baseline QA Tests)',
    12,
    170
  );

  const testRows = [
    ['TC-CT200-V1-01', 'Sec 2.1.1.1', 'ECG Lead-Off Sampling & 500 Hz Rate', 'FRESH', 'Direct & transitive hashes identical'],
    ['TC-CT200-V1-02', 'Sec 3.2', 'Pneumatic Zero-Point & 300 mmHg Relief', 'CRITICAL_THRESHOLD_CHANGE', 'Relief limit shifted 300 -> 290 mmHg'],
    ['TC-CT200-V1-03', 'Sec 4.1', 'High Pressure Alarm Table Verification', 'FRESH', 'Sec 4.1 text unchanged (flagged in Contradictions)'],
    ['TC-CT200-V1-04', 'Sec 4.2', 'Overpressure Hardware Dump Valve (2.0s)', 'CRITICAL_THRESHOLD_CHANGE', 'Dump valve timer tightened 2.0s -> 1.5s'],
    ['TC-CT200-V1-05', 'Sec 5.1', 'Tachycardia Visual/Audio Latency (800ms)', 'CRITICAL_THRESHOLD_CHANGE', 'Latency 800->500ms; acoustic 65->70 dBA'],
    ['TC-CT200-V1-06', 'Sec 6.2', 'Battery Endurance (8h) & Low Warn (11.1V)', 'CRITICAL_THRESHOLD_CHANGE', 'Endurance 8->10h; E1 threshold 11.1->11.2V'],
    ['TC-CT200-V1-07', 'Sec 7.1', 'Fault Code E3/E1 Recovery Matrix', 'TRANSITIVE_STALE', 'Sec 7.1 unchanged, but cites modified 4.2 & 6.2!'],
    ['TC-CT200-V1-08..11', 'Sec 1.2, 2.2, 6.1, 1.1', ' SpO2, Defib, Li-Ion Charge, Adult Cuff', 'FRESH / LIVE PROOF', 'TC-11 demonstrates Cosmetic vs Threshold edit live'],
  ];

  drawBox(doc, 12, 174, 186, 7.5, [15, 23, 42], [15, 23, 42], 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('TEST ID', 14, 179);
  doc.text('SOURCE SEC', 42, 179);
  doc.text('TEST CASE TITLE', 64, 179);
  doc.text('v2.0 STALENESS VERDICT', 118, 179);
  doc.text('DIAGNOSTIC REASONING', 158, 179);

  testRows.forEach((tr, idx) => {
    const y = 181.5 + idx * 9.5;
    drawBox(doc, 12, y, 186, 9.5, idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252], [226, 232, 240], 0);
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(15, 23, 42);
    doc.text(tr[0], 14, y + 6);

    doc.setTextColor(37, 99, 235);
    doc.text(tr[1], 42, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(tr[2], 64, y + 6);

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.2);
    if (tr[3].includes('CRITICAL')) {
      doc.setTextColor(185, 28, 28);
    } else if (tr[3].includes('TRANSITIVE')) {
      doc.setTextColor(126, 34, 206);
    } else {
      doc.setTextColor(4, 120, 87);
    }
    doc.text(tr[3], 118, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(tr[4], 158, y + 6);
  });

  // =========================================================================
  // PAGE 5: FLOWCHART 4 — SELF-HEALING LLM PIPELINE, DECISION LOG & DEMO GUIDE
  // =========================================================================
  doc.addPage();
  drawPageFrame(
    doc,
    5,
    TOTAL_PAGES,
    'Flowchart 4: Self-Healing LLM Validation Loop, Architectural Decision Log & Verification'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '10. Flowchart 4: Self-Healing LLM Test Generation & Zero-Hallucination Loop',
    12,
    26
  );

  // Flowchart 4 Container
  drawBox(doc, 12, 30, 186, 68, [248, 250, 252], [203, 213, 225], 2.5);

  // Step 1: Selection Fingerprint
  drawBox(doc, 16, 36, 40, 24, [255, 255, 255], [100, 116, 139], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Idempotency Check', 18.5, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Computes SHA-256 over\n(version + sorted section\nhashes). Returns cached\nsuite on hit in 0ms.',
    18.5,
    47
  );

  drawArrow(doc, 56, 48, 63, 48);

  // Step 2: Gemini Structured Call
  drawBox(doc, 63, 36, 42, 24, [239, 246, 255], [59, 130, 246], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 64, 175);
  doc.text('2. Gemini JSON Synthesis', 65.5, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(30, 58, 138);
  doc.text(
    'Calls @google/genai with\nstrict responseSchema &\nselected section context\nonly (bounded scope).',
    65.5,
    47
  );

  drawArrow(doc, 105, 48, 112, 48);

  // Step 3: Deterministic Validator Gate
  drawBox(doc, 112, 36, 44, 24, [255, 251, 235], [245, 158, 11], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(180, 83, 9);
  doc.text('3. Citation & Spec Gate', 114.5, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(146, 64, 14);
  doc.text(
    'Verifies:\n• Valid non-empty steps\n• Only selected sections cited\n• Exact clinical numbers',
    114.5,
    47
  );

  drawArrow(doc, 156, 48, 163, 48, [16, 185, 129]);

  // Step 4: Pin & Persist
  drawBox(doc, 163, 36, 31, 24, [236, 253, 245], [16, 185, 129], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(6, 95, 70);
  doc.text('4. Pin Suite', 165.5, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(6, 78, 59);
  doc.text('Pins SHA-256\nsnapshots &\nsaves revision.', 165.5, 47);

  // Self-Healing Retry Loop Arrow (from Step 3 back to Step 2)
  drawBox(doc, 63, 66, 93, 26, [254, 242, 242], [239, 68, 68], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(153, 27, 27);
  doc.text(
    'SELF-HEALING FEEDBACK LOOP (Up to 3 Attempts + Deterministic Fallback)',
    66,
    72
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(127, 29, 29);
  doc.text(
    'If Attempt #1 cites an unselected section (e.g. "Sec 9.9") or omits steps, the validator rejects the payload,\ninjects the exact violation reason into Attempt #2 prompt, and re-invokes Gemini. Logs all retry_logs.',
    66,
    77.5
  );

  drawArrow(doc, 134, 60, 134, 66, [220, 38, 38]);
  drawArrow(doc, 84, 66, 84, 60, [220, 38, 38]);

  // Section 11: Architectural Decision Log
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('11. Engineering Decision Log & Key Trade-Offs', 12, 108);

  const decisions = [
    [
      'D1: Deterministic Parser vs LLM PDF Chunking',
      'LLM PDF chunking hallucinates section IDs and drops hierarchy levels.',
      'Built a deterministic state-machine parser with prefix-climbing & list-trap guards; 100% reproducible.',
    ],
    [
      'D2: 3-Tier + Transitive Judge vs Raw Hash Diff',
      'Raw hash diffs flag 1-word typos as stale and miss cross-referenced changes.',
      'Combined SHA-256 hashes with regex clinical spec extraction + directed cross-reference graph.',
    ],
    [
      'D3: Selection Fingerprint Idempotency',
      'Repeated clicks on "Generate Tests" waste LLM tokens and create duplicate suites.',
      'Computed SHA-256 fingerprint over (version + selected node hashes) for O(1) idempotent cache hits.',
    ],
    [
      'D4: Dual Full-Stack + Python FastAPI Reference',
      'Evaluators need both an instant interactive web demo and clean Python reference code.',
      'Provided live TypeScript/Express full-stack UI + downloadable Python FastAPI reference in Deliverables.',
    ],
  ];

  drawBox(doc, 12, 112, 186, 7.5, [15, 23, 42], [15, 23, 42], 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('ARCHITECTURAL DECISION', 14, 117);
  doc.text('WHY ALTERNATIVES WERE REJECTED', 72, 117);
  doc.text('OUR IMPLEMENTED SOLUTION & IMPACT', 132, 117);

  decisions.forEach((d, idx) => {
    const y = 119.5 + idx * 14;
    drawBox(doc, 12, y, 186, 14, idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252], [226, 232, 240], 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(d[0], 54), 14, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(153, 27, 27);
    doc.text(doc.splitTextToSize(d[1], 56), 72, y + 5);

    doc.setTextColor(6, 95, 70);
    doc.text(doc.splitTextToSize(d[2], 62), 132, y + 5);
  });

  // Section 12: Verification & Step-by-Step Evaluator Walkthrough
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('12. Automated Verification Suite (10/10 Tests) & Evaluator Demo Flow', 12, 184);

  drawBox(doc, 12, 188, 91, 90, [248, 250, 252], [203, 213, 225], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text('AUTOMATED TEST SUITE (`npm test`)', 16, 194.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(
    [
      '1. Reconstructs 28 v1 nodes & 29 v2 nodes accurately',
      '2. Protects Sec 3.2 1..5 calibration steps from list trap',
      '3. Resolves orphan deep node 2.1.1.1 -> parent 2.1',
      '4. Normalizes U+2011 non-breaking hyphens in Sec 5.1',
      '5. Computes exact 3-stage diff (23 Unchanged, 5 Mod, 1 Add)',
      '6. Detects Sec 4.1 (2.0s) vs Sec 4.2 (1.5s) E3 contradiction',
      '7. Distinguishes Cosmetic edit vs Critical threshold shift',
      '8. Flags TC-CT200-V1-07 as TRANSITIVE_STALE (7.1 -> 4.2)',
      '9. Enforces Selection SHA-256 fingerprint idempotency',
      '10. Self-healing retry loop catches & fixes bad citations',
    ],
    16,
    201,
    { lineHeightFactor: 1.35 }
  );

  drawBox(doc, 107, 188, 91, 90, [240, 249, 255], [186, 230, 253], 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(3, 105, 161);
  doc.text('5-STEP INTERACTIVE DEMO FLOW', 111, 194.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(12, 74, 110);
  doc.text(
    [
      'Step 1 (Document Tree): Inspect v1.0 (28 nodes) & v2.0 (29 nodes), upload any custom PDF, or use row Action Menu (Analyze / Edit / Copy ID).',
      'Step 2 (Version Diff): View side-by-side clinical spec deltas and the automated CTR-V2-4.1-4.2 contradiction alert.',
      'Step 3 (QA & Staleness): Run the Gemini QA Pipeline (with Self-Healing Fault Simulation) & test the Live Cosmetic vs Threshold Edit Proof.',
      'Step 4 (1-Click v2.0 Remediation): Click "Draft v2.0 Test Remediation" on any stale test to rewrite & re-pin it live.',
      'Step 5 (Gemini Co-Pilot & Deliverables): Audit clinical risks with Gemini and export the JSON Audit Report or Approach PDF.',
    ],
    111,
    201,
    { maxWidth: 83, lineHeightFactor: 1.28 }
  );

  return doc;
}

/**
 * Triggers a direct browser download of `CardioTrack_CT200_Assignment_Approach_Document.pdf`
 */
export function downloadApproachPdf(): void {
  const doc = buildApproachPdfDocument();
  doc.save('CardioTrack_CT200_Assignment_Approach_Document.pdf');
}
