# CardioTrack CT-200 Regulatory Document Traceability & Staleness Engine

[![IEC 62304 Class B](https://img.shields.io/badge/Standard-IEC%2062304%20Class%20B-0ea5e9.svg)](https://www.iso.org/standard/38421.html)
[![ISO 13485:2016](https://img.shields.io/badge/Quality-ISO%2013485%3A2016-10b981.svg)](https://www.iso.org/standard/53177.html)
[![Tests Passing](https://img.shields.io/badge/Tests-10%2F10%20Passing-emerald.svg)](./src/engine/traceabilityEngine.test.ts)
[![TypeScript 5.8](https://img.shields.io/badge/TypeScript-5.8%2B-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-CSS%20v4-38bdf8.svg)](https://tailwindcss.com/)
[![Gemini API](https://img.shields.io/badge/Gemini-SDK%20v2.4-8b5cf6.svg)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](./LICENSE)

> **Deterministic Medical Device Document Intelligence, Non-Destructive Version Diffing, 3-Tier Transitive Staleness Evaluation, and Self-Healing QA Test Generation** for the CardioTrack CT-200 Blood Pressure Monitor (`ct200_manual.pdf` v1 and `ct200_manual_v2.pdf` v2).

---

## Table of Contents
- [Executive Overview](#executive-overview)
- [The Regulatory Challenge](#the-regulatory-challenge)
- [System Architecture](#system-architecture)
- [Core Technical Innovations](#core-technical-innovations)
  - [1. Typography & Geometry-Aware PDF Parser (8 Anomalies Resolved)](#1-typography--geometry-aware-pdf-parser-8-anomalies-resolved)
  - [2. Three-Tier + Transitive Staleness Engine](#2-three-tier--transitive-staleness-engine)
  - [3. Cross-Section Regulatory Contradiction Engine](#3-cross-section-regulatory-contradiction-engine)
  - [4. Self-Healing LLM QA Generator with 3-Attempt Retry Loop](#4-self-healing-llm-qa-generator-with-3-attempt-retry-loop)
  - [5. Arbitrary PDF Ingestion & Graph-Grounded Co-Pilot](#5-arbitrary-pdf-ingestion--graph-grounded-co-pilot)
- [Interactive Demo Guide](#interactive-demo-guide)
- [Automated Test Matrix](#automated-test-matrix)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started](#getting-started)
- [Standards & Compliance References](#standards--compliance-references)

---

## Executive Overview

In medical device software and firmware engineering (**IEC 62304 / ISO 13485 / FDA 21 CFR Part 820**), requirements are living documents. When product specifications update from version 1.0 to 2.0, traditional QA pipelines face two major failure modes:

1. **Silent Test Obsolescence**: Upstream specification changes invalidate downstream test suites without changing downstream test wording (the *Transitive Staleness* problem).
2. **False Alarm Fatigue**: Trivial wording edits (e.g., swapping *"clinician"* for *"physician"*) trigger unnecessary, costly laboratory re-execution because naive SHA-256 or Git diffs cannot distinguish cosmetic prose from safety-critical clinical boundaries.

The **CardioTrack CT-200 Regulatory Engine** solves both problems through a deterministic, geometry-aware PDF parser, a 3-tier staleness classifier, a cross-chapter regulatory contradiction auditor, and an automated Gemini-powered test remediation loop.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         CARDIO-TRACK CT-200 ENGINE                            │
├───────────────────────┬────────────────────────────┬───────────────────────────┤
│  PDF HIERARCHY PARSER │     3-TIER STALENESS       │    GEMINI COPILOT & QA    │
│  - 8 Layout Anomalies │  - Tier 1: SHA-256 Hash    │  - Pydantic/Zod Schema    │
│  - Prefix-Climbing    │  - Tier 2: Clinical Specs  │  - Self-Healing Retries   │
│  - Bounding-Box BBox  │  - Tier 3: Transitive DAG  │  - Remediation Generator  │
└───────────────────────┴────────────────────────────┴───────────────────────────┘
```

---

## The Regulatory Challenge

| Traditional Failure Mode | What Happens in Practice | How This Engine Solves It |
| :--- | :--- | :--- |
| **Naive SHA-256 Hashing** | A single typo fix forces re-execution of 50 bench tests costing thousands of dollars. | **Tier-2 Clinical Specs Extractor**: Identifies `COSMETIC_WORDING_CHANGE` (no re-test needed). |
| **Silent Transitive Invalidation** | Section 7.1 text doesn't change, but Section 4.2 changes an error code. Tests pass silently against wrong specs. | **Tier-3 Dependency DAG**: Traces `7.1 → 4.2` and automatically flags tests as `TRANSITIVE_STALE`. |
| **Orphan Contradictions** | Engineering updates Section 4.2 (1.5s deflation) but forgets Section 4.1 (states 2.0s). | **Contradiction Detector**: Detects cross-section numeric conflicts and halts release with audit warnings. |
| **PDF Layout Corruption** | Unstructured PDF parsers mistake bullet numbers `1..5` for root sections or misread 11pt bold headings. | **Geometry & Font Engine**: Resolves all 8 structural anomalies with 100% hierarchy fidelity. |

---

## System Architecture

```
                               ┌───────────────────────────┐
                               │ ct200_manual.pdf (v1 / v2)│
                               └─────────────┬─────────────┘
                                             │
                             [Typography & BBox Parser]
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
          [Document Tree Builder]                      [Regex Clinical Extractor]
          - Resolves 8 Anomalies                       - Numeric tolerances (mmHg, bpm)
          - Prefix-Climbing Ancestors                  - Durations, cycle limits, codes
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             ▼
                              [Hybrid In-Memory Store]
                   - Relational Tables: versions, nodes, selections
                   - Document Store: qa_generations, attempt_logs
                                             │
                      ┌──────────────────────┼──────────────────────┐
                      ▼                      ▼                      ▼
             [3-Stage Node Diff]     [3-Tier Staleness]    [Contradiction Detector]
             - Match by ID & Slug    - SHA-256 Check       - 4.1 vs 4.2 E3 mismatch
             - Match by Section+Parent- Tolerance Delta    - Flag safety divergence
             - Content Diff          - Cross-Ref DAG
                      │                      │                      │
                      └──────────────────────┼──────────────────────┘
                                             ▼
                              [Gemini QA Test Pipeline]
                             - Schema Validation (JSON)
                             - Self-Healing Retries (1-3)
                             - Live v2.0 Remediation Drafts
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
           [Web Dashboard (React 19)]                   [Audit Report Export]
           - 5 Tabbed Workspaces                        - ISO 13485 Compliant PDF
           - Live Prose Simulation                      - Traceability Matrix JSON
```

---

## Core Technical Innovations

### 1. Typography & Geometry-Aware PDF Parser (8 Anomalies Resolved)

Regulatory PDFs present subtle typesetting quirks that break traditional text extraction:

1. **Multi-Line Document Title (Page 1)**: Three consecutive `22.0pt NimbusSans-Bold` lines coalesce into a single canonical Root Node (`section_number="0"`, `level=0`).
2. **Skipped Hierarchy Level (`2.1` → `2.1.1.1`, Page 2)**: `2.1 General Specifications` is directly followed by `2.1.1.1 Battery Life`, skipping `2.1.1`. The prefix-climbing builder walks `2.1.1.1 → 2.1.1 (missing) → 2.1 (exists)`, nesting `2.1.1.1` under `2.1` while preserving `level=4`.
3. **Inconsistent Heading Font Size (`3.2`, Page 3)**: Section `3.2 Cuff Inflation Sequence` is typeset in `11.0pt Bold` instead of the standard `12.9pt Bold`. Heading detection leverages font weight (`is_bold == true`) paired with numbering patterns, accurately positioning `3.2` at `level=2`.
4. **Out-of-Order Section Numbering (`3.4` before `3.3`, Page 3)**: `3.4 Auto Shutoff` physically precedes `3.3 Result Display`. The parser preserves physical order for audit fidelity while logging an `OUT_OF_ORDER_SECTION_NUMBERING` warning.
5. **Numbered List False-Positive Trap (`1..5` inside `3.3`, Page 3)**: Classification bullets `1. Normal...` through `5. Hypertensive Crisis...` match `^\d+\.\s+` but are set in `11.0pt Regular` with indentation. They are cleanly parsed into `node.list_items` under `3.3` rather than generating false root sections.
6. **Duplicate Section Headings (`4.2 Error Codes` vs `7.1 Error Codes`)**: Both sections share identical titles. Each receives a distinct composite logical ID (`4.2::error-codes` vs `7.1::error-codes`) and parent pointer.
7. **Interleaved Multi-Line Tables (`2.1` & `4.2`)**: Table bounding boxes are isolated to prevent table text from contaminating prose lines. Cells are extracted into normalized Markdown tables.
8. **Unicode Non-Breaking Hyphens & Cross-Page Splitting**: Non-breaking hyphens (`\u2011` in `CT‑200`, `low‑battery`) are normalized to ASCII `-` prior to SHA-256 calculation. Paragraphs split across pages (`3.1` across pages 2–3) are seamlessly unified.

---

### 2. Three-Tier + Transitive Staleness Engine

Does a 1-word wording edit equal a changed pressure threshold? **No.**

```
                      [Target Section Evaluated]
                                  │
                       Is SHA-256 Identical?
                        /               \
                     YES                 NO
                     /                     \
             [Mark FRESH]          Did Clinical Specs Change?
                                   (mmHg, bpm, %, sec, codes)
                                      /                 \
                                    YES                  NO
                                    /                     \
                   [CRITICAL_THRESHOLD_CHANGE]    [COSMETIC_WORDING_CHANGE]
                   (Re-Test Mandatory)            (Re-Test Not Required)
                                  │
                   Does Any Unchanged Section
                   Cross-Reference a Modified Section?
                   (e.g., Section 7.1 -> Section 4.2)
                                  │
                        [TRANSITIVE_STALE]
                        (Upstream Requirement Changed)
```

- **Tier 1 (O(1) SHA-256 Check)**: Immediate hash match between pinned test snapshot and latest document version.
- **Tier 2 (Clinical Specification Extractor)**:
  - *Cosmetic Edit*: "clinician" → "physician" → SHA-256 changes, but tolerances remain identical → `COSMETIC_WORDING_CHANGE`.
  - *Threshold Edit*: "22–42 cm" → "24–40 cm" or deflation limit "2.0s" → "1.5s" → `CRITICAL_THRESHOLD_CHANGE`.
- **Tier 3 (Transitive Dependency Graph)**:
  - Section `7.1 Error Codes` has zero text modifications between v1 and v2, but cites *"If a code from Section 4.2 appears..."*. Because Section 4.2 was modified in v2, tests referencing 7.1 automatically escalate to `TRANSITIVE_STALE`.

---

### 3. Cross-Section Regulatory Contradiction Engine

During rapid revision cycles, documentation inconsistencies can jeopardize safety approvals. The engine scans all document sections simultaneously to detect contradictions:

- **Section 4.1 (Overpressure Protection)**: *"Maximum pressure limit 300 mmHg with automated rapid deflation valve triggering within 2.0 seconds."*
- **Section 4.2 (Error Codes - Updated in v2)**: *"E3: Overpressure condition (>300 mmHg). Rapid deflation triggered within 1.5 seconds."*
- **Engine Action**: Flags `SPEC_THRESHOLD_MISMATCH` with severity `HIGH`, generating actionable compliance warnings across the diff viewer and audit deliverables.

---

### 4. Self-Healing LLM QA Generator with 3-Attempt Retry Loop

When synthesizing test cases with Gemini, regulatory compliance demands zero hallucinations:

- **Pinned Node Anchoring**: Tests must strictly bind to valid section numbers existing in the active document.
- **Strict Pydantic / TypeScript Schema**: Validates preconditions, numbered test steps, expected clinical results, and verification metrics.
- **3-Attempt Self-Healing Loop**:
  - Attempt 1: Standard structured synthesis.
  - If schema validation fails or an invalid section is referenced, the validator extracts the error, appends feedback to the prompt, adjusts temperature, and re-executes.
  - Every attempt is permanently recorded in `attempt_logs[]` for audit transparency.

---

### 5. Arbitrary PDF Ingestion & Graph-Grounded Co-Pilot

- **Dynamic PDF Analysis**: Upload any regulatory manual, addendum, or clinical evaluation report (CER).
- **Multi-Modal / In-Memory Parsing**: Extracts text hierarchy, estimates heading levels, and mounts the document into the active version store.
- **Query-Driven Co-Pilot**: Answers questions strictly grounded in the parsed document graph with cited section numbers, exact threshold values, and cross-reference lineage.
- **Full State Reversion**: One-click rollback restores the baseline CT-200 state without residual memory leaks.

---

## Interactive Demo Guide

The application features 5 dedicated workspaces accessible via the top navigation bar:

### 1. Reconstructed Document Hierarchy (`DocumentTreeView`)
- **View Modes**: Switch between **Pinned Version 1 (v1.0)** and **Latest Version 2 (v2.0)**.
- **Node Inspector**: Click any node to view breadcrumbs, font metrics, child count, and SHA-256 content hash.
- **Context Actions Menu**:
  - `Analyze Section`: Transports the section into the Gemini Co-Pilot with an automatic prompt.
  - `Edit Section`: Opens an inline prose editor with live SHA-256 and clinical threshold recalculation.
  - `Copy Section ID`: Copies the unique section identifier (`section::slug`) to the clipboard.

### 2. Side-by-Side Version Diff (`VersionDiffView`)
- **Structural Diff Matrix**: View additions (`MODIFIED`, `NEW`, `DELETED`, `UNCHANGED`).
- **Contradiction Banner**: Highlights the Section 4.1 vs 4.2 overpressure deflation timing conflict.
- **Inline Word Diff**: Inspect exact clinical tolerance edits (e.g., `300 measurement cycles` → `250 measurement cycles`).

### 3. QA Test Suite Generator & Live Staleness Proof (`QAStalenessView`)
- **Generate QA Suite**: Runs the pipeline with real-time progress indicators and attempt logging.
- **Live Proof Simulator**:
  - *Click `1. Simulate Cosmetic Edit`*: Changes Section 1.1 prose ("clinician" → "physician") → flags `COSMETIC_WORDING_CHANGE`.
  - *Click `2. Simulate Threshold Edit`*: Changes Section 1.1 range ("22–42 cm" → "24–40 cm") → escalates to `CRITICAL_THRESHOLD_CHANGE`.
  - *Click `Restore Baseline`*: Restores Section 1.1 to its original state.
- **Gemini Remediation Draft**: Click `Draft v2.0 Test Remediation` on any stale card to synthesize updated test steps.

### 4. Gemini Regulatory Co-Pilot (`GeminiCopilotView`)
- **Interactive Chat**: Ask questions regarding clinical thresholds, error codes, and battery life.
- **Persistent Chat History**: Retains dialogue context across tab switches.
- **Upload Custom PDF**: Test arbitrary regulatory PDFs and analyze their internal hierarchies.

### 5. Compliance Deliverables & Audit Exporter (`DeliverablesView`)
- **Audit Deliverable Previews**:
  - `APPROACH.md`: Full architectural log and design decisions.
  - `requirements-traceability-matrix.json`: Machine-readable traceability mapping.
  - `regulatory-audit-report-ct200-v2.0.pdf`: Print-ready ISO 13485 compliance report.
- **One-Click Export**: Download official compliance documentation.

---

## Automated Test Matrix

The test suite consists of **10 comprehensive tests** executed via Vitest, verifying all parser, diff, staleness, and AI loops:

```bash
npm test
```

| # | Test Scenario | Verified Behavior |
| :---: | :--- | :--- |
| **1** | PDF Hierarchy Reconstruction | Accurately reconstructs 28 nodes in v1 and 29 nodes in v2, resolving all 8 structural anomalies. |
| **2** | Unicode Hyphen & Prefix-Climbing | Normalizes non-breaking hyphens (`\u2011`) and attaches skipped levels (`2.1.1.1` under `2.1`). |
| **3** | Non-Destructive v1 → v2 Diff | Validates 3-stage logical node matching, additions (`4.3`), and modifications (`4.2`). |
| **4** | Cross-Section Contradiction Detector | Flags the 4.1 (2.0s) vs 4.2 E3 (1.5s) deflation timing mismatch with severity `HIGH`. |
| **5** | 3-Tier + Transitive Staleness | Verifies `FRESH`, `COSMETIC_WORDING_CHANGE`, `CRITICAL_THRESHOLD_CHANGE`, and `TRANSITIVE_STALE` (`7.1 → 4.2`). |
| **6** | Self-Healing LLM Validation Loop | Enforces schema validation and rejects hallucinated or out-of-bounds section numbers. |
| **7** | Regulatory Audit JSON Builder | Validates compliance report JSON generation according to IEC 62304 standards. |
| **8** | Uploaded PDF Analysis | Verifies hierarchy parsing and node classification on arbitrary uploaded PDFs. |
| **9** | PDF Rollback & State Cleanup | Ensures dynamic uploaded versions can be removed with zero side-effects. |
| **10** | Query-Driven Synthesizer | Validates grounded regulatory query answering against document graphs. |

---

## Project Directory Structure

```
├── APPROACH.md                   # Formal engineering decision log & architectural rationale
├── package.json                  # Dependencies, scripts, and build configuration
├── server.ts                     # Express + Vite SSR backend proxy & Gemini integration
├── vite.config.ts                # Vite build and plugin configurations
├── tsconfig.json                 # Strict TypeScript configuration
├── public/                       # Static public assets
└── src/
    ├── App.tsx                   # Main navigation layout and active tab coordinator
    ├── index.css                 # Tailwind CSS v4 styling rules
    ├── main.tsx                  # React 19 entry point
    ├── components/
    │   ├── DocumentTreeView.tsx   # Interactive tree hierarchy, inspector & context menu
    │   ├── VersionDiffView.tsx    # Side-by-side diff matrix & contradiction alerts
    │   ├── QAStalenessView.tsx    # QA generation, live proof simulator & remediation
    │   ├── GeminiCopilotView.tsx  # Multi-modal regulatory chat & PDF uploader
    │   └── DeliverablesView.tsx   # Compliance deliverables viewer & PDF exporter
    └── engine/
        ├── deliverablesContent.ts # Exportable audit reports and matrix templates
        ├── traceabilityEngine.ts  # Core parser, 3-tier staleness, and graph algorithms
        └── traceabilityEngine.test.ts # Vitest automated test suite (10 test suites)
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**
- **Gemini API Key**: (Optional for local deterministic mode; required for live AI test generation & Co-Pilot). Obtain from [Google AI Studio](https://aistudio.google.com/).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/cardiotrack-ct200-regulatory-engine.git
   cd cardiotrack-ct200-regulatory-engine
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Add your Gemini API key in .env:
   # GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Run the test suite**:
   ```bash
   npm test
   ```

6. **Build for production**:
   ```bash
   npm run build
   ```

---

## Standards & Compliance References

- **IEC 62304:2006/AMD 1:2015**: Medical device software — Software life cycle processes.
  - *Clause 5.1*: Software development planning.
  - *Clause 5.2*: Software requirements analysis & traceability.
  - *Clause 5.7*: Software system testing & test documentation.
- **ISO 13485:2016**: Medical devices — Quality management systems — Requirements for regulatory purposes.
  - *Clause 4.2.4*: Control of records.
  - *Clause 7.3.2*: Design and development inputs.
  - *Clause 7.3.7*: Design and development validation.
- **FDA 21 CFR Part 820.30**: Design Controls — Software Validation and Traceability.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
