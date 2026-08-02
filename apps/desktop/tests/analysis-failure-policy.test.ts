import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyAnalysisFailure,
  shouldDegradeStructuredSubstep,
} from '../src/main/analysis-failure-policy.ts';

test('analysis failure policy separates transient recovery from user action', () => {
  assert.deepEqual(classifyAnalysisFailure(Object.assign(new Error('HTTP 503'), { code: 'QWEN_API_TRANSIENT' })), {
    category: 'transient_provider', retryable: true,
    userMessage: '模型服务暂时不可用；已完成内容和检查点均已保留，可以安全重试。', suggestedAction: 'retry',
  });
  assert.equal(classifyAnalysisFailure(Object.assign(new Error('unauthorized'), { code: 'QWEN_AUTH_FAILED' })).suggestedAction, 'check_credentials');
  assert.equal(classifyAnalysisFailure(Object.assign(new Error('需要确认'), { code: 'ANALYSIS_CONFIRMATION_REQUIRED' })).suggestedAction, 'provide_information');
});

test('deliverable-specific enrichment degrades without hiding cancellation or user confirmation', () => {
  assert.equal(shouldDegradeStructuredSubstep(Object.assign(new Error('invalid JSON'), { code: 'MODEL_SCHEMA_INVALID' })), true);
  assert.equal(shouldDegradeStructuredSubstep(Object.assign(new Error('confirm'), { code: 'ANALYSIS_CONFIRMATION_REQUIRED' })), false);
  assert.equal(shouldDegradeStructuredSubstep(Object.assign(new Error('cancel'), { code: 'CANCELLED' })), false);
});

test('analysis failure policy keeps schema failures retryable without exposing implementation detail', () => {
  const failure = classifyAnalysisFailure(Object.assign(new Error('JSON schema mismatch at $.field'), { code: 'MODEL_SCHEMA_INVALID' }));
  assert.equal(failure.category, 'model_output');
  assert.equal(failure.retryable, true);
  assert.doesNotMatch(failure.userMessage, /\$\.field/u);
});
