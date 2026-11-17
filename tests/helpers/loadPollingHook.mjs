import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Existing view tests run the real polling hook, with only its first tick enabled.
// Clock, visibility and authentication lifecycles are tested in pagePolling.test.mjs.
export function loadPollingHook(react) {
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const module = { exports: {} };
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
    }).outputText;
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      AbortController,
      Date,
      document: {
        visibilityState: "visible",
        addEventListener() {},
        removeEventListener() {},
      },
      setTimeout(callback, delay) {
        if (delay === 0) callback();
        return 0;
      },
      clearTimeout() {},
      require(name) {
        if (name === "react")
          return {
            ...react,
            useRef:
              react.useRef ||
              ((initial) => react.useState(() => ({ current: initial }))[0]),
            useEffectEvent: (callback) => callback,
          };
        if (name === "../auth/session")
          return {
            getSession: () => ({ refreshExpiresAt: "2099-01-01T00:00:00Z" }),
            getSessionGeneration: () => 0,
            subscribeSession: () => () => {},
          };
        if (name === "./pagePolling") return load("src/hooks/pagePolling.ts");
        throw new Error(name);
      },
    });
    cache.set(path, module.exports);
    return module.exports;
  }
  return load("src/hooks/usePagePolling.ts");
}
