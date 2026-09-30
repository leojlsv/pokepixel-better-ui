import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCoupledWorkspaceModule } from "../src/modules/coupled-workspace/index.js";
import { readAnalyzerSummary } from "../src/modules/coupled-workspace/controller.js";
import { createStandaloneCardModeModule } from "../src/modules/coupled-workspace/standalone.js";
import { setActiveTeamMember } from "../src/modules/coupled-workspace/hunt-controls.js";
import { rememberActiveHuntZone } from "../src/modules/hunts/dom.js";

const settle = async () => {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
  await Promise.resolve();
};

function setup(t, { coupled = true, analyzerSummary = undefined, locale = "pt-BR", modules = null } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="${locale}"><head></head><body>
    <nav class="pokeidle-top-toolbar">
      <button data-menu-id="inventory"><span class="pokeidle-top-toolbar__label">Inventory</span></button>
      <button data-menu-id="hunts"><span class="pokeidle-top-toolbar__label">Hunts</span></button>
      <button data-menu-id="hunt-analyzer" aria-label="Hunt Analyzer"><span class="pokeidle-top-toolbar__label">Hunt Analyzer</span></button>
      <button data-menu-id="storage" disabled><span class="pokeidle-top-toolbar__label">Storage</span></button>
    </nav>
  </body></html>`, { url: "https://pokepixel.nietore.com/play/", pretendToBeVisual: true });
  const { window } = dom;
  const sent = [];
  const listeners = new Set();
  const bridge = {
    postMessage: value => sent.push(value),
    addEventListener: (name, fn) => { if (name === "message") listeners.add(fn); },
    removeEventListener: (name, fn) => { if (name === "message") listeners.delete(fn); },
    send: value => { for (const fn of listeners) fn({ data: value }); },
  };
  Object.defineProperty(window, "chrome", { configurable: true, value: { webview: bridge } });
  if (coupled) Object.defineProperty(window, "__PPBUI_COUPLED_WORKSPACE__", { configurable: true, value: { protocol: 1 } });
  let currentAnalyzerSummary = analyzerSummary;
  if (analyzerSummary !== undefined) {
    Object.defineProperty(window, "__POKEPIXEL_HUNT_ANALYZER_PUBLIC__", {
      configurable: true,
      value: { protocol: 1, getSummary: () => currentAnalyzerSummary },
    });
  }

  const previous = new Map();
  for (const name of ["window", "document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value:
      typeof window[name] === "function" && name !== "MutationObserver" ? window[name].bind(window) : window[name] });
  }
  const app = createBetterUI({ modules: modules || [createCoupledWorkspaceModule()] });
  t.after(() => {
    app.stop();
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return {
    app,
    window,
    doc: window.document,
    bridge,
    sent,
    setAnalyzerSummary(value) { currentAnalyzerSummary = value; },
  };
}

test("mounts only with explicit coupled host marker and hides native toolbar only after correlated host acceptance", t => {
  const { app, doc, bridge, sent } = setup(t);
  app.start();
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
  assert.ok(doc.querySelector('style[data-ppbui-style="coupled-workspace"]'));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, "ppbui.coupled.capabilities");
  assert.equal(sent[0].requestId, "caps-1");
  assert.deepEqual(sent[0].surfaces, [
    { id: "hunt-analyzer", label: "Hunt Analyzer", available: true },
    { id: "hunts", label: "Hunts", available: true },
    { id: "inventory", label: "Inventory", available: true },
    { id: "storage", label: "Storage", available: false },
  ]);
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "stale", ok: true });
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false, "stale acceptance cannot hide fallback navigation");
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  assert.equal(doc.documentElement.getAttribute("data-ppbui-coupled-workspace"), "true");
});

test("card dashboard stays fail-safe hidden until accepted host explicitly selects Cards", t => {
  const { app, doc, bridge } = setup(t);
  app.start();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.ok(cards);
  assert.equal(cards.hidden, true, "dashboard must not cover native UI before bridge acceptance");

  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  assert.equal(cards.hidden, true, "pre-acceptance view commands fail closed to native game");

  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  assert.equal(cards.hidden, false);
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "game" });
  assert.equal(cards.hidden, true);
});

test("card dashboard reads the active Team HUD Pokémon without turning it into Analyzer data", t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: {
      protocol: 1,
      available: true,
      capturedAtMs: Date.now(),
      status: "running",
      activeMs: 61_000,
      seen: 1,
      captured: 0,
      failed: 0,
      currentTarget: null,
      attemptHistory: [],
    },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list">
    <div class="pokeidle-team-card" data-creature-id="a">
      <span class="pokemon-sprite" style="background-image:url('/sprites/rhydon.png')"></span>
      <span class="pokeidle-team-card__name">Rhydon</span>
    </div>
  </div>`;
  doc.body.append(hud);
  window.PokeIdle = {
    PersistentHud: {
      _teamHud: {
        el: hud,
        _creatures: [{ id: "a", name: "Rhydon", level: 195, hp: 4603, max_hp: 4603, exp: 1500, exp_current_level: 1000, exp_next_level: 3000, is_leader: true }],
      },
    },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.equal(cards.querySelector('[data-card-field="player-name"]').textContent, "Rhydon");
  assert.equal(cards.querySelector('[data-card-field="player-meta"]').textContent, "Lv. 195");
  assert.equal(cards.querySelector("[data-card-player-hp-row]").hidden, false);
  assert.equal(cards.querySelector("[data-card-player-hp-value]").textContent, "4,6k/4,6k");
  assert.equal(cards.querySelector("[data-card-player-hp-bar]").style.width, "100%");
  assert.equal(cards.querySelector("[data-card-player-exp-row]").hidden, false);
  assert.equal(cards.querySelector("[data-card-player-exp-value]").textContent, "500/2k · 25%");
  assert.equal(cards.querySelector("[data-card-player-exp-bar]").style.width, "25%");
  assert.equal(cards.querySelector("[data-card-player-exp-meter]").getAttribute("aria-valuenow"), "500");
  assert.equal(cards.querySelector('[data-card-sprite="player"]').src, "https://pokepixel.nietore.com/sprites/rhydon.png");
  assert.equal(cards.querySelector('[data-card-sprite-fallback="player"]').getAttribute("aria-hidden"), "true");
  assert.equal(cards.querySelector('[data-card-sprite-fallback="target"]').getAttribute("aria-hidden"), "true");
});

test("card dashboard follows game Localization and updates copy plus number formatting without remounting", t => {
  const { app, doc, window, bridge } = setup(t, {
    locale: "pt-BR",
    analyzerSummary: {
      protocol: 1, available: true, capturedAtMs: Date.now(), status: "running",
      seen: 12_500, seenPerHour: 12_500,
      specialHistory: [{
        atMs: Date.now() - 60_000,
        species: "Dragonite",
        rarity: "epic",
        shiny: false,
        chance: 0.015,
        result: "captured",
        ball: "Ultra Ball",
        captureDetails: { gender: "male", nature: "bold", ivTotal: 120, ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 } },
      }],
    },
  });
  let language = "en-US";
  window.PokeIdle = { Localization: { get: () => language } };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const identity = cards;
  assert.equal(cards.querySelector('[data-card-copy="huntSummary"]').textContent, "Hunt summary");
  assert.equal(cards.querySelector('[data-card-field="status"]').textContent, "Hunting");
  assert.equal(cards.querySelector('[data-card-field="seen-hour"]').textContent, "12.5k");
  assert.equal(cards.querySelector('[data-card-attempt-rarity-summary]').textContent, "Rarity · All");
  assert.equal(cards.querySelector('[data-card-attempt-body] .ppbui-cards-attempt > span:nth-child(2)').textContent, "Epic");
  assert.equal(cards.querySelector('[data-card-attempt-body] .ppbui-cards-attempt > span:nth-child(5)').textContent, "Captured");

  language = "pt-BR";
  app.reconcile();
  assert.equal(doc.querySelector("[data-ppbui-coupled-cards]"), identity, "locale updates must not remount the Cards surface");
  assert.equal(cards.querySelector('[data-card-copy="huntSummary"]').textContent, "Resumo da hunt");
  assert.equal(cards.querySelector('[data-card-field="status"]').textContent, "Caçando");
  assert.equal(cards.querySelector('[data-card-field="seen-hour"]').textContent, "12,5k");
  assert.equal(cards.querySelector('[data-card-attempt-body] .ppbui-cards-attempt > span:nth-child(2)').textContent, "Épica");
  assert.equal(cards.querySelector('[data-card-attempt-body] .ppbui-cards-attempt > span:nth-child(5)').textContent, "Capturados");
  assert.equal(cards.getAttribute("aria-label"), "Console de hunt");
  assert.equal(cards.querySelector('[data-card-aria="historyTable"]').getAttribute("aria-label"), "Hunt Story: Épica, Lendária, Mítica + Shiny");
  assert.equal(cards.querySelector(".ppbui-cards-rarity-filter fieldset").getAttribute("aria-label"), "Raridade: Épica, Lendária, Mítica. Exceções Shiny usam o filtro Shiny.");
  assert.equal(cards.querySelector("[data-card-shortcuts]").getAttribute("aria-label"), "Ir para seção");
  assert.equal(cards.querySelector('[data-card-jump="economy"]').textContent, "Economia");
  assert.equal(cards.querySelector(".ppbui-cards-result-filter").getAttribute("aria-label"), "Resultado");
  assert.deepEqual([...cards.querySelectorAll("[data-card-attempt-result]")].map(node => node.textContent), ["Todos", "Capturados", "Falharam"]);
});

test("battle cards render native Team/Hunt elements without the obsolete YOU/TYPE midpoint", t => {
  const { app, doc, window, bridge } = setup(t, {
    locale: "en-US",
    analyzerSummary: {
      protocol: 1, available: true, capturedAtMs: Date.now(), status: "running",
      currentTarget: { speciesId: "venusaur", zoneId: "zone-grass", species: "Venusaur", level: 50, rarity: "epic", shiny: false, elements: ["grass", "poison"], pokemonExp: 4305 },
      specialHistory: [],
    },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="lead"><span class="pokeidle-team-card__name">Charizard</span></div></div>`;
  doc.body.append(hud);
  window.PokeIdle = { PersistentHud: { _teamHud: { el: hud, _creatures: [{ id: "lead", name: "Charizard", level: 55, elements: ["fire", "flying"], is_leader: true }] } } };
  const hunt = doc.createElement("div");
  hunt.innerHTML = `<div class="pokeidle-panel__body"><button class="hunt-map-marker" data-zone-index="0"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/venusaur.png')"></span></button></div>`;
  doc.body.append(hunt);
  const body = hunt.querySelector(".pokeidle-panel__body");
  window.SceneManager = { _scene: { _panel: { body }, _zones: [{ id: "zone-grass", name: "Venusaur", elements: ["grass", "poison"], min: 50, max: 50 }], zoneName: zone => zone.name, zoneElements: zone => zone.elements, zoneMinMaxLevel: zone => ({ min: zone.min, max: zone.max }) } };
  rememberActiveHuntZone(hunt, 0);
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.match(cards.querySelector('[data-card-elements="player"]').getAttribute("aria-label"), /Fire, Flying/);
  assert.match(cards.querySelector('[data-card-elements="target"]').getAttribute("aria-label"), /Grass, Poison/);
  assert.equal(cards.querySelector("[data-card-matchup]"), null);
  assert.equal(cards.querySelector(".ppbui-cards-versus"), null);
  assert.equal(cards.textContent.includes("YOU"), false);
  assert.equal(cards.querySelector('[data-card-field="target-meta"]').textContent, "Lv. 50");
  assert.equal(cards.querySelector('[data-card-field="target-meta"]').textContent.includes("XP"), false, "Target no longer duplicates encounter XP");
});

test("active Pokémon card renders the authoritative selected moves as native move icons and refreshes after moveset.saved", async t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary:{protocol:1,available:true,capturedAtMs:Date.now(),status:"running",specialHistory:[]},
  });
  const hud=doc.createElement("div");hud.className="pokeidle-team-hud";doc.body.append(hud);
  const creature={id:"lead",name:"Rhydon",species_id:"rhydon",level:196,hp:100,max_hp:100,is_leader:true};
  let selected=[
    {id:"earthquake",name:"Earthquake",element:"ground"},
    {id:"rock-slide",name:"Rock Slide",element:"rock"},
    {id:"drill-run",name:"Drill Run",element:"ground"},
    {id:"ice-fang",name:"Ice Fang",element:"ice"},
  ];
  const handlers=new Map();let movesetReads=0;
  window.POKEIDLE_MOVE_ICON_MAP={earthquake:"earthquake-icon","rock-slide":"rock-slide-icon","drill-run":"drill-run-icon","ice-fang":"ice-fang-icon",protect:"protect-icon"};
  window.PokeIdle={
    PersistentHud:{_teamHud:{el:hud,_creatures:[creature]}},
    Api:{async getMoveset(id){movesetReads++;assert.equal(id,"lead");return{creature_id:id,revision:movesetReads,mode:"manual",selected};}},
    Bus:{on(name,handler){handlers.set(name,handler);},off(name,handler){if(handlers.get(name)===handler)handlers.delete(name);},emit(name,data){handlers.get(name)?.(data);}},
  };
  app.start();bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  await settle();
  const rail=doc.querySelector("[data-card-player-moves]");
  assert.equal(rail.hidden,false);
  assert.equal(rail.querySelectorAll(".ppbui-cards-move").length,4);
  assert.deepEqual([...rail.querySelectorAll(".ppbui-cards-move")].map(node=>node.title),selected.map(move=>move.name));
  assert.match(rail.querySelector("img").src,/\/img\/moves\/earthquake-icon\.png$/);
  assert.match(rail.getAttribute("aria-label"),/Earthquake, Rock Slide, Drill Run, Ice Fang/);
  selected=[selected[0],selected[1],selected[2],{id:"protect",name:"Protect",element:"normal"}];
  window.PokeIdle.Bus.emit("moveset.saved",{creature_id:"lead"});
  await settle();
  assert.equal(movesetReads,2,"moveset.saved invalidates the active creature's read-only moves cache");
  assert.equal(rail.querySelectorAll(".ppbui-cards-move").length,4);
  assert.equal(rail.querySelector(".ppbui-cards-move:last-child").title,"Protect");
  assert.match(rail.querySelector(".ppbui-cards-move:last-child img").src,/\/img\/moves\/protect-icon\.png$/);
});

test("card dashboard falls back to the exact active Team HUD portrait when compact card art is absent", t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", attemptHistory: [] },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__active"><div class="pokeidle-team-hud__active-portrait"><canvas class="pokeidle-team-card__charset"></canvas></div></div>
    <div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">Gyarados</span></div></div>`;
  const portraitCanvas = hud.querySelector(".pokeidle-team-hud__active-portrait canvas");
  portraitCanvas.width = 2;
  portraitCanvas.height = 2;
  portraitCanvas.getContext = () => ({ getImageData: () => ({ data: new Uint8ClampedArray([0,0,0,255, 0,0,0,0, 0,0,0,0, 0,0,0,0]) }) });
  portraitCanvas.toDataURL = () => "data:image/png;base64,QUJDRA==";
  doc.body.append(hud);
  window.PokeIdle = { PersistentHud: { _teamHud: { el: hud, _creatures: [{ id: "a", name: "Gyarados", is_leader: true }] } } };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const sprite = doc.querySelector('[data-card-sprite="player"]');
  assert.equal(sprite.hidden, false);
  assert.equal(sprite.getAttribute("src"), "data:image/png;base64,QUJDRA==");
});

test("card dashboard ignores a transparent native portrait canvas and never invents external species art", t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", attemptHistory: [] },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__active"><div class="pokeidle-team-hud__active-portrait"><canvas></canvas></div></div>
    <div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">Gyarados</span></div></div>`;
  const canvas = hud.querySelector("canvas");
  canvas.width = 2;
  canvas.height = 2;
  canvas.getContext = () => ({ getImageData: () => ({ data: new Uint8ClampedArray(16) }) });
  canvas.toDataURL = () => "data:image/png;base64,BLANKCANVAS";
  doc.body.append(hud);
  window.PokeIdle = {
    PersistentHud: {
      _teamHud: {
        el: hud,
        _creatures: [{ id: "a", species_id: "gyarados", name: "Gyarados", is_leader: true }],
      },
    },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const sprite = doc.querySelector('[data-card-sprite="player"]');
  assert.equal(sprite.hidden, true);
  assert.equal(sprite.hasAttribute("src"), false);
});

test("card dashboard ignores a transparent compact Team card canvas and never invents external species art", t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", attemptHistory: [] },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><canvas class="pokeidle-team-card__charset"></canvas><span class="pokeidle-team-card__name">Gyarados</span></div></div>`;
  const canvas = hud.querySelector("canvas");
  canvas.width = 2;
  canvas.height = 2;
  canvas.getContext = () => ({ getImageData: () => ({ data: new Uint8ClampedArray(16) }) });
  canvas.toDataURL = () => "data:image/png;base64,QUJDRA==";
  doc.body.append(hud);
  window.PokeIdle = {
    PersistentHud: {
      _teamHud: {
        el: hud,
        _creatures: [{ id: "a", species_id: "gyarados", name: "Gyarados", is_leader: true }],
      },
    },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const sprite = doc.querySelector('[data-card-sprite="player"]');
  assert.equal(sprite.hidden, true);
  assert.equal(sprite.hasAttribute("src"), false);
});

test("card dashboard retries a bounded missing native sprite and resolves late compact HUD hydration", t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", attemptHistory: [] },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokemon-sprite"></span><span class="pokeidle-team-card__name">Rhydon</span></div></div>`;
  doc.body.append(hud);
  window.PokeIdle = { PersistentHud: { _teamHud: { el: hud, _creatures: [{ id: "a", name: "Rhydon", is_leader: true }] } } };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const sprite = doc.querySelector('[data-card-sprite="player"]');
  assert.equal(sprite.hidden, true);
  hud.querySelector(".pokemon-sprite").style.backgroundImage = "url('/sprites/rhydon-late.png')";
  app.reconcile();
  assert.equal(sprite.hidden, false);
  assert.equal(sprite.src, "https://pokepixel.nietore.com/sprites/rhydon-late.png");
});

test("card dashboard resolves missing player art through the server species metadata without inventing an asset path", async t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", attemptHistory: [] },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokemon-sprite"></span><span class="pokeidle-team-card__name">Rhydon</span></div></div>`;
  doc.body.append(hud);
  let speciesReads = 0;
  window.PokeIdle = {
    Api: {
      async getSpecies(id) {
        speciesReads++;
        assert.equal(id, "rhydon");
        return { id, name: "Rhydon", normal_sprite_url: "/server-assets/pokemon/rhydon.png" };
      },
    },
    PersistentHud: {
      _teamHud: {
        el: hud,
        _creatures: [{ id: "a", species_id: "rhydon", name: "Rhydon", is_leader: true }],
      },
    },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  await settle();
  app.reconcile();
  const sprite = doc.querySelector('[data-card-sprite="player"]');
  assert.equal(speciesReads, 1);
  assert.equal(sprite.hidden, false);
  assert.equal(sprite.src, "https://pokepixel.nietore.com/server-assets/pokemon/rhydon.png");
});

test("card dashboard resolves target identity and native art from Analyzer without requiring the Hunts window", async t => {
  const base = {
    protocol:1, available:true, capturedAtMs:Date.now(), status:"running", specialHistory:[],
    currentTarget:{ speciesId:"typhlosion", zoneId:"zone-fire", species:"Typhlosion", level:80, rarity:"rare", shiny:false, elements:["fire"], pokemonExp:4305 },
  };
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, { analyzerSummary:base });
  window.PokeIdle = {
    Api:{ async getSpecies(id){ assert.equal(id,"typhlosion"); return { id, name:"Typhlosion", normal_sprite_url:"/native-species/typhlosion.png", elements:["fire"] }; } },
  };
  app.start();
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});
  bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  await settle();
  const cards=doc.querySelector("[data-ppbui-coupled-cards]"),target=cards.querySelector('[data-card-sprite="target"]');
  assert.equal(doc.querySelector(".hunt-window"),null,"target discovery does not require the Hunts UI to exist");
  assert.equal(cards.querySelector('[data-card-field="target-name"]').textContent,"Typhlosion");
  assert.equal(target.src,"https://pokepixel.nietore.com/native-species/typhlosion.png");
  setAnalyzerSummary({...base,capturedAtMs:Date.now(),currentTarget:null});app.reconcile();
  assert.equal(cards.querySelector('[data-card-field="target-name"]').textContent,"Typhlosion","last Analyzer-confirmed hunt identity remains visible between encounters");
  assert.equal(target.src,"https://pokepixel.nietore.com/native-species/typhlosion.png");
});

test("card dashboard retries transient native target metadata failures without inventing art", async t => {
  const now = Date.now();
  const { app, doc, window, bridge } = setup(t, { analyzerSummary:{
    protocol:1, available:true, capturedAtMs:now, status:"running", specialHistory:[],
    currentTarget:{speciesId:"typhlosion",species:"Typhlosion",rarity:"rare",shiny:false},
  }});
  let speciesReads = 0;
  window.PokeIdle = { Api:{ async getSpecies(id) {
    speciesReads++;
    assert.equal(id, "typhlosion");
    if (speciesReads === 1) throw new Error("transient species metadata failure");
    return { id, name:"Typhlosion", normal_sprite_url:"/native-species/typhlosion.png" };
  }}};
  app.start();
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});
  bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  await settle();
  const target = doc.querySelector('[data-card-sprite="target"]');
  assert.equal(speciesReads, 1);
  assert.equal(target.hasAttribute("src"), false, "failed native lookup must not synthesize a fallback path");
  app.reconcile();
  await settle();
  assert.equal(speciesReads, 2, "a transient native lookup failure must remain retryable");
  assert.equal(target.src, "https://pokepixel.nietore.com/native-species/typhlosion.png");
  app.reconcile();
  await settle();
  assert.equal(speciesReads, 2, "successful native sprite metadata is cached");
});

test("card dashboard bounds repeated native target metadata failures", async t => {
  const { app, window, bridge } = setup(t, { analyzerSummary:{
    protocol:1,available:true,capturedAtMs:Date.now(),status:"running",specialHistory:[],
    currentTarget:{speciesId:"typhlosion",species:"Typhlosion",rarity:"rare",shiny:false},
  }});
  let speciesReads = 0;
  window.PokeIdle={Api:{async getSpecies(){speciesReads++;throw new Error("still unavailable");}}};
  app.start();
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});
  bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  for (let index=0;index<10;index++) {
    await settle();
    app.reconcile();
  }
  await settle();
  assert.equal(speciesReads,4,"target metadata retries are bounded and cannot spin indefinitely");
});

test("card dashboard leaves player art empty when the native species API is unavailable", t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", attemptHistory: [] },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokemon-sprite"></span><span class="pokeidle-team-card__name">Rhydon</span></div></div>`;
  doc.body.append(hud);
  window.PokeIdle = {
    PersistentHud: {
      _teamHud: {
        el: hud,
        _creatures: [{ id: "a", species_id: "rhydon", name: "Rhydon", is_leader: true }],
      },
    },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const sprite = doc.querySelector('[data-card-sprite="player"]');
  assert.equal(sprite.hidden, true);
  assert.equal(sprite.hasAttribute("src"), false);
});

test("card dashboard bounds failed native species metadata lookups without synthesizing a fallback", async t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", attemptHistory: [] },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokemon-sprite"></span><span class="pokeidle-team-card__name">Rhydon</span></div></div>`;
  doc.body.append(hud);
  let speciesReads = 0;
  window.PokeIdle = {
    Api: { async getSpecies() { speciesReads++; throw new Error("missing asset metadata"); } },
    PersistentHud: { _teamHud: { el: hud, _creatures: [{ id: "a", species_id: "rhydon", name: "Rhydon", is_leader: true }] } },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  for (let index = 0; index < 10; index++) {
    await settle();
    app.reconcile();
  }
  await settle();
  assert.equal(speciesReads, 4);
  const sprite = doc.querySelector('[data-card-sprite="player"]');
  assert.equal(sprite.hidden, true);
  assert.equal(sprite.hasAttribute("src"), false);
});

test("card dashboard rejects PokemonDB even when native species metadata contains it", async t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", attemptHistory: [] },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">Rhydon</span></div></div>`;
  doc.body.append(hud);
  window.PokeIdle = {
    Api: { async getSpecies() { return { id: "rhydon", normal_sprite_url: "https://img.pokemondb.net/sprites/black-white/normal/rhydon.png" }; } },
    PersistentHud: { _teamHud: { el: hud, _creatures: [{ id: "a", species_id: "rhydon", name: "Rhydon", is_leader: true }] } },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  await settle();
  const sprite = doc.querySelector('[data-card-sprite="player"]');
  assert.equal(sprite.hidden, true);
  assert.equal(sprite.hasAttribute("src"), false);
});

test("card dashboard never coerces missing or string Team HUD numerics into fake zero facts", t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: {
      protocol: 1,
      available: true,
      capturedAtMs: Date.now(),
      status: "running",
      currentTarget: null,
      attemptHistory: [],
    },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list">
    <div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">Umbreon</span></div>
  </div>`;
  doc.body.append(hud);
  window.PokeIdle = {
    PersistentHud: {
      _teamHud: {
        el: hud,
        _creatures: [{ id: "a", name: "Umbreon", level: "95", hp: "", max_hp: null, is_leader: true }],
      },
    },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const meta = doc.querySelector('[data-card-field="player-meta"]').textContent;
  assert.equal(meta, "Lv. —");
  assert.equal(doc.querySelector("[data-card-player-hp-row]").hidden, true);
  assert.equal(doc.querySelector("[data-card-player-exp-row]").hidden, true);
  assert.equal(meta.includes("DERROTADO"), false);
});

test("card dashboard renders active-Hunt zone art and special-session history locally without host telemetry relay", async t => {
  const now = Date.now();
  const rarities = ["epic", "legendary", "mythical", "rare"];
  const attempts = Array.from({ length: 40 }, (_, index) => ({
    atMs: now - index * 60_000,
    speciesId: index === 2 ? "charizard" : `attempt-${index + 1}`,
    species: `Attempt ${index + 1}`,
    rarity: rarities[index % rarities.length],
    shiny: index % 4 === 3,
    qualityMultiplier: index === 2 ? 1.72 : null,
    ivTotal: index === 2 ? 151 : index === 0 ? 176 : null,
    chance: 0.01 + index / 1000,
    result: index === 2 ? "captured" : "fled",
    ball: "Ultra Ball",
    captureDetails: index === 2 ? {
      gender: "female",
      nature: "adamant",
      ivTotal: 151,
      ivs: { hp: 31, atk: 31, def: 25, spa: 20, spd: 22, spe: 22 },
      hidden: "must-not-cross",
    } : null,
    spriteUrl: "https://img.pokemondb.net/sprites/black-white/normal/charizard.png",
    encounterId: "must-not-cross"
  }));
  const { app, doc, window, bridge, sent } = setup(t, {
    analyzerSummary: {
      protocol: 1,
      available: true,
      capturedAtMs: now,
      status: "running",
      activeMs: 65_000,
      seen: 88,
      captured: 12,
      failed: 76,
      seenEpic: 10,
      epicPlusFailed: 7,
      rarityCounts: {
        weak: { captured: 2, seen: 10, shinyCaptured: 0, shinySeen: 0 },
        common: { captured: 3, seen: 20, shinyCaptured: 0, shinySeen: 0 },
        uncommon: { captured: 1, seen: 12, shinyCaptured: 0, shinySeen: 0 },
        rare: { captured: 2, seen: 16, shinyCaptured: 1, shinySeen: 2 },
        epic: { captured: 3, seen: 10, shinyCaptured: 1, shinySeen: 1 },
        legendary: { captured: 1, seen: 8, shinyCaptured: 0, shinySeen: 0 },
        mythical: { captured: 0, seen: 4, shinyCaptured: 0, shinySeen: 0 },
        unknown: { captured: 0, seen: 8, shinyCaptured: 0, shinySeen: 0 },
      },
      trainerExp: 2000,
      trainerExpPerHour: 4000,
      pokemonExp: 3000,
      pokemonExpPerHour: 6000,
      directGold: 12000000,
      lootSellValue: 2250000,
      autoSellValue: 750000,
      revenue: 15000000,
      revenuePerHour: 12960000,
      dollar: 15000000,
      dollarPerHour: 12960000,
      expenses: 3000000,
      expensesPerHour: 2592000,
      profit: 12000000,
      profitPerHour: 10368000,
      currentTarget: {
        speciesId: "charizard",
        zoneId: "zone-volcano",
        species: "Charizard",
        level: 90,
        rarity: "epic",
        shiny: true,
        elements: ["fire", "flying"],
        pokemonExp: 4305,
        raw: "must-not-cross"
      },
      attemptHistory: attempts.slice(0, 32),
      specialHistory: attempts,
      lootHistory: [
        { atMs: now - 15_000, species: "Charizard", directGold: 500, lootSellValue: 1250, autoSold: true, autoSellValue: 250, totalValue: 999999, items: ["must-not-cross"], secret: "must-not-cross" },
        { atMs: now - 45_000, species: "Dragonite", directGold: 0, lootSellValue: 3200, autoSold: false, autoSellValue: 999999, totalValue: 999999 },
      ],
      encounters: [{ id: "must-not-cross" }],
    },
  });
  const hunt = doc.createElement("div");
  hunt.className = "hunt-window";
  hunt.innerHTML = `<div class="pokeidle-panel__body"><button class="hunt-map-marker" data-zone-index="0"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/charizard.png')"></span></button></div>`;
  doc.body.append(hunt);
  const body = hunt.querySelector(".pokeidle-panel__body");
  window.SceneManager = { _scene: { _panel: { body }, _zones: [{ id: "zone-volcano", name: "Charizard", elements: ["fire", "flying"], min: 85, max: 95 }], zoneName: zone => zone.name, zoneElements: zone => zone.elements, zoneMinMaxLevel: zone => ({ min: zone.min, max: zone.max }) } };
  rememberActiveHuntZone(hunt, 0);
  app.start();
  assert.equal(sent.some(message => message.type === "ppbui.coupled.analyzer-summary"), false);

  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  await settle();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.equal(cards.querySelector('[data-card-field="target-name"]').textContent, "Charizard");
  assert.equal(cards.querySelector('[data-card-field="target-meta"]').textContent, "Lv. 90");
  assert.equal(cards.querySelector('[data-card-combat="target"]').dataset.shiny, "true");
  assert.equal(cards.querySelector("[data-card-shiny-badge]").hidden, false);
  assert.match(cards.querySelector("[data-card-shiny-badge]").textContent, /SHINY/);
  assert.equal(cards.querySelector("[data-card-target-rarity]").textContent, "ÉPICA");
  assert.equal(cards.querySelectorAll("[data-card-attempt-body] .ppbui-cards-attempt").length, 40, "special history is not silently capped at 32");
  assert.equal(cards.querySelector('[data-card-sprite="target"]').src, "https://pokepixel.nietore.com/native-hunt/charizard.png");
  assert.equal(cards.querySelector(".ppbui-cards-attempt-table").getAttribute("role"), "list");
  assert.equal(window.getComputedStyle(cards.querySelector(".ppbui-cards-attempt-table")).maxHeight, "190px");
  assert.equal(cards.querySelector(".ppbui-cards-attempt-head"), null);
  assert.equal(cards.querySelectorAll("[data-card-attempt-body] [role=listitem]").length, 40);
  assert.equal(cards.querySelector("[data-card-attempt-body] [data-attempt-column='0']").getAttribute("aria-label").startsWith("Hora: "), true);
  assert.equal(cards.querySelector('[data-rarity-key="unknown"]'), null, "Unknown is not a user-facing rarity bucket");
  assert.match(cards.querySelector("[data-card-attempt-body]").textContent, /SHINY/);
  const geneticsDetails = cards.querySelector(".ppbui-cards-attempt-details");
  assert.equal(cards.querySelector("[data-card-genetics-toggle]"), null, "captured genetics no longer requires a per-row disclosure click");
  assert.equal(geneticsDetails.hidden, false, "captured genetics is readable inline");
  assert.match(geneticsDetails.textContent, /Gender ♀ Female · Nature adamant · IV 151 · HP 31 · ATK 31 · SpA 20 · DEF 25 · SpD 22 · SPE 22/);
  const capturedRow = [...cards.querySelectorAll(".ppbui-cards-attempt")].find(row => row.dataset.result === "captured");
  assert.equal(capturedRow.querySelector('[data-attempt-column="3"]').textContent, "×1,72", "continuous Pokémon Quality is visible beside discrete Rarity");
  assert.equal(capturedRow.querySelector('[data-attempt-column="7"]').textContent, "151");
  const failedIvRow = [...cards.querySelectorAll(".ppbui-cards-attempt")].find(row => row.dataset.result === "fled" && row.querySelector('[data-attempt-column="7"]')?.textContent === "176");
  assert.ok(failedIvRow, "failed attempts expose the authoritative total IV as a direct-read column");
  assert.equal(cards.querySelector("[data-card-attempt-body]").textContent.includes("must-not-cross"), false);
  assert.equal(cards.querySelector('[data-card-attempt-body] .ppbui-cards-attempt[data-shiny="true"]') !== null, true);
  assert.match(cards.querySelector('[data-card-attempt-body] .ppbui-cards-attempt[data-shiny="true"] [data-attempt-column="2"]').getAttribute("aria-label"), /SHINY/,
    "Shiny species identification remains explicit in the accessible encounter name");
  assert.ok([...cards.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt:first-child [data-attempt-column]')].every(cell => cell.getAttribute("role") === "group" && cell.getAttribute("aria-label")?.startsWith(`${cell.dataset.label}: `)),
    "all eight Hunt fields expose named groups independent of CSS-generated labels");
  assert.equal(cards.querySelector('[data-card-field="revenue"]').textContent, "$ 15M");
  assert.equal(cards.querySelector('[data-card-field="revenue"]').title, "Valor exato: $ 15.000.000");
  assert.equal(cards.querySelector('[data-card-field="profit"]').textContent, "+$ 12M");
  assert.equal(cards.querySelector('[data-card-field="loot-value"]').textContent, "$ 2,3M");
  assert.equal(cards.querySelector('[data-card-field="expenses"]').textContent, "$ 3M");
  assert.equal(cards.querySelector('[data-card-field="trainer-xp"]').textContent, "2k");
  assert.equal(cards.querySelector('[data-card-field="pokemon-xp-hour"]').textContent, "6k");
  assert.equal(cards.querySelector('[data-card-field="pokemon-xp-hour"]').closest("div").classList.contains("ppbui-cards-kpi-primary"), true);
  assert.equal(cards.querySelector('[data-card-field="epic-failed"]').textContent, "7");
  assert.equal(cards.querySelector('[data-rarity-key="rare"] strong').textContent, "2/16");
  assert.equal(cards.querySelector('[data-rarity-key="rare"] [data-rarity-shiny]').textContent, "✦ 1/2");
  assert.equal(cards.querySelector('[data-rarity-key="rare"] [data-rarity-shiny]').hidden, false);
  const economy = cards.querySelector(".ppbui-cards-economy");
  const history = cards.querySelector(".ppbui-cards-history");
  assert.ok(economy.compareDocumentPosition(history) & doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
    "Economy precedes long attempt history so money/loot/profit are first-view data");
  assert.equal(cards.querySelector('[data-card-field="revenue"]').closest("div").classList.contains("ppbui-cards-kpi-primary"), true);
  assert.equal(cards.querySelector('[data-card-field="profit"]').closest("div").classList.contains("ppbui-cards-kpi-primary"), true);

  const rarityFilters = [...cards.querySelectorAll("[data-card-attempt-rarity]")];
  assert.deepEqual(rarityFilters.map(input => input.value), ["epic", "legendary", "mythical"]);
  rarityFilters.forEach(input => { input.checked = input.value === "epic"; });
  rarityFilters[0].dispatchEvent(new doc.defaultView.Event("change"));
  assert.ok(cards.querySelectorAll('[data-card-attempt-body] [data-rarity="epic"]').length > 0);
  const rarityExceptions = [...cards.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt:not([data-rarity="epic"])')];
  assert.ok(rarityExceptions.length > 0, "lower-rarity Shiny exceptions remain available without lower-rarity checkboxes");
  assert.ok(rarityExceptions.every(row => row.dataset.shiny === "true"));
  assert.equal(cards.querySelector("[data-card-attempt-rarity-summary]").textContent, "Raridade · 1/3");

  rarityFilters.forEach(input => { input.checked = true; });
  rarityFilters[0].dispatchEvent(new doc.defaultView.Event("change"));
  const shinyFilter = cards.querySelector("[data-card-attempt-shiny]");
  shinyFilter.value = "yes";
  shinyFilter.dispatchEvent(new doc.defaultView.Event("change"));
  assert.ok(cards.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt[data-shiny="true"]').length > 0);
  assert.equal(cards.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt:not([data-shiny="true"])').length, 0);

  shinyFilter.value = "";
  shinyFilter.dispatchEvent(new doc.defaultView.Event("change"));

  const resultFilters = [...cards.querySelectorAll("[data-card-attempt-result]")];
  assert.deepEqual(resultFilters.map(button => button.dataset.cardAttemptResult), ["", "captured", "fled"]);
  resultFilters[1].click();
  assert.equal(resultFilters[1].getAttribute("aria-pressed"), "true");
  assert.ok(cards.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt[data-result="captured"]').length > 0);
  assert.equal(cards.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt:not([data-result="captured"])').length, 0);
  resultFilters[2].click();
  assert.equal(resultFilters[2].getAttribute("aria-pressed"), "true");
  assert.ok(cards.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt[data-result="fled"]').length > 0);
  assert.equal(cards.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt:not([data-result="fled"])').length, 0);
  resultFilters[0].click();
  assert.equal(resultFilters[0].getAttribute("aria-pressed"), "true");
  assert.ok(cards.querySelector('[data-card-attempt-body] .ppbui-cards-attempt[data-result="captured"]'));
  assert.ok(cards.querySelector('[data-card-attempt-body] .ppbui-cards-attempt[data-result="fled"]'));

  const huntTab = cards.querySelector('[data-card-story-tab="hunt"]');
  const lootTab = cards.querySelector('[data-card-story-tab="loot"]');
  const huntPanel = cards.querySelector('[data-card-story-panel="hunt"]');
  const lootPanel = cards.querySelector('[data-card-story-panel="loot"]');
  assert.equal(huntTab.getAttribute("aria-selected"), "true");
  assert.equal(huntPanel.hidden, false);
  assert.equal(lootPanel.hidden, true);
  lootTab.click();
  assert.equal(lootTab.getAttribute("aria-selected"), "true");
  assert.equal(huntPanel.hidden, true);
  assert.equal(lootPanel.hidden, false);
  const lootRows = cards.querySelectorAll("[data-card-loot-body] .ppbui-cards-loot-row");
  assert.equal(lootRows.length, 2);
  assert.match(lootRows[0].textContent, /Charizard/);
  assert.deepEqual([...lootRows[0].querySelectorAll(".ppbui-cards-loot-finance strong")].map(node => node.textContent), ["$ 500", "$ 1,3k", "$ 250"]);
  assert.equal(lootRows[0].querySelector("[data-card-loot-total]").textContent, "Total $ 2k");
  assert.equal(lootRows[0].querySelector("[data-card-loot-total]").getAttribute("aria-label"), "Total: $ 2.000");
  assert.equal(cards.querySelector("[data-card-loot-body]").textContent.includes("must-not-cross"), false);
});

test("card dashboard keeps the active Hunt zone sprite static across normal, Shiny and between encounters", t => {
  const normalSummary = {
    protocol: 1,
    available: true,
    capturedAtMs: Date.now(),
    status: "running",
    currentTarget: { speciesId: "pikachu", zoneId: "zone-pika", species: "Pikachu", level: 30, rarity: "rare", shiny: false },
    specialHistory: [],
  };
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, { analyzerSummary: normalSummary });
  const hunt = doc.createElement("div");
  hunt.className = "hunt-window";
  hunt.innerHTML = `<div class="pokeidle-panel__body"><button class="hunt-map-marker" data-zone-index="0"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/pikachu.png')"></span></button></div>`;
  doc.body.append(hunt);
  const body = hunt.querySelector(".pokeidle-panel__body");
  window.SceneManager = { _scene: { _panel: { body }, _zones: [{ id: "zone-pika", name: "Pikachu", elements: ["electric"], min: 30, max: 35 }], zoneName: zone => zone.name, zoneElements: zone => zone.elements, zoneMinMaxLevel: zone => ({ min: zone.min, max: zone.max }) } };
  rememberActiveHuntZone(hunt, 0);

  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const target = doc.querySelector('[data-card-sprite="target"]');
  assert.equal(target.src, "https://pokepixel.nietore.com/native-hunt/pikachu.png");
  assert.equal(target.hidden, false);

  setAnalyzerSummary({
    ...normalSummary,
    capturedAtMs: Date.now(),
    currentTarget: { ...normalSummary.currentTarget, shiny: true },
  });
  app.reconcile();
  assert.equal(target.src, "https://pokepixel.nietore.com/native-hunt/pikachu.png");
  assert.equal(target.hidden, false, "zone art is intentionally encounter-agnostic");

  setAnalyzerSummary({ ...normalSummary, capturedAtMs: Date.now(), currentTarget: null });
  app.reconcile();
  assert.equal(target.src, "https://pokepixel.nietore.com/native-hunt/pikachu.png");
  assert.equal(target.hidden, false, "zone art persists between encounters");
  assert.equal(doc.querySelector('[data-card-field="target-name"]').textContent, "Pikachu");
  assert.equal(doc.querySelector('[data-card-field="target-meta"]').textContent, "Lv. 30–35");

  setAnalyzerSummary({ ...normalSummary, capturedAtMs: Date.now(), status: "waiting", currentTarget: null });
  app.reconcile();
  assert.equal(target.hidden, true, "waiting state cannot leak static art from a previous Hunt");
  assert.equal(target.hasAttribute("src"), false);

  setAnalyzerSummary({
    ...normalSummary,
    capturedAtMs: Date.now(),
    status: "running",
    currentTarget: { speciesId: "abra", zoneId: "zone-abra", species: "Abra", level: 32, rarity: "rare", shiny: false },
  });
  app.reconcile();
  assert.equal(target.hidden, true, "a later Hunt that bypasses Atlas cannot revive the previous zone art");
  assert.equal(target.hasAttribute("src"), false);
});

test("card dashboard invalidates remembered Hunt art when currentTarget belongs to another zone", t => {
  const normalSummary = {
    protocol: 1,
    available: true,
    capturedAtMs: Date.now(),
    status: "running",
    currentTarget: { speciesId: "pikachu", zoneId: "zone-pika", species: "Pikachu", level: 30, rarity: "rare", shiny: false },
    specialHistory: [],
  };
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, { analyzerSummary: normalSummary });
  const hunt = doc.createElement("div");
  hunt.className = "hunt-window";
  hunt.innerHTML = `<div class="pokeidle-panel__body"><button class="hunt-map-marker" data-zone-index="0"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/pikachu.png')"></span></button></div>`;
  doc.body.append(hunt);
  const body = hunt.querySelector(".pokeidle-panel__body");
  window.SceneManager = { _scene: { _panel: { body }, _zones: [{ id: "zone-pika", name: "Pikachu" }], zoneName: zone => zone.name } };
  rememberActiveHuntZone(hunt, 0);

  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const target = doc.querySelector('[data-card-sprite="target"]');
  assert.equal(target.hidden, false);

  setAnalyzerSummary({
    ...normalSummary,
    capturedAtMs: Date.now(),
    currentTarget: { speciesId: "abra", zoneId: "zone-abra", species: "Abra", level: 32, rarity: "rare", shiny: false },
  });
  app.reconcile();
  assert.equal(target.hidden, true, "zone mismatch must fail closed instead of showing stale native art");
  assert.equal(target.hasAttribute("src"), false);

  setAnalyzerSummary({ ...normalSummary, capturedAtMs: Date.now(), currentTarget: null });
  app.reconcile();
  assert.equal(target.hidden, true, "mismatched remembered art stays invalidated between later encounters");
  assert.equal(target.hasAttribute("src"), false);
});

test("card dashboard preserves a fresh Atlas zone through a stale prior target until Analyzer confirms the new zone", t => {
  const summaryA = {
    protocol: 1,
    available: true,
    capturedAtMs: Date.now(),
    status: "running",
    currentTarget: { speciesId: "pikachu", zoneId: "zone-pika", species: "Pikachu", level: 30, rarity: "rare", shiny: false },
    specialHistory: [],
  };
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, { analyzerSummary: summaryA });
  const hunt = doc.createElement("div");
  hunt.className = "hunt-window";
  hunt.innerHTML = `<div class="pokeidle-panel__body">
    <button class="hunt-map-marker" data-zone-index="0"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/pikachu.png')"></span></button>
    <button class="hunt-map-marker" data-zone-index="1"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/abra.png')"></span></button>
  </div>`;
  doc.body.append(hunt);
  const body = hunt.querySelector(".pokeidle-panel__body");
  window.SceneManager = {
    _scene: {
      _panel: { body },
      _zones: [{ id: "zone-pika", name: "Pikachu" }, { id: "zone-abra", name: "Abra" }],
      zoneName: zone => zone.name,
    },
  };
  rememberActiveHuntZone(hunt, 0);

  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const target = doc.querySelector('[data-card-sprite="target"]');
  assert.equal(target.src, "https://pokepixel.nietore.com/native-hunt/pikachu.png");

  rememberActiveHuntZone(hunt, 1);
  app.reconcile();
  assert.equal(target.hidden, true, "stale prior target must not render against the newly remembered Atlas zone");
  assert.equal(target.hasAttribute("src"), false);

  setAnalyzerSummary({
    ...summaryA,
    capturedAtMs: Date.now(),
    currentTarget: { speciesId: "abra", zoneId: "zone-abra", species: "Abra", level: 32, rarity: "rare", shiny: false },
  });
  app.reconcile();
  assert.equal(target.src, "https://pokepixel.nietore.com/native-hunt/abra.png");
  assert.equal(target.hidden, false, "new Atlas art recovers when Analyzer catches up without requiring re-entry");

  setAnalyzerSummary({ ...summaryA, capturedAtMs: Date.now(), currentTarget: null });
  app.reconcile();
  assert.equal(target.src, "https://pokepixel.nietore.com/native-hunt/abra.png");
  assert.equal(target.hidden, false, "confirmed zone art persists between encounters");
});

test("card dashboard preserves a fresh Atlas zone through transient Analyzer waiting until the new zone is confirmed", t => {
  const summaryA = {
    protocol: 1,
    available: true,
    capturedAtMs: Date.now(),
    status: "running",
    currentTarget: { speciesId: "pikachu", zoneId: "zone-pika", species: "Pikachu", level: 30, rarity: "rare", shiny: false },
    specialHistory: [],
  };
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, { analyzerSummary: summaryA });
  const hunt = doc.createElement("div");
  hunt.className = "hunt-window";
  hunt.innerHTML = `<div class="pokeidle-panel__body">
    <button class="hunt-map-marker" data-zone-index="0"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/pikachu.png')"></span></button>
    <button class="hunt-map-marker" data-zone-index="1"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/abra.png')"></span></button>
  </div>`;
  doc.body.append(hunt);
  const body = hunt.querySelector(".pokeidle-panel__body");
  window.SceneManager = {
    _scene: {
      _panel: { body },
      _zones: [{ id: "zone-pika", name: "Pikachu" }, { id: "zone-abra", name: "Abra" }],
      zoneName: zone => zone.name,
    },
  };
  rememberActiveHuntZone(hunt, 0);

  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const target = doc.querySelector('[data-card-sprite="target"]');
  assert.equal(target.hidden, false);

  rememberActiveHuntZone(hunt, 1);
  setAnalyzerSummary({ ...summaryA, capturedAtMs: Date.now(), status: "waiting", currentTarget: null });
  app.reconcile();
  assert.equal(target.hidden, true, "fresh unconfirmed Atlas art stays hidden during transient waiting");
  assert.equal(target.hasAttribute("src"), false);

  setAnalyzerSummary({
    ...summaryA,
    capturedAtMs: Date.now(),
    status: "running",
    currentTarget: { speciesId: "abra", zoneId: "zone-abra", species: "Abra", level: 32, rarity: "rare", shiny: false },
  });
  app.reconcile();
  assert.equal(target.src, "https://pokepixel.nietore.com/native-hunt/abra.png");
  assert.equal(target.hidden, false, "fresh Atlas snapshot survives waiting and recovers when its zone is confirmed");
});

test("card dashboard fails closed when a running current target cannot prove its zone identity", t => {
  const summary = {
    protocol: 1,
    available: true,
    capturedAtMs: Date.now(),
    status: "running",
    currentTarget: { speciesId: "pikachu", zoneId: "zone-pika", species: "Pikachu", level: 30, rarity: "rare", shiny: false },
    specialHistory: [],
  };
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, { analyzerSummary: summary });
  const hunt = doc.createElement("div");
  hunt.className = "hunt-window";
  hunt.innerHTML = `<div class="pokeidle-panel__body"><button class="hunt-map-marker" data-zone-index="0"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/pikachu.png')"></span></button></div>`;
  doc.body.append(hunt);
  const body = hunt.querySelector(".pokeidle-panel__body");
  window.SceneManager = { _scene: { _panel: { body }, _zones: [{ id: "zone-pika", name: "Pikachu" }], zoneName: zone => zone.name } };
  rememberActiveHuntZone(hunt, 0);

  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const target = doc.querySelector('[data-card-sprite="target"]');
  assert.equal(target.hidden, false);

  setAnalyzerSummary({
    ...summary,
    capturedAtMs: Date.now(),
    currentTarget: { speciesId: "abra", species: "Abra", level: 32, rarity: "rare", shiny: false },
  });
  app.reconcile();
  assert.equal(target.hidden, true, "missing zoneId cannot reuse remembered art");
  assert.equal(target.hasAttribute("src"), false);

  setAnalyzerSummary({ ...summary, capturedAtMs: Date.now(), currentTarget: null });
  app.reconcile();
  assert.equal(target.hidden, true, "invalidated ambiguous art cannot reappear between later encounters");
});

test("card dashboard ignores loaded character resources when no active Hunt zone was remembered", t => {
  const summary = {
    protocol: 1,
    available: true,
    capturedAtMs: Date.now(),
    status: "running",
    currentTarget: { speciesId: "typhlosion", zoneId: "zone-fire", species: "Typhlosion", level: 150, rarity: "rare", shiny: false },
    specialHistory: [],
  };
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, { analyzerSummary: summary });
  Object.defineProperty(window.performance, "getEntriesByType", {
    configurable: true,
    value: type => type === "resource" ? [
      { name: "https://img.pokemondb.net/sprites/black-white/normal/typhlosion.png" },
      { name: "https://pokepixel.nietore.com/play/img/characters/typhlosion.png" },
      { name: "https://pokepixel.nietore.com/play/img/characters/shiny-typhlosion.png" },
    ] : [],
  });
  let speciesReads = 0;
  window.PokeIdle = { Api: { async getSpecies() { speciesReads++; return {}; } } };

  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const target = doc.querySelector('[data-card-sprite="target"]');
  assert.equal(target.hidden, true);
  assert.equal(target.hasAttribute("src"), false);
  assert.equal(speciesReads, 0, "target art no longer performs species metadata lookup");

  setAnalyzerSummary({ ...summary, capturedAtMs: Date.now(), currentTarget: { ...summary.currentTarget, shiny: true } });
  app.reconcile();
  assert.equal(target.hidden, true);
  assert.equal(target.hasAttribute("src"), false);
  assert.equal(speciesReads, 0);
});

test("card dashboard never fabricates a character path from speciesId when the game did not load a matching native resource", async t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: {
      protocol: 1,
      available: true,
      capturedAtMs: Date.now(),
      status: "running",
      currentTarget: { speciesId: "typhlosion", species: "Typhlosion", level: 150, rarity: "rare", shiny: false },
      specialHistory: [],
    },
  });
  Object.defineProperty(window.performance, "getEntriesByType", {
    configurable: true,
    value: () => [
      { name: "https://img.pokemondb.net/sprites/black-white/normal/typhlosion.png" },
      { name: "https://pokepixel.nietore.com/play/img/characters/quilava.png" },
    ],
  });
  window.PokeIdle = { Api: { async getSpecies() { return {}; } } };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  await settle();
  const target = doc.querySelector('[data-card-sprite="target"]');
  assert.equal(target.hidden, true);
  assert.equal(target.hasAttribute("src"), false);
});

test("card dashboard compacts large values at stable boundaries while preserving exact accessible values", t => {
  const { app, doc, bridge } = setup(t, {
    analyzerSummary: {
      protocol: 1,
      available: true,
      capturedAtMs: Date.now(),
      status: "running",
      seen: 999,
      captured: 1000,
      failed: 12500,
      seenPerHour: 999950,
      trainerExp: 1_000_000_000,
      trainerExpPerHour: 999,
      pokemonExp: 12500,
      pokemonExpPerHour: 1_250_000,
      revenue: 999950,
      revenuePerHour: 1_000_000,
      profit: 1_000_000,
      profitPerHour: 12_500,
      expenses: 999,
      expensesPerHour: 1000,
      epicPlusFailed: 0,
      specialHistory: [],
    },
  });
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.equal(cards.querySelector('[data-card-field="seen"]').textContent, "999");
  assert.equal(cards.querySelector('[data-card-field="captured"]').textContent, "1k");
  assert.equal(cards.querySelector('[data-card-field="failed"]').textContent, "12,5k");
  assert.equal(cards.querySelector('[data-card-field="seen-hour"]').textContent, "1M");
  assert.equal(cards.querySelector('[data-card-field="pokemon-xp-hour"]').textContent, "1,3M");
  assert.equal(cards.querySelector('[data-card-field="trainer-xp"]').textContent, "1B");
  assert.equal(cards.querySelector('[data-card-field="revenue"]').textContent, "$ 1M");
  assert.equal(cards.querySelector('[data-card-field="expenses"]').textContent, "$ 999");
  assert.equal(cards.querySelector('[data-card-field="expenses-hour"]').textContent, "$ 1k");
  assert.equal(cards.querySelector('[data-card-field="captured"]').getAttribute("aria-label"), "Capturados: 1.000");
  assert.equal(cards.querySelector('[data-card-field="revenue"]').title, "Valor exato: $ 999.950");
});

test("card dashboard fails closed for malformed target/history fields and never treats target chance as prospective", t => {
  const now = Date.now();
  const { app, doc, bridge } = setup(t, {
    analyzerSummary: {
      protocol: 1,
      available: true,
      capturedAtMs: now,
      status: "running",
      latestCaptureChance: 0.01234,
      currentTarget: {
        species: "Mewtwo\u0000 target",
        level: Infinity,
        rarity: "god-tier",
        shiny: "yes",
        spriteUrl: "https://evil.example/mewtwo.png",
        chance: 0.99,
        sessionId: "must-not-render"
      },
      specialHistory: [
        { atMs: -1, species: "invalid", result: "fled", ball: "Ball" },
        { atMs: now - 1000, species: "Mewtwo", rarity: "invented", shiny: true, result: "fled", chance: "0.5", ivTotal: 999, ball: "Ultra Ball", sessionId: "secret" },
        { atMs: now - 2000, species: "Lugia", rarity: "legendary", result: "unknown", chance: 0.1, ball: "Master Ball" },
        { atMs: now - 3000, species: "Ho-Oh", rarity: "legendary", result: "captured", chance: 0.02, ball: "Master Ball",
          captureDetails: { gender: "male\u0000 hidden", nature: "bold", ivTotal: 999, ivs: { hp: 31, atk: "31", def: -1, spa: 20, spd: 22, spe: 22 }, secret: "must-not-render" } },
      ],
    },
  });
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });

  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.equal(cards.querySelector('[data-card-field="target-name"]').textContent, "Mewtwo target");
  assert.equal(cards.querySelector('[data-card-field="target-meta"]').textContent, "Lv. —");
  assert.equal(cards.querySelector('[data-card-sprite="target"]').hidden, true);
  assert.equal(cards.querySelector('[data-card-sprite-fallback="target"]').hidden, false);
  assert.equal(cards.querySelector('[data-card-field="last-chance"]').textContent, "1,234%");
  assert.equal(cards.textContent.includes("99.000%"), false, "target chance must not be rendered as a prospective capture chance");
  assert.equal(cards.textContent.includes("must-not-render"), false);
  assert.equal(cards.textContent.includes("secret"), false);
  const attempts = cards.querySelectorAll("[data-card-attempt-body] .ppbui-cards-attempt");
  assert.equal(attempts.length, 2);
  assert.match(attempts[0].textContent, /Mewtwo/);
  assert.equal(attempts[0].dataset.rarity, "unknown");
  assert.equal(attempts[0].querySelector('[data-attempt-column="7"]').textContent, "—", "out-of-range failed IV total fails closed");
  assert.match(attempts[0].textContent, /—/);
  assert.match(attempts[1].textContent, /Ho-Oh/);
  assert.match(attempts[1].textContent, /IV —/);
  assert.match(attempts[1].textContent, /ATK —/);
  assert.equal(attempts[1].textContent.includes("must-not-render"), false);
});

test("card dashboard makes Analyzer unavailable state visible instead of implying empty history", t => {
  const now = Date.now();
  const { app, doc, bridge, setAnalyzerSummary } = setup(t, {
    analyzerSummary: {
      protocol: 1,
      available: true,
      capturedAtMs: now,
      status: "running",
      seen: 10,
      specialHistory: [{ atMs: now - 1000, species: "Dragonite", rarity: "epic", result: "fled", chance: 0.01, ball: "Ultra Ball" }],
    },
  });
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.equal(cards.querySelector('[data-card-field="status"]').textContent, "Caçando");

  setAnalyzerSummary(null);
  app.reconcile();
  assert.equal(cards.querySelector('[data-card-field="status"]').textContent, "Indisponível");
  assert.equal(cards.querySelector('[data-card-field="target-name"]').textContent, "Indisponível");
  assert.equal(cards.querySelector("[data-card-attempt-body]").textContent, "Dados do Hunt Analyzer indisponíveis.");
  assert.equal(cards.querySelector("[data-card-attempt-body]").textContent.includes("Nenhuma tentativa"), false);
});

test("card dashboard keeps Hunt/Loot Story compact, locally scrollable and responsive", t => {
  const { app, doc } = setup(t);
  app.start();
  const css = doc.querySelector("style[data-ppbui-coupled-cards-style]").textContent;
  assert.match(css, /\.ppbui-cards-attempt-table,\.ppbui-cards-loot-table\{[^}]*max-height:190px;overflow-y:auto;overflow-x:hidden/);
  assert.match(css, /\.ppbui-cards-attempt-scroll\{[^}]*overflow-x:auto;overflow-y:hidden/);
  assert.match(css, /\.ppbui-cards-attempt-labels,\.ppbui-cards-attempt\{display:grid;grid-template-columns:64px 74px minmax\(140px,1fr\) 72px 72px 92px 68px 64px;align-items:center;min-width:648px/);
  assert.match(css, /\.ppbui-cards-attempt-table\{min-width:648px\}/);
  assert.match(css, /\.ppbui-cards-loot-row\{display:grid;gap:5px;padding:7px 8px/);
  assert.match(css, /\.ppbui-cards-loot-finance\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css, /\.ppbui-cards-attempt-head/);
  assert.match(css, /\.ppbui-cards-battle\{[^}]*height:158px;max-height:164px/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*\.ppbui-cards-history-filters\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.ok(doc.querySelector("[data-card-attempt-result]"));
  assert.ok(doc.querySelector('[data-card-story-tab="hunt"]'));
  assert.ok(doc.querySelector('[data-card-story-tab="loot"]'));
  assert.ok(doc.querySelector("[data-card-loot-body]"));
  assert.ok(doc.querySelector("[data-card-loot-rarity]"), "Loot Story exposes an item-rarity filter");
  const scroll = doc.querySelector("[data-card-attempt-scroll]");
  assert.ok(scroll?.querySelector(".ppbui-cards-attempt-labels"));
  assert.ok(scroll?.querySelector(".ppbui-cards-attempt-table"), "Hunt labels and rows share the same horizontal scroll surface");
  const labels = [...doc.querySelectorAll(".ppbui-cards-attempt-labels>[data-attempt-column]")];
  assert.equal(labels.length, 8, "Hunt Story exposes visible labels for every direct-read field");
  assert.equal(labels[3].textContent, "Quality");
  assert.equal(labels[6].textContent, "Chance");
  assert.equal(labels[7].textContent, "IV Total");
  assert.doesNotMatch(css, /grid-template-columns:55px 65px minmax\(80px,1fr\) 64px/,
    "rejected 264px-minimum four-track responsive row must not survive in narrow styles");
  assert.match(css, /@media\(max-width:640px\)[\s\S]*\.ppbui-cards-attempt\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-template-areas:"pokemon pokemon rarity" "time result ball" "quality chance iv"/,
    "compact encounter must organize eight visible facts into an identity band plus two labeled metric bands");
  assert.ok(css.includes('@container (max-width:320px){')
    && css.includes('grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"pokemon rarity" "time result" "ball chance" "quality iv"'),
    "narrower history container must reflow to two tracks based on available content width");
  assert.match(css, /@media\(max-width:640px\)[\s\S]*\.ppbui-cards-attempt-scroll\{overflow-x:hidden;overflow-y:visible\}/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*\.ppbui-cards-attempt-labels\{display:none\}/);
  assert.match(css, /\.ppbui-cards-attempt>span:not\(\.ppbui-cards-attempt-pokemon\)::before\{content:attr\(data-label\)/,
    "every compact fact exposes a visible semantic label, including Time, Rarity and Quality");
  assert.match(css, /\.ppbui-cards-attempt>\.ppbui-cards-attempt-pokemon::before\{content:attr\(data-label\)/,
    "Pokémon headline remains visibly named instead of relying on a sprite");
  assert.match(css, /@media\(max-width:640px\)[\s\S]*\.ppbui-cards-team-member>strong\{font-size:10px\}/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*\.ppbui-cards-team-member>span\{font-size:9px\}/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*\.ppbui-cards-meter-row\{grid-template-columns:minmax\(0,1fr\);row-gap:1px\}/,
    "narrow HP/EXP label and gauge use separate rows so values cannot overlap the target card");
  assert.ok(css.lastIndexOf('@media(max-width:519px){.ppbui-cards-attempt-table{max-height:218px}')
    > css.lastIndexOf('@media(max-width:640px){.ppbui-cards-history-filters{'),
    'the 218px cap takes precedence over the general 640px history sizing');
  assert.match(css, /@media\(max-width:519px\)[\s\S]*\.ppbui-cards-team-switch-head>\[data-card-copy="switchPokemon"\]\{display:none\}\.ppbui-cards-team-switch-head>\.ppbui-cards-team-switch-short\{display:inline\}/,
    '92px Team header exposes a short visible name without clipped SWiTCH POKE text');
  assert.doesNotMatch(css, /focus-visible\{[^}]*outline:1px solid var\(--ppbui-focus/);
  assert.match(css, /\.ppbui-cards-team-member:focus-visible\{[^}]*outline:2px solid var\(--ppbui-focus/);
  assert.match(css, /\.ppbui-cards-story-tabs button:focus-visible\{[^}]*outline:2px solid var\(--ppbui-focus/);
  assert.match(css, /\.ppbui-cards-history-filters select:focus-visible\{[^}]*outline:2px solid var\(--ppbui-focus/);
  assert.match(css, /\.ppbui-cards-session-actions button:focus-visible\{[^}]*outline:2px solid var\(--ppbui-focus/);
  assert.match(css, /\.ppbui-cards-rarity-filter>summary:focus-visible\{[^}]*outline:2px solid var\(--ppbui-focus/);
  assert.match(css, /@media\(max-width:519px\)[\s\S]*\.ppbui-cards-battle\{height:162px/);
  assert.match(css, /@media\(max-width:519px\)[\s\S]*\.ppbui-cards-attempt-table\{max-height:218px\}\.ppbui-cards-loot-table\{max-height:260px\}/);
  assert.doesNotMatch(css, /\.ppbui-cards-rarity-badge\{display:none!important\}/,
    "narrow target must retain a visible, textual rarity instead of relying on border color");
  assert.match(css, /@media\(max-width:519px\)[\s\S]*\.ppbui-cards-combat-kicker\{flex-wrap:wrap;overflow:visible;gap:2px\}/,
    "narrow target must allow its rarity and Shiny badges to wrap without clipping");
  assert.match(css, /\.ppbui-cards-rarity-badge,\.ppbui-cards-shiny-badge\{flex:0 0 auto;min-height:13px;padding:1px 2px;font-size:7px!important;/,
    "narrow rarity and Shiny names remain visible at compact text sizes");
  assert.doesNotMatch(css, /\.ppbui-cards-shiny-badge\{[^}]*font-size:0!important/,
    "narrow Shiny identification must remain textual, not icon-only");
  assert.match(css, /@media\(max-width:519px\)[\s\S]*\.ppbui-cards-move\{width:16px;height:16px\}/);
  assert.match(css, /@media\(max-width:519px\)[\s\S]*\.ppbui-cards-loot-finance\{grid-template-columns:1fr\}/);
  assert.match(css, /\.ppbui-cards-battle-pair\{[^}]*grid-template-columns:minmax\(126px,\.58fr\) minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /@media\(min-width:900px\)[\s\S]*\.ppbui-cards-battle-pair\{grid-template-columns:minmax\(126px,\.6fr\) minmax\(0,1\.4fr\) minmax\(0,1fr\);gap:8px\}/, "desktop Target uses the same right-hand grid boundary as Captured / Seen for screenshot cropping");
  assert.match(css, /\.ppbui-cards-team-list\{[^}]*grid-template-rows:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /\.ppbui-cards-team-member\[aria-pressed="true"\]\{[^}]*border-color:var\(--ppbui-accent-hi/);
  assert.match(css, /@media\(max-width:519px\)[\s\S]*\.ppbui-cards-battle-pair\{grid-template-columns:minmax\(92px,\.62fr\) minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.doesNotMatch(css, /\.ppbui-cards-battle-actions|\.ppbui-cards-ball-controls|\.ppbui-cards-versus/);
  assert.match(css, /\.ppbui-cards-meter-row\{[^}]*grid-template-columns:max-content minmax\(0,1fr\)/);
  assert.match(css, /\.ppbui-cards-meter-row>span\{[^}]*white-space:nowrap/);
  assert.match(css, /\.ppbui-cards-moves\{[^}]*display:flex[^}]*gap:3px/);
  assert.match(css, /\.ppbui-cards-move\{[^}]*width:19px;height:19px/);
  assert.match(css, /\.ppbui-cards-card--rarity\{[^}]*grid-column:1\/-1/);
  assert.match(css, /@media\(min-width:900px\)[\s\S]*\.ppbui-cards-card--rarity\{grid-column:auto\}/);
  const overview = [...doc.querySelectorAll(".ppbui-cards-card--overview")];
  assert.deepEqual(overview.map(card => card.classList.contains("ppbui-cards-card--summary") ? "summary" : card.classList.contains("ppbui-cards-card--capture") ? "capture" : "rarity"), ["summary", "capture", "rarity"], "Capture and Captured/Seen use the requested order");
  for (const selector of [
    "ppbui-cards-combat-card", "ppbui-cards-combat-art", "ppbui-cards-team-switch",
    "ppbui-cards-card", "ppbui-cards-rarity>div", "ppbui-cards-attempt-table,.ppbui-cards-loot-table",
    "ppbui-cards-rarity-filter fieldset", "ppbui-cards-economy-group",
  ]) assert.match(css, new RegExp(`\\.${selector.replace(/[> ]/g, match => match === ">" ? ">" : " ")}\\{[^}]*border-radius:var\\(--ppbui-radius,0px\\)`));
  assert.match(css, /\.ppbui-cards-team-member\{[^}]*border-radius:var\(--ppbui-radius-badge,0px\)/);
  assert.match(css, /\.ppbui-cards-rarity-filter>summary\{[^}]*border-radius:var\(--ppbui-control-radius,var\(--ppbui-radius,0px\)\)/);
  assert.match(css, /\.ppbui-cards-rarity-badge,\.ppbui-cards-shiny-badge\{[^}]*border-radius:var\(--ppbui-radius-badge,0px\)/);
  assert.match(css, /\.ppbui-cards-hp-meter,\.ppbui-cards-exp-meter\{[^}]*border-radius:var\(--ppbui-radius-badge,0px\)/);
});

test("Cards navigation appears only after scroll, jumps within its own pane and releases listeners on cleanup", t => {
  const { app, doc, bridge, window } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running" },
  });
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const nav = cards.querySelector("[data-card-shortcuts]");
  assert.equal(nav.hidden, true, "shortcuts consume no permanent toolbar row");
  assert.equal(nav.getAttribute("aria-label"), "Ir para seção");
  const css = doc.querySelector("style[data-ppbui-coupled-cards-style]").textContent;
  assert.match(css, /\.ppbui-cards-shortcuts\{position:sticky;top:0;height:0/);
  cards.scrollTop = 180;
  cards.dispatchEvent(new window.Event("scroll"));
  assert.equal(nav.hidden, false);
  nav.querySelector('[data-card-jump="story"]').focus();
  cards.scrollTop = 80;
  cards.dispatchEvent(new window.Event("scroll"));
  assert.equal(nav.hidden, false, "scrolling toward the top cannot hide a keyboard-focused shortcut");
  cards.querySelector("[data-card-copy-summary]").focus();
  assert.equal(nav.hidden, true, "blur removes the shortcuts at the top threshold");
  cards.scrollTop = 180;
  cards.dispatchEvent(new window.Event("scroll"));
  assert.equal(nav.hidden, false);
  const history = cards.querySelector(".ppbui-cards-history");
  history.getBoundingClientRect = () => ({ top: 680 });
  cards.getBoundingClientRect = () => ({ top: 80 });
  cards.querySelector('[data-card-jump="story"]').click();
  assert.equal(cards.scrollTop, 744, "scroll uses the selected section within the same Cards scroll surface");
  assert.equal(doc.activeElement, history, "the selected section receives programmatic focus");
  cards.querySelector('[data-card-jump="top"]').click();
  assert.equal(cards.scrollTop, 0);
  assert.equal(nav.hidden, true);
  assert.equal(doc.activeElement, cards.querySelector(".ppbui-cards-battle"), "hidden Top trigger does not retain keyboard focus");
  cards.scrollTop = 180;
  app.stop();
  cards.dispatchEvent(new window.Event("scroll"));
  assert.equal(nav.hidden, true, "detached Cards do not show controls after cleanup");
});

test("segmented Hunt result filter supports one keyboard stop and arrow/Home/End selection", t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", specialHistory: [
      { rarity: "epic", result: "captured", species: "Gengar", atMs: Date.now(), shiny: false },
      { rarity: "epic", result: "fled", species: "Dragonite", atMs: Date.now(), shiny: false },
    ] },
  });
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const options = [...cards.querySelectorAll("[data-card-attempt-result]")];
  assert.equal(cards.querySelector(".ppbui-cards-result-filter").getAttribute("aria-label"), "Resultado");
  assert.equal(options.length, 3);
  assert.deepEqual(options.map(button => button.tabIndex), [0, -1, -1]);
  options[0].focus();
  options[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  assert.equal(options[1].getAttribute("aria-pressed"), "true");
  assert.equal(doc.activeElement, options[1]);
  assert.equal(cards.querySelectorAll('[data-card-attempt-body] [data-result="captured"]').length, 1);
  options[1].dispatchEvent(new window.KeyboardEvent("keydown", { key: "End", bubbles: true }));
  assert.equal(options[2].getAttribute("aria-pressed"), "true");
  assert.equal(cards.querySelectorAll('[data-card-attempt-body] [data-result="fled"]').length, 1);
  options[2].dispatchEvent(new window.KeyboardEvent("keydown", { key: "Home", bubbles: true }));
  assert.equal(options[0].getAttribute("aria-pressed"), "true");
  assert.deepEqual(options.map(button => button.tabIndex), [0, -1, -1]);
});

test("Copy summary writes displayed authoritative KPIs and reports clipboard denial or absence", async t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running",
      seen: 120, captured: 12, failed: 108, revenue: 2450, profit: 1200, pokemonExpPerHour: 800 },
  });
  const calls = [];
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: {
    writeText: async value => { calls.push(value); },
  } });
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const copy = cards.querySelector("[data-card-copy-summary]");
  const status = cards.querySelector('[data-card-control-status="copy-summary"]');
  copy.click();
  await settle();
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^Resumo da hunt\n/);
  assert.match(calls[0], /Vistos: 120/);
  assert.match(calls[0], /Capturados: 12/);
  assert.doesNotMatch(calls[0], /(?:undefined|NaN|—|session[_-]?id|token)/i);
  assert.equal(status.textContent, "Resumo copiado");
  assert.equal(status.dataset.tone, "success");
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: {
    writeText: () => Promise.reject(new Error("permission denied")),
  } });
  copy.click();
  await settle();
  assert.equal(status.textContent, "Não foi possível copiar o resumo");
  assert.equal(status.dataset.tone, "error");
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: undefined });
  copy.click();
  assert.equal(status.textContent, "Área de transferência indisponível");
});

test("Copy summary refuses unavailable data and a late clipboard resolution cannot update detached Cards", async t => {
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, { analyzerSummary: null });
  let resolveClipboard;
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: {
    writeText: () => new Promise(resolve => { resolveClipboard = resolve; }),
  } });
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const root = doc.querySelector("[data-ppbui-coupled-cards]");
  const button = root.querySelector("[data-card-copy-summary]");
  const status = root.querySelector('[data-card-control-status="copy-summary"]');
  assert.equal(button.disabled, true, "no authoritative session may be copied");
  setAnalyzerSummary({ protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", seen: 10 });
  app.reconcile();
  assert.equal(button.disabled, false);
  button.click();
  assert.equal(typeof resolveClipboard, "function");
  const beforeCleanup = status.textContent;
  app.stop();
  resolveClipboard();
  await settle();
  assert.equal(root.isConnected, false);
  assert.equal(status.textContent, beforeCleanup, "late clipboard result cannot write a detached status");
});

test("Copy summary status belongs to the latest explicit clipboard request", async t => {
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", seen: 6 },
  });
  const requests = [];
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: {
    writeText: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
  } });
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const button = cards.querySelector("[data-card-copy-summary]");
  const status = cards.querySelector('[data-card-control-status="copy-summary"]');
  button.click();
  button.click();
  assert.equal(requests.length, 2);
  assert.equal(status.textContent, "Copiando…");
  requests[1].resolve();
  await settle();
  assert.equal(status.textContent, "Resumo copiado");
  requests[0].reject(new Error("older denial"));
  await settle();
  assert.equal(status.textContent, "Resumo copiado", "an older rejected clipboard request cannot overwrite newer success");
  button.click();
  assert.equal(requests.length, 3);
  setAnalyzerSummary(null);
  app.reconcile();
  assert.equal(button.disabled, true);
  assert.equal(status.textContent, "", "lost Analyzer authority invalidates pending copy feedback");
  requests[2].resolve();
  await settle();
  assert.equal(status.textContent, "", "late success cannot revive copy status after authority disappears");
});

test("Hunt and Loot Story tabs expose complete ARIA relationships and keyboard navigation", t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary:{protocol:1,available:true,capturedAtMs:Date.now(),status:"running",specialHistory:[],lootHistory:[]},
  });
  app.start();
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});
  bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  const hunt = doc.querySelector('[data-card-story-tab="hunt"]');
  const loot = doc.querySelector('[data-card-story-tab="loot"]');
  const huntPanel = doc.querySelector('[data-card-story-panel="hunt"]');
  const lootPanel = doc.querySelector('[data-card-story-panel="loot"]');
  assert.equal(hunt.getAttribute("aria-controls"), huntPanel.id);
  assert.equal(huntPanel.getAttribute("aria-labelledby"), hunt.id);
  assert.equal(loot.getAttribute("aria-controls"), lootPanel.id);
  assert.equal(lootPanel.getAttribute("aria-labelledby"), loot.id);
  assert.equal(hunt.tabIndex, 0);
  assert.equal(loot.tabIndex, -1);
  hunt.dispatchEvent(new window.KeyboardEvent("keydown", { key:"ArrowRight", bubbles:true }));
  assert.equal(hunt.getAttribute("aria-selected"), "false");
  assert.equal(loot.getAttribute("aria-selected"), "true");
  assert.equal(hunt.tabIndex, -1);
  assert.equal(loot.tabIndex, 0);
  assert.equal(huntPanel.hidden, true);
  assert.equal(lootPanel.hidden, false);
  loot.dispatchEvent(new window.KeyboardEvent("keydown", { key:"ArrowLeft", bubbles:true }));
  assert.equal(hunt.getAttribute("aria-selected"), "true");
  assert.equal(loot.getAttribute("aria-selected"), "false");
});

test("hunt console renders six Pokémon + level rows left of the active card and switches only after explicit selection", async t => {
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", attemptHistory: [] },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  hud.innerHTML = `<div class="pokeidle-team-hud__list">
    <div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">Rhydon</span></div>
    <div class="pokeidle-team-card" data-creature-id="b"><span class="pokeidle-team-card__name">Umbreon</span></div>
  </div>`;
  doc.body.append(hud);
  const creatures = [
    { id: "a", name: "Rhydon", level: 196, hp: 100, max_hp: 100, is_leader: true },
    { id: "b", name: "Umbreon", level: 155, hp: 90, max_hp: 100, is_leader: false },
    { id: "c", name: "Gyarados", level: 128, hp: 90, max_hp: 100, is_leader: false },
    { id: "d", name: "Gengar", level: 125, hp: 90, max_hp: 100, is_leader: false },
    { id: "e", name: "Snorlax", level: 166, hp: 90, max_hp: 100, is_leader: false },
    { id: "f", name: "Dragonite", level: 155, hp: 0, max_hp: 100, is_leader: false },
  ];
  let leaderId = "a", mutations = 0;
  window.PokeIdle = {
    PersistentHud: { _teamHud: { el: hud, _creatures: creatures } },
    Api: {
      async setTeamLeader(id) {
        mutations++;
        leaderId = id;
        creatures.forEach(creature => { creature.is_leader = creature.id === id; });
        return { xp_share: null };
      },
      async getTeam() { return { team: { leader_id: leaderId } }; },
    },
    Bus: { emit() {}, on() {}, off() {} },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const roster = doc.querySelector("[data-card-team-list]");
  const rows = [...roster.children];
  const buttons = [...roster.querySelectorAll("[data-card-team-member]")];
  assert.equal(mutations, 0, "rendering the hunt console must never switch Pokémon automatically");
  assert.equal(rows.length, 6);
  assert.equal(buttons.length, 6);
  assert.deepEqual(buttons.map(button => [button.querySelector("strong").textContent, button.querySelector("span").textContent]), [
    ["Rhydon", "Lv. 196"], ["Umbreon", "Lv. 155"], ["Gyarados", "Lv. 128"],
    ["Gengar", "Lv. 125"], ["Snorlax", "Lv. 166"], ["Dragonite", "Lv. 155"],
  ]);
  assert.equal(roster.compareDocumentPosition(doc.querySelector('[data-card-combat="player"]')) & window.Node.DOCUMENT_POSITION_FOLLOWING, window.Node.DOCUMENT_POSITION_FOLLOWING, "roster must be before the active Pokémon card");
  assert.equal(roster.querySelector('[data-card-team-member="a"]').getAttribute("aria-pressed"), "true");
  assert.equal(roster.querySelector('[data-card-team-member="f"]').disabled, true, "fainted Pokémon remains visible but cannot become active");
  roster.querySelector('[data-card-team-member="b"]').click();
  await settle();
  assert.equal(mutations, 1);
  assert.equal(leaderId, "b");
  assert.equal(doc.querySelector('[data-card-control-status="team"]').textContent, "Ativo atualizado");
  assert.equal(doc.querySelector('[data-card-team-member="b"]').getAttribute("aria-pressed"), "true");
  assert.equal(doc.querySelector('[data-card-team-member="a"]').getAttribute("aria-pressed"), "false");
  creatures.splice(2);
  app.reconcile();
  const compactRoster = doc.querySelector("[data-card-team-list]");
  assert.equal(compactRoster.children.length, 6, "roster keeps six visual rows even when Team has fewer members");
  assert.equal(compactRoster.querySelectorAll("[data-card-team-member]").length, 2);
  assert.equal(compactRoster.querySelectorAll(".ppbui-cards-team-member--empty").length, 4);
});

test("late Team hydration clears only the stale availability error and keeps six members usable", t => {
  const { app, doc, window, bridge } = setup(t, { analyzerSummary:{protocol:1,available:true,capturedAtMs:Date.now(),status:"running",specialHistory:[]} });
  window.PokeIdle={PersistentHud:{_teamHud:{_creatures:[]}}};
  app.start();bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  const status=doc.querySelector('[data-card-control-status="team"]');assert.equal(status.textContent,"Team indisponível");
  const creatures=Array.from({length:6},(_,index)=>({id:String(index+1),name:`Pokemon ${index+1}`,level:100+index,hp:100,is_leader:index===0}));
  window.PokeIdle.PersistentHud._teamHud={el:doc.createElement("div"),_creatures:creatures};
  window.PokeIdle.Api={async setTeamLeader(){return{};},async getTeam(){return{team:{leader_id:"1"}};}};
  app.reconcile();
  assert.equal(doc.querySelectorAll("[data-card-team-member]").length,6);
  assert.equal(status.textContent,"","availability copy clears when Team finishes hydrating");
  assert.equal(doc.querySelector('[data-card-field="player-name"]').textContent,"Pokemon 1","active Pokémon text does not depend on a matching HUD DOM root");
});

test("Loot Story shows dropped items with explicit metadata and item-rarity filtering", async t => {
  const now=Date.now();
  const { app, doc, window, bridge }=setup(t,{analyzerSummary:{
    protocol:1,available:true,capturedAtMs:now,status:"running",specialHistory:[],
    lootHistory:[{atMs:now-1000,species:"Dragonite",directGold:50,lootSellValue:500,autoSold:false,autoSellValue:0,items:[{itemId:"moon-stone",qty:2},{itemId:"oran-berry",qty:3}]}],
  }});
  window.PokeIdle={Api:{async getInventory(){return{inventory:[
    {item:{id:"moon-stone",name:"Moon Stone",rarity:"Rara"},qty:4},
    {item:{id:"oran-berry",name:"Oran Berry",quality:"common"},qty:8},
  ]};}}};
  app.start();bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  doc.querySelector('[data-card-story-tab="loot"]').click();await settle();
  const body=doc.querySelector("[data-card-loot-body]"),filter=doc.querySelector("[data-card-loot-rarity]");
  assert.match(body.textContent,/Moon Stone/);assert.match(body.textContent,/×2 · Rara/);assert.match(body.textContent,/Oran Berry/);assert.match(body.textContent,/×3 · Comum/);
  assert.match(body.textContent,/Gold direto/);assert.match(body.textContent,/Loot \(valor\)/);assert.match(body.textContent,/Auto-sell/);
  const total=body.querySelector("[data-card-loot-total]");
  assert.match(total.textContent,/^Total /,"Loot Story row total must have a visible label");
  assert.match(total.getAttribute("aria-label"),/^Total: /,"Loot Story row total must expose the same accessible label");
  filter.value="rare";filter.dispatchEvent(new window.Event("change"));
  assert.match(body.textContent,/Moon Stone/);assert.doesNotMatch(body.textContent,/Oran Berry/);
  filter.value="mythical";filter.dispatchEvent(new window.Event("change"));
  assert.equal(body.textContent,"Nenhum loot corresponde à raridade de item selecionada.");
});

test("Loot Story refreshes native metadata when a newly dropped item was not in the first catalog", async t => {
  const now = Date.now();
  const first = {
    protocol:1,available:true,capturedAtMs:now,status:"running",specialHistory:[],
    lootHistory:[{atMs:now-2000,species:"Dragonite",items:[{itemId:"oran-berry",qty:1}]}],
  };
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t,{analyzerSummary:first});
  let inventoryReads = 0;
  let inventory = [{item_id:"oran-berry",name:"Oran Berry",rarity:"common",qty:5}];
  window.PokeIdle={Api:{async getInventory(){inventoryReads++;return{inventory};}}};
  app.start();
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});
  bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  doc.querySelector('[data-card-story-tab="loot"]').click();
  await settle();
  assert.equal(inventoryReads,1);
  assert.match(doc.querySelector("[data-card-loot-body]").textContent,/Oran Berry/);

  inventory = [
    {item_id:"oran-berry",name:"Oran Berry",rarity:"common",qty:5},
    {item_id:"moon-stone",name:"Moon Stone",rarity:"rare",qty:2},
  ];
  setAnalyzerSummary({
    ...first,
    capturedAtMs:Date.now(),
    lootHistory:[
      ...first.lootHistory,
      {atMs:now-1000,species:"Dragonite",items:[{itemId:"moon-stone",qty:2}]},
    ],
  });
  app.reconcile();
  await settle();
  assert.equal(inventoryReads,2,"a newly seen uncached item ID triggers one deduplicated native metadata refresh");
  const body=doc.querySelector("[data-card-loot-body]"),filter=doc.querySelector("[data-card-loot-rarity]");
  assert.match(body.textContent,/Moon Stone/);
  assert.match(body.textContent,/×2 · Rara/);
  filter.value="rare";
  filter.dispatchEvent(new window.Event("change"));
  assert.match(body.textContent,/Moon Stone/);
  assert.doesNotMatch(body.textContent,/Oran Berry/);
  assert.doesNotMatch(body.textContent,/Nenhum loot corresponde/);
});

test("Team quick action accepts only successful POST and never waits for a stale GET /team", async () => {
  const member = { id: "b", name: "Umbreon", hp: 100, is_leader: false };
  let staleGetReads = 0, teamUpdates = 0;
  const win = {
    PokeIdle: {
      PersistentHud: { _teamHud: { _creatures: [{ id: "a", name: "Rhydon", hp: 100, is_leader: true }, member] } },
      Api: {
        async setTeamLeader() { return {}; },
        async getTeam() { staleGetReads++; return { team: { leader_id: "a" } }; },
      },
      Bus: { emit(event) { if (event === "team.updated") teamUpdates++; } },
    },
  };
  const result = await setActiveTeamMember(win, "b");
  assert.equal(result.ok, true, "only the native POST acknowledgment is required");
  assert.equal(result.confirmation, "post-accepted");
  assert.equal(Number.isFinite(result.ackAt), true);
  assert.equal(staleGetReads, 0, "an in-flight cached GET cannot delay or falsely reject a successful POST");
  assert.equal(teamUpdates, 1);
});

test("hunt console delegates Pause Resume and Reset explicitly to the embedded Analyzer owner", async t => {
  const now = Date.now();
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, {
    analyzerSummary: {
      protocol: 1,
      available: true,
      capturedAtMs: now,
      leadershipActive: true,
      status: "running",
      attemptHistory: [],
    },
  });
  const actions = [];
  window.__POKEPIXEL_HUNT_ANALYZER_CONTROL__ = Object.freeze({
    protocol: 1,
    async act(action) { actions.push(action); return { ok: true }; },
  });
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  const pause = doc.querySelector("[data-card-session-pause]");
  const reset = doc.querySelector("[data-card-session-reset]");
  assert.equal(actions.length, 0, "rendering Cards must never mutate Analyzer session state");
  assert.equal(pause.textContent, "Pausar");
  pause.click();
  await settle();
  assert.deepEqual(actions, ["pause"]);
  assert.equal(doc.querySelector('[data-card-control-status="analyzer"]').textContent, "Hunt pausada");

  setAnalyzerSummary({ protocol: 1, available: true, capturedAtMs: Date.now(), leadershipActive: true, status: "paused", attemptHistory: [] });
  app.reconcile();
  assert.equal(pause.textContent, "Retomar");
  pause.click();
  await settle();
  reset.click();
  await settle();
  assert.deepEqual(actions, ["pause", "resume", "reset"]);
  assert.equal(doc.querySelector('[data-card-control-status="analyzer"]').textContent, "Hunt resetada e pausada");
});

test("pending Cards action settling after cleanup cannot mutate detached dashboard state", async t => {
  const pending = (()=>{let resolve;const promise=new Promise(next=>{resolve=next;});return{promise,resolve};})();
  const { app, doc, window, bridge } = setup(t, {
    analyzerSummary:{protocol:1,available:true,capturedAtMs:Date.now(),leadershipActive:true,status:"running",attemptHistory:[]},
  });
  window.__POKEPIXEL_HUNT_ANALYZER_CONTROL__={protocol:1,act:()=>pending.promise};
  app.start();bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  const cards=doc.querySelector("[data-ppbui-coupled-cards]"),pause=cards.querySelector("[data-card-session-pause]"),status=cards.querySelector('[data-card-control-status="analyzer"]');
  pause.click();await Promise.resolve();assert.equal(status.textContent,"Pausando…");
  app.stop();assert.equal(cards.isConnected,false);const detachedStatus=status.textContent;
  pending.resolve({ok:true});await settle();
  assert.equal(status.textContent,detachedStatus,"late Analyzer settlement must not update detached Cards UI after cleanup");
});

test("queued Cards metadata reads do not start after cleanup", async t => {
  const now=Date.now();let speciesReads=0,inventoryReads=0;
  const { app, window }=setup(t,{analyzerSummary:{
    protocol:1,available:true,capturedAtMs:now,status:"running",
    currentTarget:{speciesId:"dragonite",species:"Dragonite",rarity:"epic",shiny:false},
    specialHistory:[{atMs:now-1000,speciesId:"dragonite",species:"Dragonite",rarity:"epic",shiny:false,result:"captured",chance:0.1,ball:"Ultra Ball"}],
    lootHistory:[{atMs:now-1000,species:"Dragonite",items:[{itemId:"dragon-scale",qty:1}]}],
  }});
  window.PokeIdle={Api:{async getSpecies(){speciesReads++;return{};},async getInventory(){inventoryReads++;return{inventory:[]};}}};
  app.start();app.stop();await settle();
  assert.equal(speciesReads,0,"cleanup prevents queued native species reads from starting");
  assert.equal(inventoryReads,0,"cleanup prevents queued inventory metadata reads from starting");
});

test("captured Cards sprite fallback error listeners are inert after cleanup", async t => {
  const now=Date.now();
  const {app,doc,window,bridge}=setup(t,{analyzerSummary:{
    protocol:1,available:true,capturedAtMs:now,status:"running",
    currentTarget:{speciesId:"dragonite",species:"Dragonite",rarity:"epic",shiny:false},
    specialHistory:[],
  }});
  window.PokeIdle={Api:{async getSpecies(){return{id:"dragonite",name:"Dragonite",normal_sprite_url:"/native-species/dragonite.png"};}}};
  app.start();
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});
  bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  await settle();
  const image=doc.querySelector('[data-card-sprite="target"]');
  const fallback=doc.querySelector('[data-card-sprite-fallback="target"]');
  assert.equal(image.hidden,false);
  const before={hidden:image.hidden,failed:image.dataset.failedSrc,fallbackHidden:fallback.hidden};
  app.stop();
  image.dispatchEvent(new window.Event("error"));
  assert.deepEqual(
    {hidden:image.hidden,failed:image.dataset.failedSrc,fallbackHidden:fallback.hidden},
    before,
    "detached image errors cannot mutate Cards fallback state after cleanup",
  );
});

test("captured Cards filters and Story tabs are inert after cleanup", t => {
  const {app,doc,bridge}=setup(t,{analyzerSummary:{protocol:1,available:true,capturedAtMs:Date.now(),status:"running",attemptHistory:[{species:"Mew",rarity:"mythical",result:"captured",shiny:false}]}});
  app.start();bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});bridge.send({type:"ppbui.coupled.set-view",protocol:1,viewMode:"cards"});
  const cards=doc.querySelector("[data-ppbui-coupled-cards]"),rarity=cards.querySelector('[data-card-attempt-rarity][value="mythical"]'),loot=cards.querySelector('[data-card-story-tab="loot"]'),huntPanel=cards.querySelector('[data-card-story-panel="hunt"]'),history=cards.querySelector('[data-card-aria="historyTable"]');
  const before={history:history.innerHTML,lootSelected:loot.getAttribute("aria-selected"),huntHidden:huntPanel.hidden};
  app.stop();rarity.checked=false;rarity.dispatchEvent(new doc.defaultView.Event("change"));loot.click();
  assert.equal(history.innerHTML,before.history,"detached filters cannot rerender Hunt Story after cleanup");
  assert.equal(loot.getAttribute("aria-selected"),before.lootSelected,"detached Story tabs cannot mutate selection after cleanup");
  assert.equal(huntPanel.hidden,before.huntHidden,"detached Story tabs cannot hide the previously selected panel after cleanup");
});

test("Card Mode no longer owns Auto Ball or Heal Potion settings", async t => {
  const now = Date.now();
  const baseSummary = {
    protocol: 1,
    available: true,
    capturedAtMs: now,
    status: "running",
    currentTarget: { species: "Typhlosion", level: 80, rarity: "rare", shiny: false, spriteUrl: "" },
    attemptHistory: [],
  };
  const { app, doc, window, bridge, setAnalyzerSummary } = setup(t, { analyzerSummary: baseSummary });
  let settingsReads = 0, inventoryReads = 0, updates = 0;
  window.PokeIdle = {
    Api: {
      async getHuntSettings() { settingsReads++; return {}; },
      async getInventory() { inventoryReads++; return { inventory: [] }; },
      async updateHuntSettings() { updates++; },
    },
    Bus: { on() {}, off() {} },
  };
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  bridge.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: "cards" });
  await settle();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  for (const selector of ["[data-card-ball-scope]", "[data-card-ball-select]", "[data-card-potion-select]", "[data-card-ball-label]"]) {
    assert.equal(cards.querySelector(selector), null, `${selector} must not exist in Cards`);
  }
  assert.equal(cards.textContent.includes("Auto Ball"), false);
  assert.equal(cards.textContent.includes("Heal Potion"), false);
  assert.equal(settingsReads, 0);
  assert.equal(inventoryReads, 0);
  assert.equal(updates, 0, "Cards must not own capture/heal settings writes");

  setAnalyzerSummary({ ...baseSummary, capturedAtMs: Date.now(), currentTarget: { ...baseSummary.currentTarget, shiny: true } });
  app.reconcile();
  await settle();
  assert.equal(settingsReads, 0);
  assert.equal(inventoryReads, 0);
  assert.equal(updates, 0, "target changes must not resurrect removed Card Mode controls");
});

test("standalone Better UI does not hide the native toolbar", t => {
  const { app, doc, sent } = setup(t, { coupled: false });
  app.start();
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
  assert.equal(doc.querySelector('style[data-ppbui-style="coupled-workspace"]'), null);
  assert.equal(sent.length, 0);
});

test("standalone userscript Card Mode defaults to Cards and toggles directly to Game and back", t => {
  const summary = {
    protocol: 1, available: true, capturedAtMs: Date.now(), leadershipActive: true,
    status: "running", seen: 42, captured: 7, failed: 35, specialHistory: [], lootHistory: [],
  };
  const { app, doc } = setup(t, {
    coupled: false,
    analyzerSummary: summary,
    modules: [createStandaloneCardModeModule()],
  });
  app.start();
  const switcher = doc.querySelector("[data-ppbui-card-mode-switch]");
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const cardsButton = switcher.querySelector('[data-ppbui-card-mode="cards"]');
  const gameButton = switcher.querySelector('[data-ppbui-card-mode="game"]');
  assert.ok(switcher && cards);
  assert.equal(cards.querySelector("[data-card-shortcuts]"), null,
    "standalone keeps its existing sticky Cards/Game switch without a competing host-only scroller");
  assert.equal(cards.hidden, false);
  assert.equal(cardsButton.getAttribute("aria-pressed"), "true");
  assert.equal(cards.querySelector('[data-card-field="seen"]').textContent, "42");
  gameButton.click();
  assert.equal(cards.hidden, true);
  assert.equal(gameButton.getAttribute("aria-pressed"), "true");
  cardsButton.click();
  assert.equal(cards.hidden, false);
  assert.equal(cardsButton.getAttribute("aria-pressed"), "true");
});

test("standalone native menu actions preserve their handler and return Card Mode to Game", t => {
  const { app, doc } = setup(t, {
    coupled: false,
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running", specialHistory: [], lootHistory: [] },
    modules: [createStandaloneCardModeModule()],
  });
  let clicks = 0;
  const inventory = doc.querySelector('[data-menu-id="inventory"]');
  inventory.addEventListener("click", () => { clicks += 1; });
  app.start();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.equal(cards.hidden, false);
  inventory.click();
  assert.equal(clicks, 1, "Better UI must not replace the native menu handler");
  assert.equal(cards.hidden, true);
  assert.equal(doc.documentElement.getAttribute("data-ppbui-card-mode"), "game");
  assert.equal(doc.querySelector("[data-ppbui-card-mode-switch]")?.parentElement, doc.querySelector("[data-ppbui-card-mode-dock]"));
  assert.equal(doc.querySelector(".pokeidle-top-toolbar")?.contains(doc.querySelector("[data-ppbui-card-mode-switch]")), false, "standalone Game/Card does not widen native navigation into adjacent server controls");
});

test("standalone Card Mode picks up Analyzer public summary when it becomes available later and cleans up exactly", t => {
  const { app, doc, window } = setup(t, {
    coupled: false,
    modules: [createStandaloneCardModeModule()],
  });
  app.start();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.ok(cards);
  assert.equal(cards.hidden, false);
  Object.defineProperty(window, "__POKEPIXEL_HUNT_ANALYZER_PUBLIC__", {
    configurable: true,
    value: {
      protocol: 1,
      getSummary: () => ({
        protocol: 1, available: true, capturedAtMs: Date.now(), leadershipActive: true,
        status: "running", seen: 99, captured: 11, failed: 88, specialHistory: [], lootHistory: [],
      }),
    },
  });
  app.reconcile();
  assert.equal(cards.querySelector('[data-card-field="seen"]').textContent, "99");
  app.stop();
  assert.equal(doc.querySelector("[data-ppbui-card-mode-switch]"), null);
  assert.equal(doc.querySelector("[data-ppbui-coupled-cards]"), null);
  assert.ok(doc.querySelector(".pokeidle-top-toolbar"), "native toolbar survives standalone Card Mode cleanup");
});

test("host open-surface delegates to the exact native action and fails closed", t => {
  const { app, doc, bridge, sent } = setup(t);
  let analyzerClicks = 0;
  let inventoryClicks = 0;
  let storageClicks = 0;
  doc.querySelector('[data-menu-id="hunt-analyzer"]').addEventListener("click", () => analyzerClicks++);
  doc.querySelector('[data-menu-id="inventory"]').addEventListener("click", () => inventoryClicks++);
  doc.querySelector('[data-menu-id="storage"]').addEventListener("click", () => storageClicks++);
  app.start();

  bridge.send({ type: "ppbui.coupled.open-surface", protocol: 1, requestId: "a", surfaceId: "inventory" });
  assert.equal(inventoryClicks, 1);
  assert.equal(sent.at(-1).type, "ppbui.coupled.open-surface-result");
  assert.equal(sent.at(-1).ok, true);

  bridge.send({ type: "ppbui.coupled.open-surface", protocol: 1, requestId: "analyzer", surfaceId: "hunt-analyzer" });
  assert.equal(analyzerClicks, 1);
  assert.equal(sent.at(-1).surfaceId, "hunt-analyzer");
  assert.equal(sent.at(-1).ok, true);

  bridge.send({ type: "ppbui.coupled.open-surface", protocol: 1, requestId: "b", surfaceId: "storage" });
  assert.equal(storageClicks, 0);
  assert.equal(sent.at(-1).ok, false);
  assert.equal(sent.at(-1).error, "surface-unavailable");

  bridge.send({ type: "ppbui.coupled.open-surface", protocol: 99, requestId: "c", surfaceId: "inventory" });
  assert.equal(inventoryClicks, 1, "unknown protocol is ignored");
});

test("host capabilities and commands never use menu-id impostors outside the native toolbar", t => {
  const { app, doc, bridge, sent } = setup(t);
  const native = doc.querySelector('[data-menu-id="inventory"]');
  const outside = doc.createElement("button");
  outside.dataset.menuId = "inventory";
  outside.textContent = "Outside inventory";
  const fake = doc.createElement("button");
  fake.dataset.menuId = "fake-surface";
  fake.textContent = "Not native";
  doc.body.prepend(fake, outside);
  let realClicks = 0;
  let outsideClicks = 0;
  native.addEventListener("click", () => realClicks++);
  outside.addEventListener("click", () => outsideClicks++);
  app.start();
  const initial = sent.find(message => message.type === "ppbui.coupled.capabilities");
  assert.equal(initial.surfaces.some(surface => surface.id === "fake-surface"), false);
  assert.equal(initial.surfaces.find(surface => surface.id === "inventory").label, "Inventory");
  bridge.send({ protocol: 1, type: "ppbui.coupled.open-surface", surfaceId: "inventory", requestId: "native" });
  assert.equal(realClicks, 1);
  assert.equal(outsideClicks, 0);
  assert.equal(sent.at(-1).ok, true);
  native.remove();
  bridge.send({ protocol: 1, type: "ppbui.coupled.open-surface", surfaceId: "inventory", requestId: "missing" });
  assert.equal(outsideClicks, 0);
  assert.equal(sent.find(message => message.type === "ppbui.coupled.open-surface-result" && message.requestId === "missing")?.ok,
    false, "the fallback must not click an outside impostor");
});

test("capability reconciliation tracks late native availability and cleanup restores standalone state", t => {
  const { app, doc, bridge, sent } = setup(t);
  app.start();
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: "caps-1", ok: true });
  const storage = doc.querySelector('[data-menu-id="storage"]');
  storage.disabled = false;
  app.reconcile();
  assert.equal(sent.at(-1).surfaces.find(surface => surface.id === "storage").available, true);
  const nextRequestId = sent.at(-1).requestId;
  bridge.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1, requestId: nextRequestId, ok: false });
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false, "rejected refresh restores native toolbar fallback");
  app.stop();
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
  assert.equal(doc.querySelector('style[data-ppbui-style="coupled-workspace"]'), null);
});

test("capability handshake retries unchanged surfaces after timeout and rejection until correlated acceptance", t => {
  const { app, doc, window, bridge, sent }=setup(t);let timerId=0;const timers=new Map();
  window.setTimeout=callback=>{const id=++timerId;timers.set(id,callback);return id;};
  window.clearTimeout=id=>timers.delete(id);
  const runNextTimer=()=>{const next=timers.entries().next().value;assert.ok(next,"expected a pending capability timer");const [id,callback]=next;timers.delete(id);callback();};
  const requests=()=>sent.filter(message=>message.type==="ppbui.coupled.capabilities");
  app.start();assert.deepEqual(requests().map(message=>message.requestId),["caps-1"]);
  runNextTimer();assert.equal(doc.documentElement.hasAttribute("data-ppbui-coupled-workspace"),false,"ACK timeout restores native fallback");
  runNextTimer();assert.deepEqual(requests().map(message=>message.requestId),["caps-1","caps-2"],"timeout retry must resend unchanged capabilities");
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-2",ok:false});
  runNextTimer();assert.deepEqual(requests().map(message=>message.requestId),["caps-1","caps-2","caps-3"],"rejection retry must not be suppressed by the unchanged signature");
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-3",ok:true});
  assert.equal(doc.documentElement.getAttribute("data-ppbui-coupled-workspace"),"true");assert.equal(timers.size,0,"accepted handshake clears all capability timers");
});

test("capability reconciliation supersedes an in-flight intermediate state when surfaces return to the accepted signature", t => {
  const {app,doc,bridge,sent}=setup(t),requests=()=>sent.filter(message=>message.type==="ppbui.coupled.capabilities");
  app.start();bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});
  const storage=doc.querySelector('[data-menu-id="storage"]');storage.disabled=false;app.reconcile();
  assert.equal(requests().at(-1).requestId,"caps-2");assert.equal(requests().at(-1).surfaces.find(surface=>surface.id==="storage").available,true);
  storage.disabled=true;app.reconcile();
  assert.equal(requests().at(-1).requestId,"caps-3","returning to accepted state must supersede the in-flight intermediate request");
  assert.equal(requests().at(-1).surfaces.find(surface=>surface.id==="storage").available,false);
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-2",ok:false});
  assert.equal(doc.documentElement.getAttribute("data-ppbui-coupled-workspace"),"true","stale ACK from superseded state must be ignored");
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-3",ok:true});
  assert.equal(doc.documentElement.getAttribute("data-ppbui-coupled-workspace"),"true");
});

test("capability retry renegotiates a formerly accepted signature after fallback", t => {
  const {app,doc,window,bridge,sent}=setup(t);let timerId=0;const timers=new Map();
  window.setTimeout=callback=>{const id=++timerId;timers.set(id,callback);return id;};window.clearTimeout=id=>timers.delete(id);
  const runNext=()=>{const next=timers.entries().next().value;assert.ok(next);const [id,callback]=next;timers.delete(id);callback();};
  const requests=()=>sent.filter(message=>message.type==="ppbui.coupled.capabilities");
  app.start();bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-1",ok:true});
  const storage=doc.querySelector('[data-menu-id="storage"]');storage.disabled=false;app.reconcile();assert.equal(requests().at(-1).requestId,"caps-2");
  runNext();assert.equal(doc.documentElement.hasAttribute("data-ppbui-coupled-workspace"),false,"timed-out capability update enters fallback");
  storage.disabled=true;runNext();
  assert.equal(requests().at(-1).requestId,"caps-3","fallback retry must resend even when surfaces match the last accepted signature");
  assert.equal(requests().at(-1).surfaces.find(surface=>surface.id==="storage").available,false);
  bridge.send({type:"ppbui.coupled.capabilities-accepted",protocol:1,requestId:"caps-3",ok:true});
  assert.equal(doc.documentElement.getAttribute("data-ppbui-coupled-workspace"),"true");assert.equal(timers.size,0);
});

test("ancestor-hidden native actions are advertised unavailable without removing their original nodes", t => {
  const { app, doc, sent } = setup(t);
  const wrapper = doc.createElement("div");
  const hunts = doc.querySelector('[data-menu-id="hunts"]');
  hunts.before(wrapper);
  wrapper.append(hunts);
  wrapper.hidden = true;
  app.start();
  const advertised = sent.at(-1).surfaces.find(surface => surface.id === "hunts");
  assert.equal(advertised.available, false);
  assert.equal(wrapper.firstElementChild, hunts);
});

test("aria-disabled native actions fail closed for discovery and host activation", t => {
  const { app, doc, bridge, sent } = setup(t);
  const inventory = doc.querySelector('[data-menu-id="inventory"]');
  inventory.setAttribute("aria-disabled", "true");
  let clicks = 0;
  inventory.addEventListener("click", () => clicks++);
  app.start();
  assert.equal(sent.at(-1).surfaces.find(surface => surface.id === "inventory").available, false);
  bridge.send({ type: "ppbui.coupled.open-surface", protocol: 1, requestId: "blocked", surfaceId: "inventory" });
  assert.equal(clicks, 0);
  assert.equal(sent.at(-1).type, "ppbui.coupled.open-surface-result");
  assert.equal(sent.at(-1).ok, false);
});

test("Analyzer source remains sanitized locally while the host receives no Hunt telemetry", t => {
  const { app, window, sent, setAnalyzerSummary } = setup(t, { analyzerSummary: {
    protocol: 1, available: true, capturedAtMs: Date.now(),
    appVersion: "  1.13.0\u0000  ", leadershipActive: "yes", status: "invented",
    activeMs: -5, seen: Infinity, captureRate: 5, trainerExpPerHour: NaN,
    pokemonExpPerHour: -10, dollarPerHour: 1e30, seenWeak: -2, seenCommon: Infinity,
    latestCaptureChance: 5, attemptHistory: [], secretToken: "must-not-cross",
  } });
  app.start();
  const analyzer = readAnalyzerSummary(window);
  assert.ok(analyzer);
  assert.equal(analyzer.appVersion, "1.13.0");
  assert.equal(analyzer.leadershipActive, false);
  assert.equal(analyzer.status, "waiting");
  assert.equal(analyzer.activeMs, 0);
  assert.equal(analyzer.seen, null);
  assert.equal(analyzer.captureRate, 1);
  assert.equal(analyzer.trainerExpPerHour, null);
  assert.equal(analyzer.pokemonExpPerHour, 0);
  assert.equal(analyzer.dollarPerHour, 1e15);
  assert.equal(analyzer.seenWeak, 0);
  assert.equal(analyzer.seenCommon, null);
  assert.equal(analyzer.latestCaptureChance, null);
  assert.equal("secretToken" in analyzer, false);
  assert.equal(sent.some(message => message.type === "ppbui.coupled.analyzer-summary"), false);

  setAnalyzerSummary(null);
  app.reconcile();
  assert.equal(readAnalyzerSummary(window), null);
  assert.equal(sent.some(message => message.type === "ppbui.coupled.analyzer-summary"), false);
});

test("nullable Analyzer chance and aggregate rates retain unavailable semantics in Cards data", t => {
  const base = {
    protocol: 1, available: true, capturedAtMs: Date.now(), status: "running",
    captureRate: null, seenPerHour: null, trainerExpPerHour: null,
    pokemonExpPerHour: null, dollarPerHour: null, latestCaptureChance: null,
  };
  const { app, window, setAnalyzerSummary } = setup(t, { analyzerSummary: base });
  app.start();
  const initial = readAnalyzerSummary(window);
  for (const key of ["captureRate", "seenPerHour", "trainerExpPerHour", "pokemonExpPerHour", "dollarPerHour", "latestCaptureChance"])
    assert.equal(initial[key], null, key);

  setAnalyzerSummary({ ...base, latestCaptureChance: "" });
  app.reconcile();
  assert.equal(readAnalyzerSummary(window).latestCaptureChance, null);
  setAnalyzerSummary({ ...base, latestCaptureChance: 0 });
  app.reconcile();
  assert.equal(readAnalyzerSummary(window).latestCaptureChance, 0);
});

test("Analyzer source timestamps are bounded before Cards consume the public summary", t => {
  const now = Date.now();
  const { app, window, setAnalyzerSummary, sent } = setup(t, { analyzerSummary: {
    protocol: 1, available: true, capturedAtMs: now, status: "running", seen: 5,
  } });
  app.start();
  assert.equal(readAnalyzerSummary(window).seen, 5);
  for (const capturedAtMs of [now - 10000, now + 10000, undefined]) {
    setAnalyzerSummary({ protocol: 1, available: true, capturedAtMs, status: "running", seen: 5 });
    app.reconcile();
    assert.equal(readAnalyzerSummary(window), null);
  }
  assert.equal(sent.some(message => message.type === "ppbui.coupled.analyzer-summary"), false);
});
