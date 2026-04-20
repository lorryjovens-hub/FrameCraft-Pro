import {
  type KeyboardEvent,
  type ReactNode,
  memo,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  CANVAS_NODE_TYPES,
  type VideoGenNodeData,
} from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { NodeResizeHandle } from '@/features/canvas/ui/NodeResizeHandle';
import { CanvasNodeImage } from '@/features/canvas/ui/CanvasNodeImage';
import { NodePriceBadge } from '@/features/canvas/ui/NodePriceBadge';
import {
  canvasAiGateway,
  graphImageResolver,
  canvasEventBus,
} from '@/features/canvas/application/canvasServices';
import { resolveErrorContent, showErrorDialog } from '@/features/canvas/application/errorDialog';
import {
  resolveImageDisplayUrl,
} from '@/features/canvas/application/imageData';
import {
  findReferenceTokens,
  insertReferenceToken,
  removeTextRange,
  resolveReferenceAwareDeleteRange,
} from '@/features/canvas/application/referenceTokenEditing';
import {
  DEFAULT_VIDEO_MODEL_ID,
  getVideoModel,
  listVideoModels,
  type AspectRatioOption,
} from '@/features/canvas/models';
import { resolveModelPriceDisplay } from '@/features/canvas/pricing';
import {
  NODE_CONTROL_CHIP_CLASS,
  NODE_CONTROL_ICON_CLASS,
  NODE_CONTROL_MODEL_CHIP_CLASS,
  NODE_CONTROL_PARAMS_CHIP_CLASS,
  NODE_CONTROL_PRIMARY_BUTTON_CLASS,
} from '@/features/canvas/ui/nodeControlStyles';
import { ModelParamsControls } from '@/features/canvas/ui/ModelParamsControls';
import { UiButton, UiChipButton } from '@/components/ui';
import { useCanvasStore } from '@/stores/canvasStore';
import { useSettingsStore } from '@/stores/settingsStore';

type VideoGenNodeProps = NodeProps & {
  id: string;
  data: VideoGenNodeData;
  selected?: boolean;
};

interface PickerAnchor {
  left: number;
  top: number;
}

const PICKER_FALLBACK_ANCHOR: PickerAnchor = { left: 8, top: 8 };
const PICKER_Y_OFFSET_PX = 20;
const VIDEO_GEN_NODE_MIN_WIDTH = 390;
const VIDEO_GEN_NODE_MIN_HEIGHT = 180;
const VIDEO_GEN_NODE_MAX_WIDTH = 1400;
const VIDEO_GEN_NODE_MAX_HEIGHT = 1000;
const VIDEO_GEN_NODE_DEFAULT_WIDTH = 520;
const VIDEO_GEN_NODE_DEFAULT_HEIGHT = 320;

// 视频模型的默认分辨率选项
const VIDEO_RESOLUTION_OPTIONS = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

function getTextareaCaretOffset(
  textarea: HTMLTextAreaElement,
  caretIndex: number
): PickerAnchor {
  const mirror = document.createElement('div');
  const computed = window.getComputedStyle(textarea);
  const mirrorStyle = mirror.style;

  mirrorStyle.position = 'absolute';
  mirrorStyle.visibility = 'hidden';
  mirrorStyle.pointerEvents = 'none';
  mirrorStyle.whiteSpace = 'pre-wrap';
  mirrorStyle.overflowWrap = 'break-word';
  mirrorStyle.wordBreak = 'break-word';
  mirrorStyle.boxSizing = computed.boxSizing;
  mirrorStyle.width = `${textarea.clientWidth}px`;
  mirrorStyle.font = computed.font;
  mirrorStyle.lineHeight = computed.lineHeight;
  mirrorStyle.letterSpacing = computed.letterSpacing;
  mirrorStyle.padding = computed.padding;
  mirrorStyle.border = computed.border;
  mirrorStyle.textTransform = computed.textTransform;
  mirrorStyle.textIndent = computed.textIndent;

  mirror.textContent = textarea.value.slice(0, caretIndex);

  const marker = document.createElement('span');
  marker.textContent = textarea.value.slice(caretIndex, caretIndex + 1) || ' ';
  mirror.appendChild(marker);

  document.body.appendChild(mirror);

  const left = marker.offsetLeft - textarea.scrollLeft;
  const top = marker.offsetTop - textarea.scrollTop;

  document.body.removeChild(mirror);

  return {
    left: Math.max(0, left),
    top: Math.max(0, top),
  };
}

function resolvePickerAnchor(
  container: HTMLDivElement | null,
  textarea: HTMLTextAreaElement,
  caretIndex: number
): PickerAnchor {
  if (!container) {
    return PICKER_FALLBACK_ANCHOR;
  }

  const containerRect = container.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();
  const caretOffset = getTextareaCaretOffset(textarea, caretIndex);

  return {
    left: Math.max(0, textareaRect.left - containerRect.left + caretOffset.left),
    top: Math.max(0, textareaRect.top - containerRect.top + caretOffset.top + PICKER_Y_OFFSET_PX),
  };
}

function renderPromptWithHighlights(prompt: string, maxImageCount: number): ReactNode {
  if (!prompt) {
    return ' ';
  }

  const segments: ReactNode[] = [];
  let lastIndex = 0;
  const referenceTokens = findReferenceTokens(prompt, maxImageCount);
  for (const token of referenceTokens) {
    const matchStart = token.start;
    const matchText = token.token;

    if (matchStart > lastIndex) {
      segments.push(
        <span key={`plain-${lastIndex}`}>{prompt.slice(lastIndex, matchStart)}</span>
      );
    }

    segments.push(
      <span
        key={`ref-${matchStart}`}
        className="relative z-0 text-white [text-shadow:0.24px_0_currentColor,-0.24px_0_currentColor] before:absolute before:-inset-x-[4px] before:-inset-y-[1px] before:-z-10 before:rounded-[7px] before:bg-accent/55 before:content-['']"
      >
        {matchText}
      </span>
    );

    lastIndex = matchStart + matchText.length;
  }

  if (lastIndex < prompt.length) {
    segments.push(<span key={`plain-${lastIndex}`}>{prompt.slice(lastIndex)}</span>);
  }

  return segments;
}

export const VideoGenNode = memo(({ id, data, selected, width, height }: VideoGenNodeProps) => {
  const { t, i18n } = useTranslation();
  const updateNodeInternals = useUpdateNodeInternals();
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const promptHighlightRef = useRef<HTMLDivElement>(null);
  const [promptDraft, setPromptDraft] = useState(() => data.prompt ?? '');
  const promptDraftRef = useRef(promptDraft);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerCursor, setPickerCursor] = useState<number | null>(null);
  const [pickerActiveIndex, setPickerActiveIndex] = useState(0);
  const [pickerAnchor, setPickerAnchor] = useState<PickerAnchor>(PICKER_FALLBACK_ANCHOR);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showFaceCompliancePicker, setShowFaceCompliancePicker] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const apiKeys = useSettingsStore((state) => state.apiKeys);
  const showNodePrice = useSettingsStore((state) => state.showNodePrice);
  const priceDisplayCurrencyMode = useSettingsStore((state) => state.priceDisplayCurrencyMode);
  const usdToCnyRate = useSettingsStore((state) => state.usdToCnyRate);
  const preferDiscountedPrice = useSettingsStore((state) => state.preferDiscountedPrice);

  const incomingImages = useMemo(
    () => graphImageResolver.collectInputImages(id, nodes, edges),
    [id, nodes, edges]
  );

  const incomingImageItems = useMemo(
    () =>
      incomingImages.map((imageUrl, index) => ({
        imageUrl,
        displayUrl: resolveImageDisplayUrl(imageUrl),
        label: `图${index + 1}`,
      })),
    [incomingImages]
  );
  const incomingImageViewerList = useMemo(
    () => incomingImageItems.map((item) => resolveImageDisplayUrl(item.imageUrl)),
    [incomingImageItems]
  );

  const videoModels = useMemo(() => listVideoModels(), []);

  const selectedModel = useMemo(() => {
    const modelId = data.model ?? DEFAULT_VIDEO_MODEL_ID;
    return getVideoModel(modelId);
  }, [data.model]);

  const providerApiKey = apiKeys[selectedModel.providerId] ?? '';

  const effectiveExtraParams = useMemo(
    () => ({
      ...(data.extraParams ?? {}),
    }),
    [data.extraParams]
  );

  // 视频模型使用固定的分辨率选项
  const resolutionOptions = VIDEO_RESOLUTION_OPTIONS;
  const selectedResolution = useMemo(
    () => resolutionOptions.find(r => r.value === data.size) ?? resolutionOptions[0],
    [data.size]
  );

  const aspectRatioOptions = useMemo<AspectRatioOption[]>(
    () => selectedModel.aspectRatios,
    [selectedModel.aspectRatios]
  );

  const selectedAspectRatio = useMemo(
    () =>
      aspectRatioOptions.find((item) => item.value === data.aspectRatio) ??
      aspectRatioOptions[0],
    [aspectRatioOptions, data.aspectRatio]
  );

  const durationOptions = useMemo(() => selectedModel.durations, [selectedModel.durations]);
  const selectedDuration = useMemo(
    () => durationOptions.find(d => d.value === data.duration) ?? durationOptions[0],
    [data.duration, durationOptions]
  );

  const resolvedPriceDisplay = useMemo(
    () =>
      showNodePrice
        ? resolveModelPriceDisplay(selectedModel, {
          resolution: selectedResolution.value,
          extraParams: effectiveExtraParams,
          language: i18n.language,
          settings: {
            displayCurrencyMode: priceDisplayCurrencyMode,
            usdToCnyRate,
            preferDiscountedPrice,
          },
        })
        : null,
    [
      i18n.language,
      preferDiscountedPrice,
      priceDisplayCurrencyMode,
      effectiveExtraParams,
      selectedModel,
      selectedResolution.value,
      showNodePrice,
      usdToCnyRate,
    ]
  );

  const resolvedPriceTooltip = useMemo(() => {
    if (!resolvedPriceDisplay) {
      return undefined;
    }

    const lines = [resolvedPriceDisplay.label];
    if (resolvedPriceDisplay.nativeLabel) {
      lines.push(t('pricing.nativePrice', { value: resolvedPriceDisplay.nativeLabel }));
    }
    if (resolvedPriceDisplay.originalLabel) {
      lines.push(t('pricing.originalPrice', { value: resolvedPriceDisplay.originalLabel }));
    }
    return lines.join('\n');
  }, [i18n.language, resolvedPriceDisplay, t]);

  const resolvedTitle = useMemo(
    () => resolveNodeDisplayName(CANVAS_NODE_TYPES.videoGen, data),
    [data]
  );

  const resolvedWidth = Math.max(VIDEO_GEN_NODE_MIN_WIDTH, Math.round(width ?? VIDEO_GEN_NODE_DEFAULT_WIDTH));
  const resolvedHeight = Math.max(VIDEO_GEN_NODE_MIN_HEIGHT, Math.round(height ?? VIDEO_GEN_NODE_DEFAULT_HEIGHT));

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, resolvedHeight, resolvedWidth, updateNodeInternals]);

  useEffect(() => {
    const externalPrompt = data.prompt ?? '';
    if (externalPrompt !== promptDraftRef.current) {
      promptDraftRef.current = externalPrompt;
      setPromptDraft(externalPrompt);
    }
  }, [data.prompt]);

  const commitPromptDraft = useCallback((nextPrompt: string) => {
    promptDraftRef.current = nextPrompt;
    updateNodeData(id, { prompt: nextPrompt });
  }, [id, updateNodeData]);

  useEffect(() => {
    if (data.model !== selectedModel.id) {
      updateNodeData(id, { model: selectedModel.id });
    }

    if (data.size !== selectedResolution.value) {
      updateNodeData(id, { size: selectedResolution.value });
    }

    if (data.aspectRatio !== selectedAspectRatio.value) {
      updateNodeData(id, { aspectRatio: selectedAspectRatio.value });
    }

    if (data.duration !== selectedDuration.value) {
      updateNodeData(id, { duration: selectedDuration.value });
    }
  }, [
    data.model,
    data.aspectRatio,
    data.size,
    data.duration,
    id,
    selectedAspectRatio.value,
    selectedModel.id,
    selectedResolution.value,
    selectedDuration.value,
    updateNodeData,
  ]);

  useEffect(() => {
    if (incomingImages.length === 0) {
      setShowImagePicker(false);
      setPickerCursor(null);
      setPickerActiveIndex(0);
      return;
    }

    setPickerActiveIndex((previous) => Math.min(previous, incomingImages.length - 1));
  }, [incomingImages.length]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as globalThis.Node)) {
        return;
      }

      setShowImagePicker(false);
      setShowDurationPicker(false);
      setShowFaceCompliancePicker(false);
      setShowSubjectPicker(false);
      setPickerCursor(null);
    };

    document.addEventListener('mousedown', handleOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside, true);
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    const prompt = promptDraft.replace(/@(?=图\d+)/g, '').trim();
    if (!prompt) {
      const errorMessage = t('node.imageEdit.promptRequired');
      setError(errorMessage);
      showErrorDialog(errorMessage, t('common.error'));
      return;
    }

    if (!providerApiKey) {
      const errorMessage = t('node.imageEdit.apiKeyRequired');
      setError(errorMessage);
      showErrorDialog(errorMessage, t('common.error'));
      return;
    }

    try {
      await canvasAiGateway.setApiKey(selectedModel.providerId, providerApiKey);

      updateNodeData(id, {
        isGenerating: true,
        generationStartedAt: Date.now(),
        generationError: null,
        generationErrorDetails: null,
      });

      const jobId = await canvasAiGateway.submitGenerateVideoJob({
        prompt,
        model: selectedModel.id,
        aspectRatio: selectedAspectRatio.value,
        duration: selectedDuration.value,
        referenceImages: incomingImages,
        extraParams: {
          ...effectiveExtraParams,
          ...(data.faceCompliance !== undefined ? { face_compliance: data.faceCompliance } : {}),
          ...(data.subjects && data.subjects.length > 0 ? { subjects: data.subjects } : {}),
        },
      });

      updateNodeData(id, {
        generationJobId: jobId,
      });
    } catch (err) {
      const errorContent = resolveErrorContent(err, t('ai.error'));
      setError(errorContent.message);

      updateNodeData(id, {
        isGenerating: false,
        generationError: errorContent.message,
        generationErrorDetails: errorContent.details,
        generationStartedAt: null,
      });

      showErrorDialog(errorContent.message, t('node.imageEdit.generationFailed'), errorContent.details);
    }
  }, [id, data, incomingImages, promptDraft, selectedModel, selectedAspectRatio, selectedDuration, effectiveExtraParams, updateNodeData, setError, t, canvasAiGateway, showErrorDialog, providerApiKey]);

  useEffect(() => {
    const handleGenerateEvent = (data: { nodeId: string; previewOnly: boolean }) => {
      if (data.nodeId === id) {
        void handleGenerate();
      }
    };

    const unsubscribe = canvasEventBus.subscribe('video-gen/generate' as any, handleGenerateEvent);

    return () => {
      unsubscribe();
    };
  }, [id, handleGenerate]);

  const syncPromptHighlightScroll = () => {
    if (!promptRef.current || !promptHighlightRef.current) {
      return;
    }

    promptHighlightRef.current.scrollTop = promptRef.current.scrollTop;
    promptHighlightRef.current.scrollLeft = promptRef.current.scrollLeft;
  };

  const insertImageReference = useCallback((imageIndex: number) => {
    const marker = `@图${imageIndex + 1}`;
    const currentPrompt = promptDraftRef.current;
    const cursor = pickerCursor ?? currentPrompt.length;
    const { nextText: nextPrompt, nextCursor } = insertReferenceToken(currentPrompt, cursor, marker);

    setPromptDraft(nextPrompt);
    commitPromptDraft(nextPrompt);
    setShowImagePicker(false);
    setPickerCursor(null);
    setPickerActiveIndex(0);

    requestAnimationFrame(() => {
      promptRef.current?.focus();
      promptRef.current?.setSelectionRange(nextCursor, nextCursor);
      syncPromptHighlightScroll();
    });
  }, [commitPromptDraft, pickerCursor]);

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const currentPrompt = promptDraftRef.current;
      const selectionStart = event.currentTarget.selectionStart ?? currentPrompt.length;
      const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;
      const deletionDirection = event.key === 'Backspace' ? 'backward' : 'forward';
      const deleteRange = resolveReferenceAwareDeleteRange(
        currentPrompt,
        selectionStart,
        selectionEnd,
        deletionDirection,
        incomingImages.length
      );
      if (deleteRange) {
        event.preventDefault();
        const { nextText: nextPrompt, nextCursor } = removeTextRange(currentPrompt, deleteRange);
        setPromptDraft(nextPrompt);
        commitPromptDraft(nextPrompt);
        requestAnimationFrame(() => {
          promptRef.current?.focus();
          promptRef.current?.setSelectionRange(nextCursor, nextCursor);
          syncPromptHighlightScroll();
        });
        return;
      }
    }

    if (showImagePicker && incomingImages.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setPickerActiveIndex((previous) => (previous + 1) % incomingImages.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setPickerActiveIndex((previous) =>
          previous === 0 ? incomingImages.length - 1 : previous - 1
        );
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        insertImageReference(pickerActiveIndex);
        return;
      }
    }

    if (event.key === '@' && incomingImages.length > 0) {
      event.preventDefault();
      const cursor = event.currentTarget.selectionStart ?? promptDraftRef.current.length;
      setPickerAnchor(resolvePickerAnchor(rootRef.current, event.currentTarget, cursor));
      setPickerCursor(cursor);
      setShowImagePicker(true);
      setPickerActiveIndex(0);
      return;
    }

    if (event.key === 'Escape' && (showImagePicker || showDurationPicker || showFaceCompliancePicker || showSubjectPicker)) {
      event.preventDefault();
      setShowImagePicker(false);
      setShowDurationPicker(false);
      setShowFaceCompliancePicker(false);
      setShowSubjectPicker(false);
      setPickerCursor(null);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleGenerate();
    }
  };

  return (
    <div
      ref={rootRef}
      className={`
        group relative flex h-full flex-col overflow-visible rounded-[var(--node-radius)] border bg-surface-dark/90 p-2 transition-colors duration-150
        ${selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(15,23,42,0.22)] hover:border-[rgba(15,23,42,0.34)] dark:border-[rgba(255,255,255,0.22)] dark:hover:border-[rgba(255,255,255,0.34)]'}
      `}
      style={{ width: `${resolvedWidth}px`, height: `${resolvedHeight}px` }}
      onClick={() => setSelectedNode(id)}
    >
      <NodeHeader
        className={NODE_HEADER_FLOATING_POSITION_CLASS}
        icon={<Sparkles className="h-4 w-4" />}
        titleText={resolvedTitle}
        rightSlot={
          resolvedPriceDisplay ? (
            <NodePriceBadge
              label={resolvedPriceDisplay.label}
              title={resolvedPriceTooltip}
            />
          ) : undefined
        }
        editable
        onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
      />

      <div className="relative min-h-0 flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-bg-dark/45 p-2">
        <div className="relative h-full min-h-0">
          <div
            ref={promptHighlightRef}
            aria-hidden="true"
            className="ui-scrollbar pointer-events-none absolute inset-0 overflow-y-auto overflow-x-hidden text-sm leading-6 text-text-dark"
            style={{ scrollbarGutter: 'stable' }}
          >
            <div className="min-h-full whitespace-pre-wrap break-words px-1 py-0.5">
              {renderPromptWithHighlights(promptDraft, incomingImages.length)}
            </div>
          </div>

          <textarea
            ref={promptRef}
            value={promptDraft}
            onChange={(event) => {
              const nextValue = event.target.value;
              setPromptDraft(nextValue);
              commitPromptDraft(nextValue);
            }}
            onKeyDown={handlePromptKeyDown}
            onScroll={syncPromptHighlightScroll}
            onMouseDown={(event) => event.stopPropagation()}
            placeholder={t('node.imageEdit.promptPlaceholder')}
            className="ui-scrollbar nodrag nowheel relative z-10 h-full w-full resize-none overflow-y-auto overflow-x-hidden border-none bg-transparent px-1 py-0.5 text-sm leading-6 text-transparent caret-text-dark outline-none placeholder:text-text-muted/80 focus:border-transparent whitespace-pre-wrap break-words"
            style={{ scrollbarGutter: 'stable' }}
          />
        </div>

        {showImagePicker && incomingImageItems.length > 0 && (
          <div
            className="nowheel absolute z-30 w-[120px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.16)] bg-surface-dark shadow-xl"
            style={{ left: pickerAnchor.left, top: pickerAnchor.top }}
            onMouseDown={(event) => event.stopPropagation()}
            onWheelCapture={(event) => event.stopPropagation()}
          >
            <div
              className="ui-scrollbar nowheel max-h-[180px] overflow-y-auto"
              onWheelCapture={(event) => event.stopPropagation()}
            >
              {incomingImageItems.map((item, index) => (
                <button
                  key={`${item.imageUrl}-${index}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    insertImageReference(index);
                  }}
                  onMouseEnter={() => setPickerActiveIndex(index)}
                  className={`flex w-full items-center gap-2 border border-transparent bg-bg-dark/70 px-2 py-2 text-left text-sm text-text-dark transition-colors hover:border-[rgba(255,255,255,0.18)] ${pickerActiveIndex === index
                      ? 'border-[rgba(255,255,255,0.24)] bg-bg-dark'
                      : ''
                    }`}
                >
                  <CanvasNodeImage
                    src={item.displayUrl}
                    alt={item.label}
                    viewerSourceUrl={resolveImageDisplayUrl(item.imageUrl)}
                    viewerImageList={incomingImageViewerList}
                    className="h-8 w-8 rounded object-cover"
                    draggable={false}
                  />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex shrink-0 items-center gap-1">
        <ModelParamsControls
          imageModels={[]}
          videoModels={videoModels}
          selectedModel={selectedModel}
          resolutionOptions={resolutionOptions}
          selectedResolution={selectedResolution}
          selectedAspectRatio={selectedAspectRatio}
          aspectRatioOptions={aspectRatioOptions}
          onModelChange={(modelId) => {
            updateNodeData(id, { model: modelId });
          }}
          onResolutionChange={(resolution) => {
            updateNodeData(id, { size: resolution });
          }}
          onAspectRatioChange={(aspectRatio) => {
            updateNodeData(id, { aspectRatio });
          }}
          extraParams={data.extraParams}
          onExtraParamChange={(key, value) =>
            updateNodeData(id, {
              extraParams: {
                ...(data.extraParams ?? {}),
                [key]: value,
              },
            })
          }
          triggerSize="sm"
          chipClassName={NODE_CONTROL_CHIP_CLASS}
          modelChipClassName={NODE_CONTROL_MODEL_CHIP_CLASS}
          paramsChipClassName={NODE_CONTROL_PARAMS_CHIP_CLASS}
        />

        {/* 时长选择 */}
        <div className="relative">
          <UiChipButton
            active={showDurationPicker}
            className={`${NODE_CONTROL_CHIP_CLASS} ${NODE_CONTROL_PARAMS_CHIP_CLASS}`}
            onClick={(event) => {
              event.stopPropagation();
              setShowDurationPicker(!showDurationPicker);
            }}
          >
            <span className="truncate">{selectedDuration.label}</span>
          </UiChipButton>

          {showDurationPicker && (
            <div className="absolute bottom-full left-0 z-30 mb-1 w-[140px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.16)] bg-surface-dark shadow-xl">
              <div className="p-1">
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      updateNodeData(id, { duration: option.value });
                      setShowDurationPicker(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      option.value === selectedDuration.value
                        ? 'bg-accent/20 text-text-dark'
                        : 'text-text-muted hover:bg-bg-dark'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 人脸合规选择 */}
        <div className="relative">
          <UiChipButton
            active={showFaceCompliancePicker}
            className={`${NODE_CONTROL_CHIP_CLASS} ${NODE_CONTROL_PARAMS_CHIP_CLASS}`}
            onClick={(event) => {
              event.stopPropagation();
              setShowFaceCompliancePicker(!showFaceCompliancePicker);
            }}
          >
            <span className="truncate">{data.faceCompliance ? '人脸合规' : '标准生成'}</span>
          </UiChipButton>

          {showFaceCompliancePicker && (
            <div className="absolute bottom-full left-0 z-30 mb-1 w-[140px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.16)] bg-surface-dark shadow-xl">
              <div className="p-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    updateNodeData(id, { faceCompliance: false });
                    setShowFaceCompliancePicker(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    data.faceCompliance === false
                      ? 'bg-accent/20 text-text-dark'
                      : 'text-text-muted hover:bg-bg-dark'
                  }`}
                >
                  标准生成
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    updateNodeData(id, { faceCompliance: true });
                    setShowFaceCompliancePicker(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    data.faceCompliance === true
                      ? 'bg-accent/20 text-text-dark'
                      : 'text-text-muted hover:bg-bg-dark'
                  }`}
                >
                  人脸合规
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 主体选择 */}
        <div className="relative">
          <UiChipButton
            active={showSubjectPicker}
            className={`${NODE_CONTROL_CHIP_CLASS} ${NODE_CONTROL_PARAMS_CHIP_CLASS}`}
            onClick={(event) => {
              event.stopPropagation();
              setShowSubjectPicker(!showSubjectPicker);
            }}
          >
            <span className="truncate">
              {data.subjects && data.subjects.length > 0
                ? `主体(${data.subjects.length})`
                : '选择主体'}
            </span>
          </UiChipButton>

          {showSubjectPicker && (
            <div className="absolute bottom-full left-0 z-30 mb-1 w-[180px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.16)] bg-surface-dark shadow-xl">
              <div className="p-1">
                <div className="px-3 py-2 text-xs text-text-muted">从画布选择主体图片</div>
                {incomingImageItems.slice(0, 4).map((item, index) => (
                  <button
                    key={`${item.imageUrl}-${index}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const subjectId = `subject-${Date.now()}`;
                      const newSubject = {
                        id: subjectId,
                        name: `主体${index + 1}`,
                        imageUrl: item.imageUrl,
                      };
                      const existingSubjects = data.subjects || [];
                      const subjectExists = existingSubjects.some(s => s.imageUrl === item.imageUrl);
                      if (!subjectExists) {
                        updateNodeData(id, {
                          subjects: [...existingSubjects, newSubject],
                        });
                      }
                      setShowSubjectPicker(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-muted hover:bg-bg-dark flex items-center gap-2"
                  >
                    <img
                      src={item.displayUrl}
                      alt={item.label}
                      className="h-6 w-6 rounded object-cover"
                    />
                    <span>{item.label}</span>
                  </button>
                ))}
                {(data.subjects && data.subjects.length > 0) && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      updateNodeData(id, { subjects: [] });
                      setShowSubjectPicker(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-bg-dark"
                  >
                    清除所有主体
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto" />

        <UiButton
          onClick={(event) => {
            event.stopPropagation();
            void handleGenerate();
          }}
          variant="primary"
          className={`shrink-0 ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
        >
          <Sparkles className={NODE_CONTROL_ICON_CLASS} strokeWidth={2.8} />
          <span className="truncate">{t('canvas.generate')}</span>
        </UiButton>
      </div>

      {error && <div className="mt-1 shrink-0 text-xs text-red-400">{error}</div>}

      <Handle
        type="target"
        id="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
      <Handle
        type="source"
        id="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
      <NodeResizeHandle
        minWidth={VIDEO_GEN_NODE_MIN_WIDTH}
        minHeight={VIDEO_GEN_NODE_MIN_HEIGHT}
        maxWidth={VIDEO_GEN_NODE_MAX_WIDTH}
        maxHeight={VIDEO_GEN_NODE_MAX_HEIGHT}
      />
    </div>
  );
});

VideoGenNode.displayName = 'VideoGenNode';
