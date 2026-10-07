import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultLayout, moveLayoutItem } from "../src/modules/menu-bar/layout-model.js";
import { createMenuLayoutStorage } from "../src/modules/menu-bar/layout-storage.js";

class MemoryStorage {
  constructor(map = new Map()) { this.map = map; this.blocked = false; this.blockWrites = false; }
  getItem(key) { if (this.blocked) throw new Error("blocked"); return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { if (this.blocked || this.blockWrites) throw new Error("blocked"); this.map.set(key, String(value)); }
  removeItem(key) { if (this.blocked) throw new Error("blocked"); this.map.delete(key); }
}

class Events {
  listeners = new Set();
  addEventListener(type, fn) { if (type === "storage") this.listeners.add(fn); }
  removeEventListener(type, fn) { if (type === "storage") this.listeners.delete(fn); }
  dispatch(event) { for (const fn of [...this.listeners]) fn(event); }
}

test("legacy stored layouts remain byte-identical on read and upgrade on explicit save", () => {
  const store=new MemoryStorage(),service=createMenuLayoutStorage({storage:()=>store,events:new Events()});
  const layout=defaultLayout();layout.version=1;delete layout.slotCapacity;
  const raw=JSON.stringify({version:1,revision:2,layout});store.setItem("ppbui:menu-layout:v1:A",raw);
  const snapshot=service.read("A");
  assert.equal(snapshot.issue,null);assert.equal(snapshot.layout.version,2);assert.equal(snapshot.layout.slotCapacity,13);
  assert.equal(store.getItem("ppbui:menu-layout:v1:A"),raw);assert.equal(snapshot.token,raw);
  const updated=service.write("A",{...snapshot.layout,slotCapacity:15},{expectedToken:snapshot.token});
  assert.equal(updated.ok,true);assert.equal(updated.layout.slotCapacity,15);
  assert.equal(JSON.parse(store.getItem("ppbui:menu-layout:v1:A")).layout.version,2);
});

const key = owner => `ppbui:menu-layout:v1:${encodeURIComponent(owner)}`;

test("storage isolates owners, survives reload and preserves the complete layout on position saves", () => {
  const backing = new Map(), store = new MemoryStorage(backing), events = new Events();
  const service = createMenuLayoutStorage({ storage:() => store, events });
  const a0 = service.read("trainer A"), b0 = service.read("trainer B");
  assert.equal(a0.persistent, true); assert.equal(a0.token, null); assert.equal(b0.token, null);

  const moved = moveLayoutItem(a0.layout, "native:settings", "group:automation", a0.layout.groups["group:automation"].length);
  const a1 = service.write("trainer A", moved.layout, { expectedToken:a0.token });
  assert.equal(a1.ok, true); assert.equal(a1.persistent, true);
  assert.equal(service.read("trainer B").layout.groups["group:automation"].includes("native:settings"), false);

  const positioned = service.savePosition("trainer A", { left:123, top:456 });
  assert.equal(positioned.ok, true);
  assert.deepEqual(positioned.layout.position, { left:123, top:456 });
  assert.ok(positioned.layout.groups["group:automation"].includes("native:settings"), "position save cannot erase layout placement");
  service.dispose();

  const reloaded = createMenuLayoutStorage({ storage:() => new MemoryStorage(backing), events:new Events() }).read("trainer A");
  assert.deepEqual(reloaded.layout.position, { left:123, top:456 });
  assert.ok(reloaded.layout.groups["group:automation"].includes("native:settings"));
});

test("savePosition is a true no-op for equal coordinates and accepts only strict finite coordinates", () => {
  class CountingStorage extends MemoryStorage {
    writes = 0;
    setItem(key, value) { super.setItem(key, value); this.writes++; }
  }
  const store = new CountingStorage(), service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
  const initial = service.read("A");
  const first = service.savePosition("A", { left:" 12.5 ", top:"-3" }, { expectedToken:initial.token });
  assert.equal(first.ok, true); assert.deepEqual(first.layout.position, { left:12.5, top:-3 });
  const writes = store.writes, token = first.token, raw = store.getItem(key("A"));
  const same = service.savePosition("A", { left:12.5, top:-3 }, { expectedToken:token });
  assert.equal(same.ok, true); assert.equal(same.token, token); assert.equal(store.writes, writes); assert.equal(store.getItem(key("A")), raw);
  for (const value of [null, true, false, "", "   ", [], {}]) {
    const invalid = service.savePosition("A", { left:value, top:1 }, { expectedToken:token });
    assert.equal(invalid.ok, false); assert.equal(invalid.error, "invalid-position"); assert.equal(store.writes, writes);
  }
});

test("writes use opaque best-effort tokens and external storage events are surfaced", () => {
  const store = new MemoryStorage(), events = new Events();
  const first = createMenuLayoutStorage({ storage:() => store, events });
  const second = createMenuLayoutStorage({ storage:() => store, events });
  const start = second.read("trainer");
  const written = first.write("trainer", defaultLayout(), { expectedToken:null });
  assert.equal(written.ok, true);
  const conflict = second.write("trainer", defaultLayout(), { expectedToken:start.token });
  assert.equal(conflict.ok, false); assert.equal(conflict.error, "conflict"); assert.equal(conflict.token, written.token);

  const notices = [];
  const unsubscribe = second.subscribe(event => notices.push(event));
  events.dispatch({ key:key("trainer") });
  assert.deepEqual(notices, [{ owner:"trainer", key:key("trainer"), external:true }]);
  unsubscribe(); second.dispose(); first.dispose();
  events.dispatch({ key:key("trainer") });
  assert.equal(notices.length, 1);
});

test("dispose only disconnects notifications; reads/writes survive and a later subscribe reconnects", () => {
  const store = new MemoryStorage(), events = new Events();
  const service = createMenuLayoutStorage({ storage:() => store, events });
  const first = service.read("A");
  const written = service.write("A", first.layout, { expectedToken:first.token });
  assert.equal(written.ok, true);
  const notices = [];
  service.subscribe(event => notices.push(event));
  service.dispose();
  assert.equal(events.listeners.size, 0);
  assert.equal(service.read("A").token, written.token, "dispose keeps storage/session state usable");
  const moved = moveLayoutItem(written.layout, "native:settings", "group:automation", written.layout.groups["group:automation"].length);
  const afterDispose = service.write("A", moved.layout, { expectedToken:written.token });
  assert.equal(afterDispose.ok, true, "writes remain usable after dispose");
  events.dispatch({ key:key("A") });
  assert.deepEqual(notices, [], "disposed service receives no storage notifications");

  const reconnected = [];
  service.subscribe(event => reconnected.push(event));
  assert.equal(events.listeners.size, 1, "subscribe reconnects storage listener after dispose");
  events.dispatch({ key:key("A") });
  assert.deepEqual(reconnected, [{ owner:"A", key:key("A"), external:true }]);
  service.dispose();
});

test("corrupt and future records fail closed and require explicit overwrite", () => {
  const store = new MemoryStorage(), service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
  store.setItem(key("corrupt"), "{broken");
  const corrupt = service.read("corrupt");
  assert.equal(corrupt.issue, "corrupt"); assert.equal(corrupt.persistent, true);
  assert.equal(service.savePosition("corrupt", { left:1, top:2 }).error, "protected-record");
  assert.equal(service.write("corrupt", defaultLayout()).error, "protected-record");
  assert.equal(service.write("corrupt", defaultLayout(), { overwrite:true }).ok, true);

  store.setItem(key("future"), JSON.stringify({ version:2, revision:9, layout:defaultLayout(), extra:"retain" }));
  const futureRaw = store.getItem(key("future"));
  const future = service.read("future");
  assert.equal(future.issue, "future-version");
  assert.equal(service.savePosition("future", { left:4, top:5 }).error, "protected-record");
  assert.equal(store.getItem(key("future")), futureRaw, "protected position update cannot rewrite future data");
});

test("blocked persistent storage falls back to isolated per-owner session revisions", () => {
  const store = new MemoryStorage(); store.blocked = true;
  const service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
  const anonymous = service.write("", defaultLayout());
  assert.equal(anonymous.ok, false); assert.equal(anonymous.error, "anonymous");
  const a = service.write("A", defaultLayout(), { expectedToken:null });
  assert.equal(a.ok, true); assert.equal(a.persistent, false); assert.equal(a.error, "storage-unavailable");
  assert.match(a.token, /^session:/);
  const aRead = service.read("A");
  assert.equal(aRead.persistent, false); assert.equal(aRead.token, a.token);
  assert.equal(service.read("B").token, null);
  const a2 = service.savePosition("A", { left:12, top:34 });
  assert.equal(a2.ok, true); assert.deepEqual(service.read("A").layout.position, { left:12, top:34 });
});

test("a failed persistent write remains visible through the session instead of exposing stale disk state", () => {
  const store = new MemoryStorage(), service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
  const disk = service.write("A", defaultLayout(), { expectedToken:null });
  assert.equal(disk.ok, true); assert.equal(disk.persistent, true);
  const moved = moveLayoutItem(disk.layout, "native:settings", "group:automation", disk.layout.groups["group:automation"].length);
  store.blockWrites = true;
  const session = service.write("A", moved.layout, { expectedToken:disk.token });
  assert.equal(session.ok, true); assert.equal(session.persistent, false); assert.equal(session.error, "storage-unavailable");
  const current = service.read("A");
  assert.equal(current.token, session.token); assert.equal(current.issue, "session-only");
  assert.ok(current.layout.groups["group:automation"].includes("native:settings"));
  assert.equal(JSON.parse(store.getItem(key("A"))).layout.groups["group:automation"].includes("native:settings"), false, "persistent bytes remain stale but do not replace current session state");
});

test("legacy global position migrates once to the first confirmed persistent owner and remains intact", () => {
  const store = new MemoryStorage();
  store.setItem("ppbui:menu-bar-position:v1", JSON.stringify({ left:60, top:120 }));
  const service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
  const a = service.read("A");
  assert.deepEqual(a.layout.position, { left:60, top:120 });
  assert.equal(store.getItem("ppbui:menu-layout-meta:v1:legacy-position-owner"), "A");
  assert.equal(store.getItem("ppbui:menu-bar-position:v1"), '{"left":60,"top":120}', "legacy key is retained");
  const b = service.read("B");
  assert.equal(b.layout.position, null, "later owners do not inherit another account's legacy position");
  assert.equal(service.read("legacy-position-owner").owner, "legacy-position-owner", "metakey cannot collide with a valid owner key");
});

test("legacy position rejects coercive values and accepts non-empty numeric strings", () => {
  for (const bad of [null, true, false, "", [], {}]) {
    const store = new MemoryStorage(); store.setItem("ppbui:menu-bar-position:v1", JSON.stringify({ left:bad, top:2 }));
    const service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
    assert.equal(service.read("A").layout.position, null);
    assert.equal(store.getItem("ppbui:menu-layout-meta:v1:legacy-position-owner"), null);
  }
  const store = new MemoryStorage(); store.setItem("ppbui:menu-bar-position:v1", JSON.stringify({ left:" 3.5 ", top:"-7" }));
  const service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
  assert.deepEqual(service.read("A").layout.position, { left:3.5, top:-7 });
});

test("storage rejects invalid layouts before persistence", () => {
  const store = new MemoryStorage(), service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
  const invalid = defaultLayout(); invalid.bar.push("native:unknown");
  const result = service.write("A", invalid);
  assert.equal(result.ok, false); assert.equal(result.error, "unknown-id");
  assert.equal(store.getItem(key("A")), null);
});

test("normal writes require an explicit token and migration-marker events are not reported as owners", () => {
  const store = new MemoryStorage(), events = new Events(), service = createMenuLayoutStorage({ storage:() => store, events });
  assert.equal(service.write("A", defaultLayout()).error, "expected-token-required");
  const notices = []; service.subscribe(event => notices.push(event));
  events.dispatch({ key:"ppbui:menu-layout-meta:v1:legacy-position-owner" });
  assert.deepEqual(notices, []);
});

test("owner values accept only bounded strings or finite numbers", () => {
  const store = new MemoryStorage(), service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
  assert.equal(service.read(123).owner, "123");
  for (const owner of [true, false, {}, [], NaN, Infinity, "", "   ", "x".repeat(257)]) {
    const read = service.read(owner);
    assert.equal(read.owner, ""); assert.equal(read.issue, "anonymous");
    const write = service.write(owner, defaultLayout(), { expectedToken:null });
    assert.equal(write.ok, false); assert.equal(write.error, "anonymous");
  }
});

test("oversized persistent records are protected instead of parsed or overwritten", () => {
  const store = new MemoryStorage(), service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
  const raw = "x".repeat(65537);
  store.setItem(key("A"), raw);
  const read = service.read("A");
  assert.equal(read.issue, "oversize-record");
  assert.equal(service.savePosition("A", { left:1, top:1 }).error, "protected-record");
  assert.equal(store.getItem(key("A")), raw);
});

test("write rejects an external revision observed between token check and final persistence", () => {
  for (const injectedRead of [2,3]) {
    const store = new MemoryStorage(), service = createMenuLayoutStorage({ storage:() => store, events:new Events() });
    const initial = service.write("A",defaultLayout(),{expectedToken:null});
    const external = moveLayoutItem(defaultLayout(),"native:settings","group:automation",0).layout;
    const raw = JSON.stringify({version:1,revision:2,layout:external});
    const read = store.getItem.bind(store);
    let reads = 0;
    store.getItem = name => {
      if (name === key("A") && ++reads === injectedRead) store.map.set(name,raw);
      return read(name);
    };
    const result = service.write("A",defaultLayout(),{expectedToken:initial.token});
    assert.equal(result.ok,false);
    assert.equal(result.error,"conflict");
    assert.equal(read(key("A")),raw,"an already observed external edit must not be erased");
    service.dispose();
  }
});

test("an external persistent edit supersedes a session overlay and conflicts with its old token", () => {
  const store = new MemoryStorage(), service = createMenuLayoutStorage({storage:() => store,events:new Events()});
  const disk = service.write("A",defaultLayout(),{expectedToken:null});
  store.blockWrites = true;
  const sessionLayout = moveLayoutItem(disk.layout,"native:settings","group:automation",0).layout;
  const local = service.write("A",sessionLayout,{expectedToken:disk.token});
  assert.equal(local.persistent,false);
  store.blockWrites = false;
  const externalLayout = moveLayoutItem(defaultLayout(),"native:hunts","bar",0).layout;
  const raw = JSON.stringify({version:1,revision:2,layout:externalLayout});
  store.setItem(key("A"),raw);
  const external = service.read("A");
  assert.equal(external.token,raw);
  assert.equal(external.layout.bar[0],"native:hunts");
  assert.equal(service.write("A",sessionLayout,{expectedToken:local.token}).error,"conflict");
  assert.equal(store.getItem(key("A")),raw);
  service.dispose();
});

test("explicit replacement of a protected record remains applied in session after quota failure", () => {
  for (const raw of ['{broken','{"version":999}']) {
    const store = new MemoryStorage(),service = createMenuLayoutStorage({storage:() => store,events:new Events()});
    store.setItem(key("A"),raw);
    const initial = service.read("A");
    store.blockWrites = true;
    const layout = {...defaultLayout(),orientation:"vertical"};
    const result = service.write("A",layout,{expectedToken:initial.token,overwrite:true});
    assert.equal(result.ok,true); assert.equal(result.persistent,false);
    const session = service.read("A");
    assert.equal(session.layout.orientation,"vertical");
    assert.equal(session.token,result.token); assert.equal(session.persistent,false);
    assert.equal(store.getItem(key("A")),raw);
    assert.equal(service.savePosition("A",{left:40,top:50}).ok,true);
    assert.equal(service.read("A").layout.orientation,"vertical");
    store.blockWrites = false;
    const latest = service.read("A");
    assert.equal(service.write("A",latest.layout,{expectedToken:latest.token}).persistent,true);
    assert.equal(service.read("A").layout.orientation,"vertical");
    service.dispose();
  }
});
