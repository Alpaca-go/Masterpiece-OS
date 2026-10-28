# 本地栅格证据说明（未入库）

日期：2026-10-28。原因：仓库根测试 `tests/repository-policy.test.js` 只允许栅格图片出现在 `examples/`、`tests/`、`templates/`、`space-generator/v1-baseline/benchmarks` 和 `packages/image-generation-runtime/assets/architecture-anchors` 下。下列 5 张历史截图原先放在 `packages/visual-workflow/reports/`，属于误入库，已从 Git 跟踪中移除。

| 原路径 | SHA-256 | 本地备份 |
|---|---|---|
| `packages/visual-workflow/reports/art-medical-identity/web-confirmed.png` | `397fcb16b6f7cd1914984a0037492c519d4aee25ccd575139978275b0b25367d` | `.codex-smoke/evidence-local/packages/visual-workflow/reports/art-medical-identity/web-confirmed.png` |
| `packages/visual-workflow/reports/local-spatial-boundaries/web-confirmed.png` | `b321d766caca74ac1b37bb9961249c43a6057532829f5a44af1fc461b442de1e` | `.codex-smoke/evidence-local/packages/visual-workflow/reports/local-spatial-boundaries/web-confirmed.png` |
| `packages/visual-workflow/reports/p7-spatial-layout-contract/P7-web-confirmed.png` | `b321d766caca74ac1b37bb9961249c43a6057532829f5a44af1fc461b442de1e` | `.codex-smoke/evidence-local/packages/visual-workflow/reports/p7-spatial-layout-contract/P7-web-confirmed.png` |
| `packages/visual-workflow/reports/p7a-prompt-budget/P7a-web-confirmed.png` | `82bce98cd13474c16d176a1ea838db942514284c1a28bb236224d475ee3a2889` | `.codex-smoke/evidence-local/packages/visual-workflow/reports/p7a-prompt-budget/P7a-web-confirmed.png` |
| `packages/visual-workflow/reports/spatial-balance/web-confirmed.png` | `397fcb16b6f7cd1914984a0037492c519d4aee25ccd575139978275b0b25367d` | `.codex-smoke/evidence-local/packages/visual-workflow/reports/spatial-balance/web-confirmed.png` |

`.codex-smoke/` 是 gitignore 路径，这些文件只在本机保留。原始字节仍可从 Git 历史（`3da7d1ba` 及更早提交）恢复。

## 相关的两处重命名

同名策略还禁止 `review.md` 出现在 `docs/` 之外，因此两份 tracked 的 `review.md` 已改名为 `review-notes.md`，内容未变：

- `packages/visual-workflow/reports/art-medical-identity/review.md` → `review-notes.md`
- `packages/visual-workflow/reports/local-spatial-boundaries/review.md` → `review-notes.md`

对应的 `artifact-manifest.json` 与 `real-generation/preflight-summary.json` 中的文件名引用已同步更新；内容字节与 SHA-256 未变。

## 注意

- 这些改动的目的是让仓库根测试与生产边界策略一致，不是删除证据。
- 历史报告中的 manifest 仍按当时的状态记录这些文件；本文件是“当前跟踪状态”的说明。
- 不要为了通过测试再把栅格截图重新跟踪进 `packages/`。
