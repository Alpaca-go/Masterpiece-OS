# S7 Repository Contract Baseline

Status: `REPOSITORY_CONTRACT_FROZEN`

## Freeze identity

- Branch: `codex/stabilization-s7-repository-contract-freeze`
- Starting commit: `b0d83678a333cd270fe28136b632003244aa9f9c`
- Recovery tag: `pre-s7-contract-freeze`
- Primary runtime: Web Renderer + Node Runtime Host
- Desktop runtime: REMOVED
- Electron runtime: REMOVED

## Contract snapshot

| Signal | Frozen observation |
|---|---:|
| Unknown CURRENT namespace | 0 |
| CURRENT authority conflicts | 0 |
| Declared CURRENT authorities | 15 |
| Version-path compatibility exceptions | 1 |
| Registered compatibility contracts | 5 |
| Frozen Prompt entries | 4 |
| Prompt digest mismatches | 0 |
| Golden baseline changed in S7 | NO |
| Operation count | 147 |

Operation count 147 is an S7 observation, not an invariant or future maximum. The contract protects uniqueness, registration validity, ownership boundaries, and accidental disappearance through the existing registry tests.

## Boundary snapshot

- Web / Node Host / Shared Runtime → Desktop or Electron: 0
- Current Production → archive or historical runtime: 0
- Current Production → labs: 0
- Production → Golden/evaluation fixtures: 0

## Verification snapshot

- Clean install (`npm ci`): PASS
- Clean Web production build: PASS
- `repo:verify`: PASS, offline, deterministic, provider calls 0, business writes 0
- Unit: 749 PASS
- CLI: 40 PASS
- Runtime: 14 + 334 PASS
- Web Smoke / Actual Web: PASS
- Electron process count: 0
- Desktop main process count: 0
- Golden: G-01 through G-05 PASS
- Golden automatic update: NO

Prompt, compiler, reference, generator, provider, and schema semantics were not modified during S7.
