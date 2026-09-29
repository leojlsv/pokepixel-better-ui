import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountTeamPresetComposer } from "../src/modules/team-presets/composer.js";

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function setup(count = 3) {
  const dom = new JSDOM('<div data-ppbui-team-preset-manager><div data-ppbui-team-preset-manager-grid></div></div>', { pretendToBeVisual:true, url:"https://pokepixel.nietore.com/play/" });
  const doc = dom.window.document, root = doc.body.firstChild;
  const creatures = Array.from({ length:count }, (_, index) => ({
    id:`p${index + 1}`,
    name:`Pokemon ${index + 1}`,
    level:20 + index,
    quality:index % 2 ? "rare" : "common",
    elements:index % 2 ? ["fire"] : ["water"],
    species:{ name:`Species ${index + 1}`, normal_sprite_url:`/img/p${index + 1}.png` },
  }));
  const teamCreatures = [];
  let reads = 0, mutations = 0, saved = null, updated = null;
  dom.window.PokeIdle = {
    Localization:{ get:()=>"en" },
    ElementIcons:{ definition:key=>({ label:key.toUpperCase(), color:key === "fire" ? "#f00" : "#00f" }) },
    Api:{
      async getCreatures(location) {
        reads++;
        if (location === "team") return { data:structuredClone(teamCreatures) };
        if (location === "inventory") return { data:structuredClone(creatures) };
        assert.fail(`unexpected location ${location}`);
      },
      async addTeamMember() { mutations++; }, async removeTeamMember() { mutations++; }, async setTeamLeader() { mutations++; }, async setTeamOrder() { mutations++; },
    },
  };
  const store = {
    upsert(name, snapshot) { saved = { name, snapshot:structuredClone(snapshot) }; return { created:true, preset:{ id:"new", name, ...snapshot } }; },
    updatePreset(id, name, snapshot) { updated = { id, name, snapshot:structuredClone(snapshot) }; return { id, name, ...snapshot }; },
  };
  const composer = mountTeamPresetComposer(root, { store });
  return { dom, doc, root, composer, creatures, teamCreatures, stats:()=>({ reads, mutations, saved, updated }) };
}

test("manual Saved Team composer builds an ordered verified snapshot from Backpack without mutating the live Team", async t => {
  const s = setup(); t.after(() => { s.composer.cleanup(); s.dom.window.close(); });
  const css = s.doc.querySelector('style[data-ppbui-module="team-presets-composer"]').textContent;
  assert.match(css, /\[data-ppbui-team-preset-composer-candidates\] \{[^}]*border-radius:var\(--ppbui-radius\);/);
  s.root.querySelector('[data-ppbui-team-preset-composer-launch] button').click(); await tick(); await tick();
  assert.equal(s.stats().reads, 2); assert.equal(s.stats().mutations, 0);
  assert.equal(s.root.querySelector('[data-ppbui-team-preset-composer-name] input').name, "ppbui-team-preset-composer-name");
  assert.deepEqual([...s.root.querySelectorAll('[data-ppbui-team-preset-composer-toolbar] input, [data-ppbui-team-preset-composer-toolbar] select')].map(node => node.name), [
    "ppbui-team-preset-composer-search",
    "ppbui-team-preset-composer-element",
    "ppbui-team-preset-composer-rarity",
  ]);
  const candidates = [...s.root.querySelectorAll('[data-ppbui-team-preset-candidate]')]; assert.equal(candidates.length, 3);
  candidates[0].click(); candidates[1].click();
  let slots = [...s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]')];
  assert.deepEqual(slots.map(node => node.dataset.memberId), ["p1", "p2"]); assert.equal(slots[0].dataset.active, "true");
  slots[1].click(); s.root.querySelector('[data-ppbui-team-preset-composer-member-controls] button:nth-child(2)').click();
  slots = [...s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]')]; assert.equal(slots[1].dataset.active, "true");
  s.root.querySelector('[data-ppbui-team-preset-composer-member-controls] button:first-child').click();
  slots = [...s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]')]; assert.deepEqual(slots.map(node => node.dataset.memberId), ["p2", "p1"]);
  const name = s.root.querySelector('[data-ppbui-team-preset-composer-name] input'); name.value = "Manual"; name.dispatchEvent(new s.dom.window.Event("input"));
  s.root.querySelector('[data-ppbui-team-preset-composer-actions] .ppbui-button--primary').click();
  const saved = s.stats().saved; assert.equal(saved.name, "Manual"); assert.equal(saved.snapshot.orderVerified, true); assert.equal(saved.snapshot.activeId, "p2");
  assert.deepEqual(saved.snapshot.members.map(member => member.id), ["p2", "p1"]); assert.equal(saved.snapshot.members[0].sprite, "/img/p2.png");
  assert.equal(s.stats().mutations, 0, "manual authoring must never equip/remove/reorder the live Team");
});

test("manual Saved Team composer filters Backpack candidates and enforces the six-member cap", async t => {
  const s = setup(8); t.after(() => { s.composer.cleanup(); s.dom.window.close(); });
  s.root.querySelector('[data-ppbui-team-preset-composer-launch] button').click(); await tick(); await tick();
  const search = s.root.querySelector('[data-ppbui-team-preset-composer-toolbar] input'); search.value = "Pokemon 8"; search.dispatchEvent(new s.dom.window.Event("input"));
  assert.deepEqual([...s.root.querySelectorAll('[data-ppbui-team-preset-candidate]')].map(node => node.dataset.memberId), ["p8"]);
  s.root.querySelector('[data-ppbui-team-preset-composer-toolbar] button').click();
  let candidates = [...s.root.querySelectorAll('[data-ppbui-team-preset-candidate]')]; assert.equal(candidates.length, 8);
  candidates.slice(0, 6).forEach(node => node.click());
  candidates = [...s.root.querySelectorAll('[data-ppbui-team-preset-candidate]')];
  assert.equal(s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]').length, 6);
  assert.equal(candidates.find(node => node.dataset.memberId === "p7").getAttribute("aria-disabled"), "true");
  candidates.find(node => node.dataset.memberId === "p7").click();
  assert.equal(s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]').length, 6);
  assert.match(s.root.querySelector('[data-ppbui-team-preset-composer-status]').textContent, /6/);
  assert.equal(s.stats().mutations, 0);
});

test("manual Saved Team composer caches Backpack between openings and refreshes only on explicit request", async t => {
  const s = setup(4); t.after(() => { s.composer.cleanup(); s.dom.window.close(); });
  const create = s.root.querySelector('[data-ppbui-team-preset-composer-launch] button');
  create.click(); await tick(); await tick(); assert.equal(s.stats().reads, 2);
  s.root.querySelector('[data-ppbui-team-preset-composer-actions] button:first-child').click();
  create.click(); await tick(); await tick(); assert.equal(s.stats().reads, 2, "reopening the composer must reuse its available Pokémon snapshot");
  s.root.querySelector('[data-ppbui-team-preset-composer-head] button').click(); await tick(); await tick();
  assert.equal(s.stats().reads, 4, "Refresh Pokémon is the explicit reload path for Team + Backpack");
});

test("manual Saved Team composer prunes unavailable selected members after a successful Backpack refresh", async t => {
  const s = setup(3); t.after(() => { s.composer.cleanup(); s.dom.window.close(); });
  s.root.querySelector('[data-ppbui-team-preset-composer-launch] button').click(); await tick(); await tick();
  let candidates = [...s.root.querySelectorAll('[data-ppbui-team-preset-candidate]')]; candidates[0].click(); candidates[1].click();
  const name = s.root.querySelector('[data-ppbui-team-preset-composer-name] input'); name.value = "Stale guard"; name.dispatchEvent(new s.dom.window.Event("input"));
  assert.equal(s.root.querySelector('[data-ppbui-team-preset-composer-actions] .ppbui-button--primary').disabled, false);
  s.creatures.splice(0);
  s.root.querySelector('[data-ppbui-team-preset-composer-head] button').click(); await tick(); await tick();
  assert.equal(s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]').length, 0);
  assert.equal(s.root.querySelector('[data-ppbui-team-preset-composer-actions] .ppbui-button--primary').disabled, true, "a successful refresh must not allow saving members no longer in Backpack");
  assert.match(s.root.querySelector('[data-ppbui-team-preset-composer-status]').textContent, /unavailable Pokémon were removed/i);
  assert.equal(s.stats().saved, null); assert.equal(s.stats().mutations, 0);
});

test("manual Saved Team composer deduplicates Backpack ids, preserves focus across rerender and replaces a removed active deterministically", async t => {
  const s = setup(3); t.after(() => { s.composer.cleanup(); s.dom.window.close(); });
  s.creatures.push(structuredClone(s.creatures[0]));
  s.root.querySelector('[data-ppbui-team-preset-composer-launch] button').click(); await tick(); await tick();
  let candidates = [...s.root.querySelectorAll('[data-ppbui-team-preset-candidate]')]; assert.equal(candidates.length, 3);
  candidates[0].focus(); candidates[0].click();
  assert.equal(s.doc.activeElement?.dataset.memberId, "p1", "candidate selection must not drop keyboard focus");
  candidates = [...s.root.querySelectorAll('[data-ppbui-team-preset-candidate]')]; candidates.find(node => node.dataset.memberId === "p2").click();
  const p1 = [...s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]')].find(node => node.dataset.memberId === "p1");
  p1.focus(); p1.click(); assert.equal(s.doc.activeElement?.dataset.memberId, "p1", "formation selection must keep focus on the rebuilt slot");
  s.root.querySelector('[data-ppbui-team-preset-composer-member-controls] .ppbui-button--danger').click();
  const remaining = [...s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]')];
  assert.deepEqual(remaining.map(node => node.dataset.memberId), ["p2"]); assert.equal(remaining[0].dataset.active, "true");
});

test("manual Saved Team composer distinguishes empty Backpack and keeps stable sync mutation-free", async t => {
  const s = setup(0); t.after(() => { s.composer.cleanup(); s.dom.window.close(); });
  const mutations = [];
  const observer = new s.dom.window.MutationObserver(records => mutations.push(...records)); observer.observe(s.root, { subtree:true, childList:true, attributes:true, characterData:true });
  for (let index = 0; index < 100; index += 1) s.composer.sync();
  await tick(); assert.equal(mutations.length, 0, "unchanged composer sync must stay DOM-mutation free"); observer.disconnect();
  s.root.querySelector('[data-ppbui-team-preset-composer-launch] button').click(); await tick(); await tick();
  assert.equal(s.root.querySelector('[data-ppbui-team-preset-composer-candidates]').dataset.empty, "true");
  const empty = s.root.querySelector('[data-ppbui-team-preset-composer-empty]');
  assert.equal(empty.hidden, false, "an actually empty Backpack must expose its empty-state message after loading completes");
  assert.match(empty.textContent, /No Pokémon are available/i);
  assert.match(s.root.querySelector('[data-ppbui-team-preset-composer-hint]').textContent, /does not change the current Team/i);
});

test("manual Saved Team composer never reports an empty Backpack while loading or after an initial load failure", async t => {
  const dom = new JSDOM('<div data-ppbui-team-preset-manager><div data-ppbui-team-preset-manager-grid></div></div>', { pretendToBeVisual:true, url:"https://pokepixel.nietore.com/play/" });
  const doc = dom.window.document, root = doc.body.firstChild;
  const rejectLoads = [];
  dom.window.PokeIdle = {
    Localization:{ get:()=>"en" },
    Api:{ getCreatures:()=>new Promise((resolve, reject) => { rejectLoads.push(reject); }) },
  };
  const composer = mountTeamPresetComposer(root, { store:{ upsert:()=>null } });
  t.after(() => { composer.cleanup(); dom.window.close(); });
  root.querySelector('[data-ppbui-team-preset-composer-launch] button').click();
  await tick();
  const empty = root.querySelector('[data-ppbui-team-preset-composer-empty]');
  const status = root.querySelector('[data-ppbui-team-preset-composer-status]');
  assert.equal(empty.hidden, true, "loading must not imply the Backpack is empty before the request resolves");
  assert.match(status.textContent, /Loading Pokémon/i);
  rejectLoads.forEach(reject => reject(new Error("offline"))); await tick(); await tick();
  assert.equal(empty.hidden, true, "a failed initial load must keep the unknown inventory state distinct from an empty Backpack");
  assert.match(status.textContent, /Could not load Backpack and Team/i);
  assert.equal(status.dataset.error, "true");
  const selects = [...root.querySelectorAll('[data-ppbui-team-preset-composer-toolbar] select')];
  assert.equal(selects[0].options.length, 1); assert.match(selects[0].options[0].textContent, /Element: All/i);
  assert.equal(selects[1].options.length, 1); assert.match(selects[1].options[0].textContent, /Rarity: All/i);
});

test("manual Saved Team composer edits an existing preset by id and preserves saved members that are currently outside Backpack", async t => {
  const s = setup(3); t.after(() => { s.composer.cleanup(); s.dom.window.close(); });
  const savedPreset = {
    id:"saved-1", name:"Boss",
    members:[
      { id:"team-only", name:"Equipped", level:88, sprite:"/img/equipped.png" },
      { id:"p1", name:"Pokemon 1", level:20, sprite:"/img/p1.png" },
    ],
    activeId:"team-only", orderVerified:true,
  };
  assert.equal(s.composer.edit(savedPreset), true);
  await tick(); await tick();
  let slots = [...s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]')];
  assert.deepEqual(slots.map(node => node.dataset.memberId), ["team-only", "p1"], "editing must not drop a saved member merely because it is currently equipped instead of in Backpack");
  assert.equal(slots[0].dataset.active, "true");
  const p2 = [...s.root.querySelectorAll('[data-ppbui-team-preset-candidate]')].find(node => node.dataset.memberId === "p2");
  p2.click();
  slots = [...s.root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]')];
  slots.find(node => node.dataset.memberId === "p2").click();
  s.root.querySelector('[data-ppbui-team-preset-composer-member-controls] button:nth-child(2)').click();
  const name = s.root.querySelector('[data-ppbui-team-preset-composer-name] input'); name.value = "Boss edited"; name.dispatchEvent(new s.dom.window.Event("input"));
  const save = s.root.querySelector('[data-ppbui-team-preset-composer-actions] .ppbui-button--primary');
  assert.equal(save.textContent, "Save changes"); save.click();
  const updated = s.stats().updated;
  assert.equal(updated.id, "saved-1"); assert.equal(updated.name, "Boss edited"); assert.equal(updated.snapshot.orderVerified, true); assert.equal(updated.snapshot.activeId, "p2");
  assert.deepEqual(updated.snapshot.members.map(member => member.id), ["team-only", "p1", "p2"]);
  assert.equal(s.stats().saved, null, "editing must not route through name-based upsert");
  assert.equal(s.stats().mutations, 0, "editing a saved snapshot must never mutate the live Team");
});

test("manual Saved Team composer includes current Team Pokémon and deduplicates ids against Backpack", async t => {
  const s = setup(2); t.after(() => { s.composer.cleanup(); s.dom.window.close(); });
  s.teamCreatures.push(
    { id:"team-only", name:"Equipped", level:70, quality:"epic", elements:["fire"], species:{ name:"Equipped", normal_sprite_url:"/img/team-only.png" } },
    { ...structuredClone(s.creatures[0]), name:"Pokemon 1 Team Copy", level:99 },
  );
  s.root.querySelector('[data-ppbui-team-preset-composer-launch] button').click(); await tick(); await tick();
  const candidates = [...s.root.querySelectorAll('[data-ppbui-team-preset-candidate]')];
  assert.deepEqual(candidates.map(node => node.dataset.memberId), ["team-only", "p1", "p2"]);
  assert.equal(candidates.filter(node => node.dataset.memberId === "p1").length, 1, "a transient id present in Team and Backpack must render once");
  assert.equal(candidates.find(node => node.dataset.memberId === "p1").querySelector("strong").textContent, "Pokemon 1 Team Copy", "the current Team record wins duplicate-id reconciliation");
  candidates.find(node => node.dataset.memberId === "team-only").click();
  const name = s.root.querySelector('[data-ppbui-team-preset-composer-name] input'); name.value = "Mixed"; name.dispatchEvent(new s.dom.window.Event("input"));
  s.root.querySelector('[data-ppbui-team-preset-composer-actions] .ppbui-button--primary').click();
  assert.deepEqual(s.stats().saved.snapshot.members.map(member => member.id), ["team-only"]);
  assert.equal(s.stats().mutations, 0, "selecting an already-equipped Pokémon must remain a read-only Saved Team authoring action");
});

test("manual Saved Team composer enriches Team and Backpack creatures with shared native species metadata", async t => {
  const dom = new JSDOM('<div data-ppbui-team-preset-manager><div data-ppbui-team-preset-manager-grid></div></div>', { pretendToBeVisual:true, url:"https://pokepixel.nietore.com/play/" });
  const doc = dom.window.document, root = doc.body.firstChild; let speciesReads = 0;
  dom.window.PokeIdle = {
    Localization:{ get:()=>"en" },
    Api:{
      async getCreatures(location) {
        if (location === "team") return { data:[{ id:"raw-team", species_id:"pikachu", name:"Pikachu Team", level:50, quality:"rare" }] };
        assert.equal(location, "inventory");
        return { data:[{ id:"raw-1", species_id:"pikachu", name:"Pikachu", level:44, quality:"rare" }] };
      },
      async getSpecies(id) { speciesReads++; assert.equal(id, "pikachu"); return { id, name:"Pikachu", normal_sprite_url:"/assets/pikachu/front.png", elements:["electric"] }; },
    },
  };
  const composer = mountTeamPresetComposer(root, { store:{ upsert:()=>null, updatePreset:()=>null } });
  t.after(() => { composer.cleanup(); dom.window.close(); });
  root.querySelector('[data-ppbui-team-preset-composer-launch] button').click(); await tick(); await tick();
  assert.equal(speciesReads, 1, "same species across Team and Backpack should share one species read per load");
  const images = [...root.querySelectorAll('[data-ppbui-team-preset-candidate] img')];
  assert.equal(images.length, 2); assert.ok(images.every(image => image.getAttribute("src") === "/assets/pikachu/front.png"));
});

test("captured manual composer Save cannot persist after cleanup", async t => {
  const s=setup(2);t.after(()=>s.dom.window.close());
  s.root.querySelector('[data-ppbui-team-preset-composer-launch] button').click();await tick();await tick();
  s.root.querySelector('[data-ppbui-team-preset-candidate]').click();
  const name=s.root.querySelector('[data-ppbui-team-preset-composer-name] input');name.value="Stale";name.dispatchEvent(new s.dom.window.Event("input"));
  const save=s.root.querySelector('[data-ppbui-team-preset-composer-actions] .ppbui-button--primary');assert.equal(save.disabled,false);
  s.composer.cleanup();save.click();
  assert.equal(s.stats().saved,null,"detached composer controls cannot mutate Saved Teams after cleanup");
});
