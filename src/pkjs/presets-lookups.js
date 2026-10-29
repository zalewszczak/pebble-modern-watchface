/**
 * presets-lookups.js -- every hand-curated, largely-static lookup table
 * config-page.js needs: font metadata, color scheme presets, the
 * corner/edge feature content catalogue (grouped into categories for
 * the picker, complete with each item's own live-preview text),
 * the starter hand-style presets, and the built-in marker presets
 * (None/Minimal/Braun/Swiss/Classy -- rings + numerals). Pulled out into its own plain
 * JS module -- real object/array literals, no string-concatenation
 * escaping -- specifically so these are easy to read and hand-edit
 * (add a font, retune a color preset, add a new feature id) without
 * hunting through buildConfigHtml()'s own giant HTML-template string.
 *
 * CORNER_CATEGORIES is the single source of truth for every corner/
 * edge feature content id: config-page.js derives both the flat,
 * id-ordered options list the hidden per-slot <select>s use (see
 * cornerContentOptionsHtml()) AND the categorized picker's own
 * grouped view from this one array, and pulls each item's live-
 * preview text from the same place its label lives. Previously these
 * were 3 independently hand-maintained lists (a flat id+label array,
 * a separate category-grouped id+label copy, and a separate id-
 * >preview-text map) that could -- and did -- drift apart: id 104
 * ("Current UV index") had a category entry and a real on-watch
 * renderer but no preview text, so it silently failed to draw in the
 * live preview/slot buttons until re-picked; a few other ids had
 * subtly different wording (even a plain typo, "Tinute") between the
 * flat and categorized copies. One array per id now makes that whole
 * class of bug structurally impossible: there's nowhere left for a
 * new id to be added to one list and forgotten in another.
 *
 * Every content id features_layer.c actually implements (0-115,
 * minus the retired id 33) must appear in exactly one category's
 * items list, with an id matching its case in draw_corner_item()'s
 * switch exactly.
 */

// One canonical font table, id-for-id identical to font_lookup.c's FONT_TABLE
// on the watch -- every font this app uses anywhere, custom-resource or
// system. The font pickers (marker text, corner/edge Feature text) draw their
// <option>s from this SAME list, so picking (for example) "Bebas" always
// means the same id and the same resource everywhere.
//
// Per-entry fields: `label`, `height` (px), `preview` (CSS used on the
// settings page), `small`/`grid` (picker grouping), `sizeCategory`
// (XS/S/M/L, feeds the picker's size filters), `categories` (tags shown in the
// picker; the filter row is FONT_CATEGORIES below -- 'all' is picker-only),
// `google`/`webfontFamily`/`webfontUrl` (where the settings page fetches a
// preview webfont from), and `resourceName`/`fileName`, which mirror
// FontLookupEntry.resource_name/file_name in font_lookup.c (FONT_KEY_* name
// for a system font, or the package.json media name/file for a custom one).
// The legacy `mainClock`/`sidesAllowed`/`sidesWithSeconds` flags only
// described the removed digital clock layouts and are ignored.

// IMPORTANT: For best results use js table editor located in scripts folder, copy contents of this table and parse it in there
var FONT_LOOKUP = [
  { id: 0 , grid: false, label: 'Gothic'             , height: 14, preview: 'font-family: Arial, sans-serif;'                                                                         , small: true , google: null                   , sizePx: 14, sizeCategory: 'XS', approx: true, categories: ['pebbleos', 'modern']                                      , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'FONT_KEY_GOTHIC_14'               , fileName: null                                       },                                                                                                                                                  // Pebble's built-in "Gothic" system font -- no Google Fonts equivalent by name; Arial/Helvetica is the closest common grotesque.
  { id: 1 , grid: false, label: 'Gothic'             , height: 18, preview: 'font-family: Arial, sans-serif; font-weight: 700;'                                                       , small: true , google: null                   , sizePx: 14, sizeCategory: 'S' , approx: true, categories: ['pebbleos', 'modern', 'bold']                              , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'FONT_KEY_GOTHIC_14_BOLD'          , fileName: null                                       },                                                                                                                                                  // see id 0
  { id: 2 , grid: false, label: 'Gothic'             , height: 24, preview: 'font-family: Arial, sans-serif; font-weight: 700;'                                                       , small: true , google: null                   , sizePx: 17, sizeCategory: 'S' , approx: true, categories: ['pebbleos', 'modern', 'bold']                              , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'FONT_KEY_GOTHIC_18_BOLD'          , fileName: null                                       },                                                                                                                                                  // see id 0
  { id: 3 , grid: true , label: 'Gothic'             , height: 32, preview: 'font-family: Arial, sans-serif; font-weight: 700;'                                                       , small: true , google: null                   , sizePx: 24, sizeCategory: 'M' , approx: true, categories: ['pebbleos', 'modern', 'bold']                              , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'FONT_KEY_GOTHIC_24_BOLD'          , fileName: null                                       },                                                                                                                                                  // see id 0
  { id: 4 , grid: true , label: 'Gothic'             , height: 36, preview: 'font-family: Arial, sans-serif; font-weight: 700;'                                                       , small: true , google: null                   , sizePx: 28, sizeCategory: 'M' , approx: true, categories: ['pebbleos', 'modern', 'bold']                              , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'FONT_KEY_GOTHIC_28_BOLD'          , fileName: null                                       },                                                                                                                                                  // see id 0
  { id: 5 , grid: true , label: 'Leco'               , height: 28, preview: 'font-family: \'LECO 1976-Regular\', Arial; font-weight: 300;'                                            , small: false, sizePx: 28, sizeCategory: 'M' , categories: ['pebbleos', 'digital', 'thin']                             , sidesAllowed: '2' , sidesWithSeconds: '2' , romanOk: true , resourceName: 'FONT_KEY_LECO_28_LIGHT_NUMBERS'   , fileName: null                                      , webfontFamily: 'LECO 1976-Regular', webfontUrl: 'https://static.wfonts.com/download/data/2016/05/28/leco-1976/LECO 1976-Regular.woff'   , webfontFormat: 'woff', mainClock: true  },
  { id: 6 , grid: true , label: 'Leco'               , height: 32, preview: 'font-family: \'LECO 1976-Regular\', Arial, sans-serif;'                                                  , small: false, sizePx: 32, sizeCategory: 'M' , categories: ['pebbleos', 'digital', 'bold']                             , sidesAllowed: 2   , sidesWithSeconds: '2' , romanOk: true , resourceName: 'FONT_KEY_LECO_32_BOLD_NUMBERS'    , fileName: null                                      , webfontFamily: 'LECO 1976-Regular', webfontUrl: 'https://static.wfonts.com/download/data/2016/05/28/leco-1976/LECO 1976-Regular.woff'   , webfontFormat: 'woff', mainClock: true  },
  { id: 7 , grid: true , label: 'Leco'               , height: 36, preview: 'font-family: \'LECO 1976-Regular\', Arial, sans-serif; font-weight: 700;'                                , small: false, sizePx: 36, sizeCategory: 'L' , categories: ['pebbleos', 'digital', 'bold']                             , sidesAllowed: 2   , sidesWithSeconds: '1' , romanOk: true , resourceName: 'FONT_KEY_LECO_36_BOLD_NUMBERS'    , fileName: null                                      , webfontFamily: 'LECO 1976-Regular', webfontUrl: 'https://static.wfonts.com/download/data/2016/05/28/leco-1976/LECO 1976-Regular.woff'   , webfontFormat: 'woff', mainClock: true  },
  { id: 8 , grid: true , label: 'Leco'               , height: 42, preview: 'font-family: \'LECO 1976-Regular\', Arial, sans-serif; font-weight: 700;'                                , small: false, sizePx: 42, sizeCategory: 'L' , categories: ['pebbleos', 'digital', 'bold']                             , sidesAllowed: 2   , sidesWithSeconds: '0' , romanOk: true , resourceName: 'FONT_KEY_LECO_42_NUMBERS'         , fileName: null                                      , webfontFamily: 'LECO 1976-Regular', webfontUrl: 'https://static.wfonts.com/download/data/2016/05/28/leco-1976/LECO 1976-Regular.woff'   , webfontFormat: 'woff', mainClock: true  },
  { id: 9 , grid: true , label: 'Droid Serif'        , height: 28, preview: 'font-family: \'Droid Serif\', Georgia, serif; font-weight: 700;'                                         , small: true , google: 'Droid Serif'          , sizePx: 28, sizeCategory: 'M' , categories: ['pebbleos', 'serif', 'bold']                               , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'FONT_KEY_DROID_SERIF_28_BOLD'     , fileName: null                                      , weight: 700 },                                                                                                                                                   // still genuinely on Google Fonts (legacy listing, but live)
  { id: 10, grid: false, label: 'Roboto Condensed'   , height: 21, preview: 'font-family: \'Roboto Condensed\', Arial, sans-serif;'                                                   , small: true , google: 'Roboto Condensed'     , sizePx: 21, sizeCategory: 'S' , categories: ['pebbleos', 'modern', 'narrow']                            , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'FONT_KEY_ROBOTO_CONDENSED_21'     , fileName: null                                      , weight: 400 },
  { id: 11, grid: false, label: 'Roboto'             , height: 49, preview: 'font-family: \'Roboto\', Arial, sans-serif; font-weight: 700;'                                           , small: false, google: 'Roboto'               , sizePx: 49, sizeCategory: 'L' , categories: ['pebbleos', 'modern', 'bold']                              , sidesAllowed: '1' , sidesWithSeconds: '0' , romanOk: false, resourceName: 'FONT_KEY_ROBOTO_BOLD_SUBSET_49'   , fileName: null                                      , mainClock: true , weight: 700 },
  { id: 12, grid: true , label: 'Bitham'             , height: 30, preview: 'font-family: \'Montserrat\', \'Century Gothic\', sans-serif; font-weight: 700;'                          , small: false, google: 'Montserrat'           , sizePx: 30, sizeCategory: 'M' , approx: true, categories: ['pebbleos', 'modern', 'bold']                              , sidesAllowed: 2   , sidesWithSeconds: '1' , romanOk: true , resourceName: 'FONT_KEY_BITHAM_30_BLACK'         , fileName: null                                      , mainClock: true , weight: 700 },
  { id: 13, grid: false, label: 'Bitham'             , height: 34, preview: 'font-family: \'Montserrat\', \'Century Gothic\', sans-serif; font-weight: 500;'                          , small: false, google: 'Montserrat'           , sizePx: 34, sizeCategory: 'M' , approx: true, categories: ['pebbleos', 'modern']                                      , sidesAllowed: 2   , sidesWithSeconds: '1' , romanOk: false, resourceName: 'FONT_KEY_BITHAM_34_MEDIUM_NUMBERS', fileName: null                                      , mainClock: true , weight: 500 },
  { id: 14, grid: true , label: 'Bitcount Grid'      , height: 18, preview: 'font-family: \'Bitcount Grid Double\', \'Courier New\', monospace;'                                      , small: true, google: 'Bitcount Grid Double' , sizePx: 18, sizeCategory: 'S' , categories: ['digital']                                                 , sidesAllowed: 2   , sidesWithSeconds: '0' , romanOk: true , resourceName: 'BITCOUNTGRID_FONT_18'             , fileName: 'fonts/BitcountGridDouble-Light.ttf'      , mainClock: false , weight: 300 },
  { id: 15, grid: true , label: 'Minecrafter'        , height: 12, preview: 'font-family: \'minecrafter_20\', \'Courier New\', monospace;'                                            , small: true , sizePx: 12, sizeCategory: 'XS', categories: ['pixelated', 'funky']                                      , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'MINECRAFTER_FONT_12'              , fileName: 'fonts/Minecrafter.ttf'                   , webfontFamily: 'minecrafter_20'   , webfontUrl: 'https://static.wfonts.com/download/data/2016/05/03/minecrafter-2-0/minecrafter_20.woff', webfontFormat: 'woff' },
  { id: 16, grid: false, label: 'Alagard'            , height: 19, preview: 'font-family: \'alagard\', \'Century Gothic\', sans-serif;'                                               , small: true , sizePx: 19, sizeCategory: 'S' , categories: ['pixelated', 'stylish']                                    , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'ALAGARD_FONT_19'                  , fileName: 'fonts/alagard.ttf'                       , webfontFamily: 'alagard'          , webfontUrl: 'https://static.wfonts.com/download/data/2014/06/10/alagard/alagard.woff'               , webfontFormat: 'woff', weight: 400 },
  { id: 17, grid: false, label: 'Bebas'              , height: 20, preview: 'font-family: \'Bebas Neue\', \'Century Gothic\', sans-serif; letter-spacing: 1px;'                       , small: true , google: 'Bebas Neue'           , sizePx: 20, sizeCategory: 'S' , categories: ['stylish', 'modern', 'narrow']                             , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'BEBAS_FONT_20'                    , fileName: 'fonts/BebasNeueBold.otf'                 , weight: 400 },
  { id: 18, grid: true , label: 'Bytesized'          , height: 16, preview: 'font-family: \'Bytesized\', Impact, \'Arial Narrow\', sans-serif; font-weight: 400;'                     , small: true , google: 'Bytesized'            , sizePx: 16, sizeCategory: 'XS', categories: ['pixelated']                                               , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'BYTESIZED_FONT_16'                , fileName: 'fonts/Bytesized-Regular.ttf'             , mainClock: false, weight: 400 },
  { id: 19, grid: true , label: 'M Plus 1C'          , height: 16, preview: 'font-family: \'M PLUS 1 Code\', Impact, \'Arial Narrow\', sans-serif; font-weight: 700;'                 , small: true , google: 'M PLUS 1 Code'        , sizePx: 16, sizeCategory: 'XS', categories: ['modern', 'bold']                                          , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'MPLUSBLACK_FONT_16'               , fileName: 'fonts/MPLUSRounded1c-Black.ttf'          , mainClock: false, weight: 700 },
  { id: 20, grid: false, label: 'Noto Serif'         , height: 18, preview: 'font-family: \'Noto Serif\', Impact, \'Arial Narrow\', sans-serif; font-weight: 500; font-style: italic;', small: true , google: 'Noto Serif'           , sizePx: 18, sizeCategory: 'S' , categories: ['serif', 'italic']                                         , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'NOTOITALIC_FONT_18'               , fileName: 'fonts/NotoSerif-MediumItalic.ttf'        , mainClock: false, weight: 500, italic: true },
  { id: 21, grid: false, label: 'Arcade'             , height: 18, preview: 'font-family: \'ArcadeClassic\', \'Courier New\', monospace;'                                             , small: true, sizePx: 18, sizeCategory: 'S' , categories: ['digital', 'pixelated']                                    , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'ARCADE_FONT_18'                   , fileName: 'fonts/ArcadeClassic.ttf'                 , mainClock: false, cdn: 'arcadeclassic' },                                                                                                                                                         // ArcadeClassic (Pizzadude, dafont-only) is hosted on cdnfonts.com as a webfont under its own name -- see cdnFontLinks() below.
  { id: 22, grid: false, label: 'DS Digital'         , height: 20, preview: 'font-family: \'DS-Digital\', \'Courier New\', monospace; font-weight: 700;'                              , small: true, sizePx: 20, sizeCategory: 'S' , categories: ['digital', 'bold']                                         , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'DSDIGIB_FONT_20'                  , fileName: 'fonts/DS-DIGIB.TTF'                      , mainClock: false, cdn: 'ds-digital'    },                                                                                                                                                         // DS-Digital is hosted on cdnfonts.com as a webfont -- see cdnFontLinks() below.
  { id: 23, grid: false, label: 'DS Digital (Italic)', height: 20, preview: 'font-family: \'DS-Digital\', \'Courier New\', monospace; font-weight: 700; font-style: italic;'          , small: true , sizePx: 20, sizeCategory: 'S' , categories: ['digital', 'bold', 'italic']                               , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'DSDIGIT_FONT_20'                  , fileName: 'fonts/DS-DIGIT.TTF'                      , mainClock: false, cdn: 'ds-digital'    },                                                                                                                                                         // see id 48
  { id: 24, grid: false, label: 'LCD'                , height: 18, preview: 'font-family: \'LCD Solid\', \'Courier New\', monospace;'                                                 , small: true , sizePx: 18, sizeCategory: 'S' , categories: ['digital', 'pixelated']                                    , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'LCDSOLID_FONT_18'                 , fileName: 'fonts/LCD_Solid.ttf'                     , webfontFamily: 'LCD Solid'        , webfontUrl: 'https://static.wfonts.com/download/data/2015/12/12/lcd-solid/LCD_Solid.woff'           , webfontFormat: 'woff', mainClock: false, weight: 400 }, // LCD Solid isn't on Google Fonts or cdnfonts.com, but wfonts.com hosts the actual font as a direct .woff download (https://www.wfonts.com/font/lcd-solid) -- linked via webfontUrl/@font-face (see directWebfontStyle() in config-fonts.js)
  { id: 25, grid: true , label: 'Radioland'          , height: 16, preview: 'font-family: \'Radioland\', \'Courier New\', monospace;'                                                 , small: true , sizePx: 16, sizeCategory: 'S' , categories: ['digital']                                                 , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'RADIOLAND_FONT_16'                , fileName: 'fonts/RADIOLAND.ttf'                     , mainClock: false, cdn: 'radioland'     },                                                                                                                                                         // Radioland (Pizzadude, dafont-only) is hosted on cdnfonts.com as a webfont under its own name -- see cdnFontLinks() below.
  { id: 26, grid: false, label: 'Nunito'             , height: 21, preview: 'font-family: \'Nunito\', \'Courier New\', monospace;'                                                    , small: true , google: 'Nunito'               , sizePx: 21, sizeCategory: 'S' , categories: ['stylish', 'modern', 'digital']                            , romanOk: true , resourceName: 'NUNITO_FONT_21'                   , fileName: 'fonts/Nunito-Bold.ttf'                   , mainClock: false, weight: 400, cdn: null            },
  { id: 27, grid: true , label: 'Digital Dream'      , height: 13, preview: 'font-family: \'Digital dream\', \'Courier New\', monospace; letter-spacing: 1px;'                        , small: true , sizePx: 13, sizeCategory: 'XS', categories: ['digital']                                       , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'DIGITALDREAM_FONT_13'             , fileName: 'fonts/DIGITALDREAM.ttf'                  , cdn: 'digital-dream' },                                                                                                                                                                           // Digital Dream (Pizzadude, dafont-only) isn't on Google Fonts, but the exact same font is hosted on cdnfonts.com as a webfont -- see cdnFontLinks() in config-page.js for how the extra <link> gets added.
  { id: 28, grid: true , label: 'Digital Dream Narrow'      , height: 14, preview: 'font-family: \'Digital dream Narrow\', \'Courier New\', monospace; letter-spacing: 1px;'                        , small: true , sizePx: 14, sizeCategory: 'S', categories: ['digital', 'narrow']                                       , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'DIGITALDREAMNARROW_FONT_14'             , fileName: 'fonts/DIGITALDREAMNARROW.ttf'                  , cdn: 'digital-dream-narrow' },                                                                                                                                                                           // Digital Dream (Pizzadude, dafont-only) isn't on Google Fonts, but the exact same font is hosted on cdnfonts.com as a webfont -- see cdnFontLinks() in config-page.js for how the extra <link> gets added.
  { id: 29, grid: true , label: 'Digital Dream Fat'      , height: 15, preview: 'font-family: \'Digital dream Fat\', \'Courier New\', monospace; letter-spacing: 1px;'                        , small: true , sizePx: 15, sizeCategory: 'S', categories: ['digital', 'bold']                                       , sidesAllowed: null, sidesWithSeconds: null, romanOk: true , resourceName: 'DIGITALDREAMFAT_FONT_15'             , fileName: 'fonts/DIGITALDREAMFAT.ttf'                  , cdn: 'digital-dream-fat' },                                                                                                                                                                           // Digital Dream (Pizzadude, dafont-only) isn't on Google Fonts, but the exact same font is hosted on cdnfonts.com as a webfont -- see cdnFontLinks() in config-page.js for how the extra <link> gets added.
]; // FONT_MAX_CONTENT_ID below is derived from this array's own ids --
   // no more "remember to bump" comment needed.

// The highest FONT_LOOKUP id currently in use -- used wherever a font
// choice (clock font, corner/edge font, marker text font) gets
// validated/clamped, e.g. clampFontId() in index.js. Computed from
// FONT_LOOKUP itself rather than hand-maintained as a separate number,
// so adding a new font entry above can never leave this stale the way
// a hardcoded copy repeatedly has.
var FONT_MAX_CONTENT_ID = FONT_LOOKUP.reduce(function (max, f) { return Math.max(max, f.id); }, 0);

// Font picker category filter row -- 'all' is a special case handled
// entirely client-side (see fontMatchesCategoryFilters() in
// config-page.js): it's never listed in any font's own `categories`
// array, always shows every font (still subject to the "Show
// incompatible fonts" checkbox, same as every other filter
// combination), and picking it clears/replaces whatever combination
// of the other categories was active. Order here is the order the
// picker's horizontal scroll row shows them in.
// Entries carrying a `sizeCategory` (large/medium/small/tiny) are the
// size filters: they don't look at a font's `categories` array but
// compare against its own `sizeCategory` field (see
// fontMatchesCategoryFilters() in config-page.js), and they never
// show up as tags on a font's picker button (its size label already
// covers that).
var FONT_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'digital', label: 'Digital' },
  { id: 'pixelated', label: 'Pixelated' },
  { id: 'stylish', label: 'Stylish' },
  { id: 'modern', label: 'Modern' },
  { id: 'funky', label: 'Funky' },
  { id: 'serif', label: 'Serif' },
  { id: 'italic', label: 'Italic' },
  { id: 'bold', label: 'Bold' },
  { id: 'thin', label: 'Thin' },
  { id: 'narrow', label: 'Narrow' },
  { id: 'wide', label: 'Wide' },
  { id: 'pebbleos', label: 'PebbleOS' },
  { id: 'large', label: 'Large', sizeCategory: 'L' },
  { id: 'medium', label: 'Medium', sizeCategory: 'M' },
  { id: 'small', label: 'Small', sizeCategory: 'S' },
  { id: 'tiny', label: 'Tiny', sizeCategory: 'XS' },
  { id: 'handwritten', label: 'Handwritten' }
];

// Must match get_color_scheme() in src/c/comms/comms_decoder.c exactly --
// same order, same id, same colors.
var COLOR_SCHEMES = [
  // Proven classics retained from the original set.
  { id: 0, grid: true, label: 'Ink on Snow', altLabel: 'Black on White', bg: '#ffffff', text: '#000000', accent: '#000000', mode: 'both' },
  { id: 1, grid: true, label: 'Chalk on Coal', altLabel: 'White on Black', bg: '#000000', text: '#ffffff', accent: '#ffffff', mode: 'both' },
  { id: 2, grid: true, label: 'Ruby Night', altLabel: 'Red on Black', bg: '#000000', text: '#ff0000', accent: '#ff0000', mode: 'both' },
  { id: 5, grid: true, label: 'Snow & Ember', altLabel: 'White on Black, Red accent', bg: '#000000', text: '#ffffff', accent: '#ff0000', mode: 'both' },
  { id: 6, grid: true, label: 'Ink & Garnet', altLabel: 'Black on White, Dark Red accent', bg: '#ffffff', text: '#000000', accent: '#550000', mode: 'both' },
  { id: 3, grid: true, label: 'Moonlight Navy', altLabel: 'White on Dark Blue', bg: '#000055', text: '#ffffff', accent: '#ffffff', mode: 'both' },
  { id: 4, grid: true, label: 'Signal Gold', altLabel: 'Yellow on Dark Blue', bg: '#000055', text: '#ffff00', accent: '#ffff00', mode: 'both' },
  { id: 8, grid: true, label: 'Ruby & Snow', altLabel: 'Red on Black, White accent', bg: '#000000', text: '#ff0000', accent: '#ffffff', mode: 'both' },

  // Day presets: reflective-screen friendly, light backgrounds with strong
  // dark/saturated foregrounds. New entries deliberately avoid midtone-on-
  // midtone combinations that tend to wash together on e-paper.
  { id: 12, grid: true, label: 'Cobalt Paper', altLabel: 'Dark blue on White, Blue accent', bg: '#ffffff', text: '#000055', accent: '#0000ff', mode: 'day' }, // Blueprint Snow
  { id: 13, grid: true, label: 'Forest Ink', altLabel: 'Dark green on White, Orange accent', bg: '#ffffff', text: '#005500', accent: '#ff5500', mode: 'day' }, //Pine on Paper
  { id: 14, grid: true, label: 'Violet Ledger', altLabel: 'Violet on White, Yellow accent', bg: '#ffffff', text: '#550055', accent: '#ffff00', mode: 'day' }, // Plum & Sun
  { id: 15, grid: true, label: 'Teal Signal', altLabel: 'Green on White, Orange accent', bg: '#ffffff', text: '#005555', accent: '#ff5500', mode: 'day' }, // Harbor Ink
  { id: 16, grid: true, label: 'Garnet Paper', altLabel: 'Brown on White, Blue accent', bg: '#ffffff', text: '#550000', accent: '#0000aa', mode: 'day' }, // Crimson Ledger
  { id: 17, grid: true, label: 'Navy Ember', altLabel: 'Dark blue on White, Red accent', bg: '#ffffff', text: '#000055', accent: '#ff0000', mode: 'day' }, // Midnight Ink
  { id: 18, grid: true, label: 'Evergreen Gold', altLabel: 'Green on Yellow, Orange accent', bg: '#ffffaa', text: '#005500', accent: '#aa5500', mode: 'day' }, // Pine & Brass
  { id: 19, grid: true, label: 'Sunlit Indigo', altLabel: 'Dark Blue on Yellow, Orange accent', bg: '#ffffaa', text: '#000055', accent: '#aa0000', mode: 'day' }, // Ochre & Cobalt
  { id: 20, grid: true, label: 'Skyline Ink', altLabel: 'Dark Blue on Light Violet, Blue accent', bg: '#aaaaff', text: '#000000', accent: '#0000aa', mode: 'day' }, // Azure Paper
  { id: 21, grid: true, label: 'Mint & Charcoal', altLabel: 'Dark Green on Lime, Green accent', bg: '#aaffaa', text: '#000000', accent: '#005500', mode: 'day' }, // Frosted Forest

  // Night presets: black/deep-colour backgrounds with very bright text or
  // accents. These favour high luminance contrast when the backlight is off.
  { id: 22, grid: true, label: 'Moonlit Cobalt', altLabel: 'White on Dark Blue, Light Blue accent', bg: '#000055', text: '#ffffff', accent: '#55ffff', mode: 'night' }, // Ice on Navy
  { id: 23, grid: true, label: 'Ember Night', altLabel: 'White on Black, Orange accent', bg: '#000000', text: '#ffffff', accent: '#ff5500', mode: 'night' }, // Snow & Flame
  { id: 24, grid: true, label: 'Aurora Green', altLabel: 'Light Green on Black, Green accent', bg: '#000000', text: '#aaffaa', accent: '#00aa00', mode: 'night' }, // Frost & Pine
  { id: 25, grid: true, label: 'Violet Moon', altLabel: 'White on Dark Blue, violet accent', bg: '#000055', text: '#ffffff', accent: '#ff55ff', mode: 'night' }, // Lilac Signal
  { id: 26, grid: true, label: 'Arctic Teal', altLabel: 'Light Blue on Black, Green accent', bg: '#000000', text: '#aaffff', accent: '#00aaaa', mode: 'night' }, // Icewater Night
  { id: 27, grid: true, label: 'Solar Flare', altLabel: 'Yellow on Black, Orange Accent', bg: '#000000', text: '#ffff00', accent: '#ff5500', mode: 'night' }, // Gold on Ink
  { id: 28, grid: true, label: 'Ruby Eclipse', altLabel: 'White on Dark Red, Orange accent', bg: '#550000', text: '#ffffff', accent: '#ff5555', mode: 'night' }, // White & Ruby
  { id: 29, grid: true, label: 'Deep Forest', altLabel: 'White on Dark Green, Lime accent', bg: '#005500', text: '#ffffff', accent: '#aaff55', mode: 'night' }, // Moon & Moss
  { id: 30, grid: true, label: 'Royal Night', altLabel: 'Light Yellow on Dark Blue, Light Blue accent', bg: '#000055', text: '#ffffaa', accent: '#aaaaff', mode: 'night' }, // Crown & Cobalt
  { id: 31, grid: true, label: 'Copper Midnight', altLabel: 'Orange on Black, White accent', bg: '#000000', text: '#ffaa00', accent: '#ffffff', mode: 'night' } // Amber on Coal
];

// Roman-numeral compatibility lives on FONT_LOOKUP itself now (each
// entry's own `romanOk` field, right alongside every other font
// capability flag) rather than as a second id-keyed table a caller had
// to cross-reference against FONT_LOOKUP by hand -- see fontLookupEntry()
// in config-fonts.js for the normal way to read it. This is the phone-
// side copy of the same data font_lookup.c tracks per-font as
// FontLookupEntry.roman_ok (JS and the watch app are separate runtimes
// that can't share a table, so keep the two in sync by hand) -- see its
// own comment there for exactly how each value was determined: official
// Pebble system-font documentation for ids 0-15, and each custom font's
// own package.json characterRegex for ids 16+. int_to_roman() in
// marker_text.c only ever needs I, V, X, L (it covers 0-55: the hour
// ring's 1-12 and the second/minute ring's 0/5/.../55), never C, D or M.

// Must match draw_corner_item()'s color_mode switch exactly.
var CORNER_COLOR_MODE_LABELS = ['MONO', 'ACC', 'PILL', 'COLOR'];

// The corner/edge feature content catalogue -- see this file's own
// header comment for why this is the one place all of id, label,
// category and live-preview text live together. `icon` is the SVG
// glyph shown on that category's own picker button; `preview` is
// the illustrative (not live) sample text shown in the live preview
// canvas and the slot-picker diagram's own buttons for that item --
// omitted for id 0 ("None"), which never draws anything. Item order
// within a category is deliberately curated (most useful/common
// first), not id-ascending.
var CORNER_CATEGORIES = [
  {
    "id": "none",
    "label": "None",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M12 3 L12 11\"/><path d=\"M7 6.5 A8 8 0 1 0 17 6.5\"/></svg>",
    "items": [
      {
        "id": 0,
        "label": "None"
      }
    ]
  },
  {
    "id": "utilities",
    "label": "Utilities",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17.7 3.3a4.5 4.5 0 0 0-6 5.7L4 16.7a1.8 1.8 0 0 0 2.5 2.5L14.2 12a4.5 4.5 0 0 0 5.7-6l-2.8 2.8-2.1-2.1 2.7-2.7z\"/></svg>",
    "items": [
      {
        "id": 10,
        "label": "Battery",
        "preview": "82%"
      },
      {
        "id": 13,
        "label": "Location",
        "preview": "Innsbruck"
      },
      {
        "id": 17,
        "label": "Pebble logo /w battery bar",
        "preview": "LOGO"
      },
      {
        "id": 20,
        "label": "Bluetooth connection",
        "preview": "Connected"
      },
      {
        "id": 78,
        "label": "Bluetooth status (icon only)",
        "preview": "(bt)"
      },
      {
        "id": 38,
        "label": "Altitude",
        "preview": "380m"
      },
      {
        "id": 85,
        "label": "Compass",
        "preview": "NNW"
      },
      {
        "id": 102,
        "label": "Battery + Bluetooth (icons only)",
        "preview": "(batt)(bt)"
      },
      {
        "id": 103,
        "label": "Battery % + Bluetooth",
        "preview": "68% (bt)"
      },
      {
        "id": 108,
        "label": "Quiet Time (icon only)",
        "preview": "(quiet)"
      },
      {
        "id": 109,
        "label": "Quiet Time (icon + ON/OFF)",
        "preview": "(spkr) OFF"
      },
      {
        "id": 112,
        "label": "Battery + Bluetooth + Quiet Time (icons only)",
        "preview": "(batt)(bt)(quiet)"
      },
      {
        "id": 113,
        "label": "Battery % + Quiet Time + Bluetooth (icon + ON/OFF each)",
        "preview": "82% (spkr)OFF (bt)ON"
      }
    ]
  },
  {
    "id": "health",
    "label": "Health",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12 20.8c-.3 0-.6-.1-.8-.3C6.5 16.6 3 13.3 3 9.6 3 6.9 5.1 5 7.7 5c1.6 0 3.1.8 4.3 2.2C13.2 5.8 14.7 5 16.3 5 18.9 5 21 6.9 21 9.6c0 3.7-3.5 7-8.2 10.9-.2.2-.5.3-.8.3z\"/></svg>",
    "items": [
      {
        "id": 1,
        "label": "Heart rate",
        "preview": "72"
      },
      {
        "id": 2,
        "label": "Steps today",
        "preview": "5234"
      },
      {
        "id": 3,
        "label": "Step goal %",
        "preview": "68%"
      },
      {
        "id": 39,
        "label": "Sleep duration",
        "preview": "7h 32m"
      },
      {
        "id": 40,
        "label": "Restful sleep duration",
        "preview": "2h 15m"
      },
      {
        "id": 41,
        "label": "Sleep quality %",
        "preview": "42%"
      },
      {
        "id": 42,
        "label": "Bed time",
        "preview": "23:45"
      },
      {
        "id": 43,
        "label": "Wake time",
        "preview": "07:20"
      }
    ]
  },
  {
    "id": "date",
    "label": "Date",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><rect x=\"7\" y=\"13\" width=\"3\" height=\"3\" fill=\"currentColor\" stroke=\"none\"/></svg>",
    "items": [
      {
        "id": 12,
        "label": "Short date",
        "preview": "Mon 15"
      },
      {
        "id": 19,
        "label": "Week number",
        "preview": "WK 34"
      },
      {
        "id": 21,
        "label": "Month Day (SEP 11)",
        "preview": "SEP 11"
      },
      {
        "id": 22,
        "label": "Day of month (11)",
        "preview": "11"
      },
      {
        "id": 23,
        "label": "Weekday short (MON)",
        "preview": "MON"
      },
      {
        "id": 24,
        "label": "Weekday long (Monday)",
        "preview": "Monday"
      },
      {
        "id": 25,
        "label": "Month short (SEP)",
        "preview": "SEP"
      },
      {
        "id": 26,
        "label": "Month long (September)",
        "preview": "September"
      },
      {
        "id": 27,
        "label": "Day/Month (11/9)",
        "preview": "11/9"
      },
      {
        "id": 28,
        "label": "Month/Day (9/11)",
        "preview": "9/11"
      },
      {
        "id": 29,
        "label": "Full date (24/9/2026)",
        "preview": "24/9/2026"
      },
      {
        "id": 30,
        "label": "Full date, imperial (9/24/26)",
        "preview": "9/24/26"
      },
      {
        "id": 98,
        "label": "Weekday + Day/Month (MON 24/9)",
        "preview": "MON 24/9"
      },
      {
        "id": 99,
        "label": "Weekday + Month/Day (MON 9/24)",
        "preview": "MON 9/24"
      }
    ]
  },
  {
    "id": "time",
    "label": "Time",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><line x1=\"12\" y1=\"12\" x2=\"12\" y2=\"6.5\"/><line x1=\"12\" y1=\"12\" x2=\"16\" y2=\"14\"/></svg>",
    "items": [
      {
        "id": 18,
        "label": "Time",
        "preview": "12:34"
      },
      {
        "id": 63,
        "label": "Time full (H:M:S)",
        "preview": "14:32:07"
      },
      {
        "id": 64,
        "label": "Hour, 24h leading zero (07)",
        "preview": "07"
      },
      {
        "id": 65,
        "label": "Hour, 24h (7)",
        "preview": "7"
      },
      {
        "id": 66,
        "label": "Hour, 12h (7)",
        "preview": "7"
      },
      {
        "id": 67,
        "label": "Minute (5)",
        "preview": "5"
      },
      {
        "id": 68,
        "label": "Minute, leading zero (05)",
        "preview": "05"
      },
      {
        "id": 69,
        "label": "Seconds (8)",
        "preview": "8"
      },
      {
        "id": 70,
        "label": "Second, leading zero (08)",
        "preview": "08"
      },
      {
        "id": 71,
        "label": "Seconds, tens digit",
        "preview": "3"
      },
      {
        "id": 72,
        "label": "Seconds, ones digit",
        "preview": "8"
      },
      {
        "id": 86,
        "label": "AM/PM",
        "preview": "PM"
      }
    ]
  },
  {
    "id": "timezone",
    "label": "Timezone",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><ellipse cx=\"12\" cy=\"12\" rx=\"4\" ry=\"9\"/><line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"/><path d=\"M4.5 7 C8 8.5, 16 8.5, 19.5 7\"/><path d=\"M4.5 17 C8 15.5, 16 15.5, 19.5 17\"/></svg>",
    "items": [
      {
        "id": 44,
        "label": "GMT+0 London",
        "preview": "LON 12:34"
      },
      {
        "id": 45,
        "label": "GMT+1 Paris / Berlin / Madrid",
        "preview": "PAR 13:34"
      },
      {
        "id": 46,
        "label": "GMT+2 Cairo",
        "preview": "CAI 14:34"
      },
      {
        "id": 47,
        "label": "GMT+3 Moscow",
        "preview": "MOW 15:34"
      },
      {
        "id": 48,
        "label": "GMT+4 Dubai",
        "preview": "DXB 16:34"
      },
      {
        "id": 49,
        "label": "GMT+5:30 Delhi / Mumbai",
        "preview": "DEL 18:04"
      },
      {
        "id": 50,
        "label": "GMT+6 Dhaka",
        "preview": "DAC 18:34"
      },
      {
        "id": 51,
        "label": "GMT+7 Bangkok / Jakarta",
        "preview": "BKK 19:34"
      },
      {
        "id": 52,
        "label": "GMT+8 Beijing / Shanghai / Singapore",
        "preview": "BJS 20:34"
      },
      {
        "id": 53,
        "label": "GMT+9 Tokyo",
        "preview": "TOK 21:34"
      },
      {
        "id": 54,
        "label": "GMT+10 Sydney",
        "preview": "SYD 22:34"
      },
      {
        "id": 55,
        "label": "GMT+12 Auckland",
        "preview": "AKL 00:34"
      },
      {
        "id": 56,
        "label": "GMT-5 New York",
        "preview": "NYC 07:34"
      },
      {
        "id": 57,
        "label": "GMT-6 Chicago",
        "preview": "CHI 06:34"
      },
      {
        "id": 58,
        "label": "GMT-7 Denver",
        "preview": "DEN 05:34"
      },
      {
        "id": 59,
        "label": "GMT-8 Los Angeles",
        "preview": "LAX 04:34"
      },
      {
        "id": 60,
        "label": "GMT-9 Anchorage",
        "preview": "ANC 03:34"
      },
      {
        "id": 61,
        "label": "GMT-10 Honolulu",
        "preview": "HNL 02:34"
      },
      {
        "id": 62,
        "label": "GMT-3 Sao Paulo",
        "preview": "SAO 09:34"
      }
    ]
  },
  {
    "id": "weather",
    "label": "Weather",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"><circle cx=\"8\" cy=\"7.5\" r=\"3.2\" fill=\"currentColor\" stroke=\"none\"/><line x1=\"8\" y1=\"1\" x2=\"8\" y2=\"2.5\"/><line x1=\"1.5\" y1=\"7.5\" x2=\"3\" y2=\"7.5\"/><line x1=\"3.3\" y1=\"2.8\" x2=\"4.4\" y2=\"3.9\"/><path d=\"M6 20h11a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.2 10.8 3.8 3.8 0 0 0 6 20z\" fill=\"currentColor\" stroke=\"none\"/></svg>",
    "items": [
      {
        "id": 4,
        "label": "High / low temperature",
        "preview": "H72 L58"
      },
      {
        "id": 5,
        "label": "Current conditions",
        "preview": "68F Clear"
      },
      {
        "id": 6,
        "label": "UV Index today",
        "preview": "UV5"
      },
      {
        "id": 107,
        "label": "Current UV index",
        "preview": "UV5"
      },
      {
        "id": 7,
        "label": "Rain chance today",
        "preview": "R20%"
      },
      {
        "id": 8,
        "label": "Humidity",
        "preview": "H45%"
      },
      {
        "id": 9,
        "label": "Wind",
        "preview": "W12"
      },
      {
        "id": 14,
        "label": "Visibility",
        "preview": "80%"
      },
      {
        "id": 15,
        "label": "Cloud cover",
        "preview": "45%"
      },
      {
        "id": 31,
        "label": "Weather icon",
        "preview": "(cloud)"
      },
      {
        "id": 32,
        "label": "Temp + weather icon",
        "preview": "20C"
      },
      {
        "id": 34,
        "label": "Pressure",
        "preview": "1013 hPa"
      },
      {
        "id": 35,
        "label": "Wind direction",
        "preview": "NW"
      },
      {
        "id": 36,
        "label": "Air quality",
        "preview": "AQI 42"
      },
      {
        "id": 37,
        "label": "Dew point",
        "preview": "12C"
      },
      {
        "id": 73,
        "label": "Current temp",
        "preview": "22C"
      },
      {
        "id": 74,
        "label": "High temp",
        "preview": "H 28C"
      },
      {
        "id": 75,
        "label": "Low temp",
        "preview": "L 11C"
      },
      {
        "id": 76,
        "label": "Weather icon + all temps",
        "preview": "22 H28 L11C"
      },
      {
        "id": 77,
        "label": "Feels like temp",
        "preview": "FL 20C"
      },
      {
        "id": 87,
        "label": "Weather in 1 hour",
        "preview": "(1h) 24C"
      },
      {
        "id": 88,
        "label": "Weather in 2 hours",
        "preview": "(2h) 23C"
      },
      {
        "id": 89,
        "label": "Weather in 3 hours",
        "preview": "(3h) 22C"
      },
      {
        "id": 90,
        "label": "Weather in 4 hours",
        "preview": "(4h) 21C"
      },
      {
        "id": 91,
        "label": "Weather in 5 hours",
        "preview": "(5h) 20C"
      },
      {
        "id": 92,
        "label": "Weather in 6 hours",
        "preview": "(6h) 19C"
      },
      {
        "id": 93,
        "label": "Weather in 1 days",
        "preview": "(1d) 24C"
      },
      {
        "id": 94,
        "label": "Weather in 2 days",
        "preview": "(2d) 22C"
      },
      {
        "id": 95,
        "label": "Weather in 3 days",
        "preview": "(3d) 20C"
      }
    ]
  },
  {
    "id": "astro",
    "label": "Astronomy",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\"><circle cx=\"12\" cy=\"12\" r=\"2.3\" fill=\"currentColor\" stroke=\"none\"/><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"4\"/><ellipse cx=\"12\" cy=\"12\" rx=\"6.5\" ry=\"9\" transform=\"rotate(60 12 12)\"/><circle cx=\"21.3\" cy=\"12\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"9.6\" cy=\"4.1\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/></svg>",
    "items": [
      {
        "id": 11,
        "label": "Moon phase",
        "preview": "Full"
      },
      {
        "id": 16,
        "label": "Sunrise / sunset",
        "preview": "19:42"
      },
      {
        "id": 79,
        "label": "Planets visible now",
        "preview": "3 planets"
      },
      {
        "id": 80,
        "label": "Meteor shower",
        "preview": "Perseids"
      },
      {
        "id": 81,
        "label": "Saturn ring angle",
        "preview": "Rings 12%"
      },
      {
        "id": 82,
        "label": "Next planet rise",
        "preview": "VEN 18:32"
      },
      {
        "id": 83,
        "label": "Next ISS pass",
        "preview": "22:47"
      },
      {
        "id": 84,
        "label": "Aurora Kp index",
        "preview": "Kp 4.3"
      }
    ]
  },
  {
    "id": "wide",
    "label": "Wide",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"/><polyline points=\"8,7 3,12 8,17\"/><polyline points=\"16,7 21,12 16,17\"/></svg>",
    "items": [
      {
        "id": 100,
        "label": "Heart rate + steps",
        "preview": "72 5234"
      },
      {
        "id": 101,
        "label": "Bed time + wake time",
        "preview": "23:45 /07:20"
      },
      {
        "id": 104,
        "label": "Sleep times",
        "preview": "7h32m (2h15m) 42%"
      },
      {
        "id": 105,
        "label": "Long date + sunrise/sunset",
        "preview": "Mon 23 Sep 19:42"
      },
      {
        "id": 106,
        "label": "Long date + week number",
        "preview": "Mon 23 Sep WK34"
      },
      {
        "id": 96,
        "label": "Last weather update, long",
        "preview": "Last updated 12:34"
      },
      {
        "id": 97,
        "label": "Last weather update, short",
        "preview": "12:34"
      },
      {
        "id": 118,
        "label": "Battery + Bluetooth + Quiet Time (% for battery only)",
        "preview": "82% (bt)(spkr)"
      }
    ]
  },
  {
    "id": "plugins",
    "label": "Plugins",
    "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 4.5a1.8 1.8 0 0 1 3.6 0V6H18a1 1 0 0 1 1 1v3.4h-1.5a1.8 1.8 0 0 0 0 3.6H19V18a1 1 0 0 1-1 1h-3.4v-1.5a1.8 1.8 0 0 0-3.6 0V19H7a1 1 0 0 1-1-1v-4H4.5a1.8 1.8 0 0 1 0-3.6H6V7a1 1 0 0 1 1-1h3z\"/></svg>",
    "items": [
      {
        "id": 200,
        "label": "Plugin data 1",
        "preview": "PLG"
      },
      {
        "id": 201,
        "label": "Plugin data 2",
        "preview": "PLG"
      },
      {
        "id": 202,
        "label": "Plugin data 3",
        "preview": "PLG"
      },
      {
        "id": 203,
        "label": "Plugin data 4",
        "preview": "PLG"
      },
      {
        "id": 204,
        "label": "Plugin data 5",
        "preview": "PLG"
      },
      {
        "id": 205,
        "label": "Plugin data 6",
        "preview": "PLG"
      },
      {
        "id": 206,
        "label": "Plugin data 7",
        "preview": "PLG"
      },
      {
        "id": 207,
        "label": "Plugin data 8",
        "preview": "PLG"
      },
      {
        "id": 208,
        "label": "Plugin data 9",
        "preview": "PLG"
      },
      {
        "id": 209,
        "label": "Plugin data 10",
        "preview": "PLG"
      },
      {
        "id": 210,
        "label": "Plugin data 11",
        "preview": "PLG"
      },
      {
        "id": 211,
        "label": "Plugin data 12",
        "preview": "PLG"
      }
    ]
  }
];

// The highest corner/edge content id currently in use -- every content
// id features_layer.c implements (see this file's own comment above
// CORNER_CATEGORIES) must appear somewhere in that array, so its
// highest id IS this number; computed here rather than hand-maintained
// as a separate constant, since a stale hardcoded copy (index.js's own
// MAX_FEATURES sat at 104 for a while after content ids up to 115 were
// added elsewhere in this same file, silently rejecting every one of
// them back down to "None" until this was caught) is exactly the
// failure mode FONT_MAX_CONTENT_ID's own comment already flagged for
// FONT_LOOKUP.
var MAX_FEATURES = CORNER_CATEGORIES.reduce(function (max, cat) {
  return cat.items.reduce(function (m, item) { return Math.max(m, item.id); }, max);
}, 0);

// Starter hand-style presets for the Style section's "Hand style"
// picker -- keyed "1"."9" to match HAND_STYLE_IMAGES/
// HAND_STYLE_DIAGRAM_IMAGES's own filenames, each with a display
// title plus hour/min/sec field sets in the same shape
// applyHandPresetToKind() (config-page.js) writes into the hidden
// custom-hand inputs, PLUS a centerCircle and shadow field set
// applied the same way to the standalone Center circle/Shadow style
// settings (see applyHandPresetExtras()) -- those two aren't
// per-hand, but still look like part of "the hand style" to anyone
// picking a preset, so a preset sets them too instead of leaving
// whatever was there before. Picking a preset is a one-shot copy
// into those same fields the manual "Edit ... hand" / Center
// circle/Shadow style editors use -- nothing about it is remembered
// as a distinct "preset" afterward, on this page or on the watch.
// These 9 are placeholders pairing the existing style shapes with
// generic starter numbers -- replace the images and retune the
// field sets here once real example styles are worked out.
var HAND_PRESETS = {
  "1": {
    "title": "Pebble",
    "hour": {
      "Style": "0",
      "Width": "10",
      "Length": "51",
      "BackOffset": "0",
      "Color": "1"
    },
    "min": {
      "Style": "0",
      "Width": "10",
      "Length": "78",
      "BackOffset": "0",
      "Color": "0"
    },
    "sec": {
      "Style": "0",
      "Width": "2",
      "Length": "85",
      "BackOffset": "0",
      "Color": "0"
    },
    "centerCircle": {
      "Radius": "5",
      "Color": "1"
    },
    "shadow": {
      "Translucent": "true",
      "Angle": "120"
    }
  },
  "2": {
    "title": "Fruit",
    "hour": {
      "Style": "5",
      "Width": "8",
      "Length": "63",
      "BackOffset": "0",
      "MiddleOffset": "20",
      "SecondaryWidth": "2",
      "Color": "1"
    },
    "min": {
      "Style": "5",
      "Width": "8",
      "Length": "81",
      "BackOffset": "0",
      "MiddleOffset": "20",
      "SecondaryWidth": "2",
      "Color": "0"
    },
    "sec": {
      "Style": "2",
      "Width": "2",
      "Length": "85",
      "BackOffset": "0",
      "Color": "0"
    },
    "centerCircle": {
      "Radius": "2",
      "Color": "0"
    },
    "shadow": {
      "Translucent": "true",
      "Angle": "120"
    }
  },
  "3": {
    "title": "Modern",
    "hour": {
      "Style": "2",
      "Width": "6",
      "Length": "51",
      "BackOffset": "10",
      "Color": "0"
    },
    "min": {
      "Style": "2",
      "Width": "6",
      "Length": "78",
      "BackOffset": "10",
      "Color": "0"
    },
    "sec": {
      "Style": "2",
      "Width": "2",
      "Length": "85",
      "BackOffset": "10",
      "Color": "1"
    },
    "centerCircle": {
      "Radius": "4",
      "Color": "1"
    },
    "shadow": {
      "Translucent": "true",
      "Angle": "120"
    }
  },
  "4": {
    "title": "Swiss",
    "hour": {
      "Style": "2",
      "Width": "10",
      "Length": "51",
      "BackOffset": "10",
      "Color": "0"
    },
    "min": {
      "Style": "2",
      "Width": "10",
      "Length": "78",
      "BackOffset": "10",
      "Color": "0"
    },
    "sec": {
      "Style": "6",
      "Width": "2",
      "Length": "85",
      "BackOffset": "15",
      "MiddleOffset": "5",
      "SecondaryWidth": "17",
      "Color": "1"
    },
    "centerCircle": {
      "Radius": "3",
      "Color": "1"
    },
    "shadow": {
      "Translucent": "true",
      "Angle": "120"
    }
  },
  "5": {
    "title": "Pointy",
    "hour": {
      "Style": "1",
      "Width": "12",
      "Length": "51",
      "BackOffset": "0",
      "Color": "0"
    },
    "min": {
      "Style": "1",
      "Width": "12",
      "Length": "78",
      "BackOffset": "0",
      "Color": "0"
    },
    "sec": {
      "Style": "0",
      "Width": "2",
      "Length": "85",
      "BackOffset": "0",
      "Color": "1"
    },
    "centerCircle": {
      "Radius": "4",
      "Color": "0"
    },
    "shadow": {
      "Translucent": "true",
      "Angle": "120"
    }
  },
  "6": {
    "title": "Classy",
    "hour": {
      "Style": "3",
      "Width": "10",
      "Length": "51",
      "BackOffset": "4",
      "MiddleOffset": "10",
      "Color": "0"
    },
    "min": {
      "Style": "3",
      "Width": "8",
      "Length": "78",
      "BackOffset": "4",
      "MiddleOffset": "14",
      "Color": "0"
    },
    "sec": {
      "Style": "1",
      "Width": "2",
      "Length": "85",
      "BackOffset": "6",
      "Color": "1"
    },
    "centerCircle": {
      "Radius": "5",
      "Color": "0"
    },
    "shadow": {
      "Translucent": "true",
      "Angle": "135"
    }
  },
  "7": {
    "title": "Bell",
    "hour": {
      "Style": "4",
      "Width": "10",
      "Length": "61",
      "BackOffset": "-20",
      "MiddleOffset": "40",
      "SecondaryWidth": "14",
      "Color": "0"
    },
    "min": {
      "Style": "4",
      "Width": "8",
      "Length": "78",
      "BackOffset": "-21",
      "MiddleOffset": "40",
      "SecondaryWidth": "8",
      "Color": "0"
    },
    "sec": {
      "Style": "7",
      "Width": "7",
      "Length": "85",
      "BackOffset": "0",
      "Color": "1"
    },
    "centerCircle": {
      "Radius": "5",
      "Color": "1"
    },
    "shadow": {
      "Translucent": "true",
      "Angle": "135"
    }
  },
  "8": {
    "title": "Leafs",
    "hour": {
      "Style": "8",
      "Width": "10",
      "Length": "51",
      "BackOffset": "0",
      "MiddleOffset": "5",
      "Color": "0"
    },
    "min": {
      "Style": "8",
      "Width": "8",
      "Length": "78",
      "BackOffset": "0",
      "MiddleOffset": "8",
      "Color": "0"
    },
    "sec": {
      "Style": "1",
      "Width": "2",
      "Length": "85",
      "BackOffset": "6",
      "Color": "1"
    },
    "centerCircle": {
      "Radius": "4",
      "Color": "0"
    },
    "shadow": {
      "Translucent": "true",
      "Angle": "120"
    }
  },
  "9": {
    "title": "Funky",
    "hour": {
      "Style": "10",
      "Width": "4",
      "Length": "51",
      "BackOffset": "0",
      "MiddleOffset": "8",
      "SecondaryWidth": "12",
      "Color": "0"
    },
    "min": {
      "Style": "10",
      "Width": "3",
      "Length": "78",
      "BackOffset": "0",
      "MiddleOffset": "10",
      "SecondaryWidth": "10",
      "Color": "0"
    },
    "sec": {
      "Style": "10",
      "Width": "2",
      "Length": "85",
      "BackOffset": "6",
      "MiddleOffset": "8",
      "SecondaryWidth": "17",
      "Color": "1"
    },
    "centerCircle": {
      "Radius": "4",
      "Color": "1"
    },
    "shadow": {
      "Translucent": "true",
      "Angle": "150"
    }
  }
};

// Built-in marker presets -- the "Indices style" picker's None
// (bigAnalogMarkerStyle 0), Braun (1), Swiss (2), Classy (9) and
// Minimal (10) tiles. (Minimal used to be 0 and None used to be 9;
// settings-migration.js remaps stored values.)
// The watch itself has no concept of these: picking one on the
// settings page copies its hour ring, second ring AND numerals (marker
// text) values into the same customHour*/customSec*/markerText* fields
// the "Custom" style edits (see applyMarkerStylePresetToCustom() in
// config-page.js), and settings-codecs.js sends the watch style 8
// ("Custom") plus those values whenever one of these is the selected
// style. The selected preset itself is still what's stored and shown in
// the menu.
//
// One entry per preset, index-aligned across all three arrays:
//   0 = Minimal, 1 = Braun, 2 = Swiss, 3 = Classy, 4 = None
// (MARKER_STYLE_PRESET_INDEX below maps a bigAnalogMarkerStyle value to
// that index). Ring field meanings/ranges are MarkerRingConfig's own --
// see marker_types.h and customMarkerStyleCode() etc. in
// settings-codecs.js. `style`: 0 dot, 1 line, 2 square, 4 tapered;
// `thickness` 0 means that ring draws nothing at all;
// `innerThickness` is only read by style 4; `color`: 0 main, 1
// accent, 2 background.
var MARKER_STYLE_HOUR_PRESETS = [
  { style: 1, thickness: 2,  innerThickness: 2, innerEccentricity: 100, outerEccentricity: 100, innerBorderPct: 66,  outerBorderPct: 100, translucent: false, color: 0 }, // Minimal
  { style: 1, thickness: 3,  innerThickness: 3, innerEccentricity: 100, outerEccentricity: 100, innerBorderPct: 48,  outerBorderPct: 100, translucent: false, color: 0 }, // Braun
  { style: 2, thickness: 7,  innerThickness: 1, innerEccentricity: 70,  outerEccentricity: 100, innerBorderPct: 75,  outerBorderPct: 100, translucent: false, color: 0 }, // Swiss
  { style: 4, thickness: 10, innerThickness: 3, innerEccentricity: 0,   outerEccentricity: 100, innerBorderPct: 69,  outerBorderPct: 100, translucent: false, color: 0 }, // Classy
  { style: 0, thickness: 0,  innerThickness: 1, innerEccentricity: 100, outerEccentricity: 100, innerBorderPct: 100, outerBorderPct: 100, translucent: false, color: 0 }  // None (draws nothing)
];
var MARKER_STYLE_SECOND_PRESETS = [
  { style: 0, thickness: 0, innerThickness: 1, innerEccentricity: 100, outerEccentricity: 100, innerBorderPct: 73,  outerBorderPct: 100, translucent: false, color: 0 }, // Minimal (no second indices)
  { style: 2, thickness: 1, innerThickness: 1, innerEccentricity: 100, outerEccentricity: 100, innerBorderPct: 73,  outerBorderPct: 100, translucent: false, color: 0 }, // Braun
  { style: 2, thickness: 1, innerThickness: 1, innerEccentricity: 70,  outerEccentricity: 75,  innerBorderPct: 75,  outerBorderPct: 80,  translucent: false, color: 0 }, // Swiss
  { style: 2, thickness: 1, innerThickness: 1, innerEccentricity: 0,   outerEccentricity: 0,   innerBorderPct: 73,  outerBorderPct: 80,  translucent: false, color: 0 }, // Classy
  { style: 0, thickness: 0, innerThickness: 1, innerEccentricity: 100, outerEccentricity: 100, innerBorderPct: 100, outerBorderPct: 100, translucent: false, color: 0 }  // None (draws nothing)
];
// Numerals (marker text) for each preset -- same fields as the Custom
// style's "Numerals" popup / MarkerTextConfig. `target`: 0 off, 1 hour
// ring, 2 second ring; while it's 0 (every preset for now) nothing is
// drawn and the rest is inert, but still sent as-is so a preset that
// wants numerals only has to fill its row in here. `font` is a
// FONT_LOOKUP content id; `offset` -50..50 px from the ring's inner
// edge; `hourMask`/`secondMask` 12-bit bitmasks of which of the 12
// hour/5-second marks get a label (4095 = all); `roman` I, II, III...
var MARKER_STYLE_TEXT_PRESETS = [
  { target: 0, font: 0, offset: 0, roman: false, hourMask: 4095, secondMask: 4095 }, // Minimal
  { target: 2, font: 2, offset: -45, roman: false, hourMask: 4095, secondMask: 4095 }, // Braun
  { target: 0, font: 0, offset: 0, roman: false, hourMask: 4095, secondMask: 4095 }, // Swiss
  { target: 0, font: 0, offset: 0, roman: false, hourMask: 4095, secondMask: 4095 }, // Classy
  { target: 0, font: 0, offset: 0, roman: false, hourMask: 4095, secondMask: 4095 }  // None
];

// bigAnalogMarkerStyle value -> index into the three arrays above. Any
// style not listed here (3-7 bitmap, 8 custom) isn't a marker preset.
var MARKER_STYLE_PRESET_INDEX = { '10': 0, '1': 1, '2': 2, '9': 3, '0': 4 };

// One ring preset in the exact shape the config page's hidden
// customHour*/customSec* inputs (and the popup editors' CM_FIELDS)
// use: field name -> string value, so applying it is a plain
// `element.value = fields[name]` loop with no per-field conversion.
function markerRingPresetToFields(p) {
  return {
    Style: String(p.style),
    Thickness: String(p.thickness),
    InnerThickness: String(p.innerThickness),
    InnerEcc: String(p.innerEccentricity),
    OuterEcc: String(p.outerEccentricity),
    InnerBorder: String(p.innerBorderPct),
    OuterBorder: String(p.outerBorderPct),
    Translucent: String(p.translucent),
    Color: String(p.color)
  };
}

// Same idea for numerals: the markerText* inputs' own names/values.
function markerTextPresetToFields(t) {
  return {
    Target: String(t.target),
    Font: String(t.font),
    Offset: String(t.offset),
    HourMask: String(t.hourMask),
    SecMask: String(t.secondMask),
    Roman: String(t.roman)
  };
}

// bigAnalogMarkerStyle value ("0"/"1"/"2"/"9"/"10") -> { hour: {...},
// sec: {...}, text: {...} } of the field values above. Built once here
// from the three arrays so both consumers -- the config page
// (serialized into the webview) and settings-codecs.js (what actually
// goes to the watch) -- read the exact same numbers.
var MARKER_STYLE_PRESET_FIELDS = {};
Object.keys(MARKER_STYLE_PRESET_INDEX).forEach(function (styleId) {
  var i = MARKER_STYLE_PRESET_INDEX[styleId];
  MARKER_STYLE_PRESET_FIELDS[styleId] = {
    hour: markerRingPresetToFields(MARKER_STYLE_HOUR_PRESETS[i]),
    sec: markerRingPresetToFields(MARKER_STYLE_SECOND_PRESETS[i]),
    text: markerTextPresetToFields(MARKER_STYLE_TEXT_PRESETS[i])
  };
});


// FAQ lookup table used by the settings-page FAQ section. Kept here with the
// other static lookup data so config-page.js only owns rendering/interaction.
var FAQ_ITEMS = [
    ['What is Modern?', 'Modern is an analog watchface that I have made a long long time ago that has resonated greatly with pebble community. For long time it was a doormant project that I decided to resurrect and enrich for the next decade of pebbles.'],
    ['Can I use my own picture as the background?', 'Yes. In Style, tick "Use custom background" and pick one of the predefined images, or upload your own into one of 9 slots: crop, pan and zoom it, choose a dithering method and an image style (neutral, black & white, sepia, vivid) and watch the live preview. The picture is converted to the watch\'s 64 colors and sent to the watch when you press Save (it can take around 20 seconds); after that it is stored on the watch and drawn behind the indices. Your 9 images are kept on the phone, so you can switch between them for different styles.'],
    ['Can a feature appear only when I shake the watch?', 'Yes. Open any feature position and tick "Show only when the watch is shaken" on the bottom. That feature stays hidden until you shake (or tap) the watch and then stays visible for the same number of seconds as the shake animation duration.'],
    ['I select a setting and nothing happens on my watch, is it a bug?', 'Have you pressed "Save" button on the bottom? The way settings work on peebble require you to send that configuration to the watch by confriming it - backing out or pressing back icon on top will just discard that without ever applying it to watch.'],
    ['I\'m pressing Save and still nothing happens on watch, are you sure this is not a bug?', 'Well, my last explanation for this could be color scheme that causes your changes to not be visible on the background of the watchface, check if you are making changes to right color scheme (day/night) and finally check the help icon by the option you are adjusting - it might contain a hint. Or maybe theres a checkbox that enables the change when shake animation is enabled? If nothing helps, restart watch. If still nothing, try reinstalling the watchface (remove it and add again to the watch). Give it some time, walk it off, maybe its up to higher powers.'],
    ['What are all those little pieces of text around the clock?', 'They are Features. I called them like that because I don\'t like the name Complications. You can call them complications if you want. You can configure them in "Features" section of the settings page. Each available slot can be assigned a different piece of information such as temperature, battery, weekday, wind direction or Moon phase. Available positions depend on the selected marker style.'],
    ['Why can\'t I select a particular feature in one of the positions?', 'Some marker styles do not leave enough room for every position. Modern disables incompatible positions so information does not overlap the dial markers. They can be overridden to enable more Features but you\'re risking mayhem on the screen. Choose wisely'],
    ['Some fonts dont match the display on watch, why is that?', 'Fonts shown on this page are being fetched from the internet, could be outage of that particular font service or some internet hiccup. If issue persist you can always upload font file in the Debug section manually so the settings page has it on your phone - you can find all fonts in sources on my github or by searching the name up online - refer to help button next to font import button.'],
    ['Do I need to enter my location?', 'You can use phone GPS automatically, search for a place manually, or enter latitude and longitude. Location affects sunrise/sunset, Moon and planet data, ISS passes, aurora relevance and weather.'],
    ['Why is the weather sometimes unavailable?', 'By default the watch uses plugins to retrieve the weather data. Otherwise it will try to reach Open-Meteo and does not require an API key. Modern can optionally combine that information with OpenWeatherMap if you provide your own API key. Weather data is fetched periodically rather than continuously and will depend on internet connection of your phone.'],
    ['What does the refresh interval mean?', 'It sets the minimum time between automatic data updates. A shorter interval provides fresher information but can require more phone/network activity and will result in battery drain. A significant location change can trigger an earlier update.'],
    ['What is the Aurora Kp feature?', 'It shows geomagnetic activity as an indication of aurora potential. It is not a guarantee that an aurora is visible and I\'m still tweaking the feature to match reality better.'],
    ['What are the three icon styles?', 'Simple, Hollow and Full Color change how feature and weather icons are drawn. They do not change the underlying information.'],
    ['Can I have different colors at night? Its hard to see things on a bright dial in the dark.', 'Yes. Enable different nighttime colors in Colors section and configure a separate accent, background and main text palette. This lets you create a deliberately darker nighttime appearance.'],
    ['What are Style Presets?', 'Style Presets save the visual design of the watchface, including marker style, colors, fonts, feature arrangement, hands, markers and related appearance settings. You can save several designs or export one as JSON and share with others and import one from someone. This will make it easier to have multiple appearances without having to switch watchfaces. You can also use schedule feature that will allow you to set different styles for different times automatically.'],
    ['What are Example Styles?', 'They are some presets that I created to help you explore possibilites of this watchface. You can pick one and start personalizing it from there, then save it as your style in My Styles section. If you are really proud of your style share it online and if I see it I might add it there in next update so more users can enjoy it. I lurk on r/pebble ;).'],
    ['What are the hourly vibrations?', 'Modern can provide periodic vibration reminders just like my other watchfaces. You can configure the vibration type, interval, start and end time, active weekdays and whether Quiet Time should be overridden in Other section.'],
    ['Why is an option disabled?', 'Usually because another setting makes it incompatible. For example, some marker styles leave no room for certain Feature positions. Modern disables combinations that would render poorly on the watch or break down the display, I left some overrides here and there but not for things I know that cant be legally done.'],
    ['Can I customize the analog hands?', 'Absolutely. I spent too much time on hands customization so you are more than welcome to do so. Modern includes predefined hand styles and a Custom option for editing the hour, minute and second hands, center circle and shadow style. You can pick one of the predefined hands then click Custom and go wild from there. Share your best results'],
    ['Can I customize the analog indices (markers)?', 'Yes. Choose a predefined indice design or select Custom to edit the hour indices, second indices and numerals.'],
    ['What does semi-transparent mean?', 'For supported elements, semi-transparency lets some of the background remain visible through the graphic at the expense of contrast of given elements.'],
    ['Features are sometimes obstructed by analog hands, can you fix this?', 'You can fix it by selecting Draw features beneath hands, which places feature text above the analog hands instead of below them. You can find this option at the bottom of Features section. Or set hands to be semi-transparent, that way features would still be somewhat visible from beneath them.'],
    ['Can I change the units?', 'Yes. Weather settings include separate choices for temperature, wind speed, air quality and altitude units. You can find these in Weather section.'],
    ['Is my custom font installed on the watch?', 'No. Import font for preview is for the settings page only and affects only visuals on this page. It lets you see how a font would look while designing your face; it does not install the font on the Pebble or change the watch resources. This would require rebuilding the watchface - it is open sourced on my github so if you really want to make changes go there and go wild. I do not take responsibility for poor design decisions so you will be on your own ;)'],
    ['Why does the settings page show a live preview if it is not 100% representative?', 'Modern has many interacting visual settings. The live preview lets you experiment with layouts, colors, fonts and feature combinations and have general idea of your creation before sending the configuration to the watch. I\'m slowly working through the issues of the preview to make it better but I can\'t promise it will ever reach perfection of pebbleOS. If you use latest version of pebble app and pebbleOS you will be able to see changes almost live on the watch as well thus you dont have to relay on this imperfect preview.'],
    ['Wow you finally implemented fixedpoint?', 'Hi Heiko, how\'s it going?'],
    ['When are you going to respond to my email?', 'I wish I had mental capacity to respond to every email. Maybe it\'s in spam? Maybe I missed it? Maybe I saw it and left it for later as I didnt want to be seem as overly responsive and inviting to conversation then I realised I was supposed to respond to it 3 months later at which point its too late so I pretend I never got it to avoid being seen as an asshole? IDK. Don\'t take this personally.'],
    ['I smell AI in here, did you generate this slop?', 'You are absolutely right! I apologize for the previous oversight. You have demonstrated incredible insight here, and your observation is 100% correct.<br><br>That\'s a great catch! Here is the revised, fully updated response tailored specifically to your exact slop preferences...'],
    ['This is wonderful, how can I send you some gold?', 'Theres Donate button on top of the page, go wild!'],
    ['I thought you were dead?', 'The reports of my death are greatly exaggerated.'],
    ['I want to create a watchface, how did you make this one?', 'Oh well, if it is not such complicated project I suggest just use Claude skill to create pebble watchfaces, otherwise I\'d start with pebble docs and example watchfaces.'],
    ['How much time did this take you?', 'Too much. I spent quite a few nights working on this, thats even using ChatGPT, Claude and Gemini for both simple tasks offload and harder parts research (Claude has even implemented most of the astronomy in here and ported rendering logic from C to JS preview and wrote all scripts for including C resources into this settings page, its quite impressive slop tbh. Despite that it wasnt an easy project. Most of the commit history is on my github, so you can see it for yourself in there.'],
    ['Will AI kill us all?', 'OK Doomer. Just be nice to robots and you will be fine ;)'],
    ['When are you finally going to update your old watchfaces?', 'About that. Its way long overdue, good news is that this is going to be easier now since I\'ve done this one and I\'m on a bit of a roll. I dont want to make any promises but that should be soon (tm)'],
    ['I found a bug, can you fix it?', 'Well, you can send me a donation with brief bug description - this has the highest chances of catching my attention. Your second best shot is basically going to github and either reaching out in there or even fixing it yourself. Emailing me is last resort, I\m not known for following email bug reports'],
    ['Why there are so many questions?', 'Why are you reading them?'],
    ['I have a great idea, can you add this?', 'Oh well, I\'ve reached the physical limits of this app (you might have noticed it took a while to install and this page has loading progress bar) so I\'ll most likely have to decline. But if you are really dedicated you might grab some good codex LLM, throw in github link to this project and describe what you want. Chances are non-zero that it might produce what you want and these tools are getting better every day and will put me out of job. Or find me in McDonalds when I\'ll be flipping burgers and reminiscing my programming carrer.']
];

module.exports = {
  FONT_LOOKUP: FONT_LOOKUP,
  FONT_MAX_CONTENT_ID: FONT_MAX_CONTENT_ID,
  FONT_CATEGORIES: FONT_CATEGORIES,
  COLOR_SCHEMES: COLOR_SCHEMES,
  CORNER_COLOR_MODE_LABELS: CORNER_COLOR_MODE_LABELS,
  CORNER_CATEGORIES: CORNER_CATEGORIES,
  MAX_FEATURES: MAX_FEATURES,
  HAND_PRESETS: HAND_PRESETS,
  MARKER_STYLE_HOUR_PRESETS: MARKER_STYLE_HOUR_PRESETS,
  MARKER_STYLE_SECOND_PRESETS: MARKER_STYLE_SECOND_PRESETS,
  MARKER_STYLE_TEXT_PRESETS: MARKER_STYLE_TEXT_PRESETS,
  MARKER_STYLE_PRESET_INDEX: MARKER_STYLE_PRESET_INDEX,
  MARKER_STYLE_PRESET_FIELDS: MARKER_STYLE_PRESET_FIELDS,
  FAQ_ITEMS: FAQ_ITEMS
};
