# TECHFORGE 2026 — FINAL SUBMISSION

---

## 1. Team Details
- **Team Name**: Team T06
- **Team Members**:
  - **Avadhoot Savle**
  - **Krish Shah**

---

## 2. Problem Statement
- **Problem Statement Name**: Real-Time Phishing Link Detection & Fraudulent QR / UPI Payment Prevention
- **Selected Domain**: Cybersecurity / FinTech & Payment Security

---

## 3. Project Details
- **Project Title**: **PhishLens** — Intent-Aware Security Layer for URLs and UPI QRs
- **Short Description**:  
  PhishLens is an intent-aware cybersecurity platform that protects users against malicious phishing websites and fraudulent QR/UPI payments in real time. By analyzing website brand identity, redirect chains, homoglyph lookalikes, credential traps, and UPI transaction semantics, it verifies whether the real-world action behind a link or QR code aligns with what the user intended to do. Featuring a cross-platform Chrome Extension, an installable mobile PWA, Ed25519 cryptographic merchant verification, and a ScamDNA pattern engine, PhishLens delivers explainable **Safe**, **Caution**, and **Danger** verdicts in under 3 seconds without compromising user privacy.

---

## 4. GitHub Repository
- **GitHub Repository Link**: [https://github.com/avadhootsavle/T06-phishlens](https://github.com/avadhootsavle/T06-phishlens)
- **Repository Name**: `T06-phishlens`

---

# 🛡️ PhishLens

> **An intent-aware security layer that verifies whether the identity, destination, and action behind a link or QR match what the user believes they are doing.**
> 
> *“Existing tools protect destinations. PhishLens protects decisions.”*

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [The Three Core Pillars](#-the-three-core-pillars)
3. [Key Features](#-key-features)
4. [Technology Stack](#-technology-stack)
5. [Architecture & Workflow](#-architecture--workflow)
6. [Dataset & API Information](#-dataset--api-information)
7. [Interactive 1-Click Demo Lab](#-interactive-1-click-demo-lab)
8. [Automated Test Suite](#-automated-test-suite)
9. [Setup & Installation Instructions](#-setup--installation-instructions)
10. [Security & Privacy Guarantees](#-security--privacy-guarantees)
11. [Limitations & Future Scope](#-limitations--future-scope)
12. [Team Members](#-team-members)

---

## 🌐 Project Overview

A user receives an urgent WhatsApp or SMS message claiming their electricity connection will be disconnected tonight or their bank KYC has expired, or scans a printed QR code pasted over a store counter. **The user has only about 3 seconds to make a decision.**

Traditional endpoint security and browser warnings rely heavily on static blocklists and central feeds like Google Safe Browsing. These fail against:
- **Zero-day phishing domains** registered just minutes or hours before an attack campaign.
- **Reverse-payment UPI scams**, where fraudsters trick victims expecting a refund into scanning a `upi://pay` debit request.
- **Counterfeit QR stickers**, physically pasted over authentic merchant QR standees at retail shops.
- **Homoglyph & Unicode domain spoofs** that appear identical to authentic banking sites.

**PhishLens** solves this by actively understanding **intent**. Instead of solely classifying a URL in isolation, it analyzes whether the identity claimed by a website matches its verified registration, whether the UPI transaction flow executes what the user intended to do, and whether newly spawned scam sites reuse structural fingerprints from known phishing operations.

---

## 🏆 The Three Core Pillars

```
                      ┌──────────────────────────────────────────────┐
                      │                  PhishLens                   │
                      │        Intent-Aware Security Engine          │
                      └──────────────────────┬───────────────────────┘
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼                               ▼                               ▼
    🎯 IntentGuard                  ⚡ PaymentTruth                  🧬 ScamDNA
    "Is this site who               "What will this QR               "Is this the same
     it claims to be?"               actually do?"                    scam in a new disguise?"
```

### 1. 🎯 IntentGuard — Identity Verification
- **Brand Claim vs. Official Host**: Inspects page titles, H1/H2 headings, favicons, and metadata to identify declared brands (e.g. SBI, HDFC Bank, ICICI Bank, Paytm, PhonePe), cross-referencing them against an official domain ownership registry.
- **Homoglyph & Confusable Detection**: Flags Unicode confusable substitutions (e.g. Cyrillic `а` in `раytm.com`) and Levenshtein lookalikes (`hdfc-secure-update.com`).
- **Domain Age via RDAP**: Inspects authoritative domain registration dates via RDAP protocol, applying calibrated threat weights to domains registered $<7$ days or $<30$ days ago.
- **Credential Trap Detection**: Inspects form structure for password, OTP, CVV, and UPI PIN fields on unverified domains without ever touching or reading input values (`input.value`).

### 2. ⚡ PaymentTruth — Action & Transaction Semantics
- **Payment Intent Verification**: Prompts the user before scanning (*"Pay a merchant"* vs *"Receive money / refund / cashback"*). If the user expects to receive funds, but the QR code executes a `upi://pay` payment debit, PhishLens flags an instant **DANGER**:
  > *"This QR starts a payment from you even though you expected to receive money."*
- **Cryptographically Verified Merchant QRs (Ed25519)**:
  - Genuine merchants are issued Ed25519-signed QR tokens.
  - PhishLens verifies the signature, validity period, and revocation list in constant time.
  - Immediately detects counterfeit stickers physically pasted over genuine standees.
- **Payee & Merchant Mismatch**: Cross-checks user-entered merchant names against parsed UPI payee names (`pn` parameter) to stop recipient substitution fraud.

### 3. 🧬 ScamDNA — Phishing Pattern Intelligence
- Creates a 64-bit structural **SimHash** and DOM fingerprint from form field counts, brand keywords, tag hierarchies, and script hosts.
- Compares incoming suspicious pages against confirmed scam campaign signatures to recognize attackers who rotate domains while reusing identical phishing kits.

---

## ✨ Key Features

| Category | Feature | Description |
| :--- | :--- | :--- |
| **URL Security** | **Unmasking & Redirect Analysis** | Follows up to 5 redirect hops to expose hidden destinations behind URL shorteners (`bit.ly`, `tinyurl.com`, `t.co`). |
| **URL Security** | **SSRF Route Defense** | Blocks internal network lookups (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata (`169.254.169.254`), and dangerous protocols (`file:`, `ftp:`, `javascript:`). |
| **URL Security** | **Lookalike & Homoglyph Engine** | Uses RapidFuzz and Unicode confusable normalization to detect spoofed domain names. |
| **Payment Protection** | **UPI URI Parsing** | Parses `pa` (VPA), `pn` (Payee Name), `am` (Amount), `cu` (Currency), and `tn` (Transaction Note). |
| **Payment Protection** | **Cryptographic Ed25519 Badging** | Verifies tamper-proof QR tokens issued to trusted merchants, eliminating sticker swapping. |
| **Community Defense** | **Website Reporting & Triage** | Users and extension users can report malicious URLs directly for immediate admin triage and database indexing. |
| **Chrome Extension** | **Real-Time Browsing HUD** | Chrome MV3 extension with automatic navigation checks, in-tab HUD inspection, and tab screen QR capture. |
| **Mobile PWA** | **Camera & Image Scanner** | Progressive Web App with offline caching, camera QR scanning, image upload, and responsive touch controls. |
| **Privacy First** | **Cryptographic Query Hashing** | Replaces sensitive query parameters (`?email=...`, `?token=...`) with SHA-256 hashes (`hash_<sha256>`) before database storage. |

---

## 🛠️ Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT INTERFACES                               │
├──────────────────────────────────────┬──────────────────────────────────────┤
│          React Mobile PWA            │         Chrome Extension MV3         │
│  React 18 · TypeScript · Vite        │  Manifest V3 · Chrome APIs           │
│  Tailwind CSS · @zxing/browser       │  In-Page Security HUD                │
│  vite-plugin-pwa · Lucide Icons      │  Tab Screen Capture Scanner          │
└──────────────────────────────────────┴──────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPRESS ORCHESTRATION API                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Node.js · Express.js · TypeScript · Zod Validation · Helmet Security       │
│  SSRF Route Guard · Privacy Query Hasher · Ed25519 Crypto Engine            │
│  Centralized Deterministic Risk Scoring Engine (0-24 SAFE | 25-59 CAUTION | 60-100 DANGER) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                   ┌───────────────────┴───────────────────┐
                   ▼                                       ▼
┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐
│         POSTGRESQL + PRISMA         │ │     PYTHON FASTAPI SERVICE          │
├─────────────────────────────────────┤ ├─────────────────────────────────────┤
│  Prisma ORM Client                  │ │  FastAPI · Uvicorn · Python 3       │
│  Scans & Signal Event Logs          │ │  RapidFuzz Homoglyph Matching       │
│  Brand & Official Domain Registry   │ │  ScamDNA 64-bit SimHash Engine      │
│  Verified Merchant Registry         │ │  DOM Structural Fingerprinting      │
│  Community Triage Queue             │ │                                     │
└─────────────────────────────────────┘ └─────────────────────────────────────┘
```

---

## 📐 Architecture & Workflow

### End-to-End URL Analysis Flow
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Ext as Chrome Extension / PWA
    participant API as Express API (Port 5001)
    participant SSRF as SSRF & Redirect Guard
    participant IG as IntentGuard & RDAP
    participant Py as Python ScamDNA (Port 8000)
    participant DB as PostgreSQL (Prisma)
    participant RE as Deterministic Risk Engine

    User->>Ext: Enters URL / Navigates to page
    Ext->>API: POST /api/v1/scans/url { url }
    API->>SSRF: Validate protocol & check IP destination
    SSRF-->>API: Destination approved (Non-internal IP)
    
    par Parallel Heuristic & Intelligence Analysis
        API->>IG: Check brand claims, RDAP domain age & homoglyphs
        API->>Py: Compute domain similarity & SimHash matches
        API->>DB: Query community reports & brand ownership
    end
    
    IG-->>API: Extracted identity & age signals
    Py-->>API: Similarity ratio & campaign match score
    DB-->>API: Known brand domains & active reports
    
    API->>RE: Aggregate signals & evaluate scoring weights
    RE-->>API: Verdict (SAFE / CAUTION / DANGER) + Explanation
    API->>DB: Store sanitized scan record (SHA-256 query hashed)
    API-->>Ext: Return JSON scan verdict & detailed "Why?" breakdown
    Ext-->>User: Render visual security banner & advice
```

---

## 📊 Dataset & API Information

### Pre-Seeded Datasets
1. **Protected Brand Registry (`Brand` & `BrandDomain`)**:
   - Covers premier Indian banking, telecom, tax, and fintech portals: SBI (`onlinesbi.sbi`), HDFC Bank (`hdfcbank.com`), ICICI Bank (`icicibank.com`), Axis Bank (`axisbank.com`), Paytm (`paytm.com`), PhonePe (`phonepe.com`), Google Pay (`pay.google.com`), UIDAI (`uidai.gov.in`), Income Tax Department (`incometax.gov.in`), IRCTC (`irctc.co.in`), and India Post (`indiapost.gov.in`).
2. **Verified Merchant Registry (`Merchant` & `MerchantKey`)**:
   - Houses cryptographically authenticated retail merchants with active Ed25519 public keys and registered VPAs (e.g. *Apex Electronics*, *Green Grocers*, *QuickBite Cafe*).

### Core REST API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/scans/url` | Submit URL for redirect unmasking, RDAP, homoglyph, and intent analysis |
| `POST` | `/api/v1/scans/qr` | Submit QR payload with user intent (`PAY` vs `RECEIVE`) and optional merchant context |
| `POST` | `/api/v1/scans/:id/page-metadata` | Chrome Extension enrichment with content script form analysis |
| `POST` | `/api/v1/reports` | Submit community phishing report for website URL or suspicious payment |
| `GET` | `/api/v1/admin/reports` | Admin dashboard queue for triage, confirmation, and ScamDNA indexing |
| `PATCH` | `/api/v1/admin/reports/:id` | Update report status (`CONFIRMED`, `FALSE_POSITIVE`, `REJECTED`) |
| `GET` | `/api/v1/merchants/search` | Search verified merchants by name or VPA |
| `POST` | `/api/v1/merchants/verify-qr` | Verify Ed25519 cryptographically signed QR code token |
| `GET` | `/api/v1/merchants/.well-known/jwks.json` | Public RFC 7517 JWKS discovery endpoint for merchant verification keys |
| `POST` | `/internal/domain/similarity` | Python microservice endpoint for RapidFuzz Levenshtein similarity |
| `POST` | `/internal/fingerprint/compare` | Python microservice endpoint for 64-bit SimHash Hamming distance |

---

## 🧪 Interactive 1-Click Demo Lab

PhishLens includes pre-configured live test scenarios on the PWA homepage (`http://localhost:3000`):

| # | Attack Scenario | Test Input / Payload | Detection Mechanism | Final Verdict |
| :-: | :--- | :--- | :--- | :-: |
| **1** | **WhatsApp Fake KYC Link** | `https://sbi-online-banking-portal.net` | SBI brand claim on unofficial host + domain age $<7$ days + credential trap | **DANGER** (Score: 85) |
| **2** | **Reverse-Payment Scam** | `upi://pay?pa=scammer.refund@upi&pn=Paytm%20Cashback&am=4999` *(Expected: Receive)* | Intent mismatch: QR executes account debit when user expected refund | **DANGER** (Score: 70) |
| **3** | **Tampered QR Standee** | Counterfeit Ed25519 sticker URL | Cryptographic signature failure; warns of pasted counterfeit sticker | **DANGER** (Score: 70) |
| **4** | **Homoglyph Domain Spoof** | `https://раytm-wallet.com` *(Cyrillic `а`)* | Unicode homoglyph mimicking Paytm gateway | **DANGER** (Score: 65) |
| **5** | **Merchant Payee Mismatch** | Expected: *ABC Medical* $\to$ Payee: *Rahul Sharma* | Recipient mismatch detected; prompts user confirmation | **CAUTION** (Score: 25) |
| **6** | **Authentic Verified Shop** | Official Ed25519 sticker for *Apex Electronics* | Cryptographically verified Ed25519 signature & VPA match | **SAFE** (Score: 0) |

---

## 🔬 Automated Test Suite

PhishLens includes **24 automated unit and integration tests** with 100% pass rate:

```bash
cd backend
npm test
```

### Test Suite Execution Output
```text
🧪 Starting PhishLens Automated Test Suite...

  ✅ PASS: UPI Parser extracts payee, VPA, and amount correctly
  ✅ PASS: UPI Parser handles non-UPI strings cleanly
  ✅ PASS: Risk Engine assigns SAFE for 0-24 points
  ✅ PASS: Risk Engine assigns CAUTION for 25-59 points
  ✅ PASS: Risk Engine assigns DANGER for 60-100 points
  ✅ PASS: Risk Engine clamps score at maximum 100
  ✅ PASS: SSRF rejects localhost destination
  ✅ PASS: SSRF rejects private IPv4 127.0.0.1
  ✅ PASS: SSRF rejects AWS/GCP metadata IP 169.254.169.254
  ✅ PASS: SSRF rejects non-HTTP protocol file://
  ✅ PASS: URL Heuristics detects raw numerical IP addresses
  ✅ PASS: URL Heuristics detects sensitive keywords
  ✅ PASS: Logs and storage store only hashed query parameters
  ✅ PASS: Community reporting accepts direct website URL and formats report note

🎉 Test Results: 14/14 passed (100%)

🧪 Starting Verified Merchant QR Test Suite...

  ✅ PASS: Valid Token: Cryptographically signed token verifies successfully
  ✅ PASS: Tamper Resistance: A token with one modified character fails signature verification (TAMPERED)
  ✅ PASS: Expiry Check: An expired token is rejected (EXPIRED)
  ✅ PASS: Revocation List: A token from a revoked merchant is rejected (REVOKED)
  ✅ PASS: Key Rotation: A token signed with an unknown kid is rejected (TAMPERED)
  ✅ PASS: End-to-End Sticker: QR code extracted from printed PNG sticker verifies completely
  ✅ PASS: Merchant Mismatch: Plain UPI QR with mismatched expected shop name returns MISMATCH
  ✅ PASS: Registry Match: Plain UPI QR for registered VPA returns VERIFIED_REGISTRY
  ✅ PASS: Scoring Integration: VERIFIED lowers risk score (-20), TAMPERED triggers DANGER (+70)
  ✅ PASS: JWKS Discovery: Returns RFC-compliant public keys with Ed25519

🎉 Verified Merchant QR Test Suite: 10/10 passed (100%)
```

---

## ⚡ Setup & Installation Instructions

### Prerequisites
- **Node.js** v18+ (tested on Node v21.7.1)
- **Python** 3.10+
- **PostgreSQL** running locally on port 5432 or via Docker

---

### Step 1: Database & Express Backend Setup
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment variables (create .env file)
cat << 'EOF' > .env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/phishlens?schema=public"
PYTHON_SERVICE_URL="http://localhost:8000"
SAFE_BROWSING_API_KEY=""
EOF

# 4. Push Prisma schema to PostgreSQL & seed initial data
npx prisma db push
npm run db:seed

# 5. Start Express API Server (runs on http://localhost:5001)
npm run dev
```

---

### Step 2: Python ScamDNA Microservice Setup
```bash
# 1. Open a new terminal and navigate to python_service
cd python_service

# 2. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install required Python packages
pip install -r requirements.txt

# 4. Start FastAPI service via Uvicorn (runs on http://localhost:8000)
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

### Step 3: Mobile React PWA Setup
```bash
# 1. Open a new terminal and navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite dev server (runs on http://localhost:3000)
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your mobile or desktop browser.

---

### Step 4: Chrome Extension Installation (Manifest V3)
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `/chrome_extension` directory inside the repository.
4. The PhishLens shield icon will appear in your Chrome toolbar. Pin it for quick access.

---

## 🔒 Security & Privacy Guarantees

1. **Strict SSRF Guard**: All incoming URLs are inspected before fetching. Requests resolving to `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, cloud metadata `169.254.169.254`, IPv6 equivalents, or non-HTTP protocols (`file:`, `ftp:`, `javascript:`) are instantly blocked.
2. **Privacy-Safe Query Hashing**: Sensitive query values (e.g. `?token=secret123`, `?email=user@test.com`) are **never stored raw in database columns or server logs**. They are securely transformed into one-way cryptographic SHA-256 hashes (`hash_<sha256>`).
3. **Zero Credential Access**: Chrome Extension content scripts inspect form field types (`password`, `text`), attributes (`name="otp"`), and accessibility labels to detect credential traps **without ever reading user input values** (`input.value`).
4. **Deterministic Explanations**: Risk scores and warnings are generated strictly by an explainable, deterministic scoring engine with transparent rationale—never hallucinated by an unconstrained LLM.

---

## 🚀 Limitations & Future Scope

### Current Limitations
- **Public RDAP Server Rate Limits**: Public whois/RDAP servers can intermittently throttle requests under sustained load; PhishLens implements in-memory caching to mitigate this.
- **Merchant Registry Scope**: The verified merchant database currently functions as an authoritative demonstration registry rather than an official national banking switch integration.
- **Offline Link Analysis**: Offline scanning is limited to local heuristic checks and cached threat signatures.

### Future Scope
- **National Banking Switch (NPCI) Integration**: Direct integration with NPCI / UPI interoperability APIs for real-time merchant VPA certificate validation.
- **On-Device WASM Homoglyph Matching**: Running full Unicode confusable normalization and Levenshtein similarity directly within the Chrome Extension client using WebAssembly.
- **Decentralized Threat Intelligence Sharing**: Enabling federated, privacy-preserving sharing of confirmed ScamDNA fingerprints across participating financial institutions.

---

## 👥 Team Members

- **Avadhoot Savle** — Full Stack Development, Backend Architecture, Security Protocols
- **Krish Shah** — Frontend Engineering, Chrome Extension, PWA & Threat Intelligence

---

> *“Existing tools protect destinations. PhishLens protects decisions.”*  
> **TECHFORGE 2026 Submission — Team T06**
