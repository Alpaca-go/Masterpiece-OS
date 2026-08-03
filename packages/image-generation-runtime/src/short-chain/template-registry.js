export const SHORT_CHAIN_TEMPLATE_REGISTRY_VERSION = '2.1.0';
const MODELS = ['seedream-5.0-pro'];

function template(value) {
  return Object.freeze({
    version: '1.0.0',
    requiredFields: [],
    forbiddenInheritanceFields: [],
    ...value,
    appliesTo: { models: MODELS, ...value.appliesTo },
  });
}

const FAMILY_TEMPLATES = [
  template({
    id: 'family.space',
    kind: 'family',
    deliverableFamily: 'space',
    requiredFields: ['subtype', 'shot', 'aspectRatio'],
    forbiddenInheritanceFields: ['viApplications', 'posterLayout', 'packagingArtwork'],
    sections: {
      definition: [
        'Generate a real, enterable, dimensionally credible architectural space, not a flat graphic-design presentation.',
        'The image must clearly establish floor, walls, ceiling, circulation, functional zones, and human scale.',
      ],
      professionalRequirements: [
        'Translate brand identity into spatial material, proportion, detail, and environmental graphics; do not display a collection of VI mockups.',
        'Material junctions, furniture scale, lighting installation, and circulation must be buildable.',
        'Build foreground, middle ground, and background as one continuous scene with a legible arrival sequence and unobstructed circulation.',
        'Use brand motifs as abstract spatial behavior, never as a literal oversized icon, repeated wallpaper, or decorative prop.',
      ],
      realism: [
        'Commercial architectural photography realism with physically credible material, light, shadow, scale, lens perspective, and construction detail.',
        'The result must read as one finished photograph of a real place, never as a design-process artifact.',
      ],
      negative: [
        'VI display board',
        'brand guideline page',
        'material board',
        'moodboard',
        'concept layout board',
        'stationery mockup',
        'collage',
        'split-screen comparison',
        'floating product plinth unrelated to the requested function',
      ],
    },
  }),
  template({
    id: 'family.packaging',
    kind: 'family',
    deliverableFamily: 'packaging',
    requiredFields: ['subtype', 'shot', 'aspectRatio'],
    forbiddenInheritanceFields: ['spatialScene', 'posterLayout', 'randomViApplications'],
    sections: {
      definition: [
        'Generate a physically credible packaging product render with an unambiguous construction and use.',
        'Show the package as a three-dimensional manufactured object, not loose artwork pasted onto undefined paper.',
      ],
      professionalRequirements: [
        'Make opening logic, folds, edges, thickness, inserts, material, and finishing processes physically coherent.',
        'Apply brand identity to appropriate structural surfaces while preserving confirmed package structures.',
      ],
      realism: ['High-end product photography with credible contact shadows, surface response, edge detail, and production tolerances.'],
      negative: ['flat dieline only', 'unidentified paper sheet', 'VI presentation board', 'moodboard', 'impossible package construction'],
    },
  }),
  template({
    id: 'family.vi',
    kind: 'family',
    deliverableFamily: 'vi',
    requiredFields: ['subtype', 'shot', 'aspectRatio'],
    forbiddenInheritanceFields: ['spatialScene', 'packagingStructure', 'posterMessage'],
    sections: {
      definition: [
        'Generate the explicitly requested brand application object only; do not invent a random VI collection.',
        'The selected material must be recognizable, usable, and shown at a credible physical scale.',
      ],
      professionalRequirements: [
        'Respect logo clear space, legibility, print or fabrication constraints, and the real application surface.',
      ],
      realism: ['Commercial application mockup realism with restrained supporting props and accurate object geometry.'],
      negative: ['random stationery set', 'brand guideline spread', 'unrequested object family', 'moodboard'],
    },
  }),
  template({
    id: 'family.poster',
    kind: 'family',
    deliverableFamily: 'poster',
    requiredFields: ['subtype', 'shot', 'aspectRatio'],
    forbiddenInheritanceFields: ['spatialScene', 'packageConstruction', 'randomViApplications'],
    sections: {
      definition: [
        'Generate one finished communication poster with a clear subject, message hierarchy, and publication intent.',
        'When reliable text rendering is not required, create a text-free key visual with deliberate typography-safe areas.',
      ],
      professionalRequirements: [
        'The composition must function as a formal campaign image rather than a portfolio board or design-process presentation.',
      ],
      realism: ['Publication-ready key-visual finish with controlled hierarchy, edges, depth, and color reproduction.'],
      negative: ['moodboard', 'portfolio case-study board', 'packaging lineup board', 'process annotations', 'random mockup collection'],
    },
  }),
];

const SUBTYPES = {
  space: {
    reception: ['Include a usable reception desk, visitor pause area, and clear relationship to circulation or back-of-house.'],
    lobby: ['Establish a public main space with arrival, waiting, orientation, and circulation functions.'],
    exhibition: ['Create a navigable display area with exhibit hierarchy, viewing distance, and coherent visitor flow.'],
    storefront: ['Show a complete exterior entrance, facade boundary, signage position, threshold, and street relationship.'],
    interior_panorama: ['Show a coherent interior overview connecting multiple functional zones without collapsing scale.'],
    counter: ['Show a usable service or cashier counter, queuing logic, equipment zones, and staff/customer sides.'],
  },
  packaging: {
    lid_and_base_box: ['Show a true two-piece lid-and-base box with credible overlap, wall thickness, and opening relationship.'],
    drawer_box: ['Show a sleeve-and-drawer structure with a credible pull direction, reveal, and internal tray.'],
    paper_bag: ['Show a manufactured carrier bag with gussets, base construction, handles, folds, and load-bearing proportions.'],
    small_carton: ['Show a compact folding carton with credible panels, closure, edge folds, and product scale.'],
    gift_set: ['Show a coordinated gift-box set with outer structure, internal organization, and consistent hierarchy.'],
    single_product_display: ['Show one packaged product as the hero object with clear structure and restrained supporting context.'],
  },
  vi: {
    business_card: ['Show a specific business card with credible dimensions, paper stock, edges, and print finish.'],
    letterhead_folder: ['Show only the requested letterhead and/or folder system with realistic paper and binding behavior.'],
    carrier_bag: ['Show a brand carrier bag application with credible bag construction, handles, and print placement.'],
    badge: ['Show a wearable staff badge with fastening, material thickness, legibility, and human scale.'],
    cup: ['Show a specific cup application with credible vessel shape, lid or rim, print area, and handling scale.'],
    wayfinding_sign: ['Show a functional wayfinding sign with mounting, viewing distance, direction hierarchy, and environment context.'],
    sticker_label: ['Show a specific sticker or label with credible substrate, adhesive edge, scale, and application surface.'],
    sign_lightbox: ['Show a fabricated sign or lightbox with mounting, depth, illumination, and legible brand placement.'],
  },
  poster: {
    brand_key_visual: ['Create a brand-level key visual whose primary job is long-term brand recognition.'],
    product_promotion: ['Create a product-led communication poster with a clear hero product and benefit hierarchy.'],
    event: ['Create an event poster with a clear focal idea and reserved hierarchy for event information.'],
    recruitment: ['Create a recruitment or partnership poster with persuasive commercial focus and clear information zones.'],
    concept: ['Create a concept poster with one disciplined visual proposition and publication-ready composition.'],
  },
};

const SHOTS = {
  space: {
    front: ['Use a near-frontal architectural view with controlled symmetry and legible functional depth.'],
    three_quarter_wide: ['Use a three-quarter wide architectural view with natural perspective and complete spatial depth.'],
    entrance_view: ['View from or near the entrance and explain threshold, arrival sequence, primary function, and circulation.'],
    detail_closeup: ['Use a close spatial detail while retaining enough context to explain material junction and function.'],
    entrance_three_quarter_wide: ['View from near the entrance in a three-quarter wide angle, showing the main function, boundaries, foreground/background, and circulation.'],
  },
  packaging: {
    'PKG-HERO-SINGLE': [
      'Compose exactly one complete packaged product as the hero object; do not turn supporting props into additional products.',
      'Use a commercial three-quarter product view that clearly proves the primary face, side depth, structure, substrate and finish.',
      'Keep the object fully visible with controlled contact shadow, purposeful negative space and no cropped structural edge.',
    ],
    three_quarter_hero: ['Use a three-quarter hero angle that clearly explains front, side, depth, and construction.'],
    top_down: ['Use a true top-down composition that preserves package geometry and opening relationships.'],
    open_box: ['Show the package open with a physically credible lid, drawer, insert, hinge, or closure state.'],
    set_display: ['Show the requested set as an ordered family with clear scale and hierarchy, not an unrelated prop collection.'],
  },
  vi: {
    front: ['Use a clear front-facing application view optimized for legibility and proportion.'],
    three_quarter: ['Use a restrained three-quarter product view that explains object depth and application surface.'],
    detail: ['Use a close material/detail view while keeping the requested VI object recognizable.'],
    in_context: ['Show the single requested application in a minimal real-use context without adding unrequested VI items.'],
  },
  poster: {
    subject_centered: ['Use a strong centered subject with controlled hierarchy and intentional information-safe areas.'],
    text_left_visual_right: ['Reserve a clear left information zone and place the main visual emphasis on the right.'],
    text_right_visual_left: ['Reserve a clear right information zone and place the main visual emphasis on the left.'],
    scene_led: ['Let one coherent scene carry the message while retaining deliberate publication hierarchy.'],
  },
};

const subtypeTemplates = Object.entries(SUBTYPES).flatMap(([family, entries]) =>
  Object.entries(entries).map(([id, requirements]) => template({
    id: `subtype.${family}.${id}`,
    kind: 'subtype',
    deliverableFamily: family,
    appliesTo: { subtypes: [id] },
    requiredFields: ['currentInstruction'],
    sections: {
      professionalRequirements: requirements,
      negative: family === 'vi' ? ['additional unrequested VI materials'] : [],
    },
  })));

const shotTemplates = Object.entries(SHOTS).flatMap(([family, entries]) =>
  Object.entries(entries).map(([id, composition]) => template({
    id: `shot.${family}.${id}`,
    kind: 'shot',
    deliverableFamily: family,
    appliesTo: { shots: [id] },
    requiredFields: ['aspectRatio'],
    sections: {
      composition,
      negative: family === 'space'
        ? ['fisheye distortion', 'axonometric diagram', 'floor plan', 'space without depth']
        : [],
    },
  })));

const TEMPLATES = Object.freeze([
  ...FAMILY_TEMPLATES,
  ...subtypeTemplates,
  ...shotTemplates,
]);

export function listShortChainTemplates() {
  return TEMPLATES.map((item) => structuredClone(item));
}

export function getShortChainTemplate(id) {
  const found = TEMPLATES.find((candidate) => candidate.id === id);
  return found ? structuredClone(found) : null;
}

export function listShortChainTemplateOptions() {
  const result = {};
  for (const family of Object.keys(SUBTYPES)) {
    result[family] = {
      subtypes: Object.keys(SUBTYPES[family]),
      shots: Object.keys(SHOTS[family]),
    };
  }
  return structuredClone(result);
}
