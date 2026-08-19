/**
 * CI-W1C.7 — Web minimal projection for Model-Assisted DirectionSet.
 *
 * Spec §12: read Model-Assisted DirectionSet; show whyThisProject
 * and differenceFromOtherDirections; add a "view full report"
 * entry. Do NOT rewrite the existing UI.
 *
 * This component is purely additive: it consumes the shadow
 * artifacts written by `creative-reasoning-service.ts` (when
 * available) and renders them. If the shadow artifacts are
 * not present, the component renders nothing.
 *
 * Image provider call count is always 0.
 */

import React, { useEffect, useState } from 'react';

export interface ModelAssistedDirectionEntry {
  id: string;
  title?: string;
  directionFamily?: string;
  creativeThesis?: string;
  visualMechanism?: string;
  systemHypothesis?: string;
  whyThisProject?: string;
  differenceFromOtherDirections?: string;
  strengths?: string[];
  risks?: string[];
  mustNotBecome?: string[];
  epistemicClass?: 'CREATIVE_HYPOTHESIS' | string;
}

export interface ModelAssistedDirectionPanelProps {
  /**
   * Optional list of Model-Assisted directions. When undefined /
   * empty, the panel renders nothing.
   */
  directions?: ModelAssistedDirectionEntry[];
  /**
   * Optional path to the Visual Direction Exploration Report
   * markdown. When set, the panel renders a "view full report"
   * link (href) that opens in a new tab. No filesystem write.
   */
  reportPath?: string;
  /**
   * Optional report preview snippet (first ~600 chars). When set,
   * the panel shows a collapsed preview under the link.
   */
  reportPreview?: string;
  /**
   * Generation timestamp of the shadow artifact set.
   */
  generatedAt?: string;
}

export function ModelAssistedDirectionPanel(props: ModelAssistedDirectionPanelProps): React.JSX.Element | null {
  const { directions, reportPath, reportPreview, generatedAt } = props;
  const [showPreview, setShowPreview] = useState(false);
  // The panel is rendered only when there is something to show.
  if (!directions || directions.length === 0) return null;
  void useEffect;
  void showPreview;
  void setShowPreview;
  return (
    <section className="ci-ma-panel" aria-label="Model-Assisted Visual Direction Exploration (shadow)">
      <header className="ci-ma-panel__header">
        <h3>视觉方向探索报告（Model-Assisted Shadow）</h3>
        <p className="ci-ma-panel__sub">
          Planning-First Model-Assisted reasoning 的并行输出；不会自动替代 deterministic direction 也不会修改 selection。
          Image provider call count: <strong>0</strong>.
          {generatedAt ? ` Generated: ${generatedAt}` : null}
        </p>
      </header>
      <ol className="ci-ma-panel__list">
        {directions.map((d) => (
          <li key={d.id} className="ci-ma-panel__item">
            <h4>{d.title ?? d.id}{d.directionFamily ? <small className="ci-ma-panel__family"> · {d.directionFamily}</small> : null}</h4>
            {d.creativeThesis ? <p><strong>Creative thesis:</strong> {d.creativeThesis}</p> : null}
            {d.visualMechanism ? <p><strong>Visual mechanism:</strong> {d.visualMechanism}</p> : null}
            {d.systemHypothesis ? <p><strong>System hypothesis:</strong> {d.systemHypothesis}</p> : null}
            {d.whyThisProject ? <p><strong>Why this project:</strong> {d.whyThisProject}</p> : null}
            {d.differenceFromOtherDirections ? <p><strong>Difference from other directions:</strong> {d.differenceFromOtherDirections}</p> : null}
            {d.strengths && d.strengths.length > 0 ? (
              <p><strong>Strengths:</strong> {d.strengths.join('; ')}</p>
            ) : null}
            {d.risks && d.risks.length > 0 ? (
              <p><strong>Risks:</strong> {d.risks.join('; ')}</p>
            ) : null}
            {d.mustNotBecome && d.mustNotBecome.length > 0 ? (
              <p><strong>Must not become:</strong> {d.mustNotBecome.join('; ')}</p>
            ) : null}
            {d.epistemicClass ? <p className="ci-ma-panel__epistemic">epistemicClass: {d.epistemicClass}</p> : null}
          </li>
        ))}
      </ol>
      {reportPath ? (
        <footer className="ci-ma-panel__footer">
          <a
            className="ci-ma-panel__report-link"
            href={reportPath}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看完整方向报告 →
          </a>
          {reportPreview ? (
            <details className="ci-ma-panel__preview">
              <summary>Report preview</summary>
              <pre>{reportPreview}</pre>
            </details>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}

export default ModelAssistedDirectionPanel;
