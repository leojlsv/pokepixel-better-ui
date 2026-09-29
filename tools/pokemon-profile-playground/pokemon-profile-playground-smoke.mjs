import { writeFile } from "node:fs/promises";

const [port = "9340", output = "work/pokemon-profile-playground.png", targetOrigin = ""] = process.argv.slice(2);
const screenshotsEnabled = output !== "-";
const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = pages.find(entry => (
  entry.type === "page"
  && entry.url.includes("pokemon-profile-playground.html")
  && (!targetOrigin || entry.url.startsWith(targetOrigin))
));
if (!page?.webSocketDebuggerUrl) throw new Error("Playground page not found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const callId = ++id;
  pending.set(callId, { resolve, reject });
  socket.send(JSON.stringify({ id: callId, method, params }));
});
const evaluate = async expression => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Playground evaluation failed");
  return result.result?.value;
};
const screenshot = async path => {
  if (!screenshotsEnabled) return;
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path, Buffer.from(shot.data, "base64"));
};
const variantOutput = suffix => output.replace(/\.png$/i, "") + suffix + ".png";
const waitFor = async (expression, message) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(message);
};

await send("Page.enable");
console.log("[playground-smoke] page-enabled");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.reload", { ignoreCache: true });
console.log("[playground-smoke] page-reloaded");

await waitFor(`Boolean(document.querySelector('[data-mode="profile"]'))`, "Playground controls did not become ready");
await evaluate(`document.querySelector('[data-mode="profile"]').click()`);
await waitFor(`Boolean(
  document.querySelector('[data-preview]')?.contentDocument
    ?.querySelector('[data-ppbui-profile-facts]')
  && document.querySelector('[data-preview]')?.contentDocument
    ?.querySelector('[data-ppbui-profile-move-power]')
  && document.querySelector('[data-preview]')?.contentDocument
    ?.querySelector('[data-ppbui-playground-choice-rarity] .ppbui-quality-badge')
)`, "Initial Profile preview did not become ready");
console.log("[playground-smoke] initial-profile-ready");

const result = await evaluate(`(async()=>{
  const iframe=document.querySelector('[data-preview]');
  document.querySelector('[data-reset]').click();
  document.querySelector('[data-corners="square"]').click();
  await new Promise(r=>setTimeout(r,30));

  document.querySelector('[data-layout-surface="search"]').click();
  await new Promise(r=>setTimeout(r,20));
  const searchChoice=iframe.contentDocument.querySelector('[data-ppbui-profile-choice]');
  const searchElements=searchChoice.querySelector('[data-ppbui-profile-choice-elements]');
  const searchRarity=searchChoice.querySelector('[data-ppbui-playground-choice-rarity]');
  const searchVisual=searchChoice.querySelector('[data-ppbui-profile-choice-visual]');
  const searchName=searchChoice.querySelector('[data-ppbui-profile-choice-name]');
  const searchBadge=searchRarity?.querySelector('.ppbui-quality-badge');
  const searchDefault={
    keys:[...document.querySelectorAll('[data-layout-key]')].map(node=>node.dataset.layoutKey),
    detached:Boolean(searchRarity&&searchBadge&&searchBadge.parentElement===searchRarity&&!searchElements.contains(searchBadge)),
    visualRow:getComputedStyle(searchVisual).gridRowStart,
    visualColumn:getComputedStyle(searchVisual).gridColumnStart,
    nameRow:getComputedStyle(searchName).gridRowStart,
    nameColumnEnd:getComputedStyle(searchName).gridColumnEnd,
    elementsRow:getComputedStyle(searchElements).gridRowStart,
    rarityRow:getComputedStyle(searchRarity).gridRowStart,
    rarityColumnEnd:getComputedStyle(searchRarity).gridColumnEnd,
    columns:getComputedStyle(searchChoice).gridTemplateColumns,
  };
  const profileRoot=iframe.contentDocument.querySelector('[data-ppbui-pokemon-profile-window]');
  const previewTitle=iframe.contentDocument.querySelector('[data-ppbui-profile-title]');
  const choiceElement=iframe.contentDocument.querySelector('[data-ppbui-profile-choice-element]');
  const typeElement=iframe.contentDocument.querySelector('[data-ppbui-profile-type-icon]');
  const moveElement=iframe.contentDocument.querySelector('[data-ppbui-profile-move-element]');
  const typeInner=typeElement?.querySelector('.ppbui-element-icon');
  const gamePalette={
    selected:document.querySelector('[data-skin="custom"]').getAttribute('aria-pressed'),
    controls:document.querySelectorAll('[data-color-key]').length,
    windowBg:getComputedStyle(profileRoot).backgroundColor,
    windowLine:getComputedStyle(profileRoot).borderTopColor,
    windowLineWidth:getComputedStyle(profileRoot).borderTopWidth,
    pickerBg:getComputedStyle(iframe.contentDocument.querySelector('[data-ppbui-profile-picker]')).backgroundColor,
    currentBg:getComputedStyle(iframe.contentDocument.querySelector('[data-ppbui-profile-current]')).backgroundColor,
    windowHex:document.querySelector('[data-color-key="windowBg"][type="text"]').value.toLowerCase(),
    interactiveHex:document.querySelector('[data-color-key="interactiveBg"][type="text"]').value.toLowerCase(),
    lineHex:document.querySelector('[data-color-key="line"][type="text"]').value.toLowerCase(),
  };
  const previewTypography={
    body:getComputedStyle(iframe.contentDocument.body).fontFamily,
    profile:getComputedStyle(profileRoot).fontFamily,
    title:previewTitle?getComputedStyle(previewTitle).fontFamily:'',
    lab:getComputedStyle(document.body).fontFamily,
    labTitle:getComputedStyle(document.querySelector('.panel h1')).fontFamily,
  };
  const elementEdges={
    hostileRule:Boolean(iframe.contentDocument.querySelector('style[data-preview-host-fidelity]')?.textContent.includes('border-width:2px')),
    choiceOuter:choiceElement?getComputedStyle(choiceElement).borderLeftWidth:'',
    typeOuter:typeElement?getComputedStyle(typeElement).borderLeftWidth:'',
    moveOuter:moveElement?getComputedStyle(moveElement).borderLeftWidth:'',
    typeInner:typeInner?getComputedStyle(typeInner).borderLeftWidth:'',
    typeInnerWidth:typeInner?getComputedStyle(typeInner).width:'',
    typeInnerMinWidth:typeInner?getComputedStyle(typeInner).minWidth:'',
    typeInnerHeight:typeInner?getComputedStyle(typeInner).height:'',
    typeInnerMinHeight:typeInner?getComputedStyle(typeInner).minHeight:'',
    typeInnerPresent:Boolean(typeInner),
  };
  const currentSection=iframe.contentDocument.querySelector('[data-ppbui-profile-current]');
  const savedRow=iframe.contentDocument.querySelector('[data-ppbui-profile-saved]');
  const factCell=iframe.contentDocument.querySelector('[data-ppbui-profile-fact="rarity"]');
  const moveCard=iframe.contentDocument.querySelector('[data-ppbui-profile-move]');
  const sectionHierarchy={
    currentBorder:getComputedStyle(currentSection).borderTopWidth,
    currentRadius:getComputedStyle(currentSection).borderTopLeftRadius,
    currentHeaderDivider:getComputedStyle(currentSection.querySelector(':scope > header')).borderBottomWidth,
    moveBorder:getComputedStyle(moveCard).borderTopWidth,
    factBorder:getComputedStyle(factCell).borderTopWidth,
    savedBorder:savedRow?getComputedStyle(savedRow).borderTopWidth:'',
    savedBackground:savedRow?getComputedStyle(savedRow).backgroundColor:'',
  };
  const squareGeometry={
    rootMode:iframe.contentDocument.documentElement.dataset.ppbuiCorners,
    labMode:document.documentElement.dataset.playgroundCorners,
    rootRadius:getComputedStyle(profileRoot).borderTopLeftRadius,
    controlRadius:getComputedStyle(iframe.contentDocument.querySelector('[data-ppbui-profile-close]')).borderTopLeftRadius,
    badgeRadius:typeElement?getComputedStyle(typeElement).borderTopLeftRadius:'',
    squarePressed:document.querySelector('[data-corners="square"]').getAttribute('aria-pressed'),
    roundedPressed:document.querySelector('[data-corners="rounded"]').getAttribute('aria-pressed'),
  };
  document.querySelector('[data-corners="rounded"]').click();
  await new Promise(r=>setTimeout(r,30));
  const roundedGeometry={
    rootMode:iframe.contentDocument.documentElement.dataset.ppbuiCorners,
    labMode:document.documentElement.dataset.playgroundCorners,
    rootRadius:getComputedStyle(profileRoot).borderTopLeftRadius,
    controlRadius:getComputedStyle(iframe.contentDocument.querySelector('[data-ppbui-profile-close]')).borderTopLeftRadius,
    badgeRadius:typeElement?getComputedStyle(typeElement).borderTopLeftRadius:'',
    squarePressed:document.querySelector('[data-corners="square"]').getAttribute('aria-pressed'),
    roundedPressed:document.querySelector('[data-corners="rounded"]').getAttribute('aria-pressed'),
  };
  document.querySelector('[data-corners="square"]').click();
  await new Promise(r=>setTimeout(r,20));
  const rarityItem=document.querySelector('[data-layout-key="rarity"]');
  const elementsItem=document.querySelector('[data-layout-key="elements"]');
  const searchTransfer=new DataTransfer();
  rarityItem.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:searchTransfer}));
  const elementsRect=elementsItem.getBoundingClientRect();
  elementsItem.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:searchTransfer,clientY:elementsRect.top+1}));
  elementsItem.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:searchTransfer,clientY:elementsRect.top+1}));
  rarityItem.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:searchTransfer}));
  await new Promise(r=>setTimeout(r,30));
  const searchReordered={
    order:[...document.querySelectorAll('[data-layout-key]')].map(node=>node.dataset.layoutKey),
    rarityRow:getComputedStyle(searchRarity).gridRowStart,
    elementsRow:getComputedStyle(searchElements).gridRowStart,
  };
  document.querySelector('[data-layout-reset]').click();
  await new Promise(r=>setTimeout(r,30));

  const power=document.querySelector('[data-setting="powerWidth"]');
  const before=getComputedStyle(iframe.contentDocument.querySelector('[data-ppbui-profile-move-power]')).width;
  power.value='52';
  power.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,40));
  const after=getComputedStyle(iframe.contentDocument.querySelector('[data-ppbui-profile-move-power]')).width;

  document.querySelector('[data-layout-surface="moveMeta"]').click();
  const source=document.querySelector('[data-layout-key="power"]');
  const target=document.querySelector('[data-layout-key="element"]');
  const transfer=new DataTransfer();
  source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));
  const rect=target.getBoundingClientRect();
  target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer,clientY:rect.top+1}));
  target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientY:rect.top+1}));
  source.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:transfer}));
  await new Promise(r=>setTimeout(r,40));
  const moveMeta=iframe.contentDocument.querySelector('[data-ppbui-profile-move-meta]');
  const movePower=iframe.contentDocument.querySelector('[data-ppbui-profile-move-power]');

  document.querySelector('[data-skin="obsidian"]').click();
  await new Promise(r=>setTimeout(r,30));
  const currentBox=iframe.contentDocument.querySelector('[data-ppbui-profile-current]');
  const currentMoveList=iframe.contentDocument.querySelector('[data-ppbui-profile-current] [data-ppbui-profile-move-list]');
  const currentMoveParent=currentMoveList?.parentElement;
  const currentMoveParentStyle=currentMoveParent?getComputedStyle(currentMoveParent):null;
  const currentMoveAvailable=currentMoveParent
    ? currentMoveParent.clientWidth
      - Number.parseFloat(currentMoveParentStyle.paddingLeft||0)
      - Number.parseFloat(currentMoveParentStyle.paddingRight||0)
    : 0;
  const obsidianSurfaces={
    currentBg:getComputedStyle(currentBox).backgroundColor,
    currentBorder:getComputedStyle(currentBox).borderTopColor,
    heroBg:getComputedStyle(iframe.contentDocument.querySelector('[data-ppbui-profile-hero]')).backgroundColor,
    moveBg:getComputedStyle(iframe.contentDocument.querySelector('[data-ppbui-profile-move]')).backgroundColor,
    moveBorder:getComputedStyle(iframe.contentDocument.querySelector('[data-ppbui-profile-move]')).borderTopColor,
    moveListWidth:currentMoveList?.getBoundingClientRect().width||0,
    moveListClientWidth:currentMoveList?.clientWidth||0,
    moveAvailableWidth:currentMoveAvailable,
    moveScrollbarGutter:currentMoveList?getComputedStyle(currentMoveList).scrollbarGutter:'',
  };
  document.querySelector('[data-layout-surface="selectedFacts"]').click();
  document.querySelector('[data-grid-preset="2x4"]').click();
  await new Promise(r=>setTimeout(r,40));

  const item=document.querySelector('[data-grid-item]');
  const placement=(field,value)=>{
    const input=document.querySelector('[data-grid-placement="'+field+'"]');
    input.value=String(value);
    input.dispatchEvent(new Event('change',{bubbles:true}));
  };
  item.value='rarity';
  item.dispatchEvent(new Event('change',{bubbles:true}));
  placement('y',3);
  placement('w',2);
  await new Promise(r=>setTimeout(r,40));

  const facts=iframe.contentDocument.querySelector('[data-ppbui-profile-facts]');
  const rarity=iframe.contentDocument.querySelector('[data-ppbui-profile-fact="rarity"]');
  const root=iframe.contentDocument.querySelector('[data-ppbui-pokemon-profile-window]');
  const userScenarioStyle=getComputedStyle(rarity);
  const userScenario2x4={
    columns:getComputedStyle(facts).gridTemplateColumns,
    rarityColumnStart:userScenarioStyle.gridColumnStart,
    rarityColumnEnd:userScenarioStyle.gridColumnEnd,
    rarityRowStart:userScenarioStyle.gridRowStart,
  };

  const gridSetting=(field,value)=>{
    const input=document.querySelector('[data-grid-setting="'+field+'"]');
    input.value=String(value);
    input.dispatchEvent(new Event('change',{bubbles:true}));
  };
  gridSetting('cols',4);
  gridSetting('rows',3);
  placement('w',4);
  await new Promise(r=>setTimeout(r,40));

  const rarityStyle=getComputedStyle(rarity);
  const gridBeforeCollision={
    columns:getComputedStyle(facts).gridTemplateColumns,
    rarityColumnStart:rarityStyle.gridColumnStart,
    rarityColumnEnd:rarityStyle.gridColumnEnd,
    rarityRowStart:rarityStyle.gridRowStart,
    selectedToken:getComputedStyle(root).getPropertyValue('--ppbui-selected').trim(),
  };

  item.value='gender';
  item.dispatchEvent(new Event('change',{bubbles:true}));
  placement('y',3);
  await new Promise(r=>setTimeout(r,20));
  const collisionStatus=document.querySelector('[data-grid-status]').textContent;
  const gender=iframe.contentDocument.querySelector('[data-ppbui-profile-fact="gender"]');
  const genderRow=getComputedStyle(gender).gridRowStart;
  const gridA11y={
    editorRole:document.querySelector('[data-grid-editor]').getAttribute('role'),
    statusLive:document.querySelector('[data-grid-status]').getAttribute('aria-live'),
    selectedObjectPressed:document.querySelector('[data-grid-object="gender"]').getAttribute('aria-pressed'),
    selectedObjectLabel:document.querySelector('[data-grid-object="gender"]').getAttribute('aria-label'),
  };

  return {
    gamePalette,
    previewTypography,
    elementEdges,
    sectionHierarchy,
    squareGeometry,
    roundedGeometry,
    searchDefault,
    searchReordered,
    obsidianSurfaces,
    before,
    after,
    movePowerOrder:getComputedStyle(movePower).order,
    moveMetaColumns:getComputedStyle(moveMeta).gridTemplateColumns,
    userScenario2x4,
    gridBeforeCollision,
    collisionStatus,
    genderRow,
    gridA11y,
    skinButtonPressed:document.querySelector('[data-skin="obsidian"]').getAttribute('aria-pressed'),
    summary:document.querySelector('[data-summary]').value
  };
})()`);
console.log("[playground-smoke] interaction-contracts-collected");

if (result?.gamePalette?.selected !== "true") throw new Error("Game Palette is not the reset/default skin: " + JSON.stringify(result));
if ((result?.gamePalette?.controls || 0) < 60) throw new Error("Color Lab did not expose paired picker/HEX controls: " + JSON.stringify(result));
if (result?.gamePalette?.windowBg !== "rgba(22, 29, 32, 0.92)" || result?.gamePalette?.pickerBg !== "rgba(35, 44, 46, 0.96)" || result?.gamePalette?.currentBg !== "rgba(35, 44, 46, 0.96)") throw new Error("Game Palette alpha surface defaults drifted: " + JSON.stringify(result));
if (result?.gamePalette?.windowLine !== "rgb(107, 101, 67)" || result?.gamePalette?.windowLineWidth !== "1px") throw new Error("Game Palette 1px line contract drifted: " + JSON.stringify(result));
if (result?.gamePalette?.windowHex !== "#161d20" || result?.gamePalette?.interactiveHex !== "#232c2e" || result?.gamePalette?.lineHex !== "#6b6543") throw new Error("Game Palette requested HEX defaults drifted: " + JSON.stringify(result));
if (/monospace|Consolas|Courier/i.test(result?.previewTypography?.body || "") || /monospace|Consolas|Courier/i.test(result?.previewTypography?.profile || "") || /monospace|Consolas|Courier/i.test(result?.previewTypography?.lab || "")) throw new Error("Playground or preview retained stale monospace UI typography: " + JSON.stringify(result?.previewTypography));
if (!/Cinzel|Georgia|serif/i.test(result?.previewTypography?.title || "") || !/Cinzel|Georgia|serif/i.test(result?.previewTypography?.labTitle || "")) throw new Error("Display/title typography drifted from the current Cinzel/Georgia contract: " + JSON.stringify(result?.previewTypography));
if (!result?.elementEdges?.hostileRule) throw new Error("Preview host-cascade pressure fixture is missing: " + JSON.stringify(result?.elementEdges));
if (result?.elementEdges?.choiceOuter !== "0px" || result?.elementEdges?.typeOuter !== "0px" || result?.elementEdges?.moveOuter !== "0px") throw new Error("Profile Element wrappers regained duplicate chrome under host pressure: " + JSON.stringify(result?.elementEdges));
if (!result?.elementEdges?.typeInnerPresent || result?.elementEdges?.typeInner !== "1px" || result?.elementEdges?.typeInnerWidth !== "20px" || result?.elementEdges?.typeInnerMinWidth !== "20px" || result?.elementEdges?.typeInnerHeight !== "20px" || result?.elementEdges?.typeInnerMinHeight !== "20px") throw new Error("Shared Element icon is not the single exact 20px/1px semantic edge: " + JSON.stringify(result?.elementEdges));
if (result?.sectionHierarchy?.currentBorder !== "1px" || result?.sectionHierarchy?.currentHeaderDivider !== "1px" || result?.sectionHierarchy?.moveBorder !== "0px" || result?.sectionHierarchy?.factBorder !== "0px" || result?.sectionHierarchy?.savedBorder !== "0px") throw new Error("Profile hierarchy reverted to nested border cages: " + JSON.stringify(result?.sectionHierarchy));
if (result?.squareGeometry?.rootMode !== "square" || result?.squareGeometry?.labMode !== "square" || result?.squareGeometry?.rootRadius !== "0px" || result?.squareGeometry?.controlRadius !== "0px" || result?.squareGeometry?.badgeRadius !== "0px" || result?.squareGeometry?.squarePressed !== "true" || result?.squareGeometry?.roundedPressed !== "false") throw new Error("Squared geometry contract failed: " + JSON.stringify(result?.squareGeometry));
if (result?.roundedGeometry?.rootMode !== "rounded" || result?.roundedGeometry?.labMode !== "rounded" || result?.roundedGeometry?.rootRadius !== "8px" || result?.roundedGeometry?.controlRadius !== "5px" || result?.roundedGeometry?.badgeRadius !== "4px" || result?.roundedGeometry?.squarePressed !== "false" || result?.roundedGeometry?.roundedPressed !== "true") throw new Error("Rounded geometry contract failed: " + JSON.stringify(result?.roundedGeometry));
if (result?.searchDefault?.keys?.join(">") !== "visual>name>elements>rarity>stats") throw new Error("Search Element/Rarity controls were not detached: " + JSON.stringify(result));
if (!result?.searchDefault?.detached) throw new Error("Search Rarity badge was not detached from Element: " + JSON.stringify(result));
if (result?.searchDefault?.visualRow !== "1" || result?.searchDefault?.visualColumn !== "1" || result?.searchDefault?.nameRow !== "2" || result?.searchDefault?.nameColumnEnd !== "span 2" || result?.searchDefault?.elementsRow !== "3" || result?.searchDefault?.rarityRow !== "4" || result?.searchDefault?.rarityColumnEnd !== "span 2") throw new Error("Requested default Search 2x5 geometry drifted: " + JSON.stringify(result));
if (String(result?.searchDefault?.columns || "").split(" ").filter(Boolean).length !== 2) throw new Error("Detached default Search row did not preserve side-by-side geometry: " + JSON.stringify(result));
if (result?.searchReordered?.order?.join(">") !== "visual>name>rarity>elements>stats") throw new Error("Search Rarity could not be reordered independently: " + JSON.stringify(result));
if (result?.searchReordered?.rarityRow !== "4" || result?.searchReordered?.elementsRow !== "3") throw new Error("Search grid should remain authoritative while list order is edited: " + JSON.stringify(result));
if (result?.obsidianSurfaces?.currentBg !== "rgb(20, 27, 24)" || result?.obsidianSurfaces?.heroBg !== "rgba(35, 44, 46, 0.96)" || result?.obsidianSurfaces?.moveBg !== "rgb(16, 22, 19)") throw new Error("Obsidian comparison/current-production cascade drifted: " + JSON.stringify(result));
if (result?.obsidianSurfaces?.currentBorder !== "rgb(53, 64, 57)" || result?.obsidianSurfaces?.moveBorder !== "rgb(52, 64, 57)") throw new Error("Obsidian soft-line hierarchy drifted: " + JSON.stringify(result));
if (result?.obsidianSurfaces?.moveScrollbarGutter !== "auto") throw new Error("Current Moves retained a stable scrollbar gutter: " + JSON.stringify(result));
if (Math.abs((result?.obsidianSurfaces?.moveListWidth || 0) - (result?.obsidianSurfaces?.moveAvailableWidth || 0)) > 1.5 || Math.abs((result?.obsidianSurfaces?.moveListClientWidth || 0) - (result?.obsidianSurfaces?.moveAvailableWidth || 0)) > 1.5) throw new Error("Current Moves grid did not consume the full available box width: " + JSON.stringify(result));
if (result?.after !== "52px") throw new Error(`Power width override failed: ${JSON.stringify(result)}`);
if (result?.movePowerOrder !== "0") throw new Error(`Drag reorder failed: ${JSON.stringify(result)}`);
if (!String(result?.moveMetaColumns || "").startsWith("52px 22px")) throw new Error(`Move meta tracks did not follow reordered objects: ${JSON.stringify(result)}`);
if (result?.skinButtonPressed !== "true") throw new Error(`Obsidian toggle failed: ${JSON.stringify(result)}`);
if (String(result?.userScenario2x4?.columns || "").split(" ").filter(Boolean).length !== 2) throw new Error(`2x4 user scenario did not create two columns: ${JSON.stringify(result)}`);
if (result?.userScenario2x4?.rarityColumnStart !== "1" || result?.userScenario2x4?.rarityColumnEnd !== "span 2" || result?.userScenario2x4?.rarityRowStart !== "3") throw new Error(`2x4 full-row scenario failed: ${JSON.stringify(result)}`);
if (String(result?.gridBeforeCollision?.columns || "").split(" ").filter(Boolean).length < 4) throw new Error(`Selected facts grid columns failed: ${JSON.stringify(result)}`);
if (result?.gridBeforeCollision?.rarityColumnStart !== "1" || result?.gridBeforeCollision?.rarityColumnEnd !== "span 4") throw new Error(`Full-row grid span failed: ${JSON.stringify(result)}`);
if (result?.gridBeforeCollision?.rarityRowStart !== "3") throw new Error(`Grid row placement failed: ${JSON.stringify(result)}`);
if (result?.gridBeforeCollision?.selectedToken.toLowerCase() !== "#d2b45d") throw new Error(`Obsidian token override failed: ${JSON.stringify(result)}`);
if (!String(result?.collisionStatus || "").includes("Conflito")) throw new Error(`Grid collision was not rejected visibly: ${JSON.stringify(result)}`);
if (result?.genderRow === "3") throw new Error(`Grid collision mutated the conflicting object: ${JSON.stringify(result)}`);
if (result?.gridA11y?.editorRole !== "group" || result?.gridA11y?.statusLive !== "polite" || result?.gridA11y?.selectedObjectPressed !== "true") throw new Error(`Grid accessibility state failed: ${JSON.stringify(result)}`);
if (!String(result?.gridA11y?.selectedObjectLabel || "").includes("coluna 2")) throw new Error(`Grid object placement label failed: ${JSON.stringify(result)}`);
if (!String(result?.summary || "").includes("powerWidth=52px")) throw new Error(`Summary failed: ${JSON.stringify(result)}`);
if (!String(result?.summary || "").includes("searchOrder=visual>name>elements>rarity>stats")) throw new Error("Detached Search order was not exported: " + JSON.stringify(result));
if (!String(result?.summary || "").includes("grid.search=on:2x5;visual@1,1,1,1;name@1,2,2,1;elements@1,3,1,1;rarity@1,4,2,1;stats@1,5,1,1")) throw new Error("Requested Search 2x5 grid geometry was not exported: " + JSON.stringify(result));
if (!String(result?.summary || "").includes("moveMetaOrder=power>element>category>cooldown")) throw new Error(`Layout order was not exported: ${JSON.stringify(result)}`);
if (!String(result?.summary || "").includes("skin=Obsidian")) throw new Error(`Skin was not exported: ${JSON.stringify(result)}`);
if (!String(result?.summary || "").includes("corners=Squared")) throw new Error(`Corner mode was not exported: ${JSON.stringify(result)}`);
if (!String(result?.summary || "").includes("grid.selectedFacts=on:4x3;rarity@1,3,4,1")) throw new Error(`Grid coordinates/spans were not exported: ${JSON.stringify(result)}`);
console.log("[playground-smoke] core-assertions-pass");

await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });
await new Promise(resolve => setTimeout(resolve, 80));
await screenshot(output);
if (screenshotsEnabled) console.log("[playground-smoke] overview-screenshot-written");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await new Promise(resolve => setTimeout(resolve, 80));
await evaluate(`(()=>{
  const toggle=document.querySelector('[data-grid-toggle]');
  if (toggle.getAttribute('aria-pressed')==='true') toggle.click();
})()`);
await new Promise(resolve => setTimeout(resolve, 60));

await evaluate(`document.querySelector('[data-viewport="760"]').click()`);
await new Promise(resolve => setTimeout(resolve, 180));
await screenshot(variantOutput("-profile-760-obsidian"));
if (screenshotsEnabled) console.log("[playground-smoke] obsidian-760-written");

await evaluate(`document.querySelector('[data-viewport="420"]').click()`);
await new Promise(resolve => setTimeout(resolve, 180));
const profile420 = await evaluate(`({
  stageInlineWidth:document.querySelector('[data-stage]').style.width,
  stageWidth:getComputedStyle(document.querySelector('[data-stage]')).width,
  stageRectWidth:document.querySelector('[data-stage]').getBoundingClientRect().width,
  rootWidth:getComputedStyle(document.querySelector('[data-preview]').contentDocument.querySelector('[data-ppbui-pokemon-profile-window]')).width,
  rootClientWidth:document.querySelector('[data-preview]').contentDocument.querySelector('[data-ppbui-pokemon-profile-window]').clientWidth,
  rootScrollWidth:document.querySelector('[data-preview]').contentDocument.querySelector('[data-ppbui-pokemon-profile-window]').scrollWidth
})`);
if (profile420?.stageInlineWidth !== "420px") throw new Error(`Viewport preset state failed: ${JSON.stringify(profile420)}`);
if (Math.abs(Number.parseFloat(profile420?.stageWidth) - 420) > 0.5) throw new Error(`Viewport transition did not settle at 420px: ${JSON.stringify(profile420)}`);
if (profile420?.rootScrollWidth > profile420?.rootClientWidth) throw new Error(`Profile root overflowed at 420 preset: ${JSON.stringify(profile420)}`);
await screenshot(variantOutput("-profile-420-obsidian"));
if (screenshotsEnabled) console.log("[playground-smoke] obsidian-420-written");

await evaluate(`document.querySelector('[data-viewport="340"]').click()`);
await new Promise(resolve => setTimeout(resolve, 180));
const profile340 = await evaluate(`(()=>{
  const root=document.querySelector('[data-preview]').contentDocument.querySelector('[data-ppbui-pokemon-profile-window]');
  return {
    stageInlineWidth:document.querySelector('[data-stage]').style.width,
    rootWidth:getComputedStyle(root).width,
    rootClientWidth:root.clientWidth,
    rootScrollWidth:root.scrollWidth
  };
})()`);
if (profile340?.stageInlineWidth !== "340px") throw new Error(`340 viewport preset state failed: ${JSON.stringify(profile340)}`);
if (profile340?.rootScrollWidth > profile340?.rootClientWidth) throw new Error(`Profile root overflowed at 340 preset: ${JSON.stringify(profile340)}`);
await screenshot(variantOutput("-profile-340-obsidian"));
if (screenshotsEnabled) console.log("[playground-smoke] obsidian-340-written");

await evaluate(`document.querySelector('[data-viewport="420"]').click()`);
await new Promise(resolve => setTimeout(resolve, 180));
await evaluate(`document.querySelector('[data-mode="hover"]').click()`);
await waitFor(`Boolean(
  document.querySelector('[data-preview]')?.contentDocument
    ?.querySelector('.pokemon-card[data-ppbui-profile-native-card]')
)`, "Native PokémonCard preview did not become ready");
await evaluate(`document.querySelector('[data-skin="custom"]').click()`);
await new Promise(resolve => setTimeout(resolve, 80));
const hoverResult = await evaluate(`(()=>{
  const hover=document.querySelector('[data-preview]').contentDocument.querySelector('.pokemon-card[data-ppbui-profile-native-card]');
  const actions=hover?.querySelector('.pokemon-card__actions');
  return {
    visible:Boolean(hover),
    width:getComputedStyle(hover).width,
    background:getComputedStyle(hover).backgroundColor,
    borderColor:getComputedStyle(hover).borderTopColor,
    borderWidth:getComputedStyle(hover).borderTopWidth,
    actionBg:actions?getComputedStyle(actions.querySelector('.pokemon-card__action')).backgroundColor:'',
    ivText:hover?.querySelector('[data-ppbui-profile-native-iv]')?.textContent||'',
    totalIvHidden:Boolean([...hover.querySelectorAll('.pokemon-card__cell')].find(node=>node.querySelector('.pokemon-card__cell-label')?.textContent==='TOTAL IV')?.hidden),
    rarityHidden:Boolean(hover.querySelector('.pokemon-card__cell.is-rarity')?.hidden),
    stageInlineWidth:document.querySelector('[data-stage]').style.width,
    stageWidth:getComputedStyle(document.querySelector('[data-stage]')).width
  };
})()`);
if (!hoverResult?.visible) throw new Error(`Native Card mode failed: ${JSON.stringify(hoverResult)}`);
if (hoverResult?.stageInlineWidth !== "420px") throw new Error(`Native Card viewport state drifted: ${JSON.stringify(hoverResult)}`);
if (hoverResult?.background !== "rgba(22, 29, 32, 0.92)" || hoverResult?.borderColor !== "rgb(107, 101, 67)" || hoverResult?.borderWidth !== "1px" || hoverResult?.actionBg !== "rgba(35, 44, 46, 0.96)") throw new Error(`Native Card Game Palette drifted: ${JSON.stringify(hoverResult)}`);
if (!String(hoverResult?.ivText).includes("IV") || !hoverResult?.totalIvHidden || !hoverResult?.rarityHidden) throw new Error(`Native Card structural corrective drifted in playground: ${JSON.stringify(hoverResult)}`);
await screenshot(variantOutput("-native-card-420-game-palette"));
if (screenshotsEnabled) console.log("[playground-smoke] native-card-written");
await new Promise(resolve => setTimeout(resolve, 180));

const clipboardFallback = await evaluate(`(async()=>{
  const previous=Object.getOwnPropertyDescriptor(navigator,'clipboard');
  Object.defineProperty(navigator,'clipboard',{
    configurable:true,
    value:{writeText:async()=>{throw new Error('denied')}}
  });
  document.querySelector('[data-copy-css]').click();
  await new Promise(r=>setTimeout(r,40));
  const fallback=document.querySelector('[data-copy-fallback]');
  const summaryValue=document.querySelector('[data-summary]').value;
  const result={
    visible:!fallback.hidden,
    selected:document.activeElement===fallback,
    cssValue:fallback.value,
    summaryPreserved:summaryValue.startsWith('Profile UI Playground'),
    status:document.querySelector('[data-status]').textContent,
  };
  fallback.blur();
  if(previous) Object.defineProperty(navigator,'clipboard',previous);
  else delete navigator.clipboard;
  return result;
})()`);
if (!clipboardFallback?.visible || !clipboardFallback?.selected) throw new Error(`Clipboard fallback was not exposed/selectable: ${JSON.stringify(clipboardFallback)}`);
if (!String(clipboardFallback?.cssValue || "").includes("[data-ppbui-profile")) throw new Error(`Clipboard fallback did not contain CSS export: ${JSON.stringify(clipboardFallback)}`);
if (!clipboardFallback?.summaryPreserved) throw new Error(`Clipboard fallback corrupted the settings summary: ${JSON.stringify(clipboardFallback)}`);
if (!String(clipboardFallback?.status || "").includes("conteúdo exato do export")) throw new Error(`Clipboard fallback status was misleading: ${JSON.stringify(clipboardFallback)}`);

await evaluate(`document.querySelector('[data-mode="profile"]').click()`);
await waitFor(`Boolean(
  document.querySelector('[data-preview]')?.contentDocument
    ?.querySelector('[data-ppbui-profile-facts]')
)`, "Profile preview did not return during smoke cleanup");
await evaluate(`(()=>{
  document.querySelector('[data-viewport="760"]').click();
  document.querySelector('[data-layout-surface="search"]').click();
  document.querySelector('[data-corners="square"]').click();
  document.querySelector('[data-reset]').click();
  document.querySelector('[data-skin="custom"]').click();
})()`);
await new Promise(resolve => setTimeout(resolve, 180));
const cleanupState = await evaluate(`({
  profile:document.querySelector('[data-mode="profile"]').getAttribute('aria-pressed'),
  custom:document.querySelector('[data-skin="custom"]').getAttribute('aria-pressed'),
  viewport:document.querySelector('[data-viewport="760"]').getAttribute('aria-pressed'),
  searchSurface:document.querySelector('[data-layout-surface="search"]').getAttribute('aria-pressed'),
  square:document.querySelector('[data-corners="square"]').getAttribute('aria-pressed'),
  rounded:document.querySelector('[data-corners="rounded"]').getAttribute('aria-pressed'),
  grid:document.querySelector('[data-grid-toggle]').getAttribute('aria-pressed'),
  powerWidth:document.querySelector('[data-setting="powerWidth"]').value,
  summary:document.querySelector('[data-summary]').value
})`);
if (cleanupState?.profile !== "true" || cleanupState?.custom !== "true" || cleanupState?.viewport !== "true" || cleanupState?.searchSurface !== "true" || cleanupState?.square !== "true" || cleanupState?.rounded !== "false" || cleanupState?.grid !== "true" || cleanupState?.powerWidth !== "44") {
  throw new Error(`Smoke cleanup did not leave a human-ready Playground state: ${JSON.stringify(cleanupState)}`);
}
for (const line of [
  "mode=Profile",
  "viewport=760px",
  "skin=Game Palette",
  "corners=Squared",
  "lineWidth=1px",
  "alpha.window=92%",
  "alpha.interactive=96%",
  "alpha.value=85%",
  "palette.windowBg=#161d20",
  "palette.interactiveBg=#232c2e",
  "palette.valueBg=#161d20",
  "palette.line=#6b6543",
  "palette.text=#eef1df",
  "palette.textMuted=#a6aa9f",
  "palette.textSubtle=#777b73",
  "palette.accent=#d2b45d",
  "palette.titleText=#e0c46d",
  "palette.powerText=#ffe27a",
  "palette.focus=#37b4d1",
  "palette.success=#6fb658",
  "palette.warning=#d2b45d",
  "palette.danger=#e17a72",
  "palette.titlebarBg=#232c2e",
  "palette.pickerBg=#232c2e",
  "palette.mainBg=#161d20",
  "palette.heroBg=#232c2e",
  "palette.portraitBg=#161d20",
  "palette.searchCardBg=#232c2e",
  "palette.selectedCardBg=#232c2e",
  "palette.factsBg=#161d20",
  "palette.currentMovesBg=#232c2e",
  "palette.moveCardBg=#161d20",
  "palette.movePositionBg=#161d20",
  "palette.moveEditorBg=#232c2e",
  "palette.teamMemberBg=#161d20",
  "palette.fieldBg=#161d20",
  "palette.buttonBg=#232c2e",
  "palette.nativeCardBg=#161d20",
  "palette.nativePortraitBg=#232c2e",
  "palette.nativeBadgeBg=#232c2e",
  "palette.nativeMeterBg=#161d20",
  "palette.nativeTrackBg=#161d20",
  "palette.nativeStatBg=#161d20",
  "palette.nativeActionBg=#232c2e",
  "searchCardWidth=108px",
  "moveCardMinWidth=136px",
  "powerWidth=44px",
  "moveMetaGap=4px",
  "hoverWidth=580px",
  "searchOrder=visual>name>elements>rarity>stats",
  "moveHeaderOrder=position>name",
  "moveMetaOrder=element>category>cooldown>power",
  "selectedHeaderOrder=name>power",
  "selectedFactsOrder=rarity>gender>nature>iv",
  "hoverHeaderOrder=name>level>power",
  "grid.search=on:2x5;visual@1,1,1,1;name@1,2,2,1;elements@1,3,1,1;rarity@1,4,2,1;stats@1,5,1,1",
  "grid.moveHeader=off:1x4;position@1,1,1,1;name@1,2,1,1",
  "grid.moveMeta=off:4x1;element@1,1,1,1;category@2,1,1,1;power@3,1,1,1;cooldown@4,1,1,1",
  "grid.selectedHeader=off:2x1;name@1,1,1,1;power@2,1,1,1",
  "grid.selectedFacts=off:4x1;rarity@1,1,1,1;gender@2,1,1,1;nature@3,1,1,1;iv@4,1,1,1",
  "grid.hoverHeader=off:3x1;name@1,1,1,1;level@2,1,1,1;power@3,1,1,1",
]) {
  if (!String(cleanupState?.summary || "").includes(line)) throw new Error(`Exact Product Owner Profile preset drifted at ${line}: ${JSON.stringify(cleanupState)}`);
}

await screenshot(variantOutput("-profile-760-game-palette-square"));
if (screenshotsEnabled) console.log("[playground-smoke] game-palette-square-written");
await evaluate(`document.querySelector('[data-viewport="420"]').click()`);
await new Promise(resolve => setTimeout(resolve, 100));
await screenshot(variantOutput("-profile-420-game-palette-square"));
if (screenshotsEnabled) console.log("[playground-smoke] game-palette-square-420-written");
await evaluate(`document.querySelector('[data-viewport="760"]').click()`);
await new Promise(resolve => setTimeout(resolve, 80));
await evaluate(`document.querySelector('[data-corners="rounded"]').click()`);
await new Promise(resolve => setTimeout(resolve, 100));
await screenshot(variantOutput("-profile-760-game-palette-rounded"));
if (screenshotsEnabled) console.log("[playground-smoke] game-palette-rounded-written");
await evaluate(`document.querySelector('[data-corners="square"]').click()`);

console.log(JSON.stringify({ ...result, profile420, profile340, hoverResult, clipboardFallback, cleanupState }));
socket.close();
