# CardioTrack CT-200 Regulatory Document Traceability & Staleness Engine — Approach & Decision Log

## 1. Executive Summary
This repository implements an end-to-end **Regulatory Document Intelligence, Version Traceability, and QA Test Staleness Engine** for the **CardioTrack CT-200 Home Blood Pressure Monitor** (`ct200_manual.pdf` v1 and `ct200_manual_v2.pdf` v2) aligned with **IEC 62304** (Medical Device Software Lifecycle) and **ISO 13485** traceability standards.

---

## 2. PDF Structural Irregularities & Typography-Aware Parser
Real-world regulatory PDFs contain layout anomalies that break naive regex or text-only parsers. By inspecting character-level bounding boxes (`x0, top, x1, bottom`), font names (`NimbusSans-Bold` vs `NimbusSans-Regular`), and point sizes, our parser deterministically resolves all **8 anomalies**:

1. **Multi-Line Document Title (Page 1)**: Three consecutive `22.0pt NimbusSans-Bold` lines are coalesced into a single canonical Root Node (`section_number="0"`, `level=0`).
2. **Skipped Hierarchy Level (`2.1` -> `2.1.1.1`, Page 2)**: `2.1 General Specifications` (`level=2`) is followed directly by `2.1.1.1 Battery Life Under Typical Use` (`level=4`, `11.0pt Bold`), skipping `2.1.1`. Our prefix-climbing tree builder walks `2.1.1.1 -> 2.1.1 (missing) -> 2.1 (exists)`, attaching `2.1.1.1` under parent `2.1` while preserving `level=4`.
3. **Inconsistent Heading Font Size (`3.2`, Page 3)**: `3.2 Cuff Inflation Sequence` is rendered in `11.0pt Bold` instead of `12.9pt Bold`. Because heading detection relies on `is_bold == True` + section number regex `^(\d+(?:\.\d+)*)\.?\s+(.+)$` rather than rigid font-size buckets, `3.2` is accurately classified at `level=2` under parent `3`.
4. **Out-of-Order Section Numbering (`3.4` Before `3.3`, Page 3)**: `3.4 Auto Shutoff` appears physically above `3.3 Result Display and Classification`. The parser preserves `physical_order` as encountered in the PDF while logging `OUT_OF_ORDER_SECTION_NUMBERING`.
5. **Numbered List False-Positive Trap (`1..5` inside `3.3`, Page 3)**: Clinical blood pressure classifications `1. Normal...` through `5. Hypertensive Crisis...` match `^\d+\.\s+` but are set in `11.0pt Regular` (`is_bold == False`) with left indentation. They are stored in `node.list_items` under `3.3` rather than creating false top-level sections `1..5`.
6. **Duplicate Section Headings (`4.2 Error Codes` vs `7.1 Error Codes`)**: Both sections share the title `"Error Codes"`. Each node receives a distinct composite `logical_node_id` (`4.2::error-codes` vs `7.1::error-codes`) and parent pointer.
7. **Interleaved Multi-Line Tables (`2.1` & `4.2`)**: Tables are extracted via bounding-box deduplication, nested sub-table artifacts are filtered, words falling inside table bounding boxes are excluded from prose lines, and clean Markdown tables are serialized into `body_text`.
8. **Unicode Non-Breaking Hyphens & Cross-Page Paragraph Splits**: Non-breaking hyphens (`\u2011` in `CT‑200`, `low‑battery`, `user‑configurable`) are normalized to ASCII `-` before SHA-256 hashing, and paragraphs split across page boundaries (`3.1` p2->p3; v2 `4.3`, `6.1`, `8.1`) are seamlessly stitched.

---

## 3. Hybrid Relational + Document Store Architecture
- **Relational Store (`document_versions`, `document_nodes`, `selections`, `selection_items`)**: Stores parent-child hierarchy and immutable version-pinned node snapshots (`pinned_content_hash`).
- **Document Store (`qa_generations`)**: Stores variable-length `test_cases[]`, embedded `node_snapshots[]`, and multi-attempt self-healing validation logs (`attempt_logs[]`) in a single self-contained document.

---

## 4. Three-Tier + Transitive Staleness Engine & Regulatory Contradiction Detector
Does a one-word editorial change get treated the same as a changed pressure threshold? **No.**
- **Tier 1 (O(1) SHA-256 Content Hash)**: Instant equality check between `pinned_content_hash` and latest version `content_hash`.
- **Tier 2 (Clinical & Numeric Threshold Extractor)**: Extracts domain quantities (`mmHg`, `bpm`, `%`, `seconds`, `measurement cycles`, `E1–E6`). If hashes differ and clinical specs changed (`300 -> 250 measurement cycles`, `15% -> 10%`, `40 -> 30 mmHg`, `2 -> 1.5 seconds`, `E6` added), flags `CRITICAL_THRESHOLD_CHANGE` (mandatory bench re-execution). If specs are identical, flags `COSMETIC_WORDING_CHANGE` (low severity, no hardware re-test required).
- **Tier 3 (Transitive Cross-Reference Graph)**: Section `7.1 Error Codes` has zero text changes between v1 and v2, but explicitly states *"If a code from Section 4.2 appears..."*. Because `4.2` changed in v2, test cases pinned to `7.1` are automatically flagged as `TRANSITIVE_STALE`.
- **Cross-Section Regulatory Contradiction Detector**: Automatically detects that `v2` updated `4.2 E3` overpressure auto-deflation to `1.5 seconds` while `4.1 Overpressure Protection` still states `2 seconds` (`SPEC_THRESHOLD_MISMATCH`).

---

## 5. Decision Log (Trade-offs, Alternatives Considered & Rationale)

| # | Decision Point | Options Considered | Chosen Approach & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **D1** | **PDF Parsing Library & Heading Detection** | (A) Plain text regex<br>(B) OCR via Tesseract<br>(C) Typography + bounding-box geometry (`pdfplumber`) | **Chosen: (C) Typography + bbox analysis.** Plain text extraction fails on `3.2` (11pt Bold font anomaly) and turns `3.3` numbered list items (`1..5`) into false top-level headings. Inspecting `fontname` (`Bold` vs `Regular`) and table bounding boxes achieves 100% structural fidelity without OCR latency. |
| **D2** | **Skipped Hierarchy Level (`2.1` -> `2.1.1.1`)** | (A) Synthesize dummy placeholder node `2.1.1`<br>(B) Prefix-climbing attachment to nearest existing ancestor `2.1` while keeping `level=4` | **Chosen: (B) Prefix-climbing attachment.** Fabricating a non-existent section `2.1.1` pollutes regulatory traceability matrices with phantom nodes not present in the legal PDF. Attaching `2.1.1.1` directly to `2.1` while preserving `level=4` accurately reflects the source document. |
| **D3** | **Cross-Version Node Identity (`v1` -> `v2`)** | (A) Match by database primary key<br>(B) Match by title only<br>(C) 3-Stage Logical Node Matcher (`section::slug` -> `section+parent` -> `hash/similarity`) | **Chosen: (C) 3-Stage Matcher.** Titles are not unique (`4.2 Error Codes` vs `7.1 Error Codes`). A 3-stage matcher handles exact matches, title edits, and section renumbering non-destructively. |
| **D4** | **Staleness Granularity** | (A) Binary SHA-256 hash check only<br>(B) Full LLM semantic diff on every GET request<br>(C) Deterministic 3-Tier Engine (SHA-256 + Clinical Spec Regex + Cross-Ref Graph) | **Chosen: (C) Deterministic 3-Tier Engine.** Calling an LLM on every `GET /test-cases` request adds seconds of latency and non-determinism. Extracting clinical quantities (`mmHg`, `seconds`, `%`, `cycles`, `E1–E6`) deterministically separates `CRITICAL_THRESHOLD_CHANGE` from `COSMETIC_WORDING_CHANGE` in <1ms and catches `TRANSITIVE_STALE` dependencies (`7.1 -> 4.2`). |
| **D5** | **Duplicate Generation Requests** | (A) Always run LLM and create duplicate suites<br>(B) Reject with HTTP 409<br>(C) Idempotent fingerprint cache (`force_regenerate=False` default) | **Chosen: (C) Idempotent cache with `force_regenerate` override.** Computing a SHA-256 fingerprint over `(doc_slug, pinned_version, sorted_node_hashes)` prevents redundant LLM token spend while allowing explicit new revisions when `force_regenerate=True`. |
