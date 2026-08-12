# A1-B 鈥?Qwen Baseline Freeze

Batch: A1-B
Purpose: freeze deterministic Qwen request evidence before extraction.

Files added: Qwen baseline document and fixture
Qwen behavior impact: none
Prompt impact: none; digest mismatch 0
Artifact/downstream impact: none
Tests: existing Qwen reasoner/integration + request fixture PASS
Golden: unchanged
Rollback: remove fixture/document
Result: PASS
