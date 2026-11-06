// Color-role dropdown options (no accent colour on the 1-bit watches: it is always the main colour)
var platform = require('../platform');
function schemeColorOptionsHtml(selected) {
  var sel = selected || '0';
  return (
'<option value="0"' + (sel === '0' ? ' selected' : '') + '>Main color</option>' +
(platform.bw ? '' : '<option value="1"' + (sel === '1' ? ' selected' : '') + '>Accent color</option>') +
'<option value="2"' + (sel === '2' ? ' selected' : '') + '>Background color</option>'
  );
}

module.exports = {
  schemeColorOptionsHtml: schemeColorOptionsHtml
};
