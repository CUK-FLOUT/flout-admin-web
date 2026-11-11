function hasUnsafeCharacters(value: string): boolean {
  return [...value].some(
    (character) =>
      character === "\\" ||
      character.charCodeAt(0) <= 32 ||
      character.charCodeAt(0) === 127,
  );
}

export function getLoginDestination(state: unknown): string {
  if (!state || typeof state !== "object" || !("from" in state)) return "/";

  const from = state.from;

  if (
    typeof from !== "string" ||
    !from.startsWith("/") ||
    from.startsWith("//") ||
    hasUnsafeCharacters(from)
  )
    return "/";

  try {
    const url = new URL(from, "https://flout.invalid");
    const pathname = decodeURIComponent(url.pathname);

    if (
      url.origin !== "https://flout.invalid" ||
      pathname.startsWith("//") ||
      hasUnsafeCharacters(pathname) ||
      /^\/(login|signup)\/*$/.test(pathname)
    )
      return "/";

    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
