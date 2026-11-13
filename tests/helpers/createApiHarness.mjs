import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import axios from "axios";

// Each harness owns its client, response handler and module cache so tests stay isolated.
export function createApiHarness({ overrides = {}, environment = {}, wrapResult = true } = {}) {
  const client = axios.create({
    headers: { "Content-Type": "application/json" },
  });
  const requests = [];
  let response = wrapResult ? () => ({}) : () => ({ isSuccess: true, result: {} });
  client.defaults.adapter = async (config) => {
    requests.push(config);
    const value = await response(config);
    return {
      data: wrapResult ? { isSuccess: true, result: value, message: "성공" } : value,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  const modules = new Map();
  function load(path) {
    const file = resolve(/\.tsx?$/.test(path) ? path : existsSync(`${path}.tsx`) ? `${path}.tsx` : `${path}.ts`);
    if (modules.has(file)) return modules.get(file);
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2023,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(source, {
      module,
      exports: module.exports,
      FormData,
      AbortController,
      Date,
      Error,
      Number,
      Map,
      Object,
      Promise,
      structuredClone,
      URLSearchParams,
      URL,
      crypto: { randomUUID },
      ...environment,
      require(name) {
        if (Object.hasOwn(overrides, name)) return overrides[name];
        if (name === "axios") return axios;
        if (name === "./client") return { apiClient: client };
        if (/\.(png|svg|jpe?g)$/.test(name)) return name;
        return load(resolve(dirname(file), name));
      },
    });
    modules.set(file, module.exports);
    return module.exports;
  }
  function setResponse(fn) {
    response = fn;
  }
  return { load, requests, setResponse, respond: setResponse };
}
