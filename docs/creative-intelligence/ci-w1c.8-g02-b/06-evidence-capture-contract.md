# Evidence Capture Contract

Future authorized execution must capture redacted, machine-readable evidence:

- Planning: input fingerprint, claims, needs, refs, and accepted artifact;
- Strategic: input evidence, prompt identity, Provider metadata, output artifact, and trace map;
- failure: error type, attempt number, latency, and Provider state.

An accepted Strategic artifact is mandatory; a raw response alone is insufficient. Credentials, authorization headers, full secret-bearing URLs, and unredacted Provider payloads are forbidden. Evidence must preserve the independent attempt counters and SG-01/11/12/13/14/15 results.
