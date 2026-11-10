'use strict';
// Tiny local server for out/report.html: serves the report and lets its "Accept as golden" button copy a new
// screenshot over the golden image. Only listens on 127.0.0.1.
var http = require('http');
var fs = require('fs');
var path = require('path');

var NAME = /^[A-Za-z0-9_.-]+$/;

function createServer(dirs) {
  return http.createServer(function (req, res) {
    function send(code, body, type) { res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(body); }
    if (req.method === 'GET' && (req.url === '/' || req.url === '/report.html')) {
      var f = path.join(dirs.outDir, 'report.html');
      if (!fs.existsSync(f)) return send(404, 'no report yet: run the tests first');
      return send(200, fs.readFileSync(f), 'text/html; charset=utf-8');
    }
    if (req.method === 'POST' && req.url === '/update') {
      if (req.headers['x-test-report'] !== '1') return send(403, 'forbidden');
      var host = String(req.headers.host || '').split(':')[0];
      if (host !== '127.0.0.1' && host !== 'localhost') return send(403, 'forbidden');
      var body = '';
      req.on('data', function (d) { body += d; if (body.length > 10000) req.destroy(); });
      req.on('end', function () {
        var j;
        try { j = JSON.parse(body); } catch (e) { return send(400, 'bad json'); }
        if (!NAME.test(String(j.platform)) || !NAME.test(String(j.scenario))) return send(400, 'bad name');
        var src = path.join(dirs.outDir, j.platform, j.scenario + '.png');
        var dst = path.join(dirs.goldenDir, j.platform, j.scenario + '.png');
        if (!fs.existsSync(src)) return send(404, 'no new screenshot for ' + j.platform + '/' + j.scenario);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
        send(200, JSON.stringify({ ok: true, golden: path.relative(process.cwd(), dst) }), 'application/json');
      });
      return;
    }
    send(404, 'not found');
  });
}

module.exports = { createServer: createServer };
