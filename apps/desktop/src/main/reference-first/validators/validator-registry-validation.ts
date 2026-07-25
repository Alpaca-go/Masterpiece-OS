import {
  REFERENCE_FIRST_VALIDATORS,
  VALIDATOR_IDS,
  type ReferenceFirstValidator
} from './validator-registry.ts';

/** §6 所有必需 Validator 的唯一 ID（单一来源，来自 VALIDATOR_IDS）。 */
export const REQUIRED_VALIDATOR_IDS: string[] = Object.values(VALIDATOR_IDS);

/** §6 Registry 完整性校验结果。 */
export interface ValidatorRegistryValidation {
  passed: boolean;
  duplicateIds: string[];
  missingRequiredIds: string[];
  unknownIds: string[];
}

/**
 * §6 校验 Validator 注册表：
 * - 无重复 ID；
 * - 覆盖全部必需 Validator；
 * - 无未登记（未在 VALIDATOR_IDS 中声明）的 ID。
 */
export function validateValidatorRegistry(
  validators: ReferenceFirstValidator[] = REFERENCE_FIRST_VALIDATORS
): ValidatorRegistryValidation {
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  for (const validator of validators) {
    if (seen.has(validator.id)) {
      duplicateIds.push(validator.id);
    }
    seen.add(validator.id);
  }

  const missingRequiredIds = REQUIRED_VALIDATOR_IDS.filter((id) => !seen.has(id));
  const knownIds = new Set(REQUIRED_VALIDATOR_IDS);
  const unknownIds = [...seen].filter((id) => !knownIds.has(id));

  return {
    passed:
      duplicateIds.length === 0 &&
      missingRequiredIds.length === 0 &&
      unknownIds.length === 0,
    duplicateIds,
    missingRequiredIds,
    unknownIds
  };
}

/**
 * §6 启动期断言：Registry 非法时立即抛错，禁止在非法状态下运行闭环校验。
 */
export function assertValidatorRegistry(
  validators: ReferenceFirstValidator[] = REFERENCE_FIRST_VALIDATORS
): void {
  const result = validateValidatorRegistry(validators);
  if (!result.passed) {
    throw new Error(
      'Validator registry invalid: ' +
        `duplicates=[${result.duplicateIds.join(', ')}] ` +
        `missing=[${result.missingRequiredIds.join(', ')}] ` +
        `unknown=[${result.unknownIds.join(', ')}]`
    );
  }
}
