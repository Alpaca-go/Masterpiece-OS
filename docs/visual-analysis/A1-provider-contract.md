# A1 Analysis Provider Contract

The canonical Provider boundary lives in `@masterpiece/model-runtime/analysis-provider`.

An Analysis Provider owns only:

- semantic identity and capabilities;
- support matching for a configured Profile;
- request adaptation and invocation;
- response adaptation to the canonical analysis result;
- normalized Provider errors.

It does not own Prompt semantics, analysis workflow, project persistence, report authority, Reference First, Space, or Packaging.

The canonical request is the existing reasoner input used by the one analysis pipeline: canonical Prompt messages, ordered attachments, optional JSON Schema, cancellation signal, and duration budget. The canonical result preserves the existing result fields: `runId`, `provider`, `model`, `completedAt`, `reportMarkdown`, and optional evidence fields.

Normalized errors are `AUTHENTICATION_FAILED`, `TIMEOUT`, `RATE_LIMITED`, `MALFORMED_RESPONSE`, `MODEL_UNAVAILABLE`, and `REQUEST_FAILED`. Provider identity and model identity remain separate.
