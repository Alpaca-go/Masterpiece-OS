# A2 Candidate Model Discovery

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-A
**Date:** 2026-08-12
**Status:** AWAITING_USER_CONFIRMATION
**A1 Status:** `VISUAL_ANALYSIS_A1_PASS` (baseline contract established)
**A2 Entry Gate:** PASS (unit / CLI / runtime / web:smoke / golden / actual web all green; see A2 regression report)

## 1. Purpose

A2-A enumerates real Provider/model candidates that may enter the
Visual Analysis evaluation, **without inventing model IDs, endpoints
or account entitlements**. Only candidates backed by actually
configured Profiles, real Credentials, and verified access are
admissible.

## 2. Methodology

Discovery sources, in priority order (per A2 spec §7):

1. **Existing configured Profiles** in the local Settings authority
   (`settings.json` under
   `%APPDATA%\masterpiece-os-desktop\settings.json`).
2. **Existing encrypted Credentials** stored by the same authority
   (their existence is observable; contents remain opaque).
3. **Volcengine / Ark multimodal candidates** reachable through the
   configured Ark account (if any).
4. **Other explicitly available multimodal Providers** as confirmed
   by the user.

Discovery is read-only. No new Profile is created in A2-A.

## 3. Filtering rules

A candidate must satisfy all of the following to be `ELIGIBLE`:

- `modelType = analysis` (Vision Analysis is multimodal reasoning;
  image-generation and video-generation models are out of A2 scope).
- `protocol = openai-chat-multimodal` (matches the A1 Analysis
  Provider Contract request envelope).
- Has a configured Profile in Settings with a real `modelId`,
  `baseUrl` and `credentialKey`.
- Has at least one recorded successful credential + reachability
  test (`lastTestStatus = success`).

Capabilities not directly verified are recorded as `UNKNOWN`. They
must be probed in A2-B before any Evaluation Run (per A2 spec §11).

Models that fail any of the above are `REJECTED` with a one-line
reason. Models the user is "considering" but has no working
configuration for are `DEFERRED`. Anything we cannot confirm is
`UNKNOWN` and not promoted to Evaluation.

## 4. Candidate Discovery Table

| # | Role | Provider | Model ID | Vision | Multi-image | Structured Output | Context | Access | Profile configured | Last test | Status |
|---|------|----------|----------|--------|-------------|-------------------|---------|--------|--------------------|-----------|--------|
| 1 | CONTROL | `qwen` | `qwen3.6-plus` | YES | YES | YES | 131k / 32k out | verified | YES | success 2026-07-29 | ELIGIBLE |
| 2 | Candidate A | `volcengine` | `doubao-seed-2.1-turbo` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | profile configured, last test success 2026-08-05 | YES | success 2026-08-05 | ELIGIBLE (capabilities UNKNOWN; verify in A2-B) |

### 4.1 Notes per candidate

**#1 `qwen` / `qwen3.6-plus` (CONTROL)**
- Source: existing Profile, registered in `@masterpiece/model-registry`
  as the canonical analysis baseline.
- Capabilities verified by A1 contract: `multimodal-analysis`,
  `structured-output`, vision + multi-image input.
- Baseline role: every Evaluation Run must include this model as
  control, per A2 spec §13.
- The current Production default must remain Qwen until a
  `CHANGE_DEFAULT_TO_<MODEL>` decision is produced by A2-G.

**#2 `volcengine` / `doubao-seed-2.1-turbo` (Candidate A)**
- Source: existing Profile
  `profile-7776a9f6-7270-47b5-9e7d-4d552a1c5376` in Settings;
  `lastTestStatus = success` on 2026-08-05.
- Protocol / model type match the A1 contract
  (`openai-chat-multimodal` / `analysis`), so a `VolcengineAnalysisProvider`
  adapter is technically constructible.
- Capabilities marked `UNKNOWN`:
  - **Vision input support**: the recorded success only proves chat
    completion reachable; vision/image payload handling is not yet
    proven.
  - **Multi-image analysis**: same — never exercised.
  - **Structured output (JSON Schema)**: same — never exercised.
  - **Context length**: no entry in `MODEL_CAPABILITIES`. Treat as
    unknown until A2-B capability probe returns data.
- Profile `displayName` contains a Chinese suffix ("体验") that
  is a per-user label, not part of the model ID. The model ID to use
  in Evaluation is `doubao-seed-2.1-turbo` exactly as stored.

### 4.2 Models that are NOT A2 candidates

These exist in the model-registry or in the local Profiles but are
out of scope for Visual Analysis A2 (image-generation models):

| Provider | Model | Reason |
|----------|-------|--------|
| `volcengine` | `doubao-seedream-5-0-pro-260628` | `modelType = image_generation`; A2 spec §3 forbids branching into Generation. |
| `volcengine` | `doubao-seedream-5.0-lite` | same as above. |
| `openai` | `gpt-image-2` | `modelType = image_generation`. |
| `google` | `nano-banana` | `modelType = image_generation`. |
| `dashscope` | `wan2.7-image-pro` | `modelType = image_generation`. |

These stay in the model-registry as Generation-only entries and are
NOT touched by A2.

## 5. Status legend

- `ELIGIBLE` — meets the four hard filters above; may be wired in
  A2-B and probed for capabilities.
- `ELIGIBLE (capabilities UNKNOWN)` — meets the hard filters, but
  capability cells (vision / multi-image / structured / context) are
  not yet directly verified. The A2-B capability probe must resolve
  these before any Evaluation Run.
- `DEFERRED` — interesting candidate the user has flagged but no
  working Profile exists yet.
- `REJECTED` — fails one or more hard filters; logged with reason
  and not promoted.
- `UNKNOWN` — cannot confirm; not promoted.

## 6. Open questions for the user

These decisions belong to the user (per A2 spec §6, §7, §96). The
A2-A exit gate requires a confirmed candidate list with verified
model IDs; the following questions must be answered before A2-B
starts.

### Q1. Other configured multimodal Providers

Are there any additional Provider / model combinations the user
already has working access to that should enter the candidate set?
For example:

- Doubao vision series on Ark (`doubao-1.5-vision-pro`,
  `doubao-1.5-vision-lite`, or newer), if the existing Ark account
  is entitled to them.
- Qwen-VL series on DashScope (`qwen-vl-max`, `qwen-vl-plus`),
  if the existing DashScope account is entitled to them.
- Other multimodal endpoints the user has provisioned.

If yes: provide the model ID and the configured base URL (or
confirm a new Profile should be created in Settings before A2-B).

If no: the current candidate set is final for A2.

### Q2. Candidate count target

The A2 spec recommends `Qwen baseline + 1–3 serious candidates`.
With only Candidate A in the table, the formal set is on the lower
end. Should we:

- **Option A**: proceed with Qwen + doubao-seed-2.1-turbo only
  (1 candidate). Smallest Evaluation budget, fastest path to A2-G.
- **Option B**: add 1–2 more candidates (Qwen + 2–3 total) by
  provisioning new Profiles in Settings before A2-B.
- **Option C**: explicitly defer multi-candidate comparison to a
  later A2.x phase and ship A2 with the single candidate.

### Q3. UNKNOWN capability verification

For Candidate A's `UNKNOWN` cells, the A2-B capability probe will:

- send a minimal vision-bearing request to confirm Vision input;
- send a 2-image request to confirm multi-image;
- send a JSON-Schema-bearing request to confirm structured output;
- read the response model identity and any usage to populate the
  context / capability cells.

Confirm this is acceptable as opt-in / manual (per A2 spec §20:
real Provider smoke is manual / opt-in / networked / cost-sensitive).
A2 will not embed any real Provider call into `repo:verify` or
default CI.

## 7. What is NOT in A2-A

- No new Profile is created in Settings.
- No new Provider adapter is implemented. (A2-B.)
- No new evaluation corpus is built. (A2-C.)
- No real Provider call is performed. (A2-B, manual / opt-in.)
- No Golden or Prompt is modified. (forbidden by A2 spec §91.)
- No default Provider is changed. (A2-H, only if A2-G decides.)

## 8. A2-A exit gate checklist

- [x] A1 baseline remains PASS.
- [x] Real configured Profiles inspected (4 found).
- [x] Real model IDs recorded with source location.
- [x] Real access status recorded (`lastTestStatus`, dates).
- [x] Candidate classification assigned
      (`ELIGIBLE` for Qwen and Seed 2.1 Turbo; all
      image-generation models `REJECTED` with reason).
- [ ] User confirmation of the candidate set and Candidate count
      target. **PENDING — see §6.**
- [ ] User confirmation of the UNKNOWN capability probe plan.
      **PENDING — see Q3.**

Once §6 is answered, A2-A closes and A2-B may begin with the
agreed candidate set.
