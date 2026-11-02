// bundled settings page <-> PKJS bridge
var CHUNK_CHARS = 150000;

function install(buildPage, applySettings, pluginManager, preferences) {
  if (typeof Pebble === 'undefined' || typeof Pebble.addEventListener !== 'function') return;
  var pageChunks = [];

  Pebble.addEventListener('configmessage', function (e) {
    var msg = (e && e.data) || {};
    function reply(obj) { try { e.respond(obj); } catch (err) { console.log('modern: config reply failed - ' + err.message); } }
    try {
      switch (msg.type) {
        case 'page': {
          var index = parseInt(msg.index, 10) || 0;
          if (index === 0 || !pageChunks.length) {
            var html = buildPage();
            pageChunks = [];
            for (var i = 0; i < html.length; i += CHUNK_CHARS) pageChunks.push(html.substr(i, CHUNK_CHARS));
          }
          reply({ total: pageChunks.length, chunk: pageChunks[index] || '' });
          if (index >= pageChunks.length - 1) {
            setTimeout(function () { pageChunks = []; }, 60000);
          }
          break;
        }
        case 'settings':
          applySettings(msg.settings || {});
          reply({ ok: true });
          break;
        case 'action':
          applySettings(msg.payload || {});
          reply({ ok: true });
          break;
        case 'plugins':
          reply({ catalogue: pluginManager.readCatalogue() });
          break;
        case 'preferences':
          preferences.capture(3000, function (prefs) { reply({ preferences: prefs }); });
          break;
        default:
          reply({ ok: false, error: 'unknown message' });
      }
    } catch (err) {
      console.log('modern: config message failed - ' + err.message);
      reply({ ok: false, error: err.message });
    }
  });
}

module.exports = { install: install };
