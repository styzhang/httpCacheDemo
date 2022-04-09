const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const htmlPath = path.resolve(__dirname, "../public/index.html");
const MODIFIED_SINCE = "if-modified-since";
const NONE_MATCH = 'if-none-match';

function send404 (resp) {
  resp.writeHead(404, { 'Content-Type': 'text/plain' });
  resp.write('404: NOT FOUND');
  resp.end();
}

function sendRespFile (req, resp, filePath) {
  console.log("file path: %s", filePath);
  fs.stat(filePath, function (err, stats) {
    if (err) {
      console.log(err);
      return send404(resp);
    }
    if (stats.isDirectory()) return send404();
    const mimeType = mime.getType(path.basename(filePath));
    const { headers } = req;
    console.log("headers: %s", JSON.stringify(headers));
    const { size, mtime } =  stats;
    const mtimeStr = mtime.toUTCString();
    const sizeHexStr = size.toString(16);
    const mtimeHexStr = mtime.getTime().toString(16);
    const etag = `${sizeHexStr}-${mtimeHexStr}`;
    resp.setHeader('Content-Type', mimeType);
    if (mimeType.endsWith('html')) {
      resp.setHeader('Content-Length', size);
      fs.createReadStream(filePath).pipe(resp);
      return;
    }
    /*
    * HTTP1.0 -- Expires
    * 缺点：
    * 该过期时间是以客户端时间为准的（通常是PC），如果客户端与资源所在的服务端(origin server)的时间不同步，缓存过期时间则会有误差
    * 缓存过期后，不管资源有无变化，客户端会再次向服务器发起该资源的请求
    * */
    resp.setHeader('Expires', new Date(Date.now() + 2 * 60 * 1000).toUTCString());
    /*
    * HTTP1.0 -- Pragma: 用来向后兼容只支持 HTTP/1.0 协议的缓存服务器，那时候 HTTP/1.1 协议中的 Cache-Control 还没有出来
    * 效果同Cache-Control
    * */
    // resp.setHeader('Pragma', 'no-cache');
    /*
    * HTTP1.1开始支持Cache-Control、Last-Modified/if-modified-since与ETag/if-none-match
    * Cache-Control优先级大于Expires（如果设置了no-cache/no-store/max-age等Expires会被忽略）
    * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
    * */
    // resp.setHeader('Cache-Control', 'public');
    // resp.setHeader('Cache-Control', 'public, max-age=60');
    // resp.setHeader('Cache-Control', 'private');
    // resp.setHeader('Cache-Control', 'private, max-age=60');
    /*
    * response max-age:
    * request max-age:
    * */
    // resp.setHeader('Cache-Control', 'max-age=60');
    /*
    * response no-cache:
    * 告诉客户端或代理服务器可以缓存该请求的响应内容，但每次复用该缓存时需发一次请求到资源所在的服务端(origin server)验证是否能使用缓存，即协商缓存
    * request no-cache:
    * 效果同与浏览器调试工具网络（Network）页签中设置禁用缓存（Disable cache）或者硬性加载一样
    * request/response no-cache均会让Expires失效
    * */
    // resp.setHeader('Cache-Control', 'no-cache');
    /*
    * response no-store: 告诉客户端或代理服务器不要缓存该请求的响应内容（资源），即使有设置缓存策略
    * request no-store: 客户端不会缓存该请求的响应内容，即使该请求的响应头有设置允许缓存。
    * 当前主流浏览器都不支持请求头中设置Cache-Control: no-store，即使设置也没有效果
    * */
    // resp.setHeader('Cache-Control', 'no-store');
    // resp.setHeader('ETag', etag);
    resp.setHeader('Last-Modified', mtimeStr);
    if (headers[NONE_MATCH] === etag) {
      resp.statusCode = 304;
      resp.end();
      return;
    }
    if (headers[MODIFIED_SINCE] === mtimeStr) {
      resp.statusCode = 304;
      resp.end();
      return;
    }
    resp.setHeader('Content-Length', size);
    fs.createReadStream(filePath).pipe(resp);
  });
}
const server = http.createServer(function (req, resp) {
  let filePath = htmlPath;
  if (req.url !== "/") {
    filePath = './public' + req.url;
  }
  sendRespFile(req, resp, filePath);
});

server.listen(8080, function () {
  console.log('server listening on port 8080');
});
