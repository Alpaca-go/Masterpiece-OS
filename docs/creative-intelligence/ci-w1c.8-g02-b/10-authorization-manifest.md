# Authorization Manifest

Canonical artifact: `g02-live-authorization.manifest.json`.

Canonicalization is UTF-8 JSON with recursively sorted object keys, preserved array order, and `JSON.stringify` without insignificant whitespace. SHA-256 is lowercase hexadecimal. `manifestFingerprint` is computed over the manifest after removing that field.

Frozen fingerprints:

- source identity binding: `24c63b5c09d5f319640171203c12b63bcae861cd091a35959e32a0ccf29b21e7`;
- Anchor Map: `910a8bf9b5bb6c250cc77ad0acb5d01920342adb03dfcaf138a615f50e79356b`;
- authorization manifest: `cd1703c6333ee75cb2af406b27eac3cfce492d143b01b6466a5bd35dc7a63032`;
- G01 baseline: `eda3982872a0545f8d8f30f34c931a423bd1c134e14f430ac93e132544e58d12`.

The current authorization status is `G02_PRELIVE_READY`, with `humanAuthorized=false`. This is intentional: the manifest proves readiness for explicit authorization without asserting that execution is already authorized.
