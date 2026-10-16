import path from "node:path";
import { writeText } from "../../utils.js";
async function writeAnalysisRunReport(projectRoot, report) {
  const file = path.join(projectRoot, ".runtime", "run-report.json");
  await writeText(file, `${JSON.stringify(report, null, 2)}
`);
  return file;
}
export {
  writeAnalysisRunReport
};
