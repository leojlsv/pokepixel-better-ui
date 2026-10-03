import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const host = "127.0.0.1";
const port = Number(process.env.PPBUI_CARD_PLAYGROUND_PORT || 4178);

const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/playground.js", ["playground.js", "text/javascript; charset=utf-8"]],
  ["/layout-model.js", ["layout-model.js", "text/javascript; charset=utf-8"]],
]);

const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://" + host).pathname;
  const entry = files.get(path);
  if (!entry) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  try {
    const body = await readFile(join(root, entry[0]));
    response.writeHead(200, {
      "content-type": entry[1],
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Failed to load playground: " + error.message);
  }
});

server.listen(port, host, () => {
  console.log("Card Mode layout playground: http://" + host + ":" + port + "/");
});
