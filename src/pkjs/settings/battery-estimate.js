// Battery usage estimate: turns the current settings into a ranking (1-5 segments) plus a per-item breakdown.
//
// One pure function, used by the settings page (embedded with toString(), like slot-availability.js) and by
// the tests (tests/pkjs/battery-estimate.test.js). It reads only its two arguments and has no outside
// references, so it must stay self-contained: every constant lives INSIDE the function.
//
//   s    the object collectSettings() builds in the settings page (CONFIG_* keys)
//   env  { round: bool, bw: bool,
//          avail: { upper, bottom, left, right, cornersGrayed }   (computeSlotAvailability())
//          primSeq:  { <content id>: [primitive ids] }             (PRIMITIVE_TRANSPORT_SEQUENCES)
//          primKind: { <primitive id>: [draw, tag] } }             (battery-estimate.primitiveKinds())
//
// Returns { raw, total, scale, segments, label, rows: [{ id, label, why, star, raw, pct }] } where rows are
// sorted by cost, `raw` is the unscaled point value and `pct` the share after scaling to at most 100.
//
// The points are RELATIVE, not milliwatts: they rank settings against each other. docs/BATTERY_ESTIMATE.md
// explains where every number comes from (code analysis, not measurements) and how to recalibrate them.
function estimateBatteryUsage(s, env) {
  // ---- tunable constants (all points are "per day of typical use") ------------------------------------
  var K = {
    LIFE_BASE: 110,             // battery life model: reduction = raw / (raw + LIFE_BASE). Calibrated so that a second hand
                                // (about 150 points) cuts battery life by roughly 55-60%, and a very heavy configuration
                                // approaches 80%; it can never reach 100% (an empty battery in no time).
    SAVER_OFF: 14,              // battery saver off: about 6 idle night hours a day (2 h after the last shake, then rest)
                                // keep ticking, refreshing and checking the location for nothing: roughly 12% of battery life
    SECONDS_BASE: 150,          // redraw every second instead of every minute: 60x the frames, so by far the biggest item
    SECONDS_COMPLICATION: 130,   // only a complication needs the tick: the second hand itself is not drawn
    SECONDS_MIN_SHARE: 0.6,     // redrawing 60x as often carries every other drawing cost 60x too, so seconds is never below this share of the total
    SECONDS_DRAW_FACTOR: 5,     // while seconds are live, decorations (outlines, shadows, text...) are redrawn 60x as often;
                                // the fixed per-frame cost is already inside SECONDS_BASE, so only 5x here
    SAVER_AWAKE_SHARE: 0.55,    // battery saver: share of the day the watch is not resting (2 h after the last shake)
    HAND_TRANSLUCENT: 2,        // per hand: dithered fill, one 1x1 rectangle per pixel
    HAND_OUTLINE: 0.5,            // per hand: thin outline
    HAND_OUTLINE_THICK: 2.5,      // per hand: thick outline = the thin one repeated in 8 more directions
    HAND_SHADOW: 1,             // per hand: a second polygon
    HAND_SHADOW_DITHERED: 2,    // per hand: the shadow is dithered (settings default), per-pixel again
    HAND_HOLLOW: 1.5,           // per hand: ring fill tests two polygons per pixel
    BG_IMAGE: 4,
    BG_TRANSLUCENT: 2,
    BG_NO_CACHE: 5,             // plugin picture kept in RAM only: re-sent over Bluetooth after every restart
    BORDER_WEATHER: 1.5,
    BORDER_CALENDAR: 2.5,
    PRIM_TEXT: 0.2,
    PRIM_ICON: 0.35,
    PRIM_PUNCT: 0.1,
    OUTLINE_THIN: 0.3,          // per drawn text/icon primitive: content is drawn 4 more times
    OUTLINE_THICK: 0.9,         // ... or 12 more times
    SHAKE_ONLY_SHARE: 0.4,      // a "show only on shake" complication is recomputed but drawn only after a shake
    HEALTH_HR: 0.3, HEALTH_STEPS: 0.1, HEALTH_SLEEP: 0.4,   // per primitive: health database read every minute
    COMPASS: 10,                // 15 s of magnetometer + 30 Hz smoothing timer per shake
    PLUGIN_TEXT: 1,             // per plugin text: each plugin update re-sends layout + slot table
    PHONE_BATTERY: 3,           // phone battery follows the phone's charge level
    MUSIC: 4,                   // track/playback changes re-send layout + slot table
    SHAKE_SMOOTH_PER_S: 1,      // 30 fps full redraw
    SHAKE_TRANSLUCENT_PER_S: 0.15, // hands translucent alone: one redraw every 0.5 s
    SHAKE_ONLY_COMPLICATIONS: 0.3,
    STARTUP_HANDS: 1.5, STARTUP_INDEX: 1.5,   // 1.4 s at 25 fps, once per watchface start
    REFRESH_UNIT: 0.06,         // per phone data refresh (location, 3-6 downloads, ~10 messages to the watch)
    EXTRA_SOURCE: 0.25,         // each extra download per refresh, as a share of a refresh
    MANUAL_LOCATION: 0.8,       // no position lookup per refresh
    LOC_CHECK_UNIT: 0.012,      // per periodic position check
    ASSUMED_TRAVEL_KM: 60,      // distance moved per day, to turn "refresh every N km" into refreshes per day
    VIBE: 0.25,                 // per vibration: motor + 10 s of 1 Hz flash redraws
    BT_LOST_VIBE: 0.5
  };
  var STAR_SECONDS = 'This makes the watch redraw the screen every second instead of every minute.';
  var STAR_IMAGE = 'This varies with how often the image changes.';
  var STAR_SHAKE = 'This depends on how you use the watch: more shakes mean more battery use.';
  var STAR_EVENTS = 'This depends on how often the data changes.';
  var STAR_NIGHT = 'This depends on how many hours the watch sits unused each day (typically overnight).';
  var STAR_TRAVEL = 'This depends on how much you travel.';
  var STAR_LAUNCH = 'This depends on how often the watchface restarts (for example after using another app).';

  function on(v) { return v === true || v === 'true' || v === 1 || v === '1' || v === 'on'; }
  function num(v, def, lo, hi) {
    var n = parseFloat(v);
    if (isNaN(n)) n = def;
    return Math.max(lo, Math.min(hi, n));
  }
  function get(base) {            // the dial-context key if the page has one, else the plain key
    return s[base + '_ANALOG'] !== undefined ? s[base + '_ANALOG'] : s[base];
  }
  function parseCustom(raw) {
    var ids = [];
    String(raw || '').split(',').forEach(function (entry) {
      var id = parseInt(entry.split(':')[0], 10);
      if (!isNaN(id) && id > 0 && id <= 255) ids.push(id);
    });
    return ids;
  }
  function round1(v) { return Math.round(v * 10) / 10; }

  var rows = [];
  function add(id, label, raw, why, star) {
    if (!(raw > 0.0001)) return;
    rows.push({ id: id, label: label, raw: raw, why: why, star: star || null });
  }

  var saver = on(s.CONFIG_BATTERY_SAVER_ENABLED);
  var awake = saver ? K.SAVER_AWAKE_SHARE : 1;
  var avail = env.avail || { upper: true, bottom: true, left: true, right: true, cornersGrayed: false };

  // ---- complications: the primitive sequence of every slot ---------------------------------------------
  var slotDefs = [];
  if (!env.round && !avail.cornersGrayed) {
    ['TL', 'TR', 'BL', 'BR'].forEach(function (c) {
      slotDefs.push({ content: s['CONFIG_CORNER_' + c], custom: s['CONFIG_CORNER_' + c + '_CUSTOM_PRIMS'], shake: s['CONFIG_CORNER_' + c + '_SHAKE'] });
    });
  }
  [['UPPER_MIDDLE_LINE1', 'upper', true], ['UPPER_MIDDLE_LINE2', 'upper', true],
   ['BOTTOM_MIDDLE_LINE1', 'bottom', true], ['BOTTOM_MIDDLE_LINE2', 'bottom', false],
   ['MIDDLE_LEFT_LINE1', 'left', true], ['MIDDLE_LEFT_LINE2', 'left', true],
   ['MIDDLE_RIGHT_LINE1', 'right', true], ['MIDDLE_RIGHT_LINE2', 'right', true]].forEach(function (d) {
    if (!avail[d[1]]) return;
    var base = 'CONFIG_' + d[0];
    slotDefs.push({
      content: d[2] ? get(base + '_CONTENT') : s[base + '_CONTENT'],
      custom: d[2] ? get(base + '_CUSTOM_PRIMS') : s[base + '_CUSTOM_PRIMS'],
      shake: s[base + '_SHAKE']
    });
  });

  var seq = env.primSeq || {}, kinds = env.primKind || {};
  var drawPts = 0, drawables = 0, outlinedPts = 0;
  var secondsComp = false, secondsCompVisible = false, compass = false;
  var health = 0, pluginTexts = 0, phoneBattery = false, music = false, shakeOnlySlots = 0, elements = 0;
  var contentIds = {}, primSeen = {};
  var outlineStyle = parseInt(s.CONFIG_OUTLINE_ENABLED === 'true' ? 1 : (s.CONFIG_OUTLINE_ENABLED === 'false' ? 0 : (s.CONFIG_OUTLINE_ENABLED === undefined ? 1 : s.CONFIG_OUTLINE_ENABLED)), 10);
  if ([0, 1, 2].indexOf(outlineStyle) < 0) outlineStyle = 1;

  slotDefs.forEach(function (slot) {
    var cid = parseInt(slot.content, 10) || 0;
    var custom = parseCustom(slot.custom);
    var ids = custom.length ? custom : (seq[cid] || []);
    if (!ids.length) return;
    if (cid) contentIds[cid] = true;
    var shakeOnly = String(slot.shake) === '1' || slot.shake === true;
    if (shakeOnly) shakeOnlySlots++;
    var share = shakeOnly ? K.SHAKE_ONLY_SHARE : 1;
    ids.forEach(function (id) {
      var k = kinds[id] || ['t', ''];
      primSeen[id] = true;
      var w = k[0] === 'i' ? K.PRIM_ICON : (k[0] === 'p' ? K.PRIM_PUNCT : (k[0] === 's' ? 0 : K.PRIM_TEXT));
      if (w > 0) {
        elements++;
        drawables++;
        drawPts += w * share;
        if (k[0] !== 'p') outlinedPts += share;
      }
      switch (k[1]) {
        case 'seconds': secondsComp = true; if (!shakeOnly) secondsCompVisible = true; break;
        case 'compass': compass = true; break;
        case 'hr': health += K.HEALTH_HR * share; break;
        case 'steps': health += K.HEALTH_STEPS * share; break;
        case 'sleep': health += K.HEALTH_SLEEP * share; break;
        case 'plugin': pluginTexts++; break;
        case 'phone': phoneBattery = true; break;
        case 'music': music = true; break;
      }
    });
  });

  // ---- seconds ------------------------------------------------------------------------------------------
  var secondHand = on(s.CONFIG_SHOW_SECONDS);
  var secondsLive = secondHand || secondsComp;
  var dm = 1;                      // multiplier for everything that is redrawn on every frame
  if (secondsLive) {
    dm = 1 + (K.SECONDS_DRAW_FACTOR - 1) * awake;
    var base = secondHand ? K.SECONDS_BASE : K.SECONDS_COMPLICATION;
    var why = secondHand ? 'The second hand makes the watch redraw every second.' :
      (secondsCompVisible ? 'A seconds complication makes the watch redraw every second.' :
        'A seconds complication, even one shown only on shake, keeps the second-by-second redraw running all day.');
    if (saver) why += ' Battery saver stops it after 2 h without a shake.';
    add('seconds', secondHand ? 'Second hand' : 'Seconds complication', base * awake, why, STAR_SECONDS);
  }
  var frameNote = secondsLive ? ' Drawn every second, not every minute.' : '';

  // ---- hands --------------------------------------------------------------------------------------------
  var hands = [['HOUR'], ['MIN']];
  if (secondHand) hands.push(['SEC']);
  var nTrans = 0, nOutline = 0, nShadow = 0, nHollow = 0;
  hands.forEach(function (h) {
    var p = 'CONFIG_HAND_' + h[0] + '_';
    if (on(s[p + 'TRANSLUCENT'])) nTrans++;
    if (on(s[p + 'OUTLINE_ENABLED'])) nOutline++;
    if (on(s[p + 'SHADOW_ENABLED'])) nShadow++;
    if (on(s[p + 'HOLLOW'])) nHollow++;
  });
  var thickHands = outlineStyle === 2;
  var shadowDithered = s.CONFIG_SHADOW_TRANSLUCENT === undefined ? true : on(s.CONFIG_SHADOW_TRANSLUCENT);
  add('hand_translucent', 'Semi-transparent hands', nTrans * K.HAND_TRANSLUCENT * dm,
      nTrans + (nTrans === 1 ? ' hand is' : ' hands are') + ' drawn pixel by pixel instead of filled.' + frameNote);
  add('hand_outline', 'Hand outlines', nOutline * (thickHands ? K.HAND_OUTLINE_THICK : K.HAND_OUTLINE) * dm,
      nOutline + (nOutline === 1 ? ' hand has' : ' hands have') + (thickHands ? ' a thick outline (drawn 9 times).' : ' an outline.') + frameNote);
  add('hand_shadow', 'Hand shadows', nShadow * (shadowDithered ? K.HAND_SHADOW_DITHERED : K.HAND_SHADOW) * dm,
      nShadow + (nShadow === 1 ? ' hand casts' : ' hands cast') + ' a shadow' + (shadowDithered ? ' (dithered, pixel by pixel).' : '.') + frameNote);
  add('hand_hollow', 'Hollow hands', nHollow * K.HAND_HOLLOW * dm,
      nHollow + (nHollow === 1 ? ' hand is' : ' hands are') + ' drawn as a ring.' + frameNote);

  // ---- background and border ----------------------------------------------------------------------------
  var custom = on(s.CONFIG_USE_CUSTOM_BG);
  var weatherBg = !env.bw && on(s.CONFIG_USE_WEATHER_BG) && !custom;
  var pluginBg = on(s.CONFIG_USE_PLUGIN_BG) && !custom && !weatherBg;
  var bgOn = custom || weatherBg || pluginBg;
  if (bgOn) {
    add('bg_image', pluginBg ? 'Plugin background picture' : (weatherBg ? 'Weather background' : 'Background image'), K.BG_IMAGE,
        'Needs extra memory and a rebuilt dial whenever the colors or the picture change.');
    if (on(s.CONFIG_BG_TRANSLUCENT)) add('bg_translucent', 'Translucent background', K.BG_TRANSLUCENT,
        'Every other pixel of the picture is drawn when the dial is rebuilt.');
    if (pluginBg && !on(s.CONFIG_PLUGIN_BG_CACHE)) add('bg_nocache', 'Picture not cached on the watch', K.BG_NO_CACHE,
        'The whole picture is sent over Bluetooth again after every watchface restart and every change.', STAR_IMAGE);
  }
  var borderSrc = s.CONFIG_BORDER_SOURCE !== undefined ? parseInt(s.CONFIG_BORDER_SOURCE, 10)
    : (s.CONFIG_BORDER_WEATHER_MODE && s.CONFIG_BORDER_WEATHER_MODE !== '0' ? 1 : 0);
  if (borderSrc === 1) add('border', 'Weather border', K.BORDER_WEATHER, 'A ring painted into the dial, rebuilt when its colors change (every hour).');
  if (borderSrc === 2) add('border', 'Calendar border', K.BORDER_CALENDAR, 'A ring painted into the dial; every calendar change is sent to the watch.');

  // ---- complications ------------------------------------------------------------------------------------
  add('complications', 'Complications (' + elements + ' elements)', drawPts * dm,
      'Text and icons drawn on every redraw.' + frameNote);
  if (outlineStyle > 0) add('comp_outline', 'Complication outlines', outlinedPts * (outlineStyle === 2 ? K.OUTLINE_THICK : K.OUTLINE_THIN) * dm,
      'Every text and icon is drawn ' + (outlineStyle === 2 ? '12' : '4') + ' extra times for its ' + (outlineStyle === 2 ? 'thick' : 'thin') + ' outline.' + frameNote);
  add('health', 'Health data', health, 'Step, sleep and heart-rate values are read from the health database every minute.');
  if (compass) add('compass', 'Compass', K.COMPASS, 'Each shake runs the compass sensor and a 30 Hz smoothing timer for 15 seconds.', STAR_SHAKE);
  add('plugin_text', 'Plugin texts (' + pluginTexts + ')', pluginTexts * K.PLUGIN_TEXT,
      'Each plugin update re-sends the layout to the watch.', STAR_EVENTS);
  if (phoneBattery) add('phone_battery', 'Phone battery', K.PHONE_BATTERY, 'Follows the phone charge, so it sends to the watch whenever the level changes.', STAR_EVENTS);
  if (music) add('music', 'Music', K.MUSIC, 'Every track or play/pause change is sent to the watch.', STAR_EVENTS);

  // ---- shake --------------------------------------------------------------------------------------------
  var shakeSecs = parseInt(s.CONFIG_SHAKE_LABEL_SECONDS, 10);
  if (isNaN(shakeSecs)) shakeSecs = 3;
  if (shakeSecs <= 0) shakeSecs = 3;           // the watch treats 0 as "default"
  shakeSecs = Math.min(shakeSecs, 30);
  var animMode = parseInt(s.CONFIG_SHAKE_ANIM_MODE, 10);
  var smooth = (animMode === 1 || animMode === 3) && secondHand;   // the watch ignores smooth seconds while the second hand is off
  var shakeTrans = on(s.CONFIG_SHAKE_HANDS_TRANSLUCENT);
  if (smooth) add('shake_smooth', 'Smooth second hand on shake', shakeSecs * K.SHAKE_SMOOTH_PER_S,
      shakeSecs + ' s of 30 frames per second after each shake.', STAR_SHAKE);
  if (shakeTrans) add('shake_translucent', 'Semi-transparent hands on shake',
      shakeSecs * (smooth ? K.SHAKE_SMOOTH_PER_S : K.SHAKE_TRANSLUCENT_PER_S),
      smooth ? 'Hands are drawn pixel by pixel at 30 frames per second.' : 'Hands are redrawn twice a second while the effect lasts.', STAR_SHAKE);
  var borderShake = borderSrc > 0 && on(s.CONFIG_BORDER_WEATHER_SHAKE);
  if (shakeOnlySlots > 0 || borderShake) add('shake_only', 'Shown only on shake', K.SHAKE_ONLY_COMPLICATIONS,
      'Each shake opens a ' + shakeSecs + ' s window with extra redraws.', STAR_SHAKE);

  // ---- launch animations --------------------------------------------------------------------------------
  if (String(s.CONFIG_STARTUP_CLOCK_ANIM_MODE) === '1') add('startup_hands', 'Startup hand animation', K.STARTUP_HANDS,
      'The hands sweep in for 1.4 s at 25 frames per second.', STAR_LAUNCH);
  var markerStyle = parseInt(s.CONFIG_BIG_ANALOG_MARKER_STYLE, 10);
  var bitmapMarker = (markerStyle >= 3 && markerStyle <= 7) || (markerStyle >= 11 && markerStyle <= 19);
  var idxAnim = parseInt(s.CONFIG_BG_ANIM_MODE, 10);
  if ((idxAnim === 1 || idxAnim === 2) && !bitmapMarker) add('startup_index', 'Startup index animation', K.STARTUP_INDEX,
      'The indices animate in for 1.4 s at 25 frames per second.', STAR_LAUNCH);

  // ---- phone refreshes ----------------------------------------------------------------------------------
  var mins = num(s.CONFIG_UPDATE_MINS, 60, 5, 180);
  var perDay = 1440 / mins;
  var autoLoc = s.CONFIG_AUTO_LOC === undefined ? true : on(s.CONFIG_AUTO_LOC);
  // While the watch rests (battery saver) the phone refreshes at most hourly.
  var effPerDay = awake * perDay + (1 - awake) * Math.min(perDay, 24);
  var refresh = K.REFRESH_UNIT * effPerDay * (autoLoc ? 1 : K.MANUAL_LOCATION);
  var every = mins % 60 === 0 ? (mins / 60) + ' h' : mins + ' min';
  add('refresh', 'Data refresh every ' + every, refresh,
      round1(perDay) + ' refreshes a day: position, weather and astronomy downloads, then several messages to the watch.' +
      (saver ? ' Hourly at most while the watch rests.' : ''));
  var extras = 0, extraNames = [];
  var hasPrim = function (names) { return names.some(function (id) { return primSeen[id]; }); };
  if (contentIds[36] || hasPrim(env.aqiPrims || [])) { extras++; extraNames.push('air quality'); }
  if (contentIds[83] || hasPrim(env.issPrims || [])) { extras++; extraNames.push('ISS passes'); }
  if (contentIds[84] || hasPrim(env.auroraPrims || [])) { extras++; extraNames.push('aurora'); }
  if (String(s.CONFIG_OWM_KEY || '') !== '') { extras++; extraNames.push('OpenWeatherMap'); }
  if (extras) add('refresh_extra', 'Extra downloads', refresh * K.EXTRA_SOURCE * extras,
      'Each refresh also downloads ' + extraNames.join(', ') + '.');
  var trigger = autoLoc && (s.CONFIG_LOC_TRIGGER_ENABLED === undefined ? true : on(s.CONFIG_LOC_TRIGGER_ENABLED));
  if (trigger) {
    var checkMins = num(s.CONFIG_LOC_CHECK_MINS, 15, 5, 120);
    add('loc_check', 'Location checks every ' + (checkMins % 60 === 0 ? (checkMins / 60) + ' h' : checkMins + ' min'),
        K.LOC_CHECK_UNIT * (1440 / checkMins) * awake, 'The phone looks up your position ' + Math.round(1440 / checkMins) + ' times a day.' + (saver ? ' Paused while the watch rests.' : ''));
    var km = num(s.CONFIG_LOC_TRIGGER_KM, 10, 10, 200);
    var extraRefresh = Math.min(K.ASSUMED_TRAVEL_KM / km, perDay);
    add('loc_trigger', 'Refresh when moving ' + km + ' km', K.REFRESH_UNIT * extraRefresh,
        'Each ' + km + ' km you travel adds a full refresh (about ' + round1(extraRefresh) + ' a day at ' + K.ASSUMED_TRAVEL_KM + ' km of travel).', STAR_TRAVEL);
  }

  // ---- vibration ----------------------------------------------------------------------------------------
  var vibeMode = parseInt(s.CONFIG_HOURLY_VIBE_MODE, 10) || 0;
  if (vibeMode === 1 || vibeMode === 2) {
    var toMin = function (t, def) {
      var m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : def;
    };
    var start = toMin(s.CONFIG_HOURLY_VIBE_START_TIME, 0), end = toMin(s.CONFIG_HOURLY_VIBE_END_TIME, 0);
    var interval = num(s.CONFIG_HOURLY_VIBE_INTERVAL_MIN, 30, 1, 180);
    var mask = s.CONFIG_HOURLY_VIBE_DAYS_MASK === undefined ? 127 : (parseInt(s.CONFIG_HOURLY_VIBE_DAYS_MASK, 10) || 0);
    var days = 0;
    for (var b = 0; b < 7; b++) if ((mask >> b) & 1) days++;
    var events = 0;
    for (var minute = 0; minute < 1440; minute++) {
      var inRange = start === end ? true : (start < end ? (minute >= start && minute <= end) : (minute >= start || minute <= end));
      if (!inRange) continue;
      if (vibeMode === 1 ? minute % 60 === 0 : minute % interval === 0) events++;
    }
    var perActiveDay = events * days / 7;
    add('vibe', 'Vibration reminders (' + round1(perActiveDay) + ' a day)', perActiveDay * K.VIBE,
        'Motor pulse plus a 10 s flash of the hands, ' + (vibeMode === 1 ? 'on every full hour' : 'every ' + interval + ' min') + ' in the active window.');
  }
  if (parseInt(s.CONFIG_BT_LOST_VIBE, 10) > 0) add('bt_vibe', 'Vibration when Bluetooth drops', K.BT_LOST_VIBE,
      'A pulse and a one-minute flashing Bluetooth icon each time the phone connection is lost.', STAR_EVENTS);

  if (!saver) add('no_saver', 'Battery saver is off', K.SAVER_OFF,
      'Overnight the watch keeps drawing, refreshing and checking the location for nothing; with the saver on it rests after 2 hours without a shake.', STAR_NIGHT);

  // ---- totals -------------------------------------------------------------------------------------------
  if (secondsLive) {
    var others = 0, secRow = null;
    rows.forEach(function (r) { if (r.id === 'seconds') secRow = r; else others += r.raw; });
    var floor = others * K.SECONDS_MIN_SHARE / (1 - K.SECONDS_MIN_SHARE);
    if (secRow && secRow.raw < floor) secRow.raw = floor;
  }
  rows.sort(function (a, b) { return b.raw - a.raw; });
  var raw = 0;
  rows.forEach(function (r) { raw += r.raw; });
  var total = Math.min(100, raw);
  var scale = raw > 100 ? 100 / raw : 1;
  rows.forEach(function (r) { r.pct = r.raw * scale; });
  var reduction = 100 * raw / (raw + K.LIFE_BASE);          // estimated cut of battery life, in percent
  rows.forEach(function (r) { r.cut = raw > 0 ? reduction * r.raw / raw : 0; });
  var segments = total < 20 ? 5 : (total < 40 ? 4 : (total < 60 ? 3 : (total < 80 ? 2 : 1)));
  var labels = { 5: 'very low', 4: 'low', 3: 'medium', 2: 'high', 1: 'very high' };
  return { raw: raw, reduction: reduction, total: total, scale: scale, segments: segments, label: labels[segments], rows: rows, saver: saver, secondsLive: secondsLive };
}

// Which primitives are text, icons or spacers, and which ones carry extra cost, from the generated
// primitive-id table (PRIM_* name -> id). Runs on the phone while the page is built; the result goes
// to the page as env.primKind. Kinds: draw 't' text, 'i' icon, 'p' punctuation, 's' space; tag as in
// estimateBatteryUsage().
function primitiveKinds(PRIM) {
  var out = {};
  Object.keys(PRIM).forEach(function (name) {
    var id = PRIM[name];
    if (!id || name.indexOf('GROUP') >= 0 || name === 'PRIM_ID_COUNT' || name === 'PRIM_PHONE_SLOT') return;
    var d = 't', tag = '';
    if (name === 'PRIM_SPACE') d = 's';
    else if (/^PRIM_(SLASH|DASH|PAREN_OPEN|PAREN_CLOSE|DOT|COMMA)$/.test(name)) d = 'p';
    else if (/ICON$/.test(name) || name === 'PRIM_MEDIA_PROGRESS_BAR') d = 'i';
    if (/^PRIM_(TIME_HMS|SECOND|SECOND_PAD|SECOND_TENS|SECOND_ONES)$/.test(name)) tag = 'seconds';
    else if (name === 'PRIM_COMPASS_DIR_TEXT') tag = 'compass';
    else if (name === 'PRIM_HEART_RATE_VALUE') tag = 'hr';
    else if (name === 'PRIM_STEPS_VALUE' || name === 'PRIM_STEP_GOAL_PCT' || /^PRIM_CALORIES_(ACTIVE_)?VALUE$/.test(name)) tag = 'steps';
    else if (/^PRIM_(SLEEP_|BED_TIME_TEXT|WAKE_TIME)/.test(name) && !/ICON$/.test(name)) tag = 'sleep';
    else if (name === 'PRIM_PLUGIN_TEXT') tag = 'plugin';
    else if (name === 'PRIM_PHONE_BATTERY_TEXT' || name === 'PRIM_PHONE_ICON') tag = 'phone';
    else if (/^PRIM_MEDIA_/.test(name)) tag = 'music';
    out[id] = tag ? [d, tag] : [d, ''];
  });
  return out;
}

// Primitive ids whose data comes from an extra download on every refresh.
function downloadPrimitives(PRIM) {
  function ids(names) { return names.map(function (n) { return PRIM[n]; }).filter(function (v) { return !!v; }); }
  return {
    aqi: ids(['PRIM_AQI_TEXT', 'PRIM_AQI_VALUE']),
    iss: ids(['PRIM_ISS_ICON', 'PRIM_ISS_NEXT_PASS']),
    aurora: ids(['PRIM_AURORA_ICON', 'PRIM_AURORA_KP', 'PRIM_AURORA_KP_VALUE'])
  };
}

module.exports = {
  estimateBatteryUsage: estimateBatteryUsage,
  primitiveKinds: primitiveKinds,
  downloadPrimitives: downloadPrimitives
};
