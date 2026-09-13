// Minimal static file server for the browser test suites.
//
// Unlike script/test_server.js this server never rebuilds and never
// watches the working tree, so it cannot interfere with a running
// Playwright session (which writes into test-results/).
//
// Usage: node script/static_server.js  (PORT / HOST may be set)

var http = require('http');
var path = require('path');
var url = require('url');
var fs = require('fs');

var PORT = +process.env.PORT || 9292;
var HOST = process.env.HOST || '127.0.0.1';
var ROOT = process.cwd();

var CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.png': 'image/png'
};

http
  .createServer(function (req, res) {
    var pathname = decodeURIComponent(url.parse(req.url).pathname);
    var filepath = path.join(ROOT, path.normalize(pathname));

    // never serve anything outside the repository
    if (filepath.indexOf(ROOT) !== 0) {
      res.statusCode = 403;
      res.end('403 Forbidden\n');
      return;
    }

    fs.readFile(filepath, function (err, data) {
      if (err) {
        res.statusCode =
          err.code === 'ENOENT' || err.code === 'EISDIR' ? 404 : 500;
        res.end(res.statusCode + ' ' + pathname + '\n');
        return;
      }
      var type = CONTENT_TYPES[path.extname(filepath).toLowerCase()];
      if (type) res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'no-store');
      res.end(data);
    });
  })
  .listen(PORT, HOST, function () {
    console.log('static server listening on http://' + HOST + ':' + PORT);
  });
