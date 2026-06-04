import { css, html } from 'lit';
import { FlowNode } from 'lit-flow';

const KIND_LAYER_TONE: Record<string, string> = {
  intent_question: 'tone-question',
  intent_analysis: 'tone-analysis',
  intent_option: 'tone-option',
  intent_decision: 'tone-decision',
  work_item: 'tone-work',
  work_epic: 'tone-epic',
  architecture_block: 'tone-architecture',
  schematic_block: 'tone-schematic',
};

function statusBadgeClass(status: unknown): string {
  const value = String(status ?? '').trim().toLowerCase();
  if (value === 'done' || value === 'verified') {
    return 'is-done';
  }
  if (value === 'blocked') {
    return 'is-blocked';
  }
  if (value === 'doing' || value === 'in_progress' || value === 'claimed') {
    return 'is-doing';
  }
  if (value === 'ready') {
    return 'is-ready';
  }
  return 'is-neutral';
}

export class GraphCardNode extends FlowNode {
  static styles = [
    ...(Array.isArray(FlowNode.styles) ? FlowNode.styles : [FlowNode.styles]),
    css`
      :host {
        --node-background: var(--wg-graph-node-bg, #ffffff);
        --node-border: var(--wg-graph-node-border, #dfe1e6);
        --node-text: var(--wg-graph-node-text, #172b4d);
        --node-subtext: var(--wg-graph-node-subtext, #5e6c84);
        --node-selected-border: var(--wg-graph-node-selected-border, #0052cc);
        background: transparent;
        border: none;
        border-radius: 0;
        box-shadow: none;
        font-family: "Segoe UI", system-ui, sans-serif;
        padding: 0;
      }

      :host(:hover),
      :host([selected]),
      :host([dragging]) {
        box-shadow: none;
      }

      .graph-card {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 10px 12px 11px;
        border: 1px solid var(--node-border);
        border-radius: 10px;
        background: var(--node-background);
        color: var(--node-text);
        text-align: left;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(9, 30, 66, 0.08);
        transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      }

      .graph-card:hover {
        border-color: var(--wg-graph-node-hover-border, #c1c7d0);
      }

      :host([selected]) .graph-card,
      .graph-card.is-focused,
      .graph-card.is-selected:not(.is-rejected) {
        border-color: var(--node-selected-border);
        box-shadow: none;
      }

      .graph-card.is-rejected {
        opacity: 0.58;
        border-style: dashed;
        background: var(--wg-graph-node-rejected-bg, #f4f5f7);
        box-shadow: none;
      }

      .graph-card.tone-question {
        border-left: 3px solid var(--wg-graph-tone-question, #0052cc);
      }

      .graph-card.tone-analysis {
        border-left: 3px solid var(--wg-graph-tone-analysis, #5b21b6);
      }

      .graph-card.tone-option.is-selected:not(.is-rejected) {
        background: var(--wg-graph-node-selected-bg, linear-gradient(180deg, #deebff 0%, #ffffff 72%));
      }

      .graph-card.tone-decision {
        border-left: 3px solid var(--wg-graph-tone-decision, #9a6700);
      }

      .graph-card.tone-work.is-done {
        border-color: var(--wg-graph-tone-work, #1a7f37);
      }

      .graph-card.tone-epic {
        border-left: 3px solid var(--wg-graph-tone-epic, #8250df);
      }

      .graph-card.tone-epic.is-done {
        border-color: var(--wg-graph-tone-work, #1a7f37);
      }

      .graph-card.tone-epic:not(.is-done) .status-badge.is-ready {
        background: rgba(130, 80, 223, 0.18);
      }

      .graph-card.tone-architecture,
      .graph-card.tone-schematic {
        border-left: 3px solid var(--wg-graph-tone-architecture, #0052cc);
      }

      .graph-card.drift-high {
        border-color: var(--wg-graph-drift-high, #cf3700);
        box-shadow: 0 0 0 1px rgba(207, 55, 0, 0.15);
      }

      .graph-card.drift-medium {
        border-color: var(--wg-graph-drift-medium, #9a6700);
      }

      .graph-card.drift-low {
        border-color: var(--wg-graph-drift-low, #1a7f37);
      }

      .layer {
        display: inline-block;
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--node-subtext);
        margin-bottom: 7px;
        padding: 2px 7px;
        border-radius: 999px;
        background: var(--wg-graph-layer-bg, rgba(9, 30, 66, 0.05));
        border: 1px solid var(--wg-graph-layer-border, rgba(9, 30, 66, 0.1));
      }

      .tone-question .layer {
        color: var(--wg-graph-tone-question, #0052cc);
      }

      .tone-analysis .layer {
        color: var(--wg-graph-tone-analysis, #5b21b6);
      }

      .tone-option.is-selected:not(.is-rejected) .layer {
        color: var(--wg-graph-tone-question, #0052cc);
      }

      .tone-decision .layer {
        color: var(--wg-graph-tone-decision, #9a6700);
      }

      .tone-work .layer {
        color: var(--wg-graph-tone-work, #1a7f37);
      }

      .tone-epic .layer {
        color: var(--wg-graph-tone-epic, #8250df);
      }

      .title {
        font-size: 13px;
        line-height: 1.35;
        font-weight: 600;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .summary {
        font-size: 12px;
        line-height: 1.35;
        color: var(--node-subtext);
        margin: 6px 0 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .status-row {
        margin-top: 9px;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 10px;
        line-height: 1.4;
        text-transform: lowercase;
        border: 1px solid var(--wg-graph-badge-border, #dfe1e6);
        color: var(--node-subtext);
        background: var(--wg-graph-badge-bg, #f4f5f7);
      }

      .status-badge.is-done {
        border-color: var(--wg-graph-badge-done-border, #abf5d1);
        color: var(--wg-graph-badge-done-text, #006644);
        background: var(--wg-graph-badge-done-bg, #e3fcef);
      }

      .status-badge.is-doing {
        border-color: var(--wg-graph-badge-doing-border, #f0c36d);
        color: var(--wg-graph-badge-doing-text, #7a4f01);
        background: var(--wg-graph-badge-doing-bg, #fff7d6);
      }

      .status-badge.is-ready {
        border-color: var(--wg-graph-badge-ready-border, #85b8ff);
        color: var(--wg-graph-badge-ready-text, #0052cc);
        background: var(--wg-graph-badge-ready-bg, #deebff);
      }

      .status-badge.is-blocked {
        border-color: var(--wg-graph-badge-blocked-border, #ffbdad);
        color: var(--wg-graph-badge-blocked-text, #bf2600);
        background: var(--wg-graph-badge-blocked-bg, #ffebe6);
      }

      .graph-card-wrap {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .edge-port {
        position: absolute;
        width: 8px;
        height: 8px;
        opacity: 0;
        pointer-events: none;
      }

      .edge-port.target {
        left: -4px;
        top: 50%;
        transform: translateY(-50%);
      }

      .edge-port.source {
        right: -4px;
        top: 50%;
        transform: translateY(-50%);
      }

      .edge-port.target-top {
        top: -4px;
        left: 50%;
        transform: translateX(-50%);
      }

      .edge-port.source-bottom {
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
      }
    `,
  ];

  override render() {
    const data = (this.data ?? {}) as Record<string, unknown>;
    const kind = String(data.kind ?? '');
    const tone = KIND_LAYER_TONE[kind] ?? '';
    const rejected = data.rejected === true || (kind === 'intent_option' && data.selected !== true);
    const done = data.status === 'done' || data.status === 'verified';
    const classes = [
      'graph-card',
      tone,
      data.selected === true ? 'is-selected' : '',
      rejected ? 'is-rejected' : '',
      data.focused === true ? 'is-focused' : '',
      done ? 'is-done' : '',
      data.driftTier ? `drift-${String(data.driftTier)}` : '',
    ].filter(Boolean).join(' ');

    const progress = Number(data.childCount) > 0
      ? ` ${data.doneChildCount ?? 0}/${data.childCount}`
      : '';

    const statusText = data.status ? `${String(data.status)}${progress}` : '';

    return html`
      <div class="graph-card-wrap">
        <button type="button" class=${classes} @click=${this.onCardClick}>
          <div class="layer">${String(data.layer ?? kind)}</div>
          <p class="title">${String(data.title ?? this.id)}</p>
          ${data.summary ? html`<p class="summary">${String(data.summary)}</p>` : null}
          ${statusText ? html`
            <div class="status-row">
              <span class="status-badge ${statusBadgeClass(data.status)}">${statusText}</span>
            </div>
          ` : null}
        </button>
        <div class="edge-port target" data-handle-id="target"></div>
        <div class="edge-port source" data-handle-id="source"></div>
        <div class="edge-port target-top" data-handle-id="target-top"></div>
        <div class="edge-port source-bottom" data-handle-id="source-bottom"></div>
      </div>
    `;
  }

  private onCardClick(event: Event) {
    event.stopPropagation();
    const data = (this.data ?? {}) as Record<string, unknown>;
    this.dispatchEvent(new CustomEvent('graph-node-click', {
      bubbles: true,
      composed: true,
      detail: {
        nodeId: this.id,
        kind: data.kind,
        taskId: data.taskId || undefined,
        intentNodeId: data.intentNodeId || undefined,
        blockId: data.blockId || undefined,
        schematicId: data.schematicId || undefined,
      },
    }));
  }
}

if (!customElements.get('graph-card-node')) {
  customElements.define('graph-card-node', GraphCardNode);
}
