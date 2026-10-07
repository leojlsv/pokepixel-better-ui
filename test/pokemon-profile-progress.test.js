import assert from "node:assert/strict";
import { test } from "node:test";
import { awakeningPreviewState } from "../src/modules/pokemon-profile/dom.js";

test("Awakening mirrors the native preview branches without deriving counters at a rarity ceiling", () => {
  const base={creature:{id:"pokemon-1"},stage:{tier:"epic",quality_cents:154,max_cents:154}};
  const cases=[
    [{...base,awk:{index:3,total:5}}, {kind:"awk",index:3,total:5}],
    [{...base,challenge:{from_tier:"epic",to_tier:"legendary",active:false}}, {kind:"challenge"}],
    [{...base,challenge:{active:true}}, {kind:"challenge"}],
    [{...base,god_tier:{kills_required:100}}, {kind:"godChallenge"}],
    [base, {kind:"max"}],
    [{...base,stage:{tier:"god",quality_cents:300}}, {kind:"god"}],
    [{data:{...base,awk:{index:1,total:7}}}, {kind:"awk",index:1,total:7}],
  ];
  for(const [preview,expected] of cases) assert.deepEqual(awakeningPreviewState(preview,"pokemon-1"),expected);
});

test("Awakening rejects missing, malformed and wrong-creature previews instead of displaying fabricated progress", () => {
  const base={creature:{id:"pokemon-1"},stage:{tier:"epic"}};
  for(const preview of [null,{}, {awk:{index:3,total:5}}, {...base,creature:{id:"another"}},
    ...[{index:0,total:5},{index:6,total:5},{index:1.5,total:5},{index:3,total:null},{index:3,total:true}].map(awk=>({...base,awk})),
    {...base,challenge:true}, {...base,god_tier:"unknown"}]) {
    assert.equal(awakeningPreviewState(preview,"pokemon-1"),null);
  }
});
