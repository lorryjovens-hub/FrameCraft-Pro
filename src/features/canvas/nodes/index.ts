import type { NodeTypes } from '@xyflow/react';

import { ExportVideoNode } from './ExportVideoNode';
import { GroupNode } from './GroupNode';
import { ImageEditNode } from './ImageEditNode';
import { ImageNode } from './ImageNode';
import { StoryboardGenNode } from './StoryboardGenNode';
import { StoryboardNode } from './StoryboardNode';
import { TextAnnotationNode } from './TextAnnotationNode';
import { UploadNode } from './UploadNode';
import { VideoGenNode } from './VideoGenNode';

export const nodeTypes: NodeTypes = {
  exportImageNode: ImageNode,
  exportVideoNode: ExportVideoNode,
  groupNode: GroupNode,
  imageNode: ImageEditNode,
  storyboardGenNode: StoryboardGenNode,
  storyboardNode: StoryboardNode,
  textAnnotationNode: TextAnnotationNode,
  uploadNode: UploadNode,
  videoGenNode: VideoGenNode,
};

export { ExportVideoNode, GroupNode, ImageEditNode, ImageNode, StoryboardGenNode, StoryboardNode, TextAnnotationNode, UploadNode, VideoGenNode };
