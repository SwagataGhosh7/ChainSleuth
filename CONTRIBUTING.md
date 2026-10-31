# Contributing to ChainSleuth 🕵️‍♂️

Thank you for your interest in contributing to **ChainSleuth**! We welcome contributions from developers, security researchers, and blockchain forensic analysts worldwide, especially during **Hacktoberfest**!

---

## 🎃 Hacktoberfest Guidelines

We tag beginner-friendly and impactful issues with:
- `hacktoberfest`: Eligible issues for Hacktoberfest credit.
- `good-first-issue`: Great for first-time open-source contributors.
- `heuristics`: Adding new EVM/Polygon laundering pattern detectors.
- `ui/ux`: Visual improvements to the graph canvas or copilot interface.
- `documentation`: Clarifications, API guides, and incident writeups.

---

## 🛠️ Development Workflow

1. **Fork & Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Install & Run Locally**:
   ```bash
   npm install
   npm run dev
   ```

3. **Code Style & Type Checking**:
   - Written in strict TypeScript.
   - Follow zero-pill metadata discipline and tabular numerals (`tabular-nums font-mono`) for all financial and hash metrics.
   - Run type checks prior to pushing:
     ```bash
     npm run lint
     ```

---

## 🔬 Adding New AML Heuristics

To implement a new detection rule (e.g. *Flash Loan Sybil Smurfing*):
1. Navigate to `/backend/src/services/forensicHeuristics.ts`.
2. Define your heuristic function taking `nodes` and `edgeList`.
3. Add a pattern definition to `detectedPatterns` with severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and weight.
4. Update the test case in `SAMPLE_HEIST_WALLET` or write unit assertions.

---

## 📜 Pull Request Checklist
- [ ] Code compiles cleanly (`npm run lint` and `npm run build`).
- [ ] No hardcoded secrets or API tokens.
- [ ] Clean commit messages adhering to Conventional Commits (e.g., `feat: add railgun contract detector`).
- [ ] Tested locally with both demo mode and live Polygonscan API calls.

*Happy sleuthing!*
