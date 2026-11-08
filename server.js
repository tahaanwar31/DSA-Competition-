// Tiny local web server for Code 21: The Mansion. No packages needed, only Node.js.
// Run:  node server.js        then open  http://localhost:8780
const http = require("http"), fs = require("fs"), path = require("path");

const root = __dirname, port = +process.argv[2] || +process.env.PORT || 8780;
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json",
  ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";
  const p = path.join(root, url);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "Content-Type": types[path.extname(p).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(port, () => console.log(`Code 21: The Mansion is running.\nOpen  http://localhost:${port}  in Chrome.  (Ctrl + C to stop)`));
