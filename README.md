# TruePass Guard — Turnstile & Gate Security Console

A high-performance security operator console for live biometric facial recognition, ongoing event admission control, and turnstile gate entry validation.

---

## Privacy-First Biometric Verification Model

TruePass follows a **privacy-first biometric verification model**. Unlike traditional surveillance or ticketing systems that retain facial images permanently:
- **Ephemeral Verification**: Facial verification is used only to authenticate the ticket holder at the event gate turnstile in real time.
- **Immediate Deletion**: Once verification is completed, the temporary camera image is immediately discarded.
- **Zero On-Chain Biometrics**: Ticket commitments and resale escrow are secured on the Quai blockchain without placing sensitive biometric information on-chain.
- **Core Principle**: Verify the attendee, validate the ticket, and minimise the storage of personal biometric data.

---

## Core Capabilities

1. **Live Optical Turnstile Camera**:
   - Immediate hardware activation with 3-tier fallback (`1080p` $\to$ `facingMode` $\to$ `{ video: true }`).
   - Neural network model loading decoupled from the viewfinder for instant launch (<100ms).
   - Real-time bounding box HUD, detection confidence badges, and scanning reticle.

2. **Biometric Face-API Matching**:
   - Powered by 128-dimensional deep metric face embeddings (TensorFlow.js).
   - Robust multi-format descriptor normalizer supporting arrays, nested vectors, and stringified JSONB from Supabase Cloud.
   - Tuned detection confidence (`0.35`) and distance threshold (`0.58`) for responsive, reliable matching under standard indoor lighting.

3. **Ongoing Event Admission Enforcement**:
   - Guard operator dropdown to lock gate admission to a specific ongoing concert, match, or screening (e.g. *Coldplay*, *Dune: Part Two*, *Taylor Swift*).
   - Instant verdict:
     - **VALID TICKET (GREEN)**: Pass admitted, turnstile unlocks automatically.
     - **WRONG EVENT (AMBER)**: Pass detected, but attendee holds a ticket for a different event.
     - **ALREADY CHECKED-IN (AMBER)**: Duplicate entry prevented.
     - **REVOKED / REFUNDED (RED)**: Scalped or refunded ticket denied entry.
     - **UNRECOGNIZED FACE (RED)**: Biometrics not enrolled in database.

4. **Gate Turnstile Audit Trail**:
   - Real-time logging of every admission verdict, biometric confidence score, timestamp, and gate operator note.
   - One-click CSV export of the entry audit trail.

---

## Quickstart

### Launch with One Click
Double-click `start_guard.bat` in the repository root, or run via PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\start_guard.ps1
```
The high-performance local web server will launch and open your browser to:
```
http://localhost:8088/guard.html  (or next available port, e.g. 8089)
```

---

## File Structure

```
TruePass-Guard/
├── index.html                   # Main Guard Console interface (entrypoint)
├── guard.html                   # Guard Console interface
├── start_guard.bat              # One-click Windows launcher
├── start_guard.ps1              # Multi-threaded .NET HTTP web server
├── push_guard.bat               # Script to push truepass-guard branch to GitHub
├── assets/
│   └── minimalist-glass.css     # Dark minimalist glassy shimmer UI design system
├── js/
│   ├── guard.js                 # Turnstile gate controller & admission evaluator
│   ├── face-recognition-sdk.js  # 128-d biometric Face-API neural network engine
│   ├── supabase-client.js       # Cloud sync client for faces, profiles & tickets
│   ├── db.js                    # Local IndexedDB FaceDB storage
│   ├── ui-modal.js              # Minimalist modal & prompt controller
│   └── audio-feedback.js        # Web Audio chime sounds (shutter, pass, alert)
└── security-guard/              # Mirrored standalone package directory
```

---

## GitHub Branch
This dedicated security guard package is maintained on the branch:
`https://github.com/Agney-The-Hack/TruePass/tree/truepass-guard`
