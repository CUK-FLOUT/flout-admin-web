import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPhotoStore,
  uploadLocalPhotos,
} from "../src/lib/photoStorage.ts";

function mockIndexedDb() {
  const databases = new Map();
  const openCalls = [];

  return {
    openCalls,
    open(name) {
      openCalls.push(name);

      const database = {
        createObjectStore() {
          databases.set(name, new Map());
        },
        transaction() {
          const transaction = {
            oncomplete: null,
            onerror: null,
            onabort: null,
            error: null,
            objectStore() {
              return {
                get(key) {
                  const request = { result: undefined, onsuccess: null, onerror: null };
                  queueMicrotask(() => {
                    request.result = databases.get(name)?.get(key);
                    request.onsuccess?.();
                  });
                  return request;
                },
                put(value, key) {
                  databases.get(name).set(key, value);
                  queueMicrotask(() => transaction.oncomplete?.());
                },
              };
            },
          };
          return transaction;
        },
      };

      const request = {
        result: database,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      queueMicrotask(() => {
        if (!databases.has(name)) request.onupgradeneeded?.();
        request.onsuccess?.();
      });

      return request;
    },
  };
}

class MockFileReader {
  result = null;
  onload = null;
  onerror = null;

  readAsDataURL(file) {
    file.arrayBuffer()
      .then((bytes) => {
        this.result = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;
        this.onload?.();
      })
      .catch(() => this.onerror?.());
  }
}

test("non-IDB image sources are returned without opening the database", async () => {
  const mock = mockIndexedDb();
  globalThis.indexedDB = mock;
  const store = createPhotoStore("construction-test");

  assert.equal(await store.read("/assets/test.png"), "/assets/test.png");
  assert.deepEqual(mock.openCalls, []);
});

test("photo writes and reads keep IDB references and database names isolated", async () => {
  globalThis.indexedDB = mockIndexedDb();
  const construction = createPhotoStore("flout-construction-photos");
  const infrastructure = createPhotoStore("flout-infrastructure-photos");

  await construction.writeMany([{ id: "item", source: "data:image/png;base64,QQ==" }]);
  assert.equal(await construction.read("idb:item"), "data:image/png;base64,QQ==");
  await assert.rejects(infrastructure.read("idb:item"), /사진 없음/);
  await assert.rejects(construction.read("idb:missing"), /사진 없음/);
});

test("photo upload preserves file names, IDB prefixes and image data", async () => {
  globalThis.indexedDB = mockIndexedDb();
  globalThis.FileReader = MockFileReader;
  const store = createPhotoStore("upload-test");
  const files = [new File(["image-data"], "test.png", { type: "image/png" })];

  const photos = await uploadLocalPhotos(files, "construction-", store.writeMany);
  assert.equal(photos.length, 1);
  assert.equal(photos[0].name, "test.png");
  assert.match(photos[0].id, /^construction-/);
  assert.equal(photos[0].src, `idb:${photos[0].id}`);
  assert.equal(
    await store.read(photos[0].src),
    "data:image/png;base64,aW1hZ2UtZGF0YQ==",
  );
});

test("photo upload rejects unsupported formats and oversized files", async () => {
  globalThis.indexedDB = mockIndexedDb();
  const store = createPhotoStore("invalid-upload-test");

  await assert.rejects(
    uploadLocalPhotos(
      [new File(["wrong"], "test.pdf", { type: "application/pdf" })],
      "construction-",
      store.writeMany,
    ),
    /JPG 또는 PNG/,
  );

  await assert.rejects(
    uploadLocalPhotos(
      [{ type: "image/png", size: 11 * 1024 * 1024 }],
      "construction-",
      store.writeMany,
    ),
    /10MB/,
  );
});
