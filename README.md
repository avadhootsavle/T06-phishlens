# 🛡️ PhishLens

> **An intent-aware cybersecurity layer that verifies whether the identity, destination, and action behind a link or QR match what the user believes they are doing.**
> 
> *“Existing tools protect destinations. PhishLens protects decisions.”*

---

## 📌 Problem Statement

A user receives a WhatsApp message claiming their electricity bill is unpaid or their bank KYC is expiring, or scans a QR code at a local store. **They have only about 3 seconds to decide whether to proceed.**

Traditional antivirus and browser protections check static blocklists, which fail against newly registered domains, reverse-payment UPI scams, and homoglyph spoofs.

**PhishLens** decodes the URL or QR, unmasks redirect chains, performs sandboxed visual and structural inspections, validates UPI transaction semantics, and produces a simple **Safe / Caution / Danger** verdict with a clear one-sentence explanation understandable by any non-technical user.

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
- **Brand Claim vs. Official Domain**: Detects if a page claims to be SBI, HDFC, Paytm, etc., but is hosted on an unofficial host.
- **Lookalike & Homoglyph Detection**: Identifies Unicode confusable characters (e.g. Cyrillic `а` in `раytm.com`) and Levenshtein domain imitations.
- **Domain Age via RDAP**: Flags domains registered less than 7 days ago.
- **Credential Trap Detection**: Inspects HTML structure for password, OTP, CVV, or UPI PIN fields without ever reading or logging input values.
- **Safe Preview (Visual Impersonation)**: Launches a sandboxed headless browser to capture a safe screenshot and computes a perceptual hash (dHash) against official brand portals, flagging cloned login interfaces ($\ge 80\%$ visual similarity).

### 2. ⚡ PaymentTruth — Action & Direction Semantics
- **Payment Intent Verification**: Asks the user their intention (*"Pay a merchant"* vs *"Receive money / refund"*). If the user expected to receive funds, but the QR code executes a `upi://pay` debit, PhishLens triggers a **CRITICAL DANGER** warning:
  > *"This QR starts a payment from you even though you expected to receive money."*
- **Cryptographically Verified Merchant QRs (Ed25519)**:
  - Shopkeepers receive an Ed25519 cryptographically signed QR sticker.
  - PhishLens verifies the signature, validity period, and revocation list in constant time.
  - Detects counterfeit stickers pasted over genuine shop QRs.
- **Payee & Merchant Mismatch**: Compares the user's expected shop name with the actual UPI payee name to prevent merchant switch tricks.

### 3. 🧬 ScamDNA — Phishing Pattern Intelligence
- Creates a 64-bit structural **SimHash** and DOM fingerprint from form structures, brand keywords, headings, and favicon hashes.
- Compares new suspicious pages against confirmed scam campaigns to identify repeat fraudsters reusing phishing templates across new domains.

---

## 🚀 Interactive 1-Click Demo Lab

PhishLens includes pre-configured, live test scenarios right on the homepage:

| # | Attack Vector | Test Payload | What PhishLens Detects | Verdict |
| :-: | :--- | :--- | :--- | :-: |
| **1** | **WhatsApp Fake KYC Link** | `https://sbi-online-banking-portal.net` | SBI brand claim + young domain + credential trap | **DANGER** |
| **2** | **Reverse Payment Trick** | `upi://pay?pa=scammer.refund@upi&pn=Paytm%20Cashback&am=4999` *(Expected: Receive)* | QR executes account debit when user expected refund | **DANGER** |
| **3** | **Tampered QR Sticker** | Counterfeit Ed25519 sticker URL | Signature forged; warns of physical sticker paste-over | **DANGER** |
| **4** | **Homoglyph Domain Spoof** | `https://раytm-wallet.com` *(Cyrillic `а`)* | Unicode homoglyph spoofing Paytm gateway | **DANGER** |
| **5** | **Merchant Payee Mismatch** | Expected: *ABC Medical* $\to$ Payee: *Rahul Sharma* | Recipient mismatch; prompts confirmation | **CAUTION** |
| **6** | **Authentic Verified Shop** | Official Ed25519 sticker for *Apex Electronics* | Cryptographically verified merchant badge | **SAFE** |

---

## 🏗️ Architecture & Technology Stack

```
Chrome Extension (MV3) ───┐
                          │
React PWA (Vite/Tailwind) ┼──► Express.js Orchestration API (Port 5001)
                          │      │
                          │      ├── SSRF Route Guard & Sanitizer (Query Hashing)
                          │      ├── IntentGuard & Safe Preview (Playwright + Sharp)
                          │      ├── PaymentTruth & Ed25519 Merchant Service
                          │      ├── PostgreSQL via Prisma ORM
                          │      │
                          │      └── Python FastAPI Service (Port 8000)
                          │             ├── RapidFuzz Homoglyph Matching
                          │             └── ScamDNA SimHash Pattern Comparison
                          │
                          ▼
                Deterministic Risk Engine
                 (0-24 SAFE | 25-59 CAUTION | 60-100 DANGER)
```

### Stack Breakdown
- **Frontend / PWA**: React 18, TypeScript, Vite, Tailwind CSS, `@zxing/browser` (camera & upload QR scanner).
- **Chrome Extension**: Manifest V3, TypeScript, in-page security HUD, tab screen capture QR scanner.
- **Backend API**: Node.js, Express, TypeScript, Zod, Helmet, rate-limiting, native `crypto` (Ed25519).
- **Database**: PostgreSQL with Prisma ORM.
- **Sandboxed Preview**: Playwright headless Chromium with strict SSRF request interception and Sharp perceptual hashing.
- **Scam Intelligence**: Python 3, FastAPI, RapidFuzz, SimHash.

---

## 🔒 Security & Privacy Guarantees

1. **Strict SSRF Guard**: All incoming URLs and Playwright subresources are intercepted via `page.route('**/*')`. Requests resolving to `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, cloud metadata `169.254.169.254`, IPv6 equivalents, or non-HTTP protocols (`file:`, `ftp:`, `javascript:`) are instantly blocked.
2. **Privacy-Safe Parameter Storage**: Sensitive query values (e.g. `?email=...`, `?token=...`, `?phone=...`) are **never stored raw in the database or server logs**. They are transformed into cryptographic SHA-256 hashes (`hash_<sha256>`).
3. **No Credential Access**: Extension content scripts inspect form field types and labels without ever reading user input values (`input.value`).
4. **Deterministic Explanations**: Verdicts and risk scores are derived strictly from verifiable signals—never hallucinated by an LLM.

---

## ⚡ Quickstart & Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL running locally or in Docker

### 1. Database & Backend Setup
```bash
# Navigate to backend
cd backend
npm install

# Initialize Prisma schema and seed verified merchants & sample reports
npx prisma db push
npm run db:seed

# (Optional) Generate Ed25519 signing keys
npx tsx scripts/generate-signing-key.ts

# Start the Backend API (Port 5001)
npm run dev
```

### 2. Python ScamDNA Service
```bash
# Navigate to python_service
cd python_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the Python FastAPI Service (Port 8000)
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend PWA Setup
```bash
# Navigate to frontend
cd frontend
npm install

# Start the Vite Dev Server (Port 3000)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `/chrome_extension` folder.

---

## 🧪 Automated Test Suite

PhishLens includes **36 automated unit and integration tests** with 100% pass rate:
```bash
cd backend
npm test
```
- ✅ **13 Core System Tests**: UPI URI extraction, risk engine scoring boundaries, SSRF blocks, and query parameter hashing.
- ✅ **13 Safe Preview Tests**: Playwright subresource route guards, cloud metadata interception, Hamming distance similarity, and visual impersonation boost.
- ✅ **10 Verified Merchant QR Tests**: Ed25519 signature validity, 1-character tamper rejection, token expiration, revocation lists, and printable sticker decoding.

---

## 👥 Hackathon Team & Credits
Built for the Hackathon by the PhishLens Team.

> *"Existing tools protect destinations. PhishLens protects decisions."*
