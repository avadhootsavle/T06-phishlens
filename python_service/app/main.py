from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from rapidfuzz import fuzz
import hashlib

app = FastAPI(title="PhishLens ScamDNA Analysis Service", version="1.0.0")

class SimilarityRequest(BaseModel):
    candidate: str
    targets: List[str]

class SimilarityMatch(BaseModel):
    target: str
    ratio: float
    token_ratio: float
    is_close_match: bool

class FingerprintRequest(BaseModel):
    brand: Optional[str] = None
    title: Optional[str] = None
    form_inputs: Optional[List[str]] = []
    headings: Optional[List[str]] = []
    favicon_hash: Optional[str] = None

class CompareRequest(BaseModel):
    candidate: Dict[str, Any]
    known_fingerprints: List[Dict[str, Any]]

def compute_simhash(tokens: List[str]) -> str:
    """Computes a 64-bit structural SimHash from input tokens."""
    v = [0] * 64
    for token in tokens:
        if not token:
            continue
        h = int(hashlib.md5(token.lower().encode('utf-8')).hexdigest(), 16)
        for i in range(64):
            bit = (h >> i) & 1
            v[i] += 1 if bit == 1 else -1

    fingerprint = 0
    for i in range(64):
        if v[i] > 0:
            fingerprint |= (1 << i)
    return f"{fingerprint:016x}"

def simhash_similarity(hash1_hex: str, hash2_hex: str) -> float:
    """Calculates bitwise similarity percentage between two 64-bit hashes."""
    try:
        h1 = int(hash1_hex, 16)
        h2 = int(hash2_hex, 16)
    except ValueError:
        return 0.0
    xor_val = h1 ^ h2
    differing_bits = bin(xor_val).count('1')
    similarity = (64 - differing_bits) / 64.0 * 100.0
    return round(similarity, 2)

@app.get("/health")
def health():
    return {"status": "ok", "service": "scamdna-python-engine"}

@app.post("/internal/domain/similarity")
def check_domain_similarity(req: SimilarityRequest):
    results = []
    candidate_clean = req.candidate.lower().replace(".", " ").replace("-", " ")
    for target in req.targets:
        target_clean = target.lower().replace(".", " ").replace("-", " ")
        ratio = fuzz.ratio(candidate_clean, target_clean)
        token_ratio = fuzz.token_set_ratio(candidate_clean, target_clean)
        is_close = ratio >= 75 or token_ratio >= 85
        results.append(SimilarityMatch(
            target=target,
            ratio=round(ratio, 2),
            token_ratio=round(token_ratio, 2),
            is_close_match=is_close
        ))
    return {"matches": results}

@app.post("/internal/fingerprint/generate")
def generate_fingerprint(req: FingerprintRequest):
    tokens = []
    if req.brand:
        tokens.extend([f"brand:{req.brand}"] * 3)
    if req.title:
        tokens.extend(req.title.split())
    if req.form_inputs:
        tokens.extend([f"input:{inp}" for inp in req.form_inputs])
    if req.headings:
        for h in req.headings:
            tokens.extend(h.split())
    if req.favicon_hash:
        tokens.append(f"fav:{req.favicon_hash}")

    fingerprint_hash = compute_simhash(tokens)
    return {
        "fingerprint_hash": fingerprint_hash,
        "token_count": len(tokens),
        "brand": req.brand,
    }

@app.post("/internal/fingerprint/compare")
def compare_fingerprints(req: CompareRequest):
    candidate_hash = req.candidate.get("fingerprint_hash")
    if not candidate_hash:
        return {"matches": []}

    matches = []
    for item in req.known_fingerprints:
        target_hash = item.get("fingerprint_hash")
        if not target_hash:
            continue
        sim = simhash_similarity(candidate_hash, target_hash)
        
        # Section 20 Thresholds:
        # >= 90% -> strong match
        # 80-89% -> possible match
        # < 80% -> ignore
        match_type = "NONE"
        if sim >= 90.0:
            match_type = "STRONG_MATCH"
        elif sim >= 80.0:
            match_type = "POSSIBLE_MATCH"

        if match_type != "NONE":
            matches.append({
                "campaign_id": item.get("campaign_id"),
                "similarity_score": sim,
                "match_type": match_type,
            })

    matches.sort(key=lambda x: x["similarity_score"], reverse=True)
    return {"matches": matches}
