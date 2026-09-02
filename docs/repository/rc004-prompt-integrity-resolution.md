# RC004 Prompt Integrity Resolution

Status: `RC004_BASELINE_REPAIRED`

## Decision

Root-cause classification: **B — manifest digest baseline repair**, with an
unfixed checkout-EOL policy as the enabling condition.

The four frozen Prompt files have identical Git object bytes at the declared
authority commit `d980a78e8ec94fe51a37f778dc463bef84eacfe7` and at the VM-1.5
base `cf719e2b08e1326e5973af963ab94ced122be11f`. Their Git objects use LF.
The S7 manifest digests instead match CRLF working-tree bytes. The repository
had no `.gitattributes`, so the frozen byte contract varied by checkout host.

The approved authority is the Git object content. This is supported by:

- the declared `current-authorities.json` freeze commit;
- an empty four-file Git diff from that commit to the VM-1.5 base;
- the original S7 freeze commit `5436664b7293df5b768575cf4adaa2d4219131a6`;
- `S7-contract-baseline.md` and `S7-final-report.md`, which record zero Prompt
  mismatches and no Prompt semantic changes during S7;
- Git's canonical object representation, which is reproducible across hosts.

No Prompt text or production behavior was changed.

## Audit matrix

| Prompt | Freeze object SHA-256 | VM-1.5 object SHA-256 | Audited worktree SHA-256 | Original manifest SHA-256 | Audited EOL | Decision |
|---|---|---|---|---|---|---|
| `benchmark-instructions.md` | `5FADB6A6A5CD521FDC74F8D34048116D007A806C03746736263BA7A873BABFAD` | same | `DF937BBC81BF1C7335933952EEF5DB654C73B485BFF52A67ABED2618ECEE71CB` | same as worktree | index LF / worktree CRLF / unspecified | repair manifest to authority; force LF |
| `deep-creative-director.md` | `EA567A75DC54C6670D20534912F40A570AF385AF85D6590A44988EDD6B16A1B1` | same | `4D258CCE657F023D054C86EE54C661FAB9382387847904A4B386E5A674B46142` | same as worktree | index LF / worktree CRLF / unspecified | repair manifest to authority; force LF |
| `execution-core-template.md` | `104E260EEC88F84673CBFF98AFA401EF983181905EA42CD4A15802F58099061A` | same | `D20DEF82F1D881A276007FB408FE62C92634F80BB346DA0A52AA2FDFB8C3D54C` | same as worktree | index LF / worktree CRLF / unspecified | repair manifest to authority; force LF |
| `report-schema.md` | `B64DF59D637C40ECCC96153FDB39428C439B061DBA15D0442E907CCEAF0D6C3B` | same | `CAE74A0AB49CA33827E09194005DF0D35BC979AD0E8F7165BD80524A20D637AF` | same as worktree | index LF / worktree CRLF / unspecified | repair manifest to authority; force LF |

The worktree values above are the values observed before repair. They are
retained as provenance, not as valid authority digests.

## Repair

- Added exact-path `text eol=lf` attributes for only the four frozen files.
- Replaced only their manifest digests with the proven Git object digests.
- Updated the duplicate Prompt entries in `runtime-static-assets.json` to the
  same proven digests; its root regression test verifies raw on-disk bytes.
- Kept byte-exact hashing; the guard does not normalize Prompt content.
- Added regression coverage for missing SHA values, reproducible authority
  digests, byte mutation and restoration, no automatic manifest update, and
  the exact-path EOL policy.

This repair does not authorize future Prompt digest updates. Prompt changes
still require behavior evaluation, Golden verification, approval, and an
explicit baseline update.

## Verification

Official verification ran on Windows in Node.js `v24.19.0`. The host's default
Node.js `v26.7.0` and sandboxed Node processes returned the documented
`uv_os_get_passwd ENOMEM` environment failure; running the same offline gates
outside that restricted process boundary resolved it without production-code
changes.

- `npm run verify:repository-contract`: PASS; RC004 = 0.
- `node --test tests/repository-contract-guard.test.js`: 17/17 PASS.
- `npm run verify:tracked-runtime-assets`: PASS.
- `npm run repo:verify`: PASS; final exit code 0; guard self-tests 45/45.
- `npm test`: 1686/1686 PASS.
- `npm run cli:test`: 40/40 PASS.
- `npm run runtime:test`: 1277/1277 application tests PASS, plus Shared Runtime
  Core JavaScript tests PASS.
- `npm run web-runtime:test`: 15/15 PASS.
- `npm run web-runtime:typecheck`, `npm run web:typecheck`, and
  `npm run web:build`: PASS.
- `npm run web:smoke`: PASS; Provider calls 0; business writes 0.
- `npm run golden:test`: G-01 through G-05 PASS; auto-update NO.
- VM targeted matrix: 23/23 PASS.
- Web UX/reference targeted matrix: 10/10 PASS.
- `git diff --check`: PASS.

The first Web smoke run also exposed a pre-existing stale assertion: the Node
Host authority test and runtime both report 236 registered operations while
the smoke still expected 235. The smoke-only constant was synchronized to 236;
no operation, registry entry, handler, or production route changed.
