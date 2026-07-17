# Masterpiece OS development rules

## Document-related release gate

After changing any document ingestion, parsing, Brand DNA analysis, structured model response, checkpoint, report compiler, or Desktop document-delivery code, run `npm run verify:document-flows` before declaring the work complete.

Do not package or deliver a Desktop executable when this gate fails. The gate must remain offline and must never call a real model API.
