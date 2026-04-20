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
  AUTO_REQUEST_ASPECT_RATIO,
  CANVAS_NODE_TYPES,
  EXPORT_RESULT_NODE_DEFAULT_WIDTH,
  EXPORT_RESULT_NODE_LAYOUT_HEIGHT,
  type StoryboardGenNodeData,
  type StoryboardGenFrameItem,
  type ImageSize,
  type StoryboardRatioControlMode,
} from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { NodeResizeHandle } from '@/features/canvas/ui/NodeResizeHandle';
import {
  canvasAiGateway,
  graphImageResolver,
  canvasEventBus,
} from '@/features/canvas/application/canvasServices';
import { resolveErrorContent, showErrorDialog } from '@/features/canvas/application/errorDialog';
import {
  detectAspectRatio,
  parseAspectRatio,
  resolveImageDisplayUrl,
} from '@/features/canvas/application/imageData';
import {
  buildGenerationErrorReport,
  CURRENT_RUNTIME_SESSION_ID,
  createReferenceImagePlaceholders,
  getRuntimeDiagnostics,
  type GenerationDebugContext,
} from '@/features/canvas/application/generationErrorReport';
import {
  findReferenceTokens,
  insertReferenceToken,
  removeTextRange,
  resolveReferenceAwareDeleteRange,
} from '@/features/canvas/application/referenceTokenEditing';
import {
  DEFAULT_IMAGE_MODEL_ID,
  getImageModel,
  listImageModels,
  resolveImageModelResolution,
  resolveImageModelResolutions,
} from '@/features/canvas/models';
import { GRSAI_NANO_BANANA_PRO_MODEL_ID } from '@/features/canvas/models/image/grsai/nanoBananaPro';
import { FAL_NANO_BANANA_2_MODEL_ID } from '@/features/canvas/models/image/fal/nanoBanana2';
import { KIE_NANO_BANANA_2_MODEL_ID } from '@/features/canvas/models/image/kie/nanoBanana2';
import { resolveModelPriceDisplay } from '@/features/canvas/pricing';
import {
  NODE_CONTROL_CHIP_CLASS,
  NODE_CONTROL_ICON_CLASS,
  NODE_CONTROL_MODEL_CHIP_CLASS,
  NODE_CONTROL_PARAMS_CHIP_CLASS,
  NODE_CONTROL_PRIMARY_BUTTON_CLASS,
} from '@/features/canvas/ui/nodeControlStyles';
import { ModelParamsControls } from '@/features/canvas/ui/ModelParamsControls';
import { CanvasNodeImage } from '@/features/canvas/ui/CanvasNodeImage';
import { NodePriceBadge } from '@/features/canvas/ui/NodePriceBadge';
import { UiButton } from '@/components/ui';
import { useCanvasStore } from '@/stores/canvasStore';
import { useSettingsStore } from '@/stores/settingsStore';

type StoryboardGenNodeProps = NodeProps & {
  id: string;
  data: StoryboardGenNodeData;
  selected?: boolean;
};

interface AspectRatioChoice {
  value: string;
  label: string;
}

interface PickerAnchor {
  left: number;
  top: number;
}

const PICKER_FALLBACK_ANCHOR: PickerAnchor = { left: 8, top: 8 };
const PICKER_Y_OFFSET_PX = 20;
const STORYBOARD_GEN_NODE_MIN_WIDTH = 420;
const STORYBOARD_GEN_NODE_MIN_HEIGHT = 300;
const STORYBOARD_GEN_NODE_MAX_WIDTH = 1400;
const STORYBOARD_GEN_NODE_MAX_HEIGHT = 1000;
const STORYBOARD_GEN_NODE_DEFAULT_WIDTH = 560;
const STORYBOARD_GEN_NODE_DEFAULT_HEIGHT = 420;

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

function buildAiResultNodeTitle(prompt: string, fallbackTitle: string): string {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    return fallbackTitle;
  }

  const firstLine = normalizedPrompt.split('\n')[0] ?? '';
  const truncated = firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine;
  return truncated || fallbackTitle;
}

function pickClosestAspectRatio(
  targetRatio: number,
  supportedAspectRatios: string[]
): string {
  const supported = supportedAspectRatios.length > 0 ? supportedAspectRatios : ['1:1'];
  let bestValue = supported[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const aspectRatio of supported) {
    const ratio = parseAspectRatio(aspectRatio);
    const distance = Math.abs(Math.log(ratio / targetRatio));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestValue = aspectRatio;
    }
  }

  return bestValue;
}

export const StoryboardGenNode = memo(({ id, data: nodeData, selected, width, height }: StoryboardGenNodeProps) => {
  const { t, i18n } = useTranslation();
  const updateNodeInternals = useUpdateNodeInternals();
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const activeFrameTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const frameTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const frameHighlightRefs = useRef<Record<string, HTMLElement | null>>({});
  const [frameDescriptionDrafts, setFrameDescriptionDrafts] = useState<Record<string, string>>({});

  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerCursor, setPickerCursor] = useState<number | null>(null);
  const [pickerActiveIndex, setPickerActiveIndex] = useState(0);
  const [pickerAnchor, setPickerAnchor] = useState<PickerAnchor>(PICKER_FALLBACK_ANCHOR);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const addNode = useCanvasStore((state) => state.addNode);
  const findNodePosition = useCanvasStore((state) => state.findNodePosition);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const apiKeys = useSettingsStore((state) => state.apiKeys);
  const grsaiNanoBananaProModel = useSettingsStore((state) => state.grsaiNanoBananaProModel);
  const showNodePrice = useSettingsStore((state) => state.showNodePrice);
  const priceDisplayCurrencyMode = useSettingsStore((state) => state.priceDisplayCurrencyMode);
  const usdToCnyRate = useSettingsStore((state) => state.usdToCnyRate);
  const preferDiscountedPrice = useSettingsStore((state) => state.preferDiscountedPrice);
  const grsaiCreditTierId = useSettingsStore((state) => state.grsaiCreditTierId);
  const storyboardGenKeepStyleConsistent = useSettingsStore((state) => state.storyboardGenKeepStyleConsistent);
  const storyboardGenDisableTextInImage = useSettingsStore((state) => state.storyboardGenDisableTextInImage);
  const storyboardGenAutoInferEmptyFrame = useSettingsStore((state) => state.storyboardGenAutoInferEmptyFrame);
  const showStoryboardGenAdvancedRatioControls = useSettingsStore((state) => state.showStoryboardGenAdvancedRatioControls);
  const enableStoryboardGenGridPreviewShortcut = useSettingsStore((state) => state.enableStoryboardGenGridPreviewShortcut);

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

  const imageModels = useMemo(() => listImageModels(), []);

  const selectedModel = useMemo(() => {
    const modelId = nodeData.model ?? DEFAULT_IMAGE_MODEL_ID;
    return getImageModel(modelId);
  }, [nodeData.model]);
  const providerApiKey = apiKeys[selectedModel.providerId] ?? '';

  const ratioMode: StoryboardRatioControlMode = nodeData.ratioControlMode ?? 'cell';

  const effectiveExtraParams = useMemo(
    () => ({
      ...(nodeData.extraParams ?? {}),
      ...(selectedModel.id === GRSAI_NANO_BANANA_PRO_MODEL_ID
        ? { grsai_pro_model: grsaiNanoBananaProModel }
        : {}),
    }),
    [nodeData.extraParams, grsaiNanoBananaProModel, selectedModel.id]
  );

  const resolutionOptions = useMemo(
    () => resolveImageModelResolutions(selectedModel, { extraParams: effectiveExtraParams }),
    [effectiveExtraParams, selectedModel]
  );

  const selectedResolution = useMemo(
    () => resolveImageModelResolution(selectedModel, nodeData.size, { extraParams: effectiveExtraParams }),
    [nodeData.size, effectiveExtraParams, selectedModel]
  );

  const aspectRatioOptions = useMemo<AspectRatioChoice[]>(
    () => [{
      value: AUTO_REQUEST_ASPECT_RATIO,
      label: t('modelParams.autoAspectRatio'),
    }, ...selectedModel.aspectRatios],
    [selectedModel.aspectRatios, t]
  );

  const supportedAspectRatioValues = useMemo(
    () => selectedModel.aspectRatios.map((item) => item.value),
    [selectedModel.aspectRatios]
  );

  const selectedAspectRatio = useMemo(
    () =>
      aspectRatioOptions.find((item) => item.value === nodeData.requestAspectRatio) ??
      aspectRatioOptions[0],
    [aspectRatioOptions, nodeData.requestAspectRatio]
  );

  const requestResolution = selectedModel.resolveRequest({
    referenceImageCount: incomingImages.length,
  });

  const showWebSearchToggle =
    selectedModel.id === FAL_NANO_BANANA_2_MODEL_ID ||
    selectedModel.id === KIE_NANO_BANANA_2_MODEL_ID;
  const webSearchEnabled = Boolean(nodeData.extraParams?.enable_web_search);

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
            grsaiCreditTierId,
          },
        })
        : null,
    [
      grsaiCreditTierId,
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
    if (resolvedPriceDisplay.pointsCost) {
      lines.push(t('pricing.pointsCost', { count: resolvedPriceDisplay.pointsCost }));
    }
    if (resolvedPriceDisplay.grsaiCreditTier) {
      lines.push(
        t('pricing.grsaiTier', {
          price: resolvedPriceDisplay.grsaiCreditTier.priceCny.toFixed(2),
          credits: resolvedPriceDisplay.grsaiCreditTier.credits.toLocaleString(
            i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US'
          ),
        })
      );
    }
    return lines.join('\n');
  }, [i18n.language, resolvedPriceDisplay, t]);

  const resolvedTitle = useMemo(
    () => resolveNodeDisplayName(CANVAS_NODE_TYPES.storyboardGen, nodeData),
    [nodeData]
  );

  const resolvedWidth = Math.max(STORYBOARD_GEN_NODE_MIN_WIDTH, Math.round(width ?? STORYBOARD_GEN_NODE_DEFAULT_WIDTH));
  const resolvedHeight = Math.max(STORYBOARD_GEN_NODE_MIN_HEIGHT, Math.round(height ?? STORYBOARD_GEN_NODE_DEFAULT_HEIGHT));

  const totalFrames = nodeData.gridRows * nodeData.gridCols;

  const baseFrameLayout = useMemo(() => {
    return {
      nodeWidth: 400,
      nodeHeight: 300,
      paramsRowWidth: 360,
      gridWidth: 360,
      cellWidth: 180,
      cellAspectRatio: 1,
    };
  }, []);

  const frameLayout = useMemo(() => {
    return {
      ...baseFrameLayout,
      cellWidth: baseFrameLayout.gridWidth / nodeData.gridCols,
      cellAspectRatio: 1,
    };
  }, [baseFrameLayout, nodeData.gridCols]);

  const resolvedAspectRatios = useMemo(() => {
    return {
      cellAspectRatioLabel: '1:1',
      overallAspectRatioLabel: `${nodeData.gridCols}:${nodeData.gridRows}`,
    };
  }, [nodeData.gridRows, nodeData.gridCols]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, resolvedHeight, resolvedWidth, updateNodeInternals]);

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
      setPickerCursor(null);
    };

    document.addEventListener('mousedown', handleOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside, true);
    };
  }, []);

  const syncFramesForGrid = (rows: number, cols: number): StoryboardGenFrameItem[] => {
    const expectedCount = rows * cols;
    if (nodeData.frames.length === expectedCount) {
      return nodeData.frames;
    }
    const newFrames = nodeData.frames.slice(0, expectedCount);
    while (newFrames.length < expectedCount) {
      newFrames.push({
        id: `${id}-frame-${newFrames.length}`,
        description: '',
        referenceIndex: null,
      });
    }
    return newFrames;
  };

  const handleRowChange = (delta: number) => {
    const newRows = Math.max(1, Math.min(5, nodeData.gridRows + delta));
    updateNodeData(id, { gridRows: newRows, frames: syncFramesForGrid(newRows, nodeData.gridCols) });
  };

  const handleColChange = (delta: number) => {
    const newCols = Math.max(1, Math.min(5, nodeData.gridCols + delta));
    updateNodeData(id, { gridCols: newCols, frames: syncFramesForGrid(nodeData.gridRows, newCols) });
  };

  const handleRatioModeChange = (newMode: StoryboardRatioControlMode) => {
    updateNodeData(id, { ratioControlMode: newMode });
  };

  const buildCombinedPrompt = useCallback(() => {
    const promptParts: string[] = [];

    for (let i = 0; i < nodeData.frames.length; i++) {
      const frame = nodeData.frames[i];
      let description = frameDescriptionDrafts[frame.id] ?? frame.description;

      if (!description.trim() && storyboardGenAutoInferEmptyFrame) {
        description = '依据之前的内容进行推测';
      }

      if (description.trim()) {
        promptParts.push(`分镜${i + 1}：${description}`);
      }
    }

    let fullPrompt = promptParts.join('\n\n');

    if (storyboardGenKeepStyleConsistent && incomingImages.length > 0) {
      fullPrompt += '\n\n图片风格与参考图保持一致';
    }

    if (storyboardGenDisableTextInImage) {
      fullPrompt += '\n\n禁止添加描述文本';
    }

    return fullPrompt;
  }, [nodeData.frames, frameDescriptionDrafts, storyboardGenKeepStyleConsistent, storyboardGenDisableTextInImage, storyboardGenAutoInferEmptyFrame, incomingImages.length]);

  const handleGenerate = useCallback(async (previewGridOnly: boolean = false) => {
    const combinedPrompt = buildCombinedPrompt();
    const trimmedPrompt = combinedPrompt.replace(/@(?=图\d+)/g, '').trim();

    if (!trimmedPrompt) {
      const errorMessage = t('node.imageEdit.promptRequired');
      setError(errorMessage);
      void showErrorDialog(errorMessage, t('common.error'));
      return;
    }

    if (!providerApiKey) {
      const errorMessage = t('node.imageEdit.apiKeyRequired');
      setError(errorMessage);
      void showErrorDialog(errorMessage, t('common.error'));
      return;
    }

    setError(null);

    if (previewGridOnly && enableStoryboardGenGridPreviewShortcut) {
      const newNodePosition = findNodePosition(
        id,
        EXPORT_RESULT_NODE_DEFAULT_WIDTH,
        EXPORT_RESULT_NODE_LAYOUT_HEIGHT
      );
      const newNodeId = addNode(
        CANVAS_NODE_TYPES.exportImage,
        newNodePosition,
        {
          displayName: t('node.storyboardGen.gridPreviewTitle'),
          isGenerating: false,
          resultKind: 'storyboardGenOutput',
        }
      );
      addEdge(id, newNodeId);
      return;
    }

    const generationDurationMs = selectedModel.expectedDurationMs ?? 60000;
    const generationStartedAt = Date.now();
    const resultNodeTitle = buildAiResultNodeTitle(trimmedPrompt, t('node.imageEdit.resultTitle'));
    const runtimeDiagnostics = await getRuntimeDiagnostics();

    const newNodePosition = findNodePosition(
      id,
      EXPORT_RESULT_NODE_DEFAULT_WIDTH,
      EXPORT_RESULT_NODE_LAYOUT_HEIGHT
    );
    const newNodeId = addNode(
      CANVAS_NODE_TYPES.exportImage,
      newNodePosition,
      {
        isGenerating: true,
        generationStartedAt,
        generationDurationMs,
        resultKind: 'storyboardGenOutput',
        displayName: resultNodeTitle,
      }
    );
    addEdge(id, newNodeId);

    try {
      await canvasAiGateway.setApiKey(selectedModel.providerId, providerApiKey);

      let resolvedRequestAspectRatio = selectedAspectRatio.value;
      if (resolvedRequestAspectRatio === AUTO_REQUEST_ASPECT_RATIO) {
        if (ratioMode === 'overall') {
          const overallRatio = nodeData.gridCols / nodeData.gridRows;
          resolvedRequestAspectRatio = pickClosestAspectRatio(overallRatio, supportedAspectRatioValues);
        } else if (incomingImages.length > 0) {
          try {
            const sourceAspectRatio = await detectAspectRatio(incomingImages[0]);
            const sourceAspectRatioValue = parseAspectRatio(sourceAspectRatio);
            resolvedRequestAspectRatio = pickClosestAspectRatio(
              sourceAspectRatioValue,
              supportedAspectRatioValues
            );
          } catch {
            resolvedRequestAspectRatio = pickClosestAspectRatio(1, supportedAspectRatioValues);
          }
        } else {
          resolvedRequestAspectRatio = pickClosestAspectRatio(1, supportedAspectRatioValues);
        }
      }

      const jobId = await canvasAiGateway.submitGenerateImageJob({
        prompt: trimmedPrompt,
        model: requestResolution.requestModel,
        size: selectedResolution.value,
        aspectRatio: resolvedRequestAspectRatio,
        referenceImages: incomingImages,
        extraParams: effectiveExtraParams,
      });

      const generationDebugContext: GenerationDebugContext = {
        sourceType: 'storyboardGen',
        providerId: selectedModel.providerId,
        requestModel: requestResolution.requestModel,
        requestSize: selectedResolution.value,
        requestAspectRatio: resolvedRequestAspectRatio,
        prompt: trimmedPrompt,
        extraParams: effectiveExtraParams,
        referenceImageCount: incomingImages.length,
        referenceImagePlaceholders: createReferenceImagePlaceholders(incomingImages.length),
        appVersion: runtimeDiagnostics.appVersion,
        osName: runtimeDiagnostics.osName,
        osVersion: runtimeDiagnostics.osVersion,
        osBuild: runtimeDiagnostics.osBuild,
        userAgent: runtimeDiagnostics.userAgent,
      };

      updateNodeData(newNodeId, {
        generationJobId: jobId,
        generationSourceType: 'storyboardGen',
        generationProviderId: selectedModel.providerId,
        generationClientSessionId: CURRENT_RUNTIME_SESSION_ID,
        generationDebugContext,
      });
    } catch (generationError) {
      const resolvedError = resolveErrorContent(generationError, t('ai.error'));
      const generationDebugContext: GenerationDebugContext = {
        sourceType: 'storyboardGen',
        providerId: selectedModel.providerId,
        requestModel: requestResolution.requestModel,
        requestSize: selectedResolution.value,
        requestAspectRatio: selectedAspectRatio.value,
        prompt: trimmedPrompt,
        extraParams: effectiveExtraParams,
        referenceImageCount: incomingImages.length,
        referenceImagePlaceholders: createReferenceImagePlaceholders(incomingImages.length),
        appVersion: runtimeDiagnostics.appVersion,
        osName: runtimeDiagnostics.osName,
        osVersion: runtimeDiagnostics.osVersion,
        osBuild: runtimeDiagnostics.osBuild,
        userAgent: runtimeDiagnostics.userAgent,
      };
      const reportText = buildGenerationErrorReport({
        errorMessage: resolvedError.message,
        errorDetails: resolvedError.details,
        context: generationDebugContext,
      });
      setError(resolvedError.message);
      void showErrorDialog(
        resolvedError.message,
        t('common.error'),
        resolvedError.details,
        reportText
      );
      updateNodeData(newNodeId, {
        isGenerating: false,
        generationStartedAt: null,
        generationJobId: null,
        generationProviderId: null,
        generationClientSessionId: null,
        generationError: resolvedError.message,
        generationErrorDetails: resolvedError.details ?? null,
        generationDebugContext,
      });
    }
  }, [
    id,
    addNode,
    addEdge,
    providerApiKey,
    findNodePosition,
    buildCombinedPrompt,
    nodeData.gridRows,
    nodeData.gridCols,
    ratioMode,
    incomingImages,
    selectedModel,
    selectedAspectRatio,
    selectedResolution,
    effectiveExtraParams,
    supportedAspectRatioValues,
    updateNodeData,
    setError,
    t,
    enableStoryboardGenGridPreviewShortcut,
  ]);

  useEffect(() => {
    const handleGenerateEvent = (data: { nodeId: string; previewGridOnly: boolean }) => {
      if (data.nodeId === id) {
        void handleGenerate(data.previewGridOnly);
      }
    };

    const unsubscribe = canvasEventBus.subscribe('storyboard-gen/generate' as any, handleGenerateEvent);

    return () => {
      unsubscribe();
    };
  }, [id, handleGenerate]);

  const handleFrameDescriptionChange = (index: number, value: string) => {
    const frame = nodeData.frames[index];
    if (frame) {
      setFrameDescriptionDrafts(prev => ({
        ...prev,
        [frame.id]: value,
      }));
    }
  };

  const syncFrameHighlightScroll = (frameId: string) => {
    const textarea = frameTextareaRefs.current[frameId];
    const highlight = frameHighlightRefs.current[frameId];
    if (textarea && highlight) {
      highlight.scrollTop = textarea.scrollTop;
    }
  };

  const renderFrameDescriptionWithHighlights = (description: string) => {
    if (!description) {
      return ' ';
    }

    const segments: ReactNode[] = [];
    let lastIndex = 0;
    const referenceTokens = findReferenceTokens(description, incomingImages.length);
    for (const token of referenceTokens) {
      const matchStart = token.start;
      const matchText = token.token;

      if (matchStart > lastIndex) {
        segments.push(
          <span key={`plain-${lastIndex}`}>{description.slice(lastIndex, matchStart)}</span>
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

    if (lastIndex < description.length) {
      segments.push(<span key={`plain-${lastIndex}`}>{description.slice(lastIndex)}</span>);
    }

    return segments;
  };

  const insertImageReference = useCallback((imageIndex: number) => {
    const marker = `@图${imageIndex + 1}`;
    const currentPrompt = activeFrameId
      ? (frameDescriptionDrafts[activeFrameId] ?? nodeData.frames.find(f => f.id === activeFrameId)?.description ?? '')
      : '';
    const cursor = pickerCursor ?? currentPrompt.length;
    const { nextText: nextPrompt, nextCursor } = insertReferenceToken(currentPrompt, cursor, marker);

    if (activeFrameId) {
      const frameIndex = nodeData.frames.findIndex(f => f.id === activeFrameId);
      if (frameIndex >= 0) {
        setFrameDescriptionDrafts(prev => ({
          ...prev,
          [activeFrameId]: nextPrompt,
        }));
      }
    }

    setShowImagePicker(false);
    setPickerCursor(null);
    setPickerActiveIndex(0);

    requestAnimationFrame(() => {
      if (activeFrameId) {
        const textarea = frameTextareaRefs.current[activeFrameId];
        textarea?.focus();
        textarea?.setSelectionRange(nextCursor, nextCursor);
        syncFrameHighlightScroll(activeFrameId);
      }
    });
  }, [activeFrameId, frameDescriptionDrafts, nodeData.frames, pickerCursor]);

  const handleFramePromptKeyDown = (frameId: string, event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const currentPrompt = frameDescriptionDrafts[frameId] ?? nodeData.frames.find(f => f.id === frameId)?.description ?? '';
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
        const { nextText, nextCursor } = removeTextRange(currentPrompt, deleteRange);
        setFrameDescriptionDrafts(prev => ({
          ...prev,
          [frameId]: nextText,
        }));
        requestAnimationFrame(() => {
          const textarea = frameTextareaRefs.current[frameId];
          textarea?.focus();
          textarea?.setSelectionRange(nextCursor, nextCursor);
          syncFrameHighlightScroll(frameId);
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
      const cursor = event.currentTarget.selectionStart ?? (frameDescriptionDrafts[frameId] ?? '').length;
      setActiveFrameId(frameId);
      setPickerAnchor(resolvePickerAnchor(rootRef.current, event.currentTarget, cursor));
      setPickerCursor(cursor);
      setShowImagePicker(true);
      setPickerActiveIndex(0);
      return;
    }

    if (event.key === 'Escape' && showImagePicker) {
      event.preventDefault();
      setShowImagePicker(false);
      setPickerCursor(null);
      setPickerActiveIndex(0);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleGenerate(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`
        group relative flex h-full flex-col overflow-visible rounded-[var(--node-radius)] border bg-surface-dark/95 p-3 transition-colors duration-150
        ${selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(15,23,42,0.22)] hover:border-[rgba(15,23,42,0.34)] dark:border-[rgba(255,255,255,0.22)] dark:hover:border-[rgba(255,255,255,0.34)]'
        }
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
        onTitleChange={(nextTitle: string) => updateNodeData(id, { displayName: nextTitle })}
      />

      <div className="mb-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-[rgba(255,255,255,0.12)] bg-bg-dark/50 px-1.5 py-0.5">
              <span className="text-[11px] text-text-muted">{t('node.storyboardGen.rowsShort')}</span>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded border border-[rgba(255,255,255,0.14)] text-[11px] text-text-muted transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-text-dark"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRowChange(-1);
                }}
              >
                −
              </button>
              <span className="min-w-[18px] text-center text-[11px] font-medium text-text-dark">{nodeData.gridRows}</span>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded border border-[rgba(255,255,255,0.14)] text-[11px] text-text-muted transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-text-dark"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRowChange(1);
                }}
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-[rgba(255,255,255,0.12)] bg-bg-dark/50 px-1.5 py-0.5">
              <span className="text-[11px] text-text-muted">{t('node.storyboardGen.colsShort')}</span>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded border border-[rgba(255,255,255,0.14)] text-[11px] text-text-muted transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-text-dark"
                onClick={(event) => {
                  event.stopPropagation();
                  handleColChange(-1);
                }}
              >
                −
              </button>
              <span className="min-w-[18px] text-center text-[11px] font-medium text-text-dark">{nodeData.gridCols}</span>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded border border-[rgba(255,255,255,0.14)] text-[11px] text-text-muted transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-text-dark"
                onClick={(event) => {
                  event.stopPropagation();
                  handleColChange(1);
                }}
              >
                +
              </button>
            </div>
          </div>

          {showStoryboardGenAdvancedRatioControls && (
            <div className="min-w-0 flex-1 whitespace-nowrap rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-center text-[10px] text-text-muted">
              <span>{t('node.storyboardGen.cellAspectRatio')}: {resolvedAspectRatios.cellAspectRatioLabel}</span>
              <span className="mx-1 text-[rgba(255,255,255,0.22)]">|</span>
              <span>{t('node.storyboardGen.overallAspectRatio')}: {resolvedAspectRatios.overallAspectRatioLabel}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="flex h-7 items-center rounded-md border border-[rgba(255,255,255,0.12)] bg-bg-dark/50 px-1">
            {[1, 2, 3, 4, 5].map((size) => {
              const gridCount = size * size;
              const isActive = nodeData.gridRows === size && nodeData.gridCols === size;
              return (
                <button
                  key={size}
                  type="button"
                  className={`flex h-5 min-w-[26px] items-center justify-center rounded px-1.5 text-[11px] transition-colors ${isActive ? 'bg-accent/18 text-text-dark font-medium' : 'text-text-muted hover:bg-white/10'}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    updateNodeData(id, { gridRows: size, gridCols: size, frames: syncFramesForGrid(size, size) });
                  }}
                  title={`${size}×${size} 宫格`}
                >
                  {gridCount}
                </button>
              );
            })}
          </div>
        </div>

        {showStoryboardGenAdvancedRatioControls && (
          <div className="flex items-center gap-2">
            <div className="flex h-6 items-center rounded-md border border-[rgba(255,255,255,0.12)] bg-bg-dark/50 p-0.5">
              <button
                type="button"
                className={`flex h-5 items-center justify-center rounded px-3 text-[11px] transition-colors ${ratioMode === 'overall'
                  ? 'border border-accent/55 bg-accent/18 text-text-dark font-medium'
                  : 'border border-transparent bg-transparent text-text-muted hover:bg-white/5'}`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRatioModeChange('overall');
                }}
              >
                {t('node.storyboardGen.ratioModeOverall')}
              </button>
              <button
                type="button"
                className={`flex h-5 items-center justify-center rounded px-3 text-[11px] transition-colors ${ratioMode === 'cell'
                  ? 'border border-accent/55 bg-accent/18 text-text-dark font-medium'
                  : 'border border-transparent bg-transparent text-text-muted hover:bg-white/5'}`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRatioModeChange('cell');
                }}
              >
                {t('node.storyboardGen.ratioModeCell')}
              </button>
            </div>
            <div className="text-[11px] text-text-muted">
              {t('node.storyboardGen.frameCount', { count: totalFrames })}
            </div>
          </div>
        )}
      </div>

      <div className="mb-2 flex min-h-0 flex-1 items-center justify-center">
        <div
          className="grid gap-0.5 rounded border border-[rgba(15,23,42,0.14)] bg-[rgba(15,23,42,0.04)] p-0.5 dark:border-[rgba(255,255,255,0.14)] dark:bg-[rgba(255,255,255,0.04)]"
          style={{
            width: `${frameLayout.gridWidth + 4}px`,
            gridTemplateColumns: `repeat(${nodeData.gridCols}, ${frameLayout.cellWidth}px)`,
          }}
        >
          {nodeData.frames.map((frame, index) => {
            const frameDescription = frameDescriptionDrafts[frame.id] ?? frame.description;
            return (
              <div
                key={frame.id}
                className="relative overflow-hidden rounded border border-[rgba(15,23,42,0.18)] bg-bg-dark/50 dark:border-[rgba(255,255,255,0.16)] dark:bg-bg-dark/60"
                style={{ aspectRatio: frameLayout.cellAspectRatio }}
              >
                <div
                  ref={(element) => {
                    frameHighlightRefs.current[frame.id] = element;
                  }}
                  aria-hidden="true"
                  className="ui-scrollbar pointer-events-none absolute inset-0 overflow-y-auto overflow-x-hidden text-[10px] leading-4 text-text-dark"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  <div className="min-h-full whitespace-pre-wrap break-words px-1.5 py-1 text-left">
                    {renderFrameDescriptionWithHighlights(frameDescription)}
                  </div>
                </div>
                <textarea
                  ref={(element) => {
                    frameTextareaRefs.current[frame.id] = element;
                  }}
                  value={frameDescription}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    handleFrameDescriptionChange(index, nextValue);
                  }}
                  onKeyDown={(event) => handleFramePromptKeyDown(frame.id, event)}
                  onScroll={() => syncFrameHighlightScroll(frame.id)}
                  onFocus={(event) => {
                    activeFrameTextareaRef.current = event.currentTarget;
                    setActiveFrameId(frame.id);
                    syncFrameHighlightScroll(frame.id);
                  }}
                  placeholder={t('node.storyboardGen.framePlaceholder', {
                    index: String(index + 1).padStart(2, '0'),
                  })}
                  wrap="soft"
                  className="ui-scrollbar nodrag nowheel relative z-10 h-full w-full resize-none overflow-y-auto overflow-x-hidden bg-transparent px-1.5 py-1 text-left text-[10px] leading-4 text-transparent caret-text-dark placeholder:text-text-muted/40 focus:border-accent/50 focus:outline-none whitespace-pre-wrap break-words"
                  style={{ scrollbarGutter: 'stable' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex shrink-0 items-center gap-1">
        <ModelParamsControls
          imageModels={imageModels}
          selectedModel={selectedModel}
          resolutionOptions={resolutionOptions}
          selectedResolution={selectedResolution}
          selectedAspectRatio={selectedAspectRatio}
          aspectRatioOptions={aspectRatioOptions}
          onModelChange={(modelId) => {
            updateNodeData(id, { model: modelId });
          }}
          onResolutionChange={(resolution) => {
            updateNodeData(id, { size: resolution as ImageSize });
          }
          }
          onAspectRatioChange={(aspectRatio) => {
            updateNodeData(id, { requestAspectRatio: aspectRatio });
          }
          }
          extraParams={nodeData.extraParams}
          onExtraParamChange={(key, value) =>
            updateNodeData(id, {
              extraParams: {
                ...(nodeData.extraParams ?? {}),
                [key]: value,
              },
            })
          }
          showWebSearchToggle={showWebSearchToggle}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={(enabled) =>
            updateNodeData(id, {
              extraParams: {
                ...(nodeData.extraParams ?? {}),
                enable_web_search: enabled,
              },
            })
          }
          triggerSize="sm"
          chipClassName={NODE_CONTROL_CHIP_CLASS}
          modelChipClassName={NODE_CONTROL_MODEL_CHIP_CLASS}
          paramsChipClassName={NODE_CONTROL_PARAMS_CHIP_CLASS}
        />

        <div className="ml-auto" />

        <UiButton
          onClick={(event) => {
            event.stopPropagation();
            void handleGenerate(false);
          }}
          variant="primary"
          className={`shrink-0 ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
        >
          <Sparkles className={NODE_CONTROL_ICON_CLASS} strokeWidth={2.8} />
          <span className="truncate">{t('canvas.generate')}</span>
        </UiButton>
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

      {error && <div className="mb-1.5 shrink-0 text-[10px] text-red-400">{error}</div>}

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
        minWidth={STORYBOARD_GEN_NODE_MIN_WIDTH}
        minHeight={STORYBOARD_GEN_NODE_MIN_HEIGHT}
        maxWidth={STORYBOARD_GEN_NODE_MAX_WIDTH}
        maxHeight={STORYBOARD_GEN_NODE_MAX_HEIGHT}
      />
    </div>
  );
});

StoryboardGenNode.displayName = 'StoryboardGenNode';
