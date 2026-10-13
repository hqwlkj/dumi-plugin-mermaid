import * as React from 'react';
import MermaidModal from '../MermaidModal';
import { stripMaxWidth } from '../svg';
import type { MermaidViewerProps } from '../types';
import useColorScheme from '../useColorScheme';
import useCopyDiagram from '../useCopyDiagram';
import useMermaid from '../useMermaid';
import useOnRender from '../useOnRender';
import { DiagramToolbar } from './Controls';
import Stage from './Stage';
import './index.less';

/**
 * 带交互控件的图表视图：
 * - 右上：放大到弹窗、复制 SVG / PNG
 * - 右下：平移、缩放、复位（另支持 Ctrl/Cmd + 滚轮缩放、鼠标拖拽平移）
 *
 * `Mermaid` 保持「只渲染图表」的语义不变，需要控件时用这个组件。
 */
function MermaidViewer({
  code,
  mermaidConfig,
  onRender,
  toolbar = true,
  panZoom = true,
  className,
}: MermaidViewerProps) {
  const { svg, error, loading } = useMermaid(code, mermaidConfig);
  const colorScheme = useColorScheme();
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const { copy, feedback } = useCopyDiagram(code, svg);

  useOnRender(bodyRef, svg, onRender);

  // 弹窗里摘掉 mermaid 的 max-width，图表才能真正铺满面板
  const modalSvg = React.useMemo(() => (svg ? stripMaxWidth(svg) : undefined), [svg]);

  const ready = Boolean(svg);

  return (
    <div className={['dumi-plugin-mermaid-viewer', className].filter(Boolean).join(' ')}>
      {toolbar && ready ? (
        <DiagramToolbar feedback={feedback} onExpand={() => setModalOpen(true)} onCopy={copy} />
      ) : null}

      <Stage
        bodyRef={bodyRef}
        code={code}
        svg={svg}
        error={error}
        loading={loading}
        panZoom={panZoom}
      />

      {modalOpen ? (
        <MermaidModal
          label="Mermaid diagram"
          colorScheme={colorScheme}
          onClose={() => setModalOpen(false)}
        >
          {/* 弹窗内只保留平移缩放，避免工具组套娃；每份视口的变换状态互相独立 */}
          <div className="dumi-plugin-mermaid-viewer dumi-plugin-mermaid-viewer-modal">
            <Stage code={code} svg={modalSvg} error={error} loading={loading} panZoom={panZoom} />
          </div>
        </MermaidModal>
      ) : null}
    </div>
  );
}

export default React.memo(MermaidViewer);
