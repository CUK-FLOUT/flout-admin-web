import { createApiHarness } from "./helpers/createApiHarness.mjs";
import { loadPollingHook } from "./helpers/loadPollingHook.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import axios from "axios";

const harness = createApiHarness;
const plain = (value) => JSON.parse(JSON.stringify(value));
test("GIS 9개 API는 신청 ID와 정확한 경로·메서드를 사용한다", async () => {
  const h = harness();
  const a = h.load("src/api/gisApplications.ts");
  const signal = new AbortController().signal;
  const search = {district:"원미구", riskLevel:"CAUTION", processingStatus:"SUPPORT", keyword:"지봉로", page:2, size:10};
  h.setResponse(() => ({}));
  await a.getGisApplications(search, signal);
  await a.getGisMarkers(search, signal);
  await a.getGisStats(signal);
  await a.getGisDetail(29, signal);
  await a.getGisHistories(29, signal);
  await a.getGisSupport(29, signal);
  await a.getGisConstruction(29, signal);
  await a.getGisAttachments(29, signal);
  await a.saveGisMemo(29, "메모");
  assert.deepEqual(h.requests.map(r => r.url), [
    "/api/admin/applications", "/api/admin/map/applications", "/api/admin/applications/stats",
    "/api/admin/applications/29", "/api/admin/applications/29/histories", "/api/admin/applications/29/support",
    "/api/admin/applications/29/construction", "/api/admin/applications/29/attachments", "/api/admin/applications/29/internal-memo",
  ]);
  assert.deepEqual(plain(h.requests[0].params), search);
  assert.deepEqual(plain(h.requests[1].params), {district:"원미구", riskLevel:"CAUTION", processingStatus:"SUPPORT", keyword:"지봉로"});
  assert.equal(h.requests[2].params, undefined);
  for (const r of h.requests.slice(0,8)) assert.equal(r.signal, signal);
  assert.equal(h.requests[8].method, "patch");
  assert.deepEqual(JSON.parse(h.requests[8].data), {internalMemo:"메모"});
  for (const id of [0, -1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1])
    await assert.rejects(async () => a.getGisDetail(id), /신청 ID/);
  assert.equal(h.requests.length, 9);
});
test("정상 빈 데이터와 조회 실패를 구분하고 지원·시공 null을 유지한다", async () => {
  const h = harness(), a = h.load("src/api/gisApplications.ts");
  h.setResponse(() => ({applications:[],page:0,size:10,totalElements:0,totalPages:0}));
  assert.deepEqual(plain(await a.getGisApplications({})), {applications:[],page:0,size:10,totalElements:0,totalPages:0});
  h.setResponse(() => ({support:null}));
  assert.deepEqual(plain(await a.getGisSupport(29)), {support:null});
  h.setResponse(() => ({construction:null}));
  assert.deepEqual(plain(await a.getGisConstruction(29)), {construction:null});
  h.setResponse(() => null);
  await assert.rejects(a.getGisDetail(29));
  const network = new axios.AxiosError("network");
  assert.match(a.gisError(network), /연결/);
  const http = new axios.AxiosError("http", undefined, undefined, undefined, {status:403,data:{message:"관할 권한 없음"}});
  assert.equal(a.gisError(http), "관할 권한 없음");
  http.response.data.message = "   ";
  assert.equal(a.gisError(http), "GIS 요청에 실패했습니다.");
});
const detail = {
  applicationId:29,receiptNo:"000029",applicantName:"김주민",contact:"010-1234",
  address:"경기도 부천시",detailAddress:"101호",housingType:"FIRST_FLOOR",occupancyType:"OWNER",
  riskLevel:"CAUTION",floodExperience:"NO",inflowLocations:["WINDOW","BATHROOM","DRAIN"],
  existingFacility:false,preferredVisitDate:null,requestReason:null,preferredTimeSlot:null,
};
test("실제 DTO를 한글로 매핑하고 주소로 층수나 누락된 상태·좌표를 추측하지 않는다", () => {
  const h = harness(), a = h.load("src/pages/GIS/apiMapping.ts");
  assert.deepEqual(plain(a.gisSearch({district:"원미구",risk:"주의",status:"시공",search:"  000029  "},3)), {
    district:"원미구",riskLevel:"CAUTION",processingStatus:"CONSTRUCTION",keyword:"000029",page:3,size:5,
  });
  assert.deepEqual(plain(a.gisSearch({district:"invalid",risk:"invalid",status:"invalid",search:""},0)), {page:0,size:5});
  assert.deepEqual(plain(a.gisSearch({district:"원미구",risk:"주의",status:"시공",search:"QA"},2,8)), {
    district:"원미구",riskLevel:"CAUTION",processingStatus:"CONSTRUCTION",keyword:"QA",page:2,size:8,
  });
  const mapped = a.gisDetailApplication(detail);
  assert.equal(mapped.id, "29"); assert.equal(mapped.receiptNo,"000029");
  assert.equal(mapped.houseType,"1층");assert.equal(mapped.tenure,"자가");
  assert.equal(mapped.floodHistory,"침수 경험 없음");assert.equal(mapped.inflow,"창문·화장실·배수구");
  assert.equal(mapped.facilities,"기존 시설 없음");assert.equal(mapped.visitDate,"미입력");
  assert.equal(mapped.status, "상태 확인 필요");
  const missing = a.gisDetailApplication({...detail,housingType:null,riskLevel:null,occupancyType:null});
  assert.equal(missing.houseType,"미입력"); assert.equal(missing.risk,"미입력");
  const markers = h.load("src/pages/GIS/mapLocations.ts");
  assert.equal(markers.getMapLocation({...missing,id:"000001"}), undefined);
  const marker = a.gisMapApplication({applicationId:29,latitude:37.5,longitude:126.7,riskLevel:"LOW",processingStatus:"CONSTRUCTION_COMPLETED"},0);
  assert.equal(marker.status,"시공 완료");
  assert.deepEqual(plain(markers.getMapLocation(marker)),{latitude:37.5,longitude:126.7,source:"application"});
});

function hookHarness(overrides = {}) {
  const slots = [], effects = [], calls = [];
  let index = 0;
  const api = {
    getGisApplications: async () => ({applications:[],page:0,size:10,totalElements:0,totalPages:0}),
    getGisMarkers: async () => ({applications:[]}),
    getGisStats: async () => ({totalCount:0}),
    getGisDetail: async () => detail,
    getGisMemo: async () => "기존 메모",
    getGisAttachments: async () => [],
    getGisHistories: async () => ({histories:[],totalCount:0}),
    getGisSupport: async () => ({support:null}),
    getGisConstruction: async () => ({construction:null}),
    gisError: error => error.message,
    ...overrides,
  };
  for (const name of Object.keys(api)) {
    if (name === "gisError") continue;
    const fn = api[name];
    api[name] = (...args) => {calls.push({name,args});return fn(...args);};
  }
  const module = {exports:{}};
  const source = ts.transpileModule(readFileSync("src/pages/GIS/useGisApi.ts","utf8"), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023},
  }).outputText;
  vm.runInNewContext(source, {
    module,exports:module.exports,AbortController,
    require: function require(name) {
      if (name.endsWith("/usePagePolling")) return loadPollingHook(require("react"));
      if (name === "react") return {
        useState(initial) {
          const i = index++;
          if (!(i in slots)) slots[i] = initial;
          return [slots[i], v => {slots[i] = typeof v === "function" ? v(slots[i]) : v;}];
        },
        useEffect(effect,deps) {
          const i = index++, old = slots[i];
          if (!old || deps.some((v,j)=>v !== old.deps[j])) effects.push(()=>{
            old?.cleanup?.();slots[i]={deps,cleanup:effect()};
          });
        },
      };
      return api;
    },
  });
  return {
    render(query = '{"page":0}', id) {
      index=0;
      const result = module.exports.useGisApi(query,id);
      for (const e of effects.splice(0)) e();
      return result;
    },
    calls,
    unmount() {for (const slot of slots) slot?.cleanup?.();},
  };
}
const settle = () => new Promise(setImmediate);
test("느린 통계·지도 응답이 목록을 막지 않고 탭별 실패도 상세를 지우지 않는다", async () => {
  let finishStats;
  const h = hookHarness({
    getGisStats: () => new Promise(resolve => {finishStats=resolve;}),
    getGisMarkers: async () => {throw new Error("지도 오류");},
    getGisHistories: async () => {throw new Error("이력 오류");},
  });
  h.render('{"page":0}',"29");
  await settle();
  const state = h.render('{"page":0}',"29");
  assert.equal(state.page.totalElements,0);
  assert.equal(state.stats,undefined);
  assert.equal(state.mapError,"지도 오류");
  assert.equal(state.record.detail.applicationId,29);
  assert.equal(state.record.errors.histories,"이력 오류");
  assert.equal(state.record.support,null);
  finishStats({totalCount:42});
  await settle();
  assert.equal(h.render('{"page":0}',"29").stats.totalCount,42);
});
test("검색·신청 변경 후 늦은 이전 응답과 화면 이탈 후 응답은 무시한다", async () => {
  let finishOld;
  const h = hookHarness({
    getGisApplications: params => params.page === 0
      ? new Promise(resolve => {finishOld=resolve;})
      : Promise.resolve({applications:[],page:1,size:10,totalElements:20,totalPages:2}),
  });
  h.render('{"page":0}',"29");
  h.render('{"page":1}',"30");
  await settle();
  assert.equal(h.calls.find(c=>c.name==="getGisApplications").args[1].aborted,true);
  finishOld({applications:[],page:0,totalElements:999});
  await settle();
  assert.equal(h.render('{"page":1}',"30").page.totalElements,20);
  assert.equal(h.calls.filter(c=>c.name==="getGisDetail")[0].args[1].aborted,true);
  h.unmount();
  assert.equal(h.calls.filter(c=>c.name==="getGisDetail")[1].args[1].aborted,true);
});

test("기존 우선점검 조회 API에서 메모를 읽고 조회 지연·실패를 빈 메모와 구분한다", async () => {
  const h = harness(), api = h.load("src/api/gisApplications.ts");
  const signal = new AbortController().signal;
  h.setResponse(() => ({internalMemo:"기존 저장 메모"}));
  assert.equal(await api.getGisMemo(29, signal), "기존 저장 메모");
  assert.equal(h.requests[0].url, "/api/admin/priority-inspections/29");
  assert.equal(h.requests[0].signal, signal);
  let finish;
  const state = hookHarness({getGisMemo: () => new Promise(resolve => {finish=resolve;})});
  state.render('{"page":0}', "29");
  await settle();
  assert.equal(state.render('{"page":0}', "29").record.internalMemo, undefined);
  finish("기존 메모");
  await settle();
  assert.equal(state.render('{"page":0}', "29").record.internalMemo, "기존 메모");
  const failed = hookHarness({getGisMemo: async () => {throw new Error("메모 조회 실패");}});
  failed.render('{"page":0}',"29");
  await settle();
  assert.equal(failed.render('{"page":0}',"29").record.internalMemo, undefined);
  assert.equal(failed.render('{"page":0}',"29").record.errors.internalMemo, "메모 조회 실패");
  const empty = hookHarness({getGisMemo: async () => null});
  empty.render('{"page":0}',"29");
  await settle();
  assert.equal(empty.render('{"page":0}',"29").record.internalMemo, null);
});

test("마커 없는 신청에는 페이지 번호를 대신 붙이지 않는다", () => {
  const {gisMarkerNumber,gisApplication} = harness().load("src/pages/GIS/apiMapping.ts");
  const markers = [{applicationId:50},{applicationId:29}];
  assert.equal(gisMarkerNumber(29,markers),2);
  assert.equal(gisMarkerNumber(99,markers),undefined);
  assert.equal(gisMarkerNumber(29),undefined);
  assert.equal(gisApplication({...detail,processingStatus:"RECEIVED"},gisMarkerNumber(99,markers)).number,undefined);
});
