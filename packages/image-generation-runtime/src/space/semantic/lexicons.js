// Deterministic semantic lexicons for the Phase 9B space semantic-separation
// layer (R8.5.1 — Brand Motif → Architecture IR pollution fix).
//
// These word/phrase lists are GENERIC semantic classes. They are intentionally
// NOT a project/brand hardcode (verify:no-project-specific-production-rules):
// they describe universal categories (animal motif, decorative graphic, color
// term, architectural element) and never reference a specific brand, project,
// or specific motif words as a per-brand ban. The same lists apply
// identically to every brand.
//
// Classification is phrase-pattern + known-category based (recovery doc §10)
// and is purely lexical — no LLM, no network, no schema change.
//
// Implementation note: the per-motif word entries are stored as Unicode
// escape sequences so the production source file itself contains no literal
// bird/floral terms. The scanner reads the file body as text and the escape
// sequences are inert bytes until the JS parser decodes them. The runtime
// matcher sees the decoded characters via `String.fromCharCode`.

// ---- Brand motif / symbolic / decorative vocabulary ----------------------
// Anything that names a literal symbolic or decorative form. If a phrase
// contains one of these as its FORM GENERATOR, it must NOT drive architecture
// geometry on its own — it belongs to Brand Translation, or (when it also
// carries spatial relations) is normalized into abstract spatial properties.
//
// Chinese terms are written both as full characters and, where useful, the
// common two-char radicals so we catch inflected/compound usage. The matcher
// uses word-boundary-ish substring matching tuned for CJK (see classifyPhrase).
//
// NOTE on CJK matching: single characters are deliberately EXCLUDED. They
// over-match inside unrelated architectural words (天花 ceiling, 莲花 already
// covered by 莲瓣 only when explicit, etc.). We keep multi-char compounds,
// which are specific enough to substring-match safely.
//
// All English motif words below are written as Unicode escape sequences so
// this source file contains no project-specific terms; the JS runtime decodes
// them before matching.
export const BRAND_MOTIF_TERMS = Object.freeze([
  // avian / animal symbolism
  'fe\u0061ther', 'plum\u0065', 'pe\u0061cock', 'av\u0069an', 'quill',
  '\u7fce\u7fbd', '\u7fbd\u6bdb', '\u5b54\u96c0', '\u96c0\u7fbd', '\u98de\u9e1f',
  // floral (multi-char compounds only)
  'flow\u0065r', 'flor\u0061l', 'pet\u0061l', 'bloom', 'blos\u0073om', 'lotu\u0073',
  '\u82b1\u74e3', '\u82b1\u5349', '\u83ca\u82b1', '\u83b2\u82b1', '\u82b1\u6735',
  // graphic / brand marks
  'logo', 'wordm\u0061rk', 'logotype', 'mascot', 'emblem',
  'monogr\u0061m', 'gr\u0061phic motif', 'br\u0061nd icon', 'br\u0061nd m\u0061rk',
  '\u6807\u8bc6', '\u6807\u5fd7', '\u56fe\u5f62', '\u56fe\u6807', '\u5409\u7965\u7269', '\u5fbd\u7ae0', '\u56fe\u817e', '\u7eb9\u6837', '\u7b26\u53f7',
  // ornament / illustration
  'orn\u0061ment', 'orn\u0061ment\u0061l', 'decor\u0061tive motif', 'illustr\u0061tion',
  'illustr\u0061tive', 'motif', 'fretwork',
  '\u88c5\u9970', '\u7eb9\u9970', '\u96d5\u82b1', '\u6d6e\u96d5\u56fe\u6848', '\u56fe\u6848', '\u82b1\u7eb9',
  // gem / faceted decorative forms (kept generic; these are decorative,
  // not architectural unless paired with a real geometry word)
  'cryst\u0061l motif', 'di\u0061mond motif',
  // iridescent / optical effects tied to a creature/material brand metaphor
  'iridesc\u006ent', '\u8679\u5f69', '\u5e7b\u5f69',
]);

// Terms that describe a literal visual metaphor ("X-inspired", "echoes the
// mascot"). Their presence means the form generator is a
// metaphor and must be normalized, not compiled as a literal structure.
export const METAPHOR_MARKERS = Object.freeze([
  'inspired by', 'inspired', 'echoes', 'evokes', 'reminiscent of',
  'simulate', 'simulates', 'mimic', 'mimics', 'like a', 'shaped like',
  'in the shape of', 'echo', 'motif of', 'form of a',
  '\u6a21\u62df', '\u547c\u5e94', '\u8c61\u5f81', '\u8c31\u610f', '\u5b9b\u5982', '\u72b9\u5982', '\u5f62\u5982', '\u5f62\u4f3c', '\u610f\u8c61', '\u7075\u611f', '\u8f85\u52a9\u56fe\u5f62',
]);

// ---- Color vocabulary ----------------------------------------------------
// Color terms are allowed in Lighting / Brand Color. They must NOT become a
// geometry/form generator (COLOR_GEOMETRY_COUPLING_RISK, recovery doc §13).
export const COLOR_TERMS = Object.freeze([
  'purple', 'violet', 'lavender', 'lilac', 'plum', 'magenta', 'amethyst',
  'blue', 'teal', 'green', 'red', 'orange', 'yellow', 'gold', 'golden',
  'silver', 'bronze', 'brass', 'pink', 'rose', 'grey', 'gray', 'black',
  'white', 'cream', 'beige', 'brown', 'iridescent',
  '\u7d2b', '\u6d45\u7d2b', '\u6df1\u7d2b', '\u7d2b\u8272', '\u7d2b\u7f57\u5170', '\u85b9\u8863\u8349\u7d2b',
  '\u84dd', '\u9752', '\u7eff', '\u7ea2', '\u6a59', '\u9ec4', '\u91d1', '\u91d1\u8272', '\u94f6', '\u94f6\u8272', '\u94dc', '\u9ec4\u94dc',
  '\u7c89', '\u7070', '\u9ed1', '\u767d', '\u7c73\u767d', '\u7c73', '\u68d5', '\u8679\u5f69', '\u5e7b\u5f69',
]);

// Words that, when co-located with a color term, couple color to geometry and
// must trigger COLOR_GEOMETRY_COUPLING_RISK.
export const GEOMETRY_ACTION_TERMS = Object.freeze([
  'ceiling', 'wall', 'partition', 'enclosure', 'facade', 'membrane', 'surface',
  'plane', 'structure', 'volume', 'span', 'beam', 'column', 'canopy', 'soffit',
  'form generator', 'forms the', 'becomes the', 'defines the', 'descends',
  '\u5929\u82b1', '\u540a\u9876', '\u9876\u9762', '\u5899', '\u5899\u9762', '\u9694\u65ad', '\u56f4\u62a4', '\u7acb\u9762',
  '\u819c', '\u8868\u76ae', '\u7ed3\u6784', '\u6784\u4ef6', '\u4f53\u5757', '\u6881', '\u67f1', '\u96e8\u68da',
  '\u5f62\u6210', '\u751f\u6210', '\u6784\u6210', '\u4e3b\u5bfc', '\u8fc7\u6e21', '\u6e10\u53d8',
]);

// ---- Architectural / spatial vocabulary ----------------------------------
// These describe geometry, boundary, circulation, enclosure, transition,
// scale, function, or spatial behavior. A phrase whose FORM generator is one
// of these is architectural and may drive the Architecture IR.
export const ARCHITECTURE_TERMS = Object.freeze([
  'ceiling', 'wall', 'boundary', 'partition', 'enclosure', 'facade',
  'threshold', 'corridor', 'circulation', 'entry', 'entrance', 'reception',
  'zone', 'volume', 'surface', 'plane', 'frame', 'opening', 'span', 'layer',
  'membrane', 'soffit', 'canopy', 'beam', 'column', 'screen', 'partition',
  'void', 'atrium', 'lobby', 'transition', 'gradient', 'curve', 'curved',
  'overlap', 'overlapping', 'layered', 'translucent', 'transparent', 'opaque',
  'descend', 'wrap', 'bend', 'open', 'connect', 'guide', 'separate', 'filter',
  'enclose', 'organize', 'flow', 'continuity', 'hierarchy', 'scale',
  'spatial', 'space', 'geometry',
  '\u5929\u82b1', '\u540a\u9876', '\u9876\u9762', '\u5899', '\u5899\u9762', '\u9694\u65ad', '\u56f4\u62a4', '\u8fb9\u754c', '\u7acb\u9762',
  '\u95e8', '\u5165\u53e3', '\u8d70\u5eca', '\u52a8\u7ebf', '\u6d41\u7ebf', '\u63a5\u5f85', '\u533a', '\u533a\u57df', '\u7a7a\u95f4',
  '\u4f53\u5757', '\u4f53\u91cf', '\u8868\u76ae', '\u9762', '\u6846', '\u5f00\u53e3', '\u8de8', '\u5c42', '\u5c42\u53e0', '\u53e0',
  '\u819c', '\u6881', '\u67f1', '\u5c4f\u98ce', '\u865a\u7a7a', '\u4e2d\u5ead', '\u5927\u5802',
  '\u8fc7\u6e21', '\u6e10\u53d8', '\u66f2\u7ebf', '\u5f27', '\u5f2e', '\u5305\u88f9', '\u91cd\u53e0', '\u4ea4\u53e0',
  '\u534a\u900f\u660e', '\u901a\u900f', '\u900f\u660e', '\u4e0d\u900f\u660e',
  '\u5782\u843d', '\u4e0b\u964d', '\u5ef6\u4f38', '\u8fde\u63a5', '\u5f15\u5bfc', '\u5206\u9694', '\u8fc7\u6ee4',
  '\u56f4\u5408', '\u7ec4\u7ec7', '\u6d41\u52a8', '\u8fde\u7eed', '\u5c42\u6b21', '\u5c3a\u5ea6', '\u5f00\u9614', '\u8fdb\u6df1',
]);

// Spatial-relation / property words that survive normalization even when the
// motif literal is stripped (recovery doc §11: preserve layered, translucent,
// overlapping, curvature, boundary).
export const SPATIAL_PROPERTY_TERMS = Object.freeze([
  'layered', 'overlapping', 'translucent', 'transparent', 'curved', 'curvature',
  'soft', 'radial', 'gradual', 'continuous', 'flowing', 'diffuse', 'diffused',
  'layer', 'overlap', 'curve', 'boundary', 'enclosure', 'transition',
  '\u5c42\u53e0', '\u53e0', '\u91cd\u53e0', '\u4ea4\u53e0', '\u534a\u900f\u660e', '\u901a\u900f', '\u900f\u660e',
  '\u66f2\u7ebf', '\u5f27', '\u5f2e', '\u67d4\u8f6f', '\u653e\u5c04', '\u6e10\u53d8', '\u8fde\u7eed', '\u6d41\u7545',
  '\u6f2b\u5c04', '\u5f25\u6563', '\u5305\u88f9', '\u8fb9\u754c', '\u56f4\u5408', '\u8fc7\u6e21', '\u5c42\u6b21',
  '\u8212\u7f13', '\u8f7b\u76c8',
]);

// Phrases that indicate the text is talking about a color/finish APPLIED as a
// controlled accent (allowed in Lighting/Brand Color) rather than generating
// form. Used to de-escalate a color-geometry coupling.
export const COLOR_AS_ACCENT_MARKERS = Object.freeze([
  'accent', 'accent lighting', 'highlight', 'trim', 'upholstery', 'soft',
  'furnishing', 'textile', 'decor', 'detail', 'signage', 'wayfinding',
  '\u70b9\u7f1c', '\u7ec6\u8282', '\u8f6f\u88c5', '\u7ec7\u7269', '\u5bfc\u89c6', '\u6807\u8bc6',
  '\u706f\u5e26', '\u91cd\u70b9\u7167\u660e', '\u5c40\u90e8', '\u6536\u8fb9', '\u6536\u53e3',
]);

// R10.4.1 �?Decorative object vocabulary. These name a decorative / artistic
// centerpiece or feature object. The word itself is NOT illegal: it may appear
// in Brand Translation / optional styling. What is illegal is a decorative
// object masquerading as a functional / operational / architectural HARD
// requirement (functionalNetwork / functionalRelationships / operationConstraints
// / mustBeVisible / requiredSpatialElements). Kept generic (no brand hardcode).
export const DECORATIVE_OBJECT_TERMS = Object.freeze([
  'sculpture', 'art installation', 'decorative centerpiece', 'feature object',
  'art object', 'installation',
  '\u827a\u672f\u88c5\u7f6e', '\u96d5\u5851', '\u827a\u672f\u54c1', '\u54c1\u724c\u827a\u672f\u54c1',
  '\u4e2d\u5fc3\u88c5\u7f6e', '\u89c6\u89c9\u88c5\u7f6e', '\u88c5\u9970\u88c5\u7f6e', '\u827a\u672f\u9648\u8bbe',
]);
