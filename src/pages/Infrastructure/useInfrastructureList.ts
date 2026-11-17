import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { infrastructureApiFilters } from "./apiMapping";
import { infrastructureFiltersFrom } from "./listQuery";
import { emptyFilters } from "./model";
import type { useInfrastructureData } from "./useInfrastructureData";

type ListData = Pick<
  ReturnType<typeof useInfrastructureData>,
  "totalPages" | "records" | "loading" | "listError" | "refresh" | "setError"
>;

export function useInfrastructureList(data: ListData) {
  const [params] = useSearchParams(),
    navigate = useNavigate();
  const applied = infrastructureFiltersFrom(params);
  const [filters, setFilters] = useState(applied);
  const pages = Math.max(1, data.totalPages);
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);
  const visible = data.records;
  const selected =
    visible.find((issue) => issue.id === params.get("selected")) || visible[0];

  // 조회가 끝난 뒤에만 범위를 보정해 로딩 중의 임시 페이지 수에 영향받지 않는다.
  useEffect(() => {
    if (data.loading || data.listError || page <= pages) return;
    const next = new URLSearchParams(params);

    next.set("page", String(pages));
    navigate({ search: next.toString() }, { replace: true });
  }, [data.loading, data.listError, page, pages, params, navigate]);

  function clean() {
    const p = new URLSearchParams(params);

    p.delete("dialog");

    return p;
  }

  function go(p: URLSearchParams, replace = false) {
    navigate(
      { pathname: "/infrastructure", search: p.toString() },
      { replace },
    );
  }

  function search() {
    const p = clean();

    ["district", "status", "kind", "q", "page", "selected", "dataset"].forEach(
      (k) => p.delete(k),
    );
    if (filters.district !== emptyFilters.district)
      p.set("district", filters.district);
    if (filters.status !== emptyFilters.status) p.set("status", filters.status);
    if (filters.kind !== emptyFilters.kind) p.set("kind", filters.kind);
    if (filters.query.trim()) p.set("q", filters.query.trim());
    if (
      page === 1 &&
      JSON.stringify(infrastructureApiFilters(filters)) ===
        JSON.stringify(infrastructureApiFilters(applied))
    )
      data.refresh();
    go(p);
  }

  function reset() {
    data.setError("");
    data.refresh();
    setFilters({ ...emptyFilters });
    go(new URLSearchParams());
  }

  function select(id: string) {
    const p = clean();

    p.set("selected", id);
    go(p, true);
  }

  function openDetail(id: string) {
    navigate({
      pathname: "/infrastructure/" + id + "/review",
      search: clean().toString(),
    });
  }

  function changePage(number: number) {
    const p = clean();

    p.set("page", String(number));
    p.delete("selected");
    go(p);
  }

  return {
    applied,
    filters,
    setFilters,
    page,
    visible,
    selected,
    search,
    reset,
    select,
    openDetail,
    changePage,
  };
}
