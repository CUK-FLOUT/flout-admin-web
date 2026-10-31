import type { PriorityApplication } from "./mockData";

export function changePosition(order: string[], id: string, delta: number) {
  const from = order.indexOf(id);
  const to = from + delta;

  if (from < 0 || to < 0 || to >= order.length) return order;

  const next = [...order];

  [next[from], next[to]] = [next[to], next[from]];

  return next;
}

export function orderApplications(
  applications: PriorityApplication[],
  order: string[],
) {
  const eligible = applications.filter((a) => a.designated && !a.assigned);
  const ranked = order
    .map((id) => eligible.find((a) => a.id === id))
    .filter((a): a is PriorityApplication => Boolean(a));
  const full = [...ranked, ...eligible.filter((a) => !order.includes(a.id))];

  let index = 0;

  return applications.map((a) =>
    a.designated && !a.assigned ? full[index++] : a,
  );
}
