# PhishLens — AGENTS.md

## 1. Project Overview

**PhishLens** is a cybersecurity platform that protects users from phishing links and fraudulent QR/UPI payments.

The product has two interfaces:

- **Chrome Extension** for automatic website/link analysis.
- **React PWA** for mobile QR scanning, UPI analysis and manual link scanning.

The system returns:

- `SAFE`
- `CAUTION`
- `DANGER`

Every verdict must include a simple explanation understandable by a non-technical user.

PhishLens should be presented as:

> **An intent-aware security layer that verifies whether the identity, destination and action behind a link or QR match what the user believes they are doing.**

Do not position it simply as an AI phishing detector, URL checker or QR scanner.

---

# 2. Original Problem

A user may have only a few seconds to decide whether a link or QR code is safe.

PhishLens must analyze:

- shortened URLs,
- redirect chains,
- final destination,
- known malicious URLs,
- newly registered domains,
- suspicious URL structures,
- lookalike domains,
- homoglyph domains,
- brand impersonation,
- suspicious credential forms,
- UPI payment information,
- merchant/payee mismatches,
- receive-money scams.

It must produce an explainable risk verdict quickly.

---

# 3. Core Product Architecture

```text
Chrome Extension ───┐
                    │
React PWA ──────────┤
                    ↓
             Express API
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
   URL Engine   Payment Engine  Reporting
        │           │
        ↓           ↓
   IntentGuard  PaymentTruth
        │
        ↓
Python Analysis Service
        │
     ScamDNA
        │
        └───────────┐
                    ↓
               Risk Engine
                    ↓
       SAFE / CAUTION / DANGER
                    ↓
          Simple explanation
```

---

# 4. Main Technology Stack

## Frontend / PWA

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- `vite-plugin-pwa`

QR scanning:

- `@zxing/browser`

The PWA replaces the need for an APK.

---

## Chrome Extension

- React
- TypeScript
- Manifest V3
- Chrome Extensions API

Main APIs:

- `chrome.tabs`
- `chrome.webNavigation`
- `chrome.runtime`
- `chrome.storage`
- `chrome.action`

---

## Main Backend

Use:

- Node.js
- Express.js
- TypeScript

Important libraries:

- Zod
- Helmet
- CORS
- express-rate-limit
- Pino
- native `fetch` / Undici
- `tldts`

Express is the main orchestration layer.

---

## Database

Use:

- PostgreSQL
- Prisma ORM

Do not use MongoDB.

---

## Python Service

Python is allowed only where it provides a clear advantage.

Use Python for:

- ScamDNA
- similarity analysis
- homoglyph analysis
- advanced phishing fingerprint comparison

Recommended:

- FastAPI
- RapidFuzz
- BeautifulSoup
- SimHash
- Pillow
- imagehash
- confusable-homoglyphs

Frontend applications must communicate only with Express.

```text
Frontend → Express → Python Service
```

---

# 5. The Three Main USPs

## 5.1 IntentGuard

### Purpose

Checks:

> **Is this website really who it claims to be?**

Example:

```text
Website claims: HDFC Bank
Domain: hdfc-secure-login.example
Official HDFC domain: No
Domain age: 3 days
Password field: Yes
OTP field: Yes
```

Result:

```text
DANGER

"This page claims to be HDFC Bank but is not hosted on an official HDFC domain and asks for banking information."
```

IntentGuard combines:

- brand detection,
- official-domain verification,
- lookalike detection,
- homoglyph detection,
- domain age,
- URL structure,
- credential-form analysis,
- known threat intelligence.

---

## 5.2 PaymentTruth

### Purpose

Explains:

> **What will this QR actually make the user do?**

Example:

```text
upi://pay?pa=rahul@upi&pn=Rahul%20Kumar&am=5000
```

PhishLens displays:

```text
YOU ARE ABOUT TO PAY ₹5,000

Recipient: Rahul Kumar
UPI: rahul@upi
```

If the user expected to receive money:

```text
DANGER

"This QR starts a payment from you even though you expected to receive money."
```

PaymentTruth also checks merchant/payee mismatch.

---

## 5.3 ScamDNA

### Purpose

Detects:

> **Is this the same scam using another domain?**

Attackers may change:

```text
sbi-login-one.example
```

to:

```text
sbi-secure-two.example
```

but reuse:

- same title,
- same favicon,
- same form structure,
- same brand,
- same OTP/password fields,
- similar DOM structure.

ScamDNA creates fingerprints and compares suspicious pages against confirmed phishing fingerprints.

---

# 6. Complete Feature List

## URL Protection

- Automatic Chrome URL scanning
- Manual URL scanning
- URL validation and normalization
- Short URL expansion
- Redirect-chain analysis
- Final destination detection
- Google Safe Browsing integration
- RDAP/domain-age detection
- Suspicious URL structure detection
- Lookalike domain detection
- Homoglyph detection
- Brand impersonation detection
- Credential Trap Detection
- IntentGuard
- Risk scoring
- Human-readable explanation

## QR / UPI Protection

- Camera QR scanning
- URL QR detection
- UPI QR detection
- UPI URI parsing
- Payee-name detection
- UPI-ID detection
- Amount detection
- Payment direction explanation
- PaymentTruth
- Receive-money scam detection
- Merchant/payee mismatch

## Scam Intelligence

- ScamDNA fingerprint generation
- Fingerprint comparison
- Known scam campaign matching

## Reporting

- Report suspicious website
- Report suspicious QR/payment
- Report incorrect warning
- Community report counts
- Admin review
- `PENDING`
- `CONFIRMED`
- `FALSE_POSITIVE`
- `REJECTED`

## UX

- Safe / Caution / Danger
- Risk score
- One-sentence explanation
- Detailed “Why?” section
- Chrome Extension
- Mobile PWA
- Basic admin dashboard

---

# 7. URL Scan Pipeline

For every URL:

```text
Validate
↓
Normalize
↓
SSRF protection
↓
Expand redirects
↓
Find final domain
↓
Safe Browsing
↓
RDAP / domain age
↓
URL structure analysis
↓
Lookalike + homoglyph detection
↓
Brand analysis
↓
Credential-form analysis
↓
ScamDNA
↓
Community reports
↓
Risk Engine
↓
Verdict + explanation
```

Independent checks should run concurrently wherever possible.

Target:

```text
Useful result within approximately 3 seconds.
```

If one external provider fails, use the remaining signals instead of failing the whole scan.

---

# 8. Redirect Analysis

Use the Express backend to follow redirects.

Maximum:

```text
5 redirects
```

Detect:

- URL shorteners,
- cross-domain redirects,
- multiple redirects,
- excessive redirects.

Redirects alone must never automatically mean phishing.

---

# 9. SSRF Protection

Because users submit arbitrary URLs, the backend must block requests to:

- localhost,
- `127.0.0.0/8`
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`
- metadata endpoints,
- link-local networks,
- internal IPv6 ranges.

Allow only:

```text
http
https
```

Block:

```text
file:
ftp:
data:
javascript:
```

Validate every redirect destination again.

---

# 10. Threat Intelligence

Use **Google Safe Browsing** for known malicious URLs.

The application should use a provider interface so this can later be replaced with another commercial threat feed.

Safe Browsing failure must not stop a scan.

---

# 11. Domain Age

Use **RDAP**.

Suggested rules:

```text
< 7 days     → strong signal
7–30 days    → moderate signal
30–90 days   → weak signal
> 90 days    → no penalty
```

A new domain alone must not produce `DANGER`.

---

# 12. Suspicious URL Detection

Check for:

- excessive subdomains,
- very long URLs,
- IP-address URLs,
- suspicious encoding,
- unusual characters,
- brand names inside unrelated domains,
- suspicious words such as:
  - login
  - verify
  - secure
  - KYC
  - update
  - refund
  - account
  - wallet
  - claim

These are contextual signals only.

---

# 13. Lookalike and Homoglyph Detection

Maintain a protected-brand database.

Examples:

- SBI
- HDFC Bank
- ICICI Bank
- Axis Bank
- Paytm
- PhonePe
- Google Pay
- UIDAI
- Income Tax
- IRCTC
- India Post

Compare candidate domains against official domains using:

- edit distance,
- RapidFuzz similarity,
- IDNA normalization,
- Unicode/confusable analysis.

Example:

```text
paytm.com
paytmm.example
pay-tm.example
Unicode lookalike domain
```

Strong resemblance creates a risk signal.

---

# 14. Brand Impersonation Detection

The Chrome extension reads safe page metadata such as:

- page title,
- H1/H2 headings,
- visible brand words,
- logo alt text,
- favicon,
- form structure.

Example:

```text
Title: SBI Online Banking
Domain: random-example.xyz
```

The backend checks whether the detected brand officially owns the current domain.

If not:

```text
BRAND_DOMAIN_MISMATCH
```

This signal becomes stronger when combined with:

- young domain,
- lookalike domain,
- password field,
- OTP field.

---

# 15. Credential Trap Detection

The extension must detect whether a suspicious page asks for sensitive credentials.

Inspect HTML structure for:

```text
password
OTP
CVV
card number
account number
UPI PIN
KYC
bank login
```

Check:

- `type`
- `name`
- `id`
- `placeholder`
- labels
- nearby text

Never read:

```text
input.value
```

Never collect:

- passwords,
- OTPs,
- card values,
- UPI PINs.

Credential forms on official sites are normal.

Credential forms become dangerous only when combined with suspicious identity/domain signals.

---

# 16. UPI Parsing

Support:

```text
upi://pay
```

Parse fields where available:

```text
pa → UPI ID
pn → payee name
am → amount
cu → currency
tn → note
mc → merchant category
```

Example:

```text
upi://pay?pa=abc@upi&pn=ABC%20Store&am=500
```

Display:

```text
Recipient: ABC Store
UPI: abc@upi
Amount: ₹500
```

---

# 17. Payment Intent

Ask the user:

```text
What are you trying to do?

[ Pay a merchant ]
[ Receive money / refund / cashback ]
[ Not sure ]
```

If expected action is:

```text
RECEIVE
```

but QR contains:

```text
upi://pay
```

create:

```text
PAYMENT_INTENT_MISMATCH
```

This is a very strong `DANGER` signal.

---

# 18. Merchant / Payee Mismatch

A QR alone cannot know the physical shop.

Merchant context therefore comes from:

- a registered merchant, or
- the merchant name entered/selected by the user.

Example:

```text
Expected merchant:
ABC Medical

QR payee:
Rahul Sharma
```

Result:

```text
CAUTION

"The payment name does not match the merchant name you provided. Confirm the recipient before paying."
```

Do not automatically call this fraud because legitimate small businesses may use personal UPI IDs.

---

# 19. Merchant Registry

PostgreSQL stores demo merchants.

Example:

```text
ABC Medical
→ abcmedical@upi
```

Use this only as a proof-of-concept registry.

Do not claim real NPCI/bank merchant verification unless such integration exists.

---

# 20. ScamDNA

Fingerprint suspicious pages using:

- detected brand,
- normalized title,
- favicon hash,
- password/OTP field counts,
- form structure,
- DOM structural fingerprint,
- important script hosts.

Store fingerprints only for confirmed suspicious pages.

Do not store every scanned website as a phishing fingerprint.

Suggested similarity:

```text
>= 90% → strong match
80–89% → possible match
< 80% → ignore
```

These thresholds are adjustable after testing.

---

# 21. Reporting System

Users can report:

- phishing website,
- suspicious payment,
- incorrect recipient,
- brand impersonation,
- false positive,
- other.

Reports contain:

```text
scanId
category
optional note
status
createdAt
```

Statuses:

```text
PENDING
CONFIRMED
FALSE_POSITIVE
REJECTED
```

A single report must not automatically mark something dangerous.

Admin confirmation can:

- strengthen future risk,
- add local threat intelligence,
- add confirmed fingerprints to ScamDNA.

---

# 22. PostgreSQL Core Tables

Use Prisma models for:

### Scan
- id
- inputType
- verdict
- riskScore
- explanation
- hostname
- finalHostname
- createdAt

### ScanSignal
- scanId
- code
- severity
- scoreImpact
- metadata JSONB

### Brand
- name
- normalizedName
- category
- keywords

### BrandDomain
- brandId
- official domain

### Merchant
- name
- normalizedName
- verified

### MerchantPaymentIdentifier
- merchantId
- type
- value

### Report
- scanId
- category
- note
- status
- timestamps

### ScamFingerprint
- brandId
- campaignId
- fingerprintData
- confirmed

### ScamCampaign
- name
- status

---

# 23. Risk Engine

Use one centralized risk engine.

All modules return security signals.

Example starting weights:

```text
Known phishing                +70
Payment intent mismatch       +70
Homoglyph brand match         +35
ScamDNA strong match          +35
Brand/domain mismatch         +30
Strong lookalike domain       +25
Credential trap               +25
Merchant/payee mismatch       +25
Domain < 7 days               +20
Domain < 30 days              +12
OTP field                     +12
Excessive redirects           +10
IP-address URL                +10
Password field                 +8
Suspicious URL                 +8
```

Final score:

```text
0–24   SAFE
25–59  CAUTION
60–100 DANGER
```

Tune thresholds after testing.

A weak signal alone must not create `DANGER`.

---

# 24. Explanation Engine

Do not use an LLM for the primary verdict or explanation.

Use deterministic templates.

Examples:

> “This page claims to be SBI but is not hosted on an official SBI domain.”

> “This domain closely imitates Paytm using unusual characters.”

> “This QR starts a payment from you even though you expected to receive money.”

> “The payment name does not match the merchant name you provided.”

Every result must include one main explanation and optionally a detailed “Why?” section.

---

# 25. Chrome Extension Flow

```text
User opens website
↓
Extension detects navigation
↓
URL sent to Express
↓
Initial security checks
↓
Content script analyzes safe page metadata
↓
Metadata sent to backend
↓
Risk recalculated
↓
Extension shows verdict
```

Content script may collect:

- title,
- headings,
- brand words,
- form types,
- field labels,
- favicon.

Never collect entered values.

---

# 26. PWA Screens

Minimum:

```text
Home
QR Scanner
URL Analyzer
Result Page
Report Page
About
Admin Dashboard
```

Home should mainly show:

```text
Scan QR
Check a Link
```

Keep the mobile experience simple.

---

# 27. Result Screen

Example:

```text
DANGER
82/100

"This page claims to be SBI but uses a recently registered unofficial domain."

Why?

• SBI branding detected
• Domain not registered as SBI
• Domain is 4 days old
• Password field detected
```

Never say:

> “100% safe.”

For Safe:

> “No major phishing indicators were detected.”

---

# 28. Main API Endpoints

```text
GET  /api/v1/health

POST /api/v1/scans/url

POST /api/v1/scans/:scanId/page-metadata

POST /api/v1/scans/qr

POST /api/v1/reports

GET  /api/v1/admin/reports

PATCH /api/v1/admin/reports/:id

GET  /api/v1/merchants/search
```

Internal Python:

```text
POST /internal/domain/similarity
POST /internal/fingerprint/generate
POST /internal/fingerprint/compare
```

---

# 29. Security Requirements

Use:

- Zod request validation
- Helmet
- CORS restrictions
- rate limiting
- environment variables
- HTTPS
- SSRF blocking
- API timeouts
- maximum redirect limits

Never commit:

- API keys,
- database passwords,
- JWT secrets,
- service secrets.

---

# 30. Logging

Privacy-safe logging is **not a USP**.

However, the supplied problem requires sensitive query values not to be stored directly.

Therefore:

Do not persist raw values such as:

```text
?email=user@example.com
?token=secret
```

Prefer storing:

- hostname,
- pathname,
- parameter names,
- HMAC/hash values only when comparison is required.

Never log passwords, OTPs, card numbers or UPI PINs.

---

# 31. Error Handling

A failed external service should not fail the complete scan.

Example:

```text
RDAP unavailable
```

Continue using:

- local URL analysis,
- Safe Browsing if available,
- brand checks,
- ScamDNA,
- other signals.

Uncertainty must never itself increase the threat score.

---

# 32. Performance

Target:

```text
< 3 seconds for a useful verdict
```

Run independent checks concurrently.

Cache:

- Safe Browsing responses,
- RDAP/domain age,
- brand similarity,
- repeated domain analysis.

Redis is optional and should not be added unless needed.

---

# 33. Minimum Testing

Unit-test:

- URL normalization,
- risk scoring,
- UPI parser,
- verdict boundaries,
- merchant matching,
- explanation templates,
- domain similarity.

Integration-test:

- URL scan,
- QR scan,
- report submission,
- metadata enrichment,
- Python service.

Security-test:

- localhost,
- private IPs,
- metadata endpoints,
- malicious redirects.

Also test false positives on legitimate sites.

---

# 34. Development Order

## Phase 1
- monorepo
- React PWA
- Express
- PostgreSQL
- Prisma
- shared types

## Phase 2
- URL validation
- redirect expansion
- SSRF protection
- URL rules
- risk engine

## Phase 3
- Safe Browsing
- RDAP
- lookalike/homoglyph checks

## Phase 4
- Chrome Extension
- automatic scanning
- popup/verdict

## Phase 5
- Brand Impersonation
- Credential Trap Detection
- IntentGuard

## Phase 6
- PWA QR scanner
- URL QR support
- UPI parser

## Phase 7
- PaymentTruth
- payment intent
- merchant mismatch

## Phase 8
- reporting
- admin review

## Phase 9
- ScamDNA

## Phase 10
- testing
- UI polish
- performance
- demo preparation

---

# 35. Team Workstreams

### Backend / Security
Owns:

- Express
- PostgreSQL
- URL pipeline
- redirects
- Safe Browsing
- RDAP
- SSRF
- risk engine

### Chrome / IntentGuard
Owns:

- extension,
- content scripts,
- brand detection,
- credential traps,
- extension UI.

### PWA / PaymentTruth
Owns:

- PWA,
- QR scanner,
- UPI parser,
- merchant context,
- reporting UI.

### Scam Intelligence
Owns:

- Python service,
- homoglyph/similarity logic,
- ScamDNA.

If team size is smaller, merge Scam Intelligence into backend.

---

# 36. Coding Rules for Agents

Any coding agent must:

1. Read this file first.
2. Follow the existing architecture.
3. Use TypeScript for React/Express.
4. Use Express as the main backend.
5. Use PostgreSQL, not MongoDB.
6. Use Python only for specialized analysis.
7. Validate all API input.
8. Preserve SSRF protection.
9. Never collect credentials.
10. Never create random risk scores.
11. Every score must correspond to evidence.
12. Keep detection explainable.
13. Do not add unnecessary dependencies.
14. Do not redesign the product without explicit instruction.
15. Prioritize working features over adding new ones.

---

# 37. Features Explicitly Not Included

Do not build unless later requested:

- native Android APK,
- full iOS application,
- large chatbot,
- LLM-based core verdicts,
- Playwright browser sandbox,
- large ML training pipeline,
- browser-history surveillance,
- credential collection.

---

# 38. Competitive Positioning

Do not claim:

- PhishLens replaces Google Safe Browsing.
- Existing tools cannot detect phishing.
- Homoglyph detection is unique.
- QR scanning itself is unique.

Correct positioning:

> **PhishLens combines existing threat intelligence with user intent, website identity, UPI transaction semantics and phishing-pattern recognition.**

Three pillars:

```text
IDENTITY → IntentGuard

ACTION → PaymentTruth

PATTERN → ScamDNA
```

Main presentation line:

> **Existing tools protect destinations. PhishLens protects decisions.**

---

# 39. Main Demo

## Demo 1 — IntentGuard

Open a controlled fake banking page.

Show:

- brand detected,
- unofficial domain,
- recent domain,
- password/OTP form.

Result:

```text
DANGER
```

---

## Demo 2 — PaymentTruth

User chooses:

```text
Receive money
```

Scans:

```text
upi://pay...
```

Result:

```text
DANGER

"This QR starts a payment from you even though you expected to receive money."
```

---

## Demo 3 — Merchant Mismatch

Expected:

```text
ABC Medical
```

QR payee:

```text
Rahul Sharma
```

Result:

```text
CAUTION
```

Explain that mismatch alone is not proof of fraud.

---

## Demo 4 — ScamDNA

Show two different domains using highly similar scam templates.

Result:

```text
Strong ScamDNA match
```

---

# 40. Definition of a Successful Hackathon Build

The project is successful when:

- Chrome Extension scans URLs.
- PWA scans QR codes.
- URL redirect analysis works.
- threat reputation works.
- domain age works.
- lookalike/homoglyph checks work.
- IntentGuard works.
- PaymentTruth works.
- merchant mismatch works.
- ScamDNA has a working proof of concept.
- reporting works.
- Safe/Caution/Danger works.
- every verdict explains why.
- the demo is fast and reliable.

---

# 41. Final Architecture Lock

Unless explicitly changed later:

```text
Frontend:
React + TypeScript + Vite

Mobile:
React PWA

Browser:
Chrome Extension + Manifest V3

Main backend:
Node.js + Express + TypeScript

Database:
PostgreSQL + Prisma

Python:
Specialized analysis only

Threat intelligence:
Google Safe Browsing

Domain registration:
RDAP

Core USPs:
IntentGuard
PaymentTruth
ScamDNA

Reporting:
Included

Brand Impersonation:
Included

Credential Trap Detection:
Included

Lookalike/Homoglyph:
Included

Redirect Analysis:
Included

Domain Age:
Included

Native APK:
Not included

LLM Verdict:
Not included

Playwright Browser Sandbox:
Not included
```

---

# 42. Final Principle

PhishLens should not win because it has the largest number of features.

It should win because these three flows work extremely well:

```text
Suspicious website
→ IntentGuard
→ Clear warning
```

```text
UPI QR
→ PaymentTruth
→ User understands exactly where money goes
```

```text
New scam domain
→ ScamDNA
→ Similar phishing pattern recognized
```

Every future technical decision should strengthen:

- detection,
- intent understanding,
- payment safety,
- scam recognition,
- explainability,
- reliability.

> **Existing tools protect destinations. PhishLens protects decisions.**