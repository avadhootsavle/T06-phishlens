# 🎤 PhishLens — 3-Minute Hackathon Winning Pitch & Demo Script

---

## ⏱️ Pitch Timeline (Total: 3 Minutes)

### [0:00 - 0:35] The Hook & The Flaw in Existing Security
> "Good morning judges! Picture this: you receive a WhatsApp message saying your electricity will be disconnected tonight unless you verify your bill, or you tap an SMS claiming your bank KYC is expiring. Or maybe you're at a tea stall or on OLX, scanning a QR code to receive a refund. 
> 
> You have about **3 seconds** to decide.
> 
> Current tools like Google Safe Browsing protect **destinations**—if a domain was registered 2 hours ago or if a scammer uses a genuine UPI ID to reverse-charge you, blocklists are completely blind.
> 
> That's why we built **PhishLens: an intent-aware cybersecurity layer that protects decisions, not just destinations.**"

---

### [0:35 - 1:20] Live Demo 1: IntentGuard & Safe Preview (WhatsApp Scam Link)
1. **Action**: Open [http://localhost:3000](http://localhost:3000). Click **"1. Fake KYC WhatsApp Link"** under the Live Test Scenarios.
2. **What to Say**:
   > "Let’s take a classic WhatsApp phishing attack. Look at the result: **DANGER (Score: 82/100)**.
   > 
   > Why? Our **IntentGuard** module unmasked the redirect, checked RDAP domain age (registered 3 days ago), and recognized that this site claims to be State Bank of India, but is NOT hosted on any official SBI domain.
   > 
   > Even better, look at our **Safe Preview** card. Without ever loading this malicious site on your phone, our sandboxed engine took a secure snapshot and calculated an **88% visual similarity** to the real SBI login portal. The user sees the scam before they can be compromised."

---

### [1:20 - 2:05] Live Demo 2: PaymentTruth & Reverse-Payment Trick
1. **Action**: Click **"2. Reverse Payment Scam"** under the Live Test Scenarios.
2. **What to Say**:
   > "Now let's look at India's most rampant payment scam: the OLX/Cashback 'collect' trick. A scammer tells the victim: *'Scan this QR code and you will receive your ₹5,000 refund.'*
   > 
   > The user selects their intent: **'Receive Money'**. They scan the QR.
   > 
   > Instantly, **PaymentTruth** sounds the alarm: **DANGER**.
   > In plain English, PhishLens explains:
   > *'This QR starts a payment from you even though you expected to receive money.'*
   > 
   > We analyze transaction semantics: in UPI, you NEVER enter your PIN to receive money. PhishLens flags the mismatch instantly."

---

### [2:05 - 2:40] Live Demo 3: Cryptographically Verified Merchant QR (Ed25519)
1. **Action**: Click **"3. Tampered QR Sticker"**, then click **"6. Authentic Verified Shop"**.
2. **What to Say**:
   > "What about physical QR tampering where a crook pastes a fake sticker over a merchant's counter?
   > 
   > We engineered **Verified Merchant QR**. Legitimate shops receive a cryptographically signed Ed25519 QR sticker.
   > When scanned with PhishLens, we verify the digital signature in constant time against our published public keys.
   > 
   > If someone pastes a tampered or fake sticker, the signature fails: **DANGER: Fake or altered merchant sticker detected.**
   > If genuine, the user gets a verified green shield with the confirmed shop name."

---

### [2:40 - 3:00] Conclusion & Why PhishLens Wins
> "To summarize:
> 1. **IntentGuard** verifies IDENTITY.
> 2. **PaymentTruth** verifies ACTION.
> 3. **ScamDNA** catches REPEAT PATTERNS.
> 
> Everything runs with zero credential tracking, privacy-safe SHA-256 parameter hashing, and strict SSRF defenses.
> 
> **Existing tools protect destinations. PhishLens protects decisions.**
> Thank you, and we are ready for your questions!"

---

## 💡 Anticipated Judges' Questions & Bulletproof Answers

#### Q1: "Why not just rely on Google Safe Browsing or antivirus?"
> **Answer**: *"Google Safe Browsing relies on known blocklists. A phishing campaign is often launched, steals credentials, and shuts down within 4 to 6 hours—well before Safe Browsing crawlers index it. Furthermore, Safe Browsing has zero visibility into UPI payment intent, reverse payment scams, or shopkeeper payee mismatches."*

#### Q2: "Are you using an LLM to decide if a site is phishing?"
> **Answer**: *"No. Our primary verdict and risk score are 100% deterministic based on cryptographic signatures, RDAP domain age, brand mismatches, and transaction semantics. We never hallucinate security verdicts. We use Gemini strictly as a contextual advisor to explain the social engineering tactics in simple language."*

#### Q3: "How do you protect against SSRF when previewing suspicious sites?"
> **Answer**: *"We run Playwright in a hardened sandbox. We intercept every single network request and subresource via `page.route('**/*')`. If any request attempts to resolve to `127.0.0.1`, private IP subnets (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`), cloud metadata endpoints (`169.254.169.254`), or non-HTTP protocols, it is immediately aborted at the socket level."*

#### Q4: "Do you claim integration with NPCI or banks for Verified Merchant QR?"
> **Answer**: *"No, we explicitly state this is an open cryptographic proof-of-concept. It demonstrates how asymmetric Ed25519 signatures can turn passive printed QR stickers into tamper-evident physical trust anchors without requiring custom payment gateways."*
