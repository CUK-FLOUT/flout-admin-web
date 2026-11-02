# GIS Kakao Maps integration

- Branch: `feat/gis-map`. No backend endpoint or dependency was added.
- `VITE_KAKAO_MAP_KEY` is read from Vite's environment at runtime bundle initialization; do not commit `.env.local`. JavaScript SDK keys are necessarily delivered to the browser; restrict allowed web domains in Kakao Developers.
- Use `npm run dev` at the registered domain (tested `http://localhost:5173`).
- `src/lib/kakao/maps.ts` shares one SDK-loading promise across concurrent mounts, uses `autoload=false` / `maps.load`, and clears failed attempts for retry. Loading has a 20-second timeout. SDK errors shown to users never contain the key or the request URL.
- `ApplicationMap` owns its map, ResizeObserver, zoom/drag-end listeners and CustomOverlays. Its cleanup removes overlays, DOM handlers, the zoom/drag-end listeners and observer. SDK script stays shared when routes change. No undocumented SDK destruction API is used.
- Markers reuse the existing local GIS pin SVGs (32×36), risk colors, numbers and status labels. A selected marker has a blue focus ring. The legend is 30px from the bottom so Kakao's attribution remains visible.
- Test coordinates live only in `mapLocations.ts`, labelled `demo` and visible as test coordinates in the UI. They are not geocoded masked addresses. Future API records should provide `coordinates: { latitude, longitude }`; those take precedence. Unknown/invalid coordinates do not create markers. Remove the demo lookup when replacing mock records with real API data. Address-only APIs need a separately specified geocoding integration; none is invented here.
- `filterApplications.ts` is the single filtering function shared by list and map. It maps the existing mock neighborhoods to 원미구 and detailed statuses to the Figma 점검/지원/시공 groups. Align this mapping with the eventual API contract. All current sample neighborhoods are in 원미구, so the other districts correctly have no matching samples.
- Filters and search update the URL together. Excluding a selected application clears its selection. Reset restores all samples and map state. `?dataset=empty` is a frontend fixture for the data-empty screen; a nonmatching query exercises the distinct no-search-results screen.

## Figma reference

File `vGHXBD128aui75dvqLXEbP`: main `1391:2580`, region menu `1391:7144`, risk menu `1391:7154`, processing menu `1878:1329`.

Closed controls: widths 176 / 166 / 192px, height 46px, 10px gaps, 12px horizontal padding, 6px radius, #c8d0d7 1px border, #ffffff fill, 15px Medium / 21px text, original ▾ glyph.
Menus: matching width, 185px visible height, 46px rows, #f4f5f6 selected fill, #c8d0d7 dividers, 6px radius, shadow 0 4px 12px rgba(0,0,0,0.08). Only the four visible processing-group options are shown; hidden old detailed-status layers below the clipped Figma menu are not exposed as extra choices.
The isolated menu references do not specify trigger-to-menu offset or hover behavior; these reuse the existing project's 4px offset and highlighted-row fill. Keyboard selection, Escape, outside click, blur and stacking above the map are supported.

## Validation

`node --experimental-strip-types --test tests/gis.test.mjs` covers compound filter matching, demo/real/invalid coordinates, SDK concurrency, failure cleanup and retry/timeout.
Actual browser checks cover map tiles, six overlays, zoom buttons, selection in both directions, filtering/search, selection reset, dropdown dimensions/outside close, empty states, marker switch and viewport resize. 1440×900 → 1920×1080 → 1440×900 resize round-trip restores the same marker position (marker 6 x640/y563), preserving the intentional center rather than reading transient resized bounds. Direct mouse/touch dragging is enabled by Kakao's standard map behavior; automated drag gestures were not available in the browser test surface.
