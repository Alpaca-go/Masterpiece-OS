export const VNEXT_TEMPLATE_REGISTRY_VERSION = '1.0.0';

const TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'family.space',
    version: '1.0.0',
    kind: 'family',
    deliverableFamily: 'space',
    appliesTo: { models: ['seedream-5.0-pro'] },
    requiredFields: ['subtype', 'shot', 'aspectRatio'],
    forbiddenInheritanceFields: ['viApplications', 'posterLayout', 'packagingArtwork'],
    sections: {
      definition: [
        '生成一张真实、可进入、尺度可信的室内空间效果图，不是平面设计稿。',
        '画面必须明确呈现地面、墙体、吊顶、入口关系与功能分区。',
      ],
      professionalRequirements: [
        '品牌识别应转译为空间材料、比例、细部与环境图形，不得陈列为 VI 样机集合。',
        '材料连接、家具尺度、照明安装与动线必须具备可建造性。',
      ],
      realism: [
        '商业空间摄影级真实感，物理合理的材料、光线、阴影和空间尺度。',
      ],
      negative: [
        'VI 展示板',
        '品牌手册页面',
        '材质板',
        'moodboard',
        '概念排版板',
        '名片或信纸样机',
      ],
    },
  }),
  Object.freeze({
    id: 'subtype.space.reception',
    version: '1.0.0',
    kind: 'subtype',
    deliverableFamily: 'space',
    appliesTo: {
      subtypes: ['reception'],
      models: ['seedream-5.0-pro'],
    },
    requiredFields: ['currentInstruction'],
    forbiddenInheritanceFields: ['randomBrandCollateral'],
    sections: {
      professionalRequirements: [
        '前台/接待区必须包含清晰可用的接待台、访客停留区、后场或通行关系。',
        '品牌名称或标识只在合理的空间识别位置出现，不得铺满所有表面。',
      ],
      negative: ['空舞台', '纯装置艺术', '用途不明的展板'],
    },
  }),
  Object.freeze({
    id: 'shot.space.entrance_three_quarter_wide',
    version: '1.0.0',
    kind: 'shot',
    deliverableFamily: 'space',
    appliesTo: {
      shots: ['entrance_three_quarter_wide'],
      models: ['seedream-5.0-pro'],
    },
    requiredFields: ['aspectRatio'],
    forbiddenInheritanceFields: [],
    sections: {
      composition: [
        '从入口附近以三分之四广角观察，完整交代前台主体、入口边界、前后景和主要动线。',
        '保持自然透视和垂直线，避免超广角畸变、俯视平面图或正交剖面感。',
      ],
      negative: ['鱼眼畸变', '轴测图', '平面图', '无空间纵深'],
    },
  }),
]);

export function listVNextTemplates() {
  return TEMPLATES.map((template) => structuredClone(template));
}

export function getVNextTemplate(id) {
  const template = TEMPLATES.find((candidate) => candidate.id === id);
  return template ? structuredClone(template) : null;
}

