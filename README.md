# TruePass — Decentralized Fair Ticketing Platform

A blockchain-powered fair ticketing platform designed to prevent ticket fraud, eliminate unfair resale practices, and ensure secure event entry through QR code authentication and biometric facial verification.

---

## Live Links & Quick Access

| Portal | Description | Link |
| :--- | :--- | :--- |
| **Ticketing Portal** | Browse events, create biometric account, purchase tickets | [tickets.html](file:///c:/github/TruePass/tickets.html) (`http://localhost:8080/tickets.html`) |
| **Main Platform Hub** | Unified system dashboard and architecture overview | [index.html](file:///c:/github/TruePass/index.html) (`http://localhost:8080/index.html`) |
| **Identity Onboarding** | Direct attendee biometric intake portal | [onboarding.html](file:///c:/github/TruePass/onboarding.html) (`http://localhost:8080/onboarding.html`) |
| **Security Guard Console** | Turnstile optical gate scanner & live face-match verification | [guard.html](file:///c:/github/TruePass/guard.html) (`http://localhost:8089/guard.html`) |

> **GitHub Pages Live Deployment**: `https://agney-the-hack.github.io/TruePass/tickets.html` (See below for setup instructions)

---

## Features

1. **Decentralized Ticket Ownership**:
   - Ticket commitments and transparent ownership powered by Quai Network blockchain.
   - Anti-scalping resale price caps enforced by smart contracts.

2. **Privacy-First Biometric Verification**:
   - Biometric account creation takes a live face scan and computes 128-dimensional facial descriptors locally in-browser.
   - Descriptors are securely synchronized to Supabase Cloud for gate verification.
   - Zero on-chain personal biometric storage; temporary camera images are discarded immediately after verification.

3. **Multi-Device Cloud Ticket Association**:
   - Tickets purchased are linked by buyer name and email to Supabase Cloud.
   - Any device logged in automatically retrieves purchased tickets and QR boarding passes.

---

## How to Display & Run the Website

### Option 1: Live on GitHub Pages (Free Web Hosting)
1. Go to your repository on GitHub: **[Settings &rarr; Pages](https://github.com/Agney-The-Hack/TruePass/settings/pages)**.
2. Under **Build and deployment** &gt; **Source**, select **Deploy from a branch**.
3. Under **Branch**, select `truepass-site` (or your default branch) and `/ (root)`.
4. Click **Save**. Within 1–2 minutes, your website will be live at:
   - `https://agney-the-hack.github.io/TruePass/tickets.html`
   - `https://agney-the-hack.github.io/TruePass/index.html`

### Option 2: Display Link in GitHub Repository Header ("About" Section)
1. Navigate to the main code page of [https://github.com/Agney-The-Hack/TruePass](https://github.com/Agney-The-Hack/TruePass).
2. On the right sidebar, click the **Settings gear icon (⚙️)** next to **About**.
3. In the **Website** field, paste your GitHub Pages link or `https://agney-the-hack.github.io/TruePass/tickets.html`.
4. Click **Save changes**. The link will now appear right at the top of your GitHub repository.

### Option 3: Run Locally
Run the high-performance local server using PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```
Then open:
- `http://localhost:8080/tickets.html`
- `http://localhost:8080/index.html`
