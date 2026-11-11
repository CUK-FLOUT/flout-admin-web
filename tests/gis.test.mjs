import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { filterApplications } from "../src/pages/GIS/filterApplications.ts";
import { getMapLocation } from "../src/pages/GIS/mapLocations.ts";

const records = [
  {id:"000001", district:"중동", risk:"높음", status:"접수",address:"○○로 00"},
  {id:"000002", district:"상동", risk:"주의", status:"지원 검토 중",address:"○○길 12"},
  {id:"000003", district:"원미동", risk:"높음", status:"시공 진행",address:"○○로 24"},
];
const all = {district:"",risk:"",status:"",search:""};
test("Figma region/status groups compose with risk and search",()=>{
  assert.deepEqual(filterApplications(records,{district:"원미구",risk:"높음",status:"점검",search:" 000001 "}),[records[0]]);
  assert.deepEqual(filterApplications(records,{...all,status:"지원"}),[records[1]]);
  assert.deepEqual(filterApplications(records,{...all,status:"시공"}),[records[2]]);
  assert.deepEqual(filterApplications(records,{...all,district:"소사구"}),[]);
  assert.deepEqual(filterApplications(records,all),records);
  assert.deepEqual(filterApplications([],all),[]);
});
test("real coordinates take precedence; test coordinates are explicitly marked",()=>{
  assert.equal(getMapLocation(records[0]).source,"demo");
  assert.deepEqual(getMapLocation({...records[0],coordinates:{latitude:37.5,longitude:126.7}}),{latitude:37.5,longitude:126.7,source:"application"});
  assert.equal(getMapLocation({id:"unknown"}),undefined);
  assert.equal(getMapLocation({...records[0],coordinates:{latitude:NaN,longitude:126}}),undefined);
  assert.equal(getMapLocation({...records[0],coordinates:{latitude:91,longitude:126}}),undefined);
});

async function loaderHarness() {
  // Transpile only the loader, replacing Vite's env accessor with an artificial test key.
  const source = (await readFile(new URL("../src/lib/kakao/maps.ts",import.meta.url),"utf8")).replace('import.meta.env.VITE_KAKAO_MAP_KEY','"unit-test-key"');
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;
  const scripts=[];
  const timers=new Map();
  let timerId=0;
  class Script extends EventTarget {remove(){scripts.splice(scripts.indexOf(this),1);}}
  const window={setTimeout(fn){timers.set(++timerId,fn);return timerId;}};
  const exports={};
  vm.runInNewContext(code,{exports,document:{getElementById(id){return scripts.find(s=>s.id===id)??null;},createElement(){return new Script();},head:{append(script){scripts.push(script);}}},window,clearTimeout(id){timers.delete(id);},Error,Promise,encodeURIComponent});
  return {load:exports.loadKakaoMaps,scripts,timers,window};
}
test("concurrent SDK loads share one script and one ready promise",async()=>{
  const h=await loaderHarness();
  const first=h.load(); const second=h.load();
  assert.strictEqual(first,second);
  assert.equal(h.scripts.length,1);
  h.window.kakao={maps:{load(done){done();}}};
  h.scripts[0].dispatchEvent(new Event("load"));
  assert.strictEqual(await first,h.window.kakao.maps);
  assert.equal(h.timers.size,0);
  await h.load();
  assert.equal(h.scripts.length,1);
});
test("failed or timed-out SDK loads clean up and allow retry",async()=>{
  const h=await loaderHarness();
  const failed=h.load();
  h.scripts[0].dispatchEvent(new Event("error"));
  await assert.rejects(failed);
  assert.equal(h.scripts.length,0);
  const retry=h.load();
  assert.equal(h.scripts.length,1);
  [...h.timers.values()][0]();
  await assert.rejects(retry);
  assert.equal(h.scripts.length,0);
  assert.equal(h.timers.size,0);
});

async function markerHarness() {
  const source = await readFile(new URL("../src/components/gis/applicationMarkers.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023}}).outputText;
  class Element extends EventTarget {
    children = [];
    attributes = new Map();
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) { this.attributes.set(name, value); }
  }
  const overlays = [];
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(path) {
      if (path.endsWith("mapLocations")) return {getMapLocation};
      if (path.endsWith(".svg")) return {default: path};
      throw new Error("Unexpected marker dependency");
    },
    document: {createElement() {return new Element();}},
  });
  let prevented = 0;
  const maps = {
    LatLng: class {constructor(latitude, longitude) {this.latitude = latitude; this.longitude = longitude;}},
    CustomOverlay: class {
      constructor(options) {this.options = options; overlays.push(this);}
      setMap(map) {this.map = map;}
    },
    event: {preventMap() {prevented++;}},
  };
  return {addMarker: exports.addApplicationMarker, maps, overlays, prevented: () => prevented};
}

test("extracted marker keeps selection, coordinates and removes native handlers", async () => {
  const h = await markerHarness();
  const selected = [];
  const application = {...records[0], number: 1, marker: {labelBefore: false}};
  const remove = h.addMarker({maps: h.maps, map: {}, application, isSelected: true, onSelect: id => selected.push(id)});
  const overlay = h.overlays[0];
  const button = overlay.options.content;
  assert.equal(overlay.options.zIndex, 10);
  assert.equal(button.attributes.get("aria-pressed"), "true");
  assert.equal(overlay.options.position.latitude, getMapLocation(application).latitude);
  assert.equal(button.children[0].children[0].width, 32);
  assert.equal(button.children[0].children[0].height, 36);
  button.dispatchEvent(new Event("click"));
  assert.deepEqual(selected, [application.id]);
  assert.equal(h.prevented(), 1);
  remove();
  assert.equal(overlay.map, null);
  button.dispatchEvent(new Event("click"));
  button.dispatchEvent(new Event("mousedown"));
  assert.deepEqual(selected, [application.id]);
  assert.equal(h.prevented(), 1);
});

test("extracted marker skips records without a usable location", async () => {
  const h = await markerHarness();
  const remove = h.addMarker({maps: h.maps, map: {}, application: {id: "unknown"}, isSelected: false, onSelect() {}});
  assert.equal(remove, undefined);
  assert.equal(h.overlays.length, 0);
});

test("selected map item recenters for changed coordinates, but identical polling data preserves panning", async () => {
  const source = await readFile("src/components/gis/useApplicationMap.ts", "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  const slots = [], effects = [], moves = [];
  let index = 0;
  const runtime = {
    maps: { LatLng: class { constructor(latitude, longitude) { this.latitude = latitude; this.longitude = longitude; } } },
    map: { panTo(point) { moves.push([point.latitude, point.longitude]); } },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name) {
      if (name === "react") return {
        useRef(initial) { return slots[index++] ??= { current: initial }; },
        useState(initial) {
          const i = index++;
          if (!(i in slots)) slots[i] = i === 3 ? runtime : initial;
          return [slots[i], (value) => { slots[i] = value; }];
        },
        useEffect(effect, deps) {
          const i = index++, previous = slots[i];
          if (!previous || deps.some((value, j) => value !== previous[j])) {
            slots[i] = deps;
            effects.push(effect);
          }
        },
      };
      if (name.endsWith("mapLocations")) return { getMapLocation: (a) => a.coordinates };
      if (name === "./applicationMarkers") return {};
      if (name.endsWith("kakao/maps")) return {};
      throw new Error(name);
    },
  });
  function render(id, latitude, longitude) {
    index = 0;
    module.exports.useApplicationMap({
      applications: [{ id, coordinates: { latitude, longitude } }],
      selectedId: id, showMarkers: false, onSelect() {},
    });
    effects.splice(0).forEach((effect) => effect());
  }
  render("5", 37.5, 126.7);
  render("5", 37.5, 126.7);
  assert.deepEqual(moves, [[37.5, 126.7]]);
  render("5", 37.6, 126.7);
  render("5", 37.6, 126.8);
  render("6", 37.6, 126.8);
  assert.deepEqual(moves, [[37.5, 126.7], [37.6, 126.7], [37.6, 126.8], [37.6, 126.8]]);
});
