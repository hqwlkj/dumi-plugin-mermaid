import * as React from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CopyIcon,
  ExpandIcon,
  ImageIcon,
  ResetIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../icons';
import { PAN_STEP, canZoomIn, canZoomOut } from '../transform';
import type { CopyFeedback, CopyKind } from '../useCopyDiagram';

type IconButtonProps = {
  label: string;
  /** 在 3×3 网格里的位置 */
  slot?: string;
  /** `plain` 只显示图标，用于平移这类导航操作 */
  variant?: 'solid' | 'plain';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};

function IconButton({
  label,
  slot,
  variant = 'solid',
  disabled,
  onClick,
  children,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className="dumi-plugin-mermaid-viewer-icon-button"
      data-variant={variant}
      data-slot={slot}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type DiagramToolbarProps = {
  onExpand: () => void;
  onCopy: (kind: CopyKind) => void;
  feedback: CopyFeedback | null;
};

/** 右上工具组：放大到弹窗 + 复制 mermaid 源码 / PNG */
export function DiagramToolbar({ onExpand, onCopy, feedback }: DiagramToolbarProps) {
  // 复制成功后把对应按钮切成对勾，给出即时的视觉确认
  const copiedKind = feedback?.tone === 'copied' ? feedback.kind : null;

  return (
    <div className="dumi-plugin-mermaid-viewer-toolbar" role="group" aria-label="Diagram actions">
      <IconButton label="Expand" onClick={onExpand}>
        <ExpandIcon />
      </IconButton>
      <IconButton label="Copy Mermaid code" onClick={() => onCopy('code')}>
        {copiedKind === 'code' ? <CheckIcon /> : <CopyIcon />}
      </IconButton>
      <IconButton label="Copy PNG image" onClick={() => onCopy('png')}>
        {copiedKind === 'png' ? <CheckIcon /> : <ImageIcon />}
      </IconButton>

      {feedback ? (
        <span className="dumi-plugin-mermaid-viewer-feedback" role="status">
          {feedback.message}
        </span>
      ) : null}
    </div>
  );
}

type PanZoomPanelProps = {
  scale: number;
  onPan: (dx: number, dy: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

/**
 * 右下平移/缩放面板，按 mermaid.live 的 3×3 布局：
 *
 *     ·  ↑  ⊕
 *     ←  ↺  →
 *     ·  ↓  ⊖
 *
 * 箭头方向即内容移动方向（↑ 表示图表向上走），与 transform 里朝下的 y 轴正向相反。
 */
export function PanZoomPanel({ scale, onPan, onZoomIn, onZoomOut, onReset }: PanZoomPanelProps) {
  return (
    <div className="dumi-plugin-mermaid-viewer-panzoom" role="group" aria-label="Pan and zoom">
      <IconButton slot="up" variant="plain" label="Pan up" onClick={() => onPan(0, -PAN_STEP)}>
        <ChevronUpIcon />
      </IconButton>
      <IconButton slot="zoom-in" label="Zoom in" disabled={!canZoomIn(scale)} onClick={onZoomIn}>
        <ZoomInIcon />
      </IconButton>
      <IconButton slot="left" variant="plain" label="Pan left" onClick={() => onPan(-PAN_STEP, 0)}>
        <ChevronLeftIcon />
      </IconButton>
      <IconButton slot="reset" label="Reset view" onClick={onReset}>
        <ResetIcon />
      </IconButton>
      <IconButton slot="right" variant="plain" label="Pan right" onClick={() => onPan(PAN_STEP, 0)}>
        <ChevronRightIcon />
      </IconButton>
      <IconButton slot="down" variant="plain" label="Pan down" onClick={() => onPan(0, PAN_STEP)}>
        <ChevronDownIcon />
      </IconButton>
      <IconButton
        slot="zoom-out"
        label="Zoom out"
        disabled={!canZoomOut(scale)}
        onClick={onZoomOut}
      >
        <ZoomOutIcon />
      </IconButton>
    </div>
  );
}
