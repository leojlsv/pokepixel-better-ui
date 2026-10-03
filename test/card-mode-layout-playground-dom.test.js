import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

test("successful drag to row 5 keeps keyboard focus on the moved box", async () => {
  const html = await readFile("tools/card-mode-layout-playground/index.html", "utf8");
  const dom = new JSDOM(html, { url: "http://127.0.0.1:4178/" });

  for (const select of dom.window.document.querySelectorAll("select")) {
    const max = Number(select.dataset.max || 4);
    for (let value = 1; value <= max; value += 1) {
      const option = dom.window.document.createElement("option");
      option.value = String(value);
      option.textContent = String(value);
      select.append(option);
    }
  }

  for (const key of ["window", "document", "localStorage", "navigator", "FormData"])
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });

  await import(
    pathToFileURL(process.cwd() + "/tools/card-mode-layout-playground/playground.js").href
      + "?focus-regression=4x6"
  );

  const board = dom.window.document.querySelector("[data-layout-board]");
  board.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 400, bottom: 600, width: 400, height: 600,
  });

  const original = board.querySelector('[data-box-id="hunt-summary"]');
  original.focus();
  assert.equal(dom.window.document.activeElement, original);

  const dataTransfer = {
    effectAllowed: "",
    dropEffect: "",
    setData() {},
  };
  const dragStart = new dom.window.Event("dragstart", { bubbles: true, cancelable: true });
  Object.assign(dragStart, { clientX: 25, clientY: 125, dataTransfer });
  original.dispatchEvent(dragStart);

  const drop = new dom.window.Event("drop", { bubbles: true, cancelable: true });
  Object.assign(drop, { clientX: 25, clientY: 425, dataTransfer });
  board.dispatchEvent(drop);

  const dragEnd = new dom.window.Event("dragend", { bubbles: true });
  original.dispatchEvent(dragEnd);

  const moved = board.querySelector('[data-box-id="hunt-summary"]');
  assert.deepEqual(
    [moved.style.gridColumn, moved.style.gridRow],
    ["1 / span 2", "5 / span 1"],
  );
  assert.equal(dom.window.document.activeElement, moved);
});
