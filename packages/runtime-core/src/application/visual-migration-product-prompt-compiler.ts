import type { VisualMigrationCanonV1 } from '@masterpiece/project-contracts/index.ts';
import type { PrepareVisualMigrationTaskInput } from './visual-migration-product-contract.ts';

export const VISUAL_MIGRATION_PRODUCT_PROMPT_COMPILER_VERSION =
  'visual-migration-product-prompt@1.0.0' as const;

function statements(rules: Array<{ statement: string }>): string[] {
  return rules.map((rule) => rule.statement.trim()).filter(Boolean);
}

export function compileVisualMigrationProductPrompt(input: {
  task: PrepareVisualMigrationTaskInput;
  taskId: string;
  policyId: string;
  canon: VisualMigrationCanonV1;
}) {
  const { canon, task } = input;
  const currentProject = [
    ...statements(canon.projectIdentity.requiredIdentityRules),
    ...canon.projectIdentity.lockedFacts,
    ...canon.projectIdentity.lockedAssetIds,
  ];
  const transfer = {
    color: statements(canon.transferSystem.color),
    layoutAndTypography: statements(canon.transferSystem.layoutAndTypography),
    graphicLanguage: statements(canon.transferSystem.graphicLanguage),
    materialAndPhotography: statements(canon.transferSystem.materialAndPhotography),
    extensionMechanism: statements(canon.transferSystem.extensionMechanism),
  };
  const prohibited = [
    ...canon.prohibitedTransfer.referenceBrandNames,
    ...canon.prohibitedTransfer.referenceLogos,
    ...canon.prohibitedTransfer.referenceSlogans,
    ...canon.prohibitedTransfer.referenceSignatureGraphics,
    ...canon.prohibitedTransfer.referenceProprietaryPatterns,
    ...canon.prohibitedTransfer.prohibitedMutations,
  ];
  const markdown = [
    '[CURRENT PROJECT]', ...currentProject.map((value) => `- ${value}`), '',
    '[TARGET TASK]', `- Task kind: ${task.taskKind}`, `- User intent: ${task.userIntent.trim()}`,
    `- Structure requirement: ${task.structureRequirement ?? 'none'}`, '',
    '[TRANSFERABLE VISUAL SYSTEM]',
    ...Object.entries(transfer).flatMap(([dimension, values]) => values.map((value) => `- ${dimension}: ${value}`)), '',
    '[PROHIBITED TRANSFER]', ...prohibited.map((value) => `- ${value}`), '',
    '[EXECUTION RULE]',
    '- Preserve current-project ownership, identity, content, and required structure.',
    '- Apply only the abstract transferable visual system.',
    '- Do not reproduce reference identity, proprietary copy, logos, or signature graphics.',
  ].join('\n');
  return {
    markdown: `${markdown.trim()}\n`,
    sourceMap: {
      compilerVersion: VISUAL_MIGRATION_PRODUCT_PROMPT_COMPILER_VERSION,
      canonId: canon.canonId,
      canonFingerprint: canon.canonFingerprint,
      policyId: input.policyId,
      taskId: input.taskId,
      taskKind: task.taskKind,
      userIntentSource: 'product_task',
      canonRulesUsed: { currentProject, transfer, prohibited },
    },
  };
}
