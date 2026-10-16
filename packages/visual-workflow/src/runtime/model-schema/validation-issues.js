function blockingIssues(issues) {
  return issues.filter((issue) => issue.severity === "blocking" || issue.severity === "error");
}
function validationErrorCode(issues) {
  if (issues.some((issue) => issue.issueType === "json_parse_error")) return "MODEL_OUTPUT_JSON_PARSE_ERROR";
  if (issues.some((issue) => issue.issueType === "markdown_wrapper")) return "MODEL_OUTPUT_MARKDOWN_WRAPPER";
  if (issues.some((issue) => issue.issueType === "truncated")) return "MODEL_OUTPUT_TRUNCATED";
  if (issues.some((issue) => issue.issueType === "invalid_enum")) return "MODEL_OUTPUT_INVALID_ENUM";
  if (issues.some((issue) => issue.issueType === "missing_required")) return "MODEL_OUTPUT_MISSING_FIELD";
  if (issues.some((issue) => issue.issueType === "format_error")) return "MODEL_OUTPUT_INVALID_RANGE";
  if (issues.some((issue) => issue.issueType === "fact_status_overclaimed")) return "FACT_STATUS_OVERCLAIMED";
  if (issues.some((issue) => issue.issueType === "fact_pollution")) return "FACT_EVIDENCE_POLLUTION";
  if (issues.some((issue) => issue.issueType === "insufficient_evidence")) return "FACT_INSUFFICIENT_EVIDENCE";
  return "MODEL_OUTPUT_INVALID_TYPE";
}
function throwForValidationIssues(issues, fallbackMessage = "\u6A21\u578B\u8F93\u51FA\u672A\u901A\u8FC7\u8FD0\u884C\u65F6 Schema \u6821\u9A8C") {
  const failures = blockingIssues(issues);
  if (!failures.length) return;
  const first = failures[0];
  throw Object.assign(new Error(first.message || fallbackMessage), {
    code: validationErrorCode(failures),
    issues: failures.map((issue) => issue.path),
    details: { issues: failures }
  });
}
function printable(value) {
  if (value === void 0) return "\u672A\u63D0\u4F9B";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function compileRepairPrompt(input) {
  const fields = input.issues.map((issue) => [
    `- \u5B57\u6BB5\uFF1A${issue.path}`,
    `  \u5931\u8D25\u503C\uFF1A${printable(issue.receivedValue)}`,
    `  \u9519\u8BEF\u7C7B\u578B\uFF1A${issue.issueType}`,
    `  \u89C4\u5219\uFF1A${issue.message}`,
    issue.allowedValues ? `  \u5141\u8BB8\u503C\uFF1A${printable(issue.allowedValues)}` : "",
    issue.validExamples ? `  \u5408\u6CD5\u793A\u4F8B\uFF1A${printable(issue.validExamples)}` : "",
    `  \u4FEE\u590D\u8981\u6C42\uFF1A${issue.repairInstruction}`
  ].filter(Boolean).join("\n")).join("\n");
  return `

\u4F60\u9700\u8981\u4FEE\u590D\u6A21\u578B\u8F93\u51FA\u4E2D\u7684\u7ED3\u6784\u5316\u9519\u8BEF\uFF08\u7B2C ${input.attempt} \u6B21\u4FEE\u590D\uFF0C\u6700\u591A ${input.maxAttempts} \u6B21\uFF09\u3002
\u4E0D\u5F97\u6539\u53D8\u5DF2\u7ECF\u901A\u8FC7\u6821\u9A8C\u7684\u5B57\u6BB5\u3002\u4E0D\u5F97\u65B0\u589E Schema \u672A\u5B9A\u4E49\u7684\u5B57\u6BB5\u3002\u4E0D\u5F97\u521B\u5EFA\u65B0\u7684\u679A\u4E3E\u503C\u3002
\u8BC1\u636E\u4E0D\u8DB3\u65F6\u5FC5\u987B\u4F7F\u7528\u7A7A\u6570\u7EC4\u3001null \u6216 unverified\uFF0C\u5177\u4F53\u4EE5\u5B57\u6BB5\u89C4\u5219\u4E3A\u51C6\u3002

Schema \u6458\u8981\uFF1A
${input.schemaSummary}

\u4EE5\u4E0B\u5B57\u6BB5\u5931\u8D25\uFF1A
${fields}

\u53EA\u8FD4\u56DE\u7B26\u5408\u5B8C\u6574 Schema \u7684 JSON\u3002\u4FEE\u590D\u540E\u6240\u6709\u5B57\u6BB5\u90FD\u4F1A\u91CD\u65B0\u6267\u884C\u5B8C\u6574\u6821\u9A8C\u3002`;
}
function invalidEnumIssue(path, receivedValue, allowedValues) {
  return {
    path,
    issueType: "invalid_enum",
    receivedValue,
    message: `${path} \u7684\u503C ${printable(receivedValue)} \u4E0D\u5C5E\u4E8E\u5141\u8BB8\u7684\u534F\u8BAE\u679A\u4E3E\u3002`,
    allowedValues: [...allowedValues],
    validExamples: allowedValues.length ? [allowedValues[0]] : [],
    repairInstruction: "\u4ECE\u5141\u8BB8\u679A\u4E3E\u4E2D\u9009\u62E9\u8BED\u4E49\u6700\u63A5\u8FD1\u7684\u503C\uFF1B\u4E0D\u5F97\u521B\u9020\u65B0\u679A\u4E3E\u3002",
    severity: "blocking"
  };
}
function invalidTypeIssue(path, receivedValue, message, validExamples) {
  return {
    path,
    issueType: "invalid_type",
    receivedValue,
    message,
    validExamples,
    repairInstruction: "\u6309\u5B57\u6BB5\u5B9A\u4E49\u8FD4\u56DE\u6B63\u786E\u7C7B\u578B\uFF1B\u8BC1\u636E\u4E0D\u8DB3\u65F6\u9075\u5FAA\u8BE5\u5B57\u6BB5\u7684\u7A7A\u503C\u89C4\u5219\u3002",
    severity: "blocking"
  };
}
export {
  blockingIssues,
  compileRepairPrompt,
  invalidEnumIssue,
  invalidTypeIssue,
  throwForValidationIssues,
  validationErrorCode
};
