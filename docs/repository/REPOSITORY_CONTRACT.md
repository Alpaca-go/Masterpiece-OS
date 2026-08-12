# Masterpiece OS Repository Contract

Status: **FROZEN CURRENT ARCHITECTURE CONTRACT**

Frozen from: S6 PASS, commit `b0d83678a333cd270fe28136b632003244aa9f9c`
Machine metadata: `config/repository-contract/`

This contract protects the architecture produced by S0鈥揝6. It is a guardrail, not a new governance product and not permission to redesign runtime behavior.

## Frozen runtime ownership

```text
Web Renderer                    = Primary UI
Node Runtime Host               = Primary Host
Shared Operation Registry       = Operation Entry Authority
Shared Runtime                  = Application Runtime Authority
Shared Core                     = Domain Capability Authority
Provider Adapters               = External Provider Boundary
```

Current production must not depend on Desktop, Electron, historical runtime, archive, labs, evaluation fixtures, or machine-local outputs. The Web Renderer must not import host implementation services. Operation IDs remain unique and handlers valid; the S7 count of 147 is evidence, not a permanent limit.

## Namespace contract

Current implementation paths use semantic capability names. New current modules must not use implementation chronology (`v13`, `vNext2`, `phase10`, `r12`) or temporal identity (`latest`, `new`, `final`, `backup`, `temp`, `old`).

Versions remain valid for public APIs, persisted schemas, migrations, protocols, compatibility, external providers, fixtures, and historical records. Explicit path exceptions are recorded in `version-namespace-allowlist.json`; broad directory ignores are prohibited.

## Current authority contract

One capability has one declared current authority. `current-authorities.json` is governance metadata, not a second runtime registry. An authority change must update the implementation, authority registry, Current Repository Map, Current Namespace Dictionary, and required regression evidence together.

## Prompt and Golden integrity

Only explicitly frozen production-critical prompts appear in `prompt-integrity.json`. A digest mismatch fails with `RC007 PROMPT_DIGEST_CHANGED`. The guard has no automatic update mode.

Golden assets are behavior evidence. Baseline mutations must be surfaced as `RC008 GOLDEN_BASELINE_CHANGED`, reviewed separately, and never automatically accepted to make a failing test pass.

## Compatibility discipline

Every supported compatibility identifier has a consumer, reason, owner, removal condition, and introduction phase in `compatibility-registry.json`. Compatibility points toward current semantic implementation. New anonymous aliases are prohibited; removing compatibility requires proof that its consumer count is zero.

## Generated and local artifacts

Deterministic verification must succeed from a clean clone. Current tests and guards must not depend on ignored Provider outputs, runtime directories, user projects, machine-local evaluation artifacts, or credentials.

## Agent change rules

Agents follow `AGENT_REPOSITORY_RULES.md`. Git/tags/docs carry history; current code does not fork into versioned copies. Prompt digests and Golden baselines are never updated automatically. Desktop/Electron cannot be reintroduced incidentally.

## Change classes and minimum verification

| Class | Change | Minimum verification |
|---|---|---|
| A | Documentation only | `npm run repo:verify` |
| B | Internal non-behavioral code | `repo:verify` + affected tests |
| C | Runtime or architecture | `repo:verify` + full regression |
| D | Prompt, compiler, reference, generator | Class C + Golden |
| E | Golden baseline | explicit baseline review + full regression |
| F | Compatibility, schema, persisted contract | compatibility review + full regression + Golden |

`npm run repo:verify` is the fast, deterministic, offline contract check. `npm run repo:check` is the full local regression. Neither calls a real Provider; Web Smoke makes zero business writes.

## Stable failure codes

| Code | Rule |
|---|---|
| RC001 | current version namespace prohibited |
| RC002 | production import to Desktop/Electron/labs/historical/archive prohibited |
| RC003 | declared authority missing, invalid, or duplicated |
| RC004 | frozen prompt digest changed |
| RC005 | Golden baseline mutation requires review |
| RC006 | compatibility path or location invalid/unregistered |
| RC007 | machine-local artifact dependency prohibited |
| RC008 | operation registry invalid or duplicated |
| RC009 | repository contract metadata malformed |
| RC010 | new compatibility contract review signal |

Failures must identify the rule, path, reason, and expected action.
