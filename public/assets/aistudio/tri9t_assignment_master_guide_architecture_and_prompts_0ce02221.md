# Tri9T AI Engineering Internship Assignment — Master Prompt, Architecture, Approach Document & Execution Guide

**Company:** AffineSurge Pvt. Ltd. ([Tri9T AI](https://tri9t.in/) | [LinkedIn](https://www.linkedin.com/company/tri9t/posts/?viewAsMember=true))  
**Role:** AI Engineer Intern (3 Months, Remote, PPO Opportunity: ₹7.0 LPA Fixed + ₹50,000 Performance Bonus)  
**Hard Deadline:** Wednesday, 23 October 2026, 11:59 PM (IST)  
**Application Form:** [Google Application Form](https://forms.gle/26F1bfFA5HRcaaBb7)  
**Recruitment Contacts:** Thomas D (`thomas@tri9t.in`) | Dhayanthan C (`dhayananthan.c@tri9t.in`)

---

## 1. Required Tools & Setup Checklist (What to Download & Install)

Install and configure the following tools before running and pushing your project:

| Category | Tool / Library | Why You Need It | Installation / Setup Command |
| :--- | :--- | :--- | :--- |
| **Core Runtime** | **Python 3.10 – 3.12** | Runs FastAPI, `pdfplumber`, Pydantic, SQLite/SQLAlchemy, and test suites | Download from [python.org](https://www.python.org/downloads/) or `brew install python@3.11` / `winget install Python.Python.3.11` |
| **Version Control** | **Git + GitHub CLI (`gh`)** | Evaluators explicitly inspect your incremental Git commit history | Download from [git-scm.com](https://git-scm.com/) and [cli.github.com](https://cli.github.com/) |
| **IDE / Editor** | **VS Code or Cursor** | Code inspection, terminal execution, and live debugging during the Stage 3 interview | Download from [code.visualstudio.com](https://code.visualstudio.com/) or [cursor.com](https://www.cursor.com/) |
| **LLM API Key (Free Tier)** | **Groq Cloud API** (or **Google Gemini API**) | Required for real LLM structured output generation (`llama-3.3-70b-versatile` or `gemini-2.5-flash`) | Create a free API key in 30 seconds at [console.groq.com](https://console.groq.com/) or [aistudio.google.com](https://aistudio.google.com/) |
| **NoSQL Database** | **MongoDB Community / Atlas Free Tier** *(or built-in JSON Document Store)* | Stores LLM-generated QA test suites, node snapshots, and validation retry audit logs | Optional cloud setup at [mongodb.com/atlas](https://www.mongodb.com/atlas) (our codebase also includes an automatic zero-config JSON NoSQL collection `data/nosql_generations.json`) |
| **API Testing** | **Postman / Insomnia / `curl`** | Demonstrates end-to-end `v1 -> v2` re-ingestion and staleness detection | Built-in Swagger UI at `http://127.0.0.1:8000/docs` + `demo_e2e.py` script |

### Python Packages (`requirements.txt`)
```bash
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install fastapi uvicorn pydantic sqlalchemy pdfplumber pypdf httpx pymongo pytest
```

---

## 2. Master Prompts (Copy-Paste Ready)

### 2.1 Master Prompt for AI Coding Assistants (Cursor / Windsurf / Claude Code)
If you want an AI coding assistant in your IDE to understand, extend, or live-modify the system during your interview preparation, paste this prompt:

```text
Act as a Principal Backend & AI Systems Engineer specializing in Regulated MedTech Document Intelligence (IEC 62304 / ISO 13485).

We are building the "CardioTrack CT-200 Regulatory Document Traceability & Staleness Engine" for the Tri9T AI Engineering Internship Assignment.

INPUT DATASETS:
- `data/ct200_manual.pdf` (Version 1, 6 pages, 28 hierarchical nodes: 1 root + 27 sections/subsections)
- `data/ct200_manual_v2.pdf` (Version 2, 7 pages, 29 hierarchical nodes: 4 modified sections, 1 newly added section `5.3 Data Export`)

CRITICAL PDF IRREGULARITIES YOU MUST HANDLE IN `app/parser.py` (USING `pdfplumber`):
1. Multi-line Document Title: Page 1 has a 3-line title in `Nimbus Sans Bold` 22.0pt ("CardioTrack CT-200 Home Blood / Pressure Monitor — Technical & / User Manual"). Merge into single root node (level=0).
2. Skipped Hierarchy Level: Section `2.1 General Specifications` (level=2) is followed directly by `2.1.1.1 Battery Life Under Typical Use` (level=4, 11.0pt Bold), skipping `2.1.1`. Climb prefix tree (`2.1.1` -> `2.1`) to attach `2.1.1.1` to nearest existing ancestor `2.1` while keeping `level=4`.
3. Inconsistent Heading Font Size: Section `3.2 Cuff Inflation Sequence` is rendered in `11.0pt Bold` instead of `12.9pt Bold`. Detect headings using `is_bold == True` + regex `^(\d+(?:\.\d+)*)\.?\s+(.+)$` and compute `level` from dot-segment count (`len(sec_num.split("."))`).
4. Out-of-Order Section Numbering: On Page 3, `3.4 Auto Shutoff` appears physically before `3.3 Result Display and Classification`. Preserve physical reading order under parent `3` while logging the anomaly.
5. Numbered List False-Positive Trap: Inside Section `3.3`, blood pressure categories `1. Normal...` through `5. Hypertensive Crisis...` match `^\d+\.\s+` but are `11.0pt Regular` (`is_bold == False`). Do NOT parse them as top-level headings `1..5`; store them in `node.list_items` and `body_text`.
6. Duplicate Section Headings: `4.2 Error Codes` (parent `4`) and `7.1 Error Codes` (parent `7`) share the exact same title. Assign distinct `node_id` and `logical_node_id` (`4.2::error-codes` vs `7.1::error-codes`).
7. Interleaved Multi-line Tables: Extract tables in `2.1` and `4.2` via `page.find_tables()`, filter nested sub-table artifacts, exclude words inside table bounding boxes from prose lines, and render Markdown tables into `body_text`.
8. Unicode Hyphens & Cross-Page Splits: Normalize `\u2011` non-breaking hyphens (`CT ‑ 200` -> `CT-200`) before SHA-256 hashing and stitch paragraphs split across pages (`3.1`, `4.3`, `6.1`, `8.1`).

REQUIRED CORE MODULES & API ENDPOINTS:
1. Relational Store (`SQLite`) for `document_versions`, `document_nodes`, `selections`, and `selection_items` (version-pinned).
2. NoSQL Store (`MongoDB` / `data/nosql_generations.json`) for LLM QA test generations, retry logs, and node snapshots.
3. 3-Stage Logical Node Matcher (`v1` -> `v2`): Stage 1 (`section_number + title_slug`), Stage 2 (`section_number + parent`), Stage 3 (`content_hash` or fuzzy title/body similarity).
4. LLM Generation Service (`POST /api/v1/generations`): Sends version-pinned selection text to LLM, validates 3–5 test cases via Pydantic (`QATestSuiteResponse`), runs a 3-attempt Self-Healing Retry Loop feeding `ValidationError` back to the LLM on failure, and implements an idempotent duplicate submission policy (`force_regenerate=False` returns cached generation; `force_regenerate=True` creates a new revision).
5. Two-Tier + Transitive Staleness Engine (`GET /api/v1/test-cases`):
   - Tier 1: O(1) SHA-256 `content_hash` check.
   - Tier 2: Clinical & numeric spec extractor distinguishing `CRITICAL_THRESHOLD_CHANGE` (`300 -> 250 measurement cycles`, `15% -> 10%`, `40 -> 30 mmHg`, `2 -> 1.5 seconds`, `E6` added) from `COSMETIC_WORDING_CHANGE`.
   - Tier 3: Transitive Cross-Reference Staleness flagging `7.1 Error Codes` as `TRANSITIVE_STALE` because it references `Section 4.2` which changed in `v2`.
   - Bonus: Cross-Section Regulatory Contradiction detector flagging that `v2` updated `4.2 E3` to `1.5 seconds` while `4.1` still states `2 seconds`.
```

### 2.2 In-Application LLM System Prompt & Self-Healing Retry Prompt (`app/llm_service.py`)
This is the exact prompt engineered inside `app/llm_service.py` to guarantee regulatory traceability and structured JSON output:

```text
SYSTEM PROMPT:
You are a Senior Medical Device QA & Regulatory Compliance Engineer (IEC 62304 / ISO 13485).
Given a version-pinned selection of sections from the CardioTrack CT-200 Home Blood Pressure Monitor manual,
generate between 3 and 5 concrete, repeatable QA test cases.

STRICT RULES:
1. Return ONLY valid JSON matching the schema `{"test_cases": [...]}` with 3 to 5 items.
2. Every test case MUST cite exact `source_section_numbers` from the provided selection and include a verbatim or near-verbatim `requirement_excerpt` containing the specific numeric thresholds or error codes tested.
3. Steps and `expected_result` must be concrete enough for a hardware-in-the-loop or bench QA engineer to execute and verify (e.g., exact mmHg pressures, durations in seconds, battery percentages, or error codes E1-E6).
4. Include boundary-value and negative/fault-injection test cases where applicable.

SELF-HEALING RETRY PROMPT APPENDED ON VALIDATION FAILURE:
[VALIDATION ERROR ON PREVIOUS ATTEMPT #N]:
{pydantic_or_json_error_details}
Please fix the JSON structure and ensure 3 to 5 complete test cases citing only valid selection sections are returned.
```

---

## 3. System Architecture & Data Model (For Your Interview Explanation)

### 3.1 High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                        CLIENT / QA ENGINEER (curl / Postman / E2E)                |
+-----------------------------------------+-----------------------------------------+
                                          | REST API (FastAPI + Pydantic)
                                          v
+-----------------------------------------------------------------------------------+
|                         FASTAPI APPLICATION LAYER (app/main.py)                   |
|  - POST /api/v1/documents/ingest        - POST /api/v1/selections                 |
|  - GET  /api/v1/nodes/top-level         - GET  /api/v1/selections/{id}            |
|  - GET  /api/v1/nodes/{id} & /diff      - POST /api/v1/generations                |
|  - GET  /api/v1/nodes/search            - GET  /api/v1/test-cases (Live Staleness)|
+------------------+------------------------------+---------------------------------+
                   |                              |
                   v                              v
+----------------------------------+   +--------------------------------------------+
|   PDF INGESTION & VERSION ENGINE |   |  LLM QA GENERATOR & STALENESS ENGINE       |
|  (app/parser.py & versioning.py) |   |  (app/llm_service.py & versioning.py)      |
|  1. Layout & Font Span Analysis  |   |  1. Version-Pinned Context Reconstruction  |
|  2. BBox Table Deduplication     |   |  2. LLM Call (Groq/Gemini/Deterministic)   |
|  3. Prefix-Climbing Tree Builder |   |  3. Pydantic Schema + Section Check        |
|  4. 3-Stage Logical Node Matcher |   |  4. 3x Self-Healing Error-Feedback Retry   |
|  5. Cross-Ref & Spec Extractor   |   |  5. 2-Tier + Transitive Staleness Judge    |
+------------------+---------------+   +----------------------+---------------------+
                   |                                          |
                   v                                          v
+----------------------------------+   +--------------------------------------------+
|   RELATIONAL STORE (SQLite DB)   |   |   NoSQL DOCUMENT STORE (MongoDB / JSON)    |
|  - document_versions             |   |  - qa_generations collection               |
|  - document_nodes (tree + hash)  |   |  - Embedded node_snapshots (pinned hashes) |
|  - selections (version-pinned)   |   |  - Generated test_cases[] (3-5 items)      |
|  - selection_items (snapshots)   |   |  - Self-healing attempt_logs[]             |
+----------------------------------+   +--------------------------------------------+
```

### 3.2 Why a Hybrid Relational (SQLite) + NoSQL (MongoDB/JSON) Architecture?
During the technical interview, explain this architectural split clearly:
1. **Why SQLite (Relational) for the Document Tree, Versions, and Selections?**
   - Document sections form a strict parent-child hierarchy (`parent_id` self-referential foreign key) and require indexed transactional queries across `(doc_slug, version_number)`, `logical_node_id`, and `section_number`.
   - Selections (`selections` + `selection_items`) require relational join integrity to pin specific `(node_id, version_number, pinned_content_hash)` tuples immutably.
2. **Why NoSQL (MongoDB / JSON Document Collection) for LLM Generations?**
   - LLM outputs are hierarchical, semi-structured documents containing variable-length arrays of test steps, preconditions, multi-attempt validation retry logs (`attempt_logs`), and embedded point-in-time `node_snapshots`. Storing each generation suite as a single self-contained NoSQL document avoids 4-way relational joins on every retrieval call while allowing schema evolution as prompt structures evolve.

### 3.3 Exact Diff Between `ct200_manual.pdf` (v1) and `ct200_manual_v2.pdf` (v2)
Knowing every single difference between `v1` and `v2` cold will impress your interviewers immediately:

| Section | v1 Specification (`ct200_manual.pdf`) | v2 Specification (`ct200_manual_v2.pdf`) | Staleness Classification in Our Engine |
| :--- | :--- | :--- | :--- |
| **`2.1.1.1 Battery Life Under Typical Use`** | `300 measurement cycles` before replacement; low-battery icon below `15%`. | Revised downward to `250 measurement cycles` after field testing; low-battery icon below `10%`. | **`CRITICAL_THRESHOLD_CHANGE`** (`['15%', '300 measurement cycles'] -> ['10%', '250 measurement cycles']`) |
| **`3.2 Cuff Inflation Sequence`** | Steps up in `40 mmHg` increments if pulse not detected by `180 mmHg`. | Steps up in `30 mmHg` increments (reduced from original `40 mmHg` for reliability). | **`CRITICAL_THRESHOLD_CHANGE`** (`+['30 mmHg']`) |
| **`4.2 Error Codes` (Table)** | `E3`: Auto-deflates within `2 seconds`. Table has codes `E1` through `E5`. | `E3`: Auto-deflates within `1.5 seconds`. Added row `E6` (*Bluetooth sync failure*). | **`CRITICAL_THRESHOLD_CHANGE`** (`['2 seconds'] -> ['1.5 seconds', 'E6']`) |
| **`4.3 Alarm Thresholds`** | Audible alarms limited to `E1–E5` error conditions. | Audible alarms limited to `E1–E6` error conditions. | **`CRITICAL_THRESHOLD_CHANGE`** (`['E1–E5'] -> ['E1–E6']`) |
| **`5.3 Data Export`** | *Does not exist in v1.* | **New section added in v2** (CSV export in firmware 1.4 after Bluetooth sync). | **`ADDED`** (New node in v2 tree under `5. Data Management`) |
| **`7.1 Error Codes` (Troubleshooting)** | Text unchanged, but states *"If a code from Section 4.2 appears..."* | Text unchanged, but referenced `Section 4.2` changed in v2! | **`TRANSITIVE_STALE`** (Caught by our Cross-Reference Graph!) |
| **`4.1` vs `4.2` Contradiction** | Both `4.1` and `4.2 E3` state `2 seconds`. | `4.1` still says `2 seconds`, while `4.2 E3` says `1.5 seconds`! | **`SPEC_THRESHOLD_MISMATCH`** (Flagged in `regulatory_contradictions`!) |

---

## 4. Innovations Added to Make Your Submission Stand Out

1. **Three-Tier Staleness & Impact Classification (`FRESH` vs `COSMETIC_WORDING_CHANGE` vs `CRITICAL_THRESHOLD_CHANGE` vs `TRANSITIVE_STALE`)**
   - Most candidates only implement a single SHA-256 hash comparison (`old_hash != new_hash`).
   - The prompt explicitly asks: *"does a one-word wording change get treated the same as a changed pressure threshold? should it?"*
   - Our engine answers this directly in code: Tier 1 checks the SHA-256 hash, Tier 2 parses clinical/engineering quantities (`mmHg`, `bpm`, `%`, `seconds`, `measurement cycles`, `E1–E6`) to separate critical threshold changes from cosmetic wording edits, and Tier 3 checks the cross-reference dependency graph (`referenced_sections`) so test cases on `Section 7.1` are flagged as `TRANSITIVE_STALE` when `Section 4.2` changes!
2. **Automated Cross-Section Regulatory Contradiction Detector**
   - Tri9T AI builds compliance and document intelligence products. In `ct200_manual_v2.pdf`, the author updated `E3` in the `4.2 Error Codes` table from `2 seconds` to `1.5 seconds`, but **forgot to update Section `4.1 Overpressure Protection`**, which still says *"venting the cuff within 2 seconds"*. Our ingestion pipeline automatically detects and reports this exact cross-section contradiction (`SPEC_THRESHOLD_MISMATCH`).
3. **Self-Healing LLM Validation Loop with Error Feedback**
   - Rather than doing a blind retry when an LLM returns invalid JSON or fewer than 3 test cases, `LLMTestGeneratorService` injects the exact Pydantic `ValidationError` or out-of-bounds section reference into the retry prompt so the LLM corrects its mistake deterministically.

---

## 5. Step-by-Step Guide: What to Do Next (Before Tomorrow 11:59 PM IST)

### Step 1: Generate Your Local Repository & Commit History (2 Minutes)
1. Download `build_ct200_repo.py` (provided alongside this guide) into a working folder on your laptop.
2. Run:
   ```bash
   python3 build_ct200_repo.py
   ```
   This creates the `ct200-traceability-engine/` folder and automatically executes **7 clean, incremental Git commits** (`git log --oneline`).
3. Copy your two PDF files (`ct200_manual.pdf` and `ct200_manual_v2.pdf`) into `ct200-traceability-engine/data/` and commit them:
   ```bash
   cd ct200-traceability-engine
   cp /path/to/ct200_manual.pdf data/
   cp /path/to/ct200_manual_v2.pdf data/
   git add data/ct200_manual.pdf data/ct200_manual_v2.pdf
   git commit -m "chore(data): add CT-200 v1 and v2 regulatory manual PDFs"
   ```

### Step 2: Run the Unit Tests & End-to-End Verification Script (2 Minutes)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run the 6 explicit unit & integration tests
PYTHONPATH=. python3 tests/test_suite.py

# Run the end-to-end v1 -> v2 re-ingestion & staleness demonstration
PYTHONPATH=. python3 demo_e2e.py
```
*(Optional)* If you want live LLM calls via Groq in addition to the deterministic synthesizer, add your free Groq API key to `.env` (`GROQ_API_KEY=gsk_...`).

### Step 3: Push to a Public GitHub Repository (2 Minutes)
1. Create a new **Public** repository on GitHub named `ct200-traceability-engine`.
2. Push your incremental commit history:
   ```bash
   git remote add origin https://github.com/<your-username>/ct200-traceability-engine.git
   git push -u origin main
   ```
3. Verify on GitHub that:
   - Your commit history shows all incremental commits (`git log`).
   - `README.md` and `APPROACH.md` (which includes the required **Decision Log**) are visible at the root of the repo.
   - *(Recommended)* Also paste `APPROACH.md` into a Google Doc with sharing set to **"Anyone with the link can view"** in case the Google Form asks for a separate document link.

### Step 4: Submit the Google Form & Book Your Interview Slot (CRITICAL ORDER!)
> **⚠️ Application Integrity Policy Warning:**  
> Do **NOT** book an interview slot before uploading your completed assignment and submitting the Google Form. Tri9T reviews applications in real time and immediately disqualifies candidates who book a slot before submitting their completed work.

1. Update your resume (highlight Python, FastAPI, Pydantic, SQLite/MongoDB, PDF parsing, LLM structured outputs, and RAG/traceability).
2. Open the [Google Application Form](https://forms.gle/26F1bfFA5HRcaaBb7).
3. Provide your GitHub repository URL (`https://github.com/<your-username>/ct200-traceability-engine`) and your Approach Document link (`APPROACH.md` on GitHub + Google Doc link).
4. Submit the Google Application Form **first**.
5. **Immediately after submitting the form**, click the interview scheduling link to book an available interview slot between **23 October 2026 and 26 October 2026 (8:00 AM – 9:00 PM IST)** and verify that you receive the Google Calendar / Google Meet confirmation.

### Step 5: Send the Submission Email (Ready-to-Send Template)
The assignment lists **"Submission email with links to the repo and approach doc"** under Deliverables. Send this email to `thomas@tri9t.in` and `dhayananthan.c@tri9t.in` right after submitting the Google Form and booking your slot:

**To:** `thomas@tri9t.in`, `dhayananthan.c@tri9t.in`  
**Subject:** Technical Assignment Submission — AI Engineer Intern — [Your Full Name]  

**Body:**
```text
Dear Thomas and Dhayanthan,

I have completed and submitted the technical assignment for the AI Engineer Intern position at AffineSurge Pvt. Ltd. (Tri9T AI) via the Google Application Form and booked my interview slot.

Here are the direct links to my deliverables:
- GitHub Repository (with incremental commit history): https://github.com/[your-username]/ct200-traceability-engine
- Approach Document & Decision Log: https://github.com/[your-username]/ct200-traceability-engine/blob/main/APPROACH.md
- End-to-End Verification Script (v1 -> v2 re-ingestion & staleness flow): https://github.com/[your-username]/ct200-traceability-engine/blob/main/demo_e2e.py

Key highlights of the implementation:
1. Layout- and typography-aware PDF parser (`app/parser.py`) handling all structural anomalies in the CT-200 manual (multi-line title, skipped level 2.1 -> 2.1.1.1, 11pt Bold font anomaly on 3.2, out-of-order section 3.4 before 3.3, numbered list disambiguation in 3.3, duplicate headings on 4.2 and 7.1, and bounding-box deduplicated tables).
2. Non-destructive v1 -> v2 versioning (`app/versioning.py`) with a 3-stage logical node matcher and automated detection of the cross-section regulatory contradiction introduced in v2 (Section 4.1 2-second deflation vs. Section 4.2 E3 1.5-second deflation).
3. Structured-output LLM QA test generator (`app/llm_service.py`) with Pydantic validation, a 3-attempt self-healing error-feedback retry loop, and idempotent selection deduplication.
4. Three-tier staleness & impact detection (`FRESH`, `COSMETIC_WORDING_CHANGE`, `CRITICAL_THRESHOLD_CHANGE`, and `TRANSITIVE_STALE` across cross-referenced sections like 7.1 -> 4.2).

Thank you for your time and consideration. I look forward to walking through the architecture and code during the technical interview.

Best regards,
[Your Full Name]
[Your Phone Number]
[Your LinkedIn / GitHub URL]
```
