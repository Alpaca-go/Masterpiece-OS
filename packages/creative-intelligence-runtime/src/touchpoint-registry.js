import { stableFingerprint } from './evidence-ledger.js';

function route(deliverableFamily, subtype, shot) {
  return Object.freeze({ deliverableFamily, subtype, shot });
}

export const PRIMARY_TOUCHPOINT_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'food_beverage',
    industrySignals: ['餐饮', 'restaurant', 'food service', 'cafe', '咖啡'],
    touchpoints: Object.freeze([
      { id: 'storefront', label: '门店', aliases: ['门店', '店面', 'storefront'], taskRoute: route('space', 'storefront', 'entrance_three_quarter_wide') },
      { id: 'menu', label: '菜单', aliases: ['菜单', 'menu'], taskRoute: route('vi', 'letterhead_folder', 'front') },
      { id: 'delivery_packaging', label: '外卖包装', aliases: ['外卖包装', 'delivery packaging'], taskRoute: route('packaging', 'single_product_display', 'PKG-HERO-SINGLE') },
      { id: 'social_campaign', label: '社交传播', aliases: ['社交传播', 'social media'], taskRoute: route('poster', 'product_promotion', 'scene_led') }
    ])
  }),
  Object.freeze({
    id: 'consumer_packaging',
    industrySignals: ['消费包装', 'consumer goods', 'fmcg', '食品', 'beverage', '美妆产品'],
    touchpoints: Object.freeze([
      { id: 'packaging', label: '包装', aliases: ['包装', 'packaging'], taskRoute: route('packaging', 'single_product_display', 'PKG-HERO-SINGLE') },
      { id: 'shelf', label: '货架', aliases: ['货架', 'shelf'], taskRoute: route('packaging', 'single_product_display', 'PKG-SERIES-GROUP') },
      { id: 'ecommerce_hero', label: '电商首图', aliases: ['电商首图', 'ecommerce hero'], taskRoute: route('poster', 'product_promotion', 'subject_centered') },
      { id: 'detail_page', label: '详情页', aliases: ['详情页', 'product detail page'], taskRoute: route('poster', 'product_promotion', 'text_left_visual_right') },
      { id: 'unboxing', label: '开箱体验', aliases: ['开箱', 'unboxing'], taskRoute: route('packaging', 'gift_set', 'PKG-GIFT-OPEN') }
    ])
  }),
  Object.freeze({
    id: 'medical_aesthetics_platform',
    industrySignals: ['医美平台', 'medical aesthetics platform', '医疗美容平台'],
    touchpoints: Object.freeze([
      { id: 'institution_space', label: '机构空间', aliases: ['机构空间', 'clinic space'], taskRoute: route('space', 'reception', 'entrance_three_quarter_wide') },
      { id: 'partner_materials', label: '招商资料', aliases: ['招商资料', 'partnership materials'], taskRoute: route('poster', 'recruitment', 'text_left_visual_right') },
      { id: 'digital_interface', label: '数字界面', aliases: ['数字界面', 'digital interface'], taskRoute: null },
      { id: 'product_packaging', label: '产品包装', aliases: ['产品包装', 'product packaging'], taskRoute: route('packaging', 'single_product_display', 'PKG-HERO-SINGLE') },
      { id: 'exhibition_system', label: '展会系统', aliases: ['展会', 'exhibition'], taskRoute: route('space', 'exhibition', 'three_quarter_wide') }
    ])
  }),
  Object.freeze({
    id: 'technology_hardware',
    industrySignals: ['科技硬件', 'technology hardware', 'consumer electronics', '智能硬件'],
    touchpoints: Object.freeze([
      { id: 'product_body', label: '产品机身', aliases: ['产品机身', 'device body'], taskRoute: null },
      { id: 'packaging', label: '包装', aliases: ['包装', 'packaging'], taskRoute: route('packaging', 'single_product_display', 'PKG-HERO-SINGLE') },
      { id: 'website', label: '官网', aliases: ['官网', 'website'], taskRoute: null },
      { id: 'launch_event', label: '发布会', aliases: ['发布会', 'launch event'], taskRoute: route('poster', 'event', 'scene_led') },
      { id: 'sales_materials', label: '销售资料', aliases: ['销售资料', 'sales materials'], taskRoute: route('poster', 'product_promotion', 'text_left_visual_right') }
    ])
  })
]);

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US');
}

function claimsFor(truthModel, section, pathPrefix) {
  return (Array.isArray(truthModel?.[section]) ? truthModel[section] : [])
    .filter((claim) => claim.subjectPath === pathPrefix || claim.subjectPath.startsWith(`${pathPrefix}.`));
}

function findRegistry(industry, registry) {
  const normalized = normalize(industry);
  return registry.find((entry) => entry.industrySignals.some((signal) => {
    const token = normalize(signal);
    return normalized === token || normalized.includes(token);
  })) || null;
}

function findTouchpoint(label, registryEntry) {
  const normalized = normalize(label);
  return registryEntry?.touchpoints.find((item) => item.aliases.some((alias) => {
    const token = normalize(alias);
    return normalized === token || normalized.includes(token);
  })) || null;
}

export function resolvePrimaryTouchpoints(truthModel, { registry = PRIMARY_TOUCHPOINT_REGISTRY } = {}) {
  const industries = claimsFor(truthModel, 'brandFacts', 'brandFacts.industry');
  const explicit = claimsFor(truthModel, 'businessGoals', 'businessGoals.requiredTouchpoints');
  const matchedRegistry = industries.map((claim) => ({ claim, entry: findRegistry(claim.content, registry) })).find((item) => item.entry) || null;
  const selected = [];
  if (explicit.length) {
    for (const claim of explicit) {
      const registered = findTouchpoint(claim.content, matchedRegistry?.entry);
      selected.push({
        id: registered?.id || `custom-${stableFingerprint(claim.content).slice(0, 10)}`,
        label: claim.content,
        selectionSource: 'explicit',
        industryRegistryId: matchedRegistry?.entry.id || null,
        taskRoute: registered?.taskRoute || null,
        routeStatus: registered?.taskRoute ? 'routable' : 'unmapped',
        evidenceRefs: claim.evidenceRefs
      });
    }
  } else if (matchedRegistry) {
    for (const touchpoint of matchedRegistry.entry.touchpoints) {
      selected.push({
        id: touchpoint.id,
        label: touchpoint.label,
        selectionSource: 'industry_registry',
        industryRegistryId: matchedRegistry.entry.id,
        taskRoute: touchpoint.taskRoute,
        routeStatus: touchpoint.taskRoute ? 'routable' : 'unmapped',
        evidenceRefs: matchedRegistry.claim.evidenceRefs
      });
    }
  }
  return {
    schemaVersion: '1.0',
    projectId: truthModel.projectId,
    registryVersion: '1.0.0',
    matchedIndustryRegistryId: matchedRegistry?.entry.id || null,
    sourcePolicy: explicit.length ? 'explicit_project_touchpoints' : matchedRegistry ? 'industry_registry' : 'no_default',
    touchpoints: selected,
    unresolved: selected.filter((item) => item.routeStatus === 'unmapped').map((item) => item.id)
  };
}
