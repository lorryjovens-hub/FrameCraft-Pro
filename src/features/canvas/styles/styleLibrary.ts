export interface StyleCategory {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  styles: StyleItem[];
}

export interface StyleItem {
  id: string;
  name: string;
  prompt: string;
  thumbnail?: string;
  tags?: string[];
}

export const STYLE_CATEGORIES: StyleCategory[] = [
  {
    id: 'e-commerce',
    name: '电商场景',
    nameEn: 'E-Commerce',
    description: '适用于电商平台的商品展示场景',
    styles: [
      {
        id: 'product-render',
        name: '产品渲染',
        prompt: '专业产品渲染，干净白色背景，光影分明，产品细节清晰展现，商业摄影风格',
        tags: ['产品', '渲染', '商业'],
      },
      {
        id: 'detail-page',
        name: '电商详情页',
        prompt: '电商详情页风格，专业灯光，产品突出，背景简洁，清晰的视觉焦点',
        tags: ['电商', '详情页', '商业'],
      },
      {
        id: 'lifestyle',
        name: '生活场景',
        prompt: '生活场景展示，自然光线，环境氛围，产品融入生活场景，温馨自然',
        tags: ['生活', '场景', '自然'],
      },
      {
        id: 'hero-shot',
        name: '主图风格',
        prompt: '电商主图风格，高质感，大光圈浅景深，产品突出，视觉冲击力强',
        tags: ['主图', '大图', '吸睛'],
      },
      {
        id: 'flat-lay',
        name: '平铺拍摄',
        prompt: '平铺拍摄风格，俯视角度，简洁背景，产品整齐排列，时尚杂志感',
        tags: ['平铺', '俯视', '时尚'],
      },
      {
        id: 'close-up',
        name: '特写镜头',
        prompt: '产品特写镜头，微距摄影，高清细节，纹理展现，专业光影',
        tags: ['特写', '微距', '细节'],
      },
    ],
  },
  {
    id: 'style-render',
    name: '风格渲染',
    nameEn: 'Style Render',
    description: '各种创意风格渲染效果',
    styles: [
      {
        id: 'clean-bg',
        name: '干净背景',
        prompt: '干净简洁背景，纯色或渐变，无干扰元素，产品清晰突出',
        tags: ['干净', '简洁', '纯色'],
      },
      {
        id: 'studio-light',
        name: '专业影棚',
        prompt: '专业摄影棚灯光，侧光或蝴蝶光，光影立体，质感强烈，商业级',
        tags: ['影棚', '专业', '立体'],
      },
      {
        id: 'neon-glow',
        name: '霓虹光效',
        prompt: '霓虹灯光效果，炫彩光线，赛博朋克风格，科幻未来感',
        tags: ['霓虹', '炫彩', '赛博朋克'],
      },
      {
        id: 'soft-light',
        name: '柔和灯光',
        prompt: '柔和自然光线，散射光，温柔氛围，清新淡雅',
        tags: ['柔和', '自然', '清新'],
      },
      {
        id: 'dramatic',
        name: '戏剧光影',
        prompt: '戏剧性光影对比，强光束，戏剧效果，高对比度，艺术感',
        tags: ['戏剧', '对比', '艺术'],
      },
      {
        id: 'golden-hour',
        name: '黄金时刻',
        prompt: '黄金时段阳光，暖色调，夕阳余晖，浪漫氛围，温暖质感',
        tags: ['黄金', '暖色', '夕阳'],
      },
      {
        id: 'minimalist',
        name: '极简主义',
        prompt: '极简主义设计，大量留白，简洁构图，高级感',
        tags: ['极简', '留白', '高级'],
      },
      {
        id: 'vintage',
        name: '复古风格',
        prompt: '复古胶片质感，暖色调，颗粒感，怀旧氛围',
        tags: ['复古', '胶片', '怀旧'],
      },
    ],
  },
  {
    id: 'graphic-design',
    name: '平面设计',
    nameEn: 'Graphic Design',
    description: '平面设计风格创意',
    styles: [
      {
        id: 'poster',
        name: '海报设计',
        prompt: '海报设计风格，大标题，视觉冲击，信息清晰，排版精美',
        tags: ['海报', '排版', '信息'],
      },
      {
        id: 'magazine',
        name: '杂志封面',
        prompt: '时尚杂志封面风格，高端大气，专业模特，光影杂志感',
        tags: ['杂志', '时尚', '高端'],
      },
      {
        id: 'typography',
        name: '字体设计',
        prompt: '创意字体设计，文字与产品结合，独特排版，艺术感',
        tags: ['字体', '创意', '艺术'],
      },
      {
        id: 'illustration',
        name: '插画风格',
        prompt: '商业插画风格，矢量图形，简洁线条，扁平化设计',
        tags: ['插画', '矢量', '扁平'],
      },
      {
        id: 'brand-identity',
        name: '品牌视觉',
        prompt: '品牌视觉识别系统，一致性色调，系统化设计，专业规范',
        tags: ['品牌', 'VI', '系统'],
      },
      {
        id: 'packaging',
        name: '包装设计',
        prompt: '产品包装设计效果，三维展示，材质感，立体效果',
        tags: ['包装', '材质', '立体'],
      },
    ],
  },
  {
    id: 'scene-render',
    name: '场景渲染',
    nameEn: 'Scene Render',
    description: '各种场景和环境渲染',
    styles: [
      {
        id: 'showroom',
        name: '展厅陈列',
        prompt: '展厅陈列效果，专业灯光，产品展示柜，高端大气',
        tags: ['展厅', '陈列', '高端'],
      },
      {
        id: 'outdoor',
        name: '户外场景',
        prompt: '户外自然场景，阳光明媚，环境优美，产品融入自然',
        tags: ['户外', '自然', '阳光'],
      },
      {
        id: 'office',
        name: '办公场景',
        prompt: '现代办公环境，专业商务，职场氛围，产品应用场景',
        tags: ['办公', '商务', '职场'],
      },
      {
        id: 'home',
        name: '家居场景',
        prompt: '现代家居环境，温馨舒适，生活气息，产品融入家居',
        tags: ['家居', '温馨', '生活'],
      },
      {
        id: 'studio-backdrop',
        name: '影棚背景',
        prompt: '专业影棚背景，多种背景布，灰色黑色白色，简洁专业',
        tags: ['影棚', '背景', '专业'],
      },
    ],
  },
  {
    id: 'creative',
    name: '创意特效',
    nameEn: 'Creative Effects',
    description: '各种创意特效和艺术处理',
    styles: [
      {
        id: 'smoke',
        name: '烟雾效果',
        prompt: '烟雾缭绕效果，云雾飘渺，神秘氛围，艺术感',
        tags: ['烟雾', '云雾', '神秘'],
      },
      {
        id: 'particle',
        name: '粒子特效',
        prompt: '粒子散落效果，光点飘散，科幻未来感，炫酷特效',
        tags: ['粒子', '光点', '科幻'],
      },
      {
        id: 'water',
        name: '水滴效果',
        prompt: '水滴溅射效果，水珠晶莹，动态感，清新自然',
        tags: ['水滴', '水珠', '清新'],
      },
      {
        id: 'fire',
        name: '火焰效果',
        prompt: '火焰燃烧效果，炽热光焰，动态强烈，视觉冲击',
        tags: ['火焰', '热力', '动态'],
      },
      {
        id: 'light-trail',
        name: '光轨效果',
        prompt: '光线轨迹效果，光束流动，延时摄影感，科幻炫酷',
        tags: ['光轨', '流动', '延时'],
      },
      {
        id: 'bokeh',
        name: '散景效果',
        prompt: '背景散景效果，焦外虚化，光斑点点，梦幻感',
        tags: ['散景', '虚化', '梦幻'],
      },
    ],
  },
];

export function getStyleById(categoryId: string, styleId: string): StyleItem | undefined {
  const category = STYLE_CATEGORIES.find(c => c.id === categoryId);
  return category?.styles.find(s => s.id === styleId);
}

export function getStylePrompt(categoryId: string, styleId: string): string {
  const style = getStyleById(categoryId, styleId);
  return style?.prompt ?? '';
}

export function getAllStyles(): StyleItem[] {
  return STYLE_CATEGORIES.flatMap(category => category.styles);
}

export function searchStyles(keyword: string): StyleItem[] {
  const lowerKeyword = keyword.toLowerCase();
  return getAllStyles().filter(
    style =>
      style.name.toLowerCase().includes(lowerKeyword) ||
      style.prompt.toLowerCase().includes(lowerKeyword) ||
      style.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))
  );
}
