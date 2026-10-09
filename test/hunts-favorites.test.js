import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHuntFavoritesStore,HUNT_FAVORITES_STORAGE_KEY,huntFavoriteKey,normalizeHuntFavorite} from '../src/modules/hunts/favorites.js';

function memoryStorage(seed=null) {
  const map=new Map();if(seed!==null)map.set(HUNT_FAVORITES_STORAGE_KEY,seed);
  return {map,getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value))};
}

test('Hunt Favorites store persists exact world + zone identity, deduplicates and updates metadata in place',()=>{
  const storage=memoryStorage(),store=createHuntFavoritesStore({storage:()=>storage});
  const first={worldId:'johto',regionKey:'johto',worldLabel:'Johto',zoneId:'sunkern-101',label:'Sunkern'};
  assert.equal(store.add(first),true);assert.equal(store.add(first),false);assert.equal(store.list().length,1);
  const key=huntFavoriteKey(first);assert.equal(huntFavoriteKey(store.list()[0]),key);
  assert.equal(store.add({...first,label:'Sunkern Meadow'}),true,'same Hunt identity updates its presentation metadata instead of duplicating');
  assert.deepEqual(store.list().map(item=>item.label),['Sunkern Meadow']);
  const saved=JSON.parse(storage.map.get(HUNT_FAVORITES_STORAGE_KEY));
  assert.equal(saved.version,1);assert.deepEqual(saved.items.map(item=>[item.worldId,item.zoneId]),[['johto','sunkern-101']]);
  assert.equal(store.remove(key),true);assert.deepEqual(store.list(),[]);
});

test('Hunt Favorites exact identity cannot collide when native ids contain separators',()=>{
  const storage=memoryStorage(),store=createHuntFavoritesStore({storage:()=>storage});
  const first={worldId:'alpha:beta',regionKey:'alpha:beta',worldLabel:'Alpha Beta',zoneId:'gamma',label:'First'};
  const second={worldId:'alpha',regionKey:'alpha',worldLabel:'Alpha',zoneId:'beta:gamma',label:'Second'};
  assert.notEqual(huntFavoriteKey(first),huntFavoriteKey(second));
  assert.equal(store.add(first),true);assert.equal(store.add(second),true);
  assert.deepEqual(store.list().map(item=>[item.worldId,item.zoneId]),[['alpha:beta','gamma'],['alpha','beta:gamma']]);
});

test('Hunt Favorites store sanitizes corrupt records and duplicate persisted identities',()=>{
  const raw=JSON.stringify({version:1,items:[
    {worldId:' kanto ',regionKey:'kanto',worldLabel:'Kanto\u0000',zoneId:'pika',label:'  Pikachu   Forest  '},
    {worldId:'kanto',regionKey:'kanto',worldLabel:'Kanto',zoneId:'pika',label:'Duplicate'},
    {worldId:'',regionKey:'',zoneId:'missing-world',label:'Invalid'},
    null,
  ]});
  const storage=memoryStorage(raw),store=createHuntFavoritesStore({storage:()=>storage});
  assert.deepEqual(store.list(),[{worldId:'kanto',regionKey:'kanto',worldLabel:'Kanto',zoneId:'pika',label:'Pikachu Forest'}]);
  assert.equal(store.persistent(),true);
  assert.equal(normalizeHuntFavorite({worldId:'kanto',zoneId:'',label:'No zone'}),null);
});

test('Hunt Favorites storage denial degrades to session memory without blocking add/remove',()=>{
  const storage={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  const store=createHuntFavoritesStore({storage:()=>storage}),favorite={worldId:'hoenn',regionKey:'hoenn',worldLabel:'Hoenn',zoneId:'ralts',label:'Ralts'};
  assert.deepEqual(store.list(),[]);assert.equal(store.persistent(),false);
  assert.equal(store.add(favorite),true);assert.equal(store.has(huntFavoriteKey(favorite)),true);assert.equal(store.persistent(),false);
  assert.equal(store.remove(favorite),true);assert.deepEqual(store.list(),[]);
});

test('Hunt Favorites missing storage also degrades to session memory instead of pretending persistence',()=>{
  const store=createHuntFavoritesStore({storage:()=>undefined}),favorite={worldId:'johto',regionKey:'johto',worldLabel:'Johto',zoneId:'sunkern',label:'Sunkern'};
  assert.deepEqual(store.list(),[]);assert.equal(store.persistent(),false);
  assert.equal(store.add(favorite),true);assert.equal(store.has(huntFavoriteKey(favorite)),true);assert.equal(store.persistent(),false);
});

test('Hunt Favorites read-only reconciliation access never rewrites persistent storage',()=>{
  const storage=memoryStorage();let writes=0;const nativeSet=storage.setItem;storage.setItem=(key,value)=>{writes++;nativeSet(key,value);};
  const store=createHuntFavoritesStore({storage:()=>storage}),favorite={worldId:'kanto',regionKey:'kanto',worldLabel:'Kanto',zoneId:'pika',label:'Pikachu Forest'};
  store.add(favorite);assert.equal(writes,1);
  const key=huntFavoriteKey(favorite);for(let index=0;index<20;index++){store.list();store.has(key);store.get(key);store.persistent();store.revision();}
  assert.equal(writes,1,'stable UI sync-style reads must not persist again');
});

test('Hunt Favorites protects an unknown future storage version from older-client overwrite',()=>{
  const future=JSON.stringify({version:2,items:[{worldId:'future',zoneId:'future-zone',label:'Future'}],futureField:true}),storage=memoryStorage(future),store=createHuntFavoritesStore({storage:()=>storage});
  assert.deepEqual(store.list(),[]);assert.equal(store.persistent(),false);
  const favorite={worldId:'kanto',regionKey:'kanto',worldLabel:'Kanto',zoneId:'pika',label:'Pikachu Forest'};
  assert.equal(store.add(favorite),true,'session copy remains usable');
  assert.equal(store.has(huntFavoriteKey(favorite)),true);assert.equal(store.persistent(),false);
  assert.equal(storage.map.get(HUNT_FAVORITES_STORAGE_KEY),future,'future persistent bytes remain protected');
});
