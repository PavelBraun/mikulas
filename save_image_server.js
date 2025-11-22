// save_image_server.js
// Simple local HTTP server to receive base64 image data and save to hotfolder
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOTFOLDER = 'C:\\temp\\mikulas\\hotfolder';
const PORT = 3333;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(HOTFOLDER);

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const obj = JSON.parse(body);
        if (!obj.filename || !obj.data) throw new Error('missing');
        const buf = Buffer.from(obj.data, 'base64');
        const safeName = path.basename(obj.filename);
        const outPath = path.join(HOTFOLDER, safeName);
        fs.writeFileSync(outPath, buf);
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:true, path: outPath}));
        console.log('Saved:', outPath);
      } catch (e) {
        res.writeHead(400, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:false, error: String(e)}));
      }
    });
    return;
  }
  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('save_image_server listening on http://127.0.0.1:' + PORT);
  console.log('Hotfolder:', HOTFOLDER);
});
