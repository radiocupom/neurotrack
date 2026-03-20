export type DashboardPrimitive = string | number | boolean;
export type DashboardFilterValue =
  | DashboardPrimitive
  | null
  | undefined
  | Array<DashboardPrimitive | null | undefined>;

export type DashboardFilters = Record<string, DashboardFilterValue>;

function appendFilterValue(params: URLSearchParams, key: string, value: DashboardFilterValue) {
  if (value == null) {
    return;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => (item == null ? "" : String(item).trim()))
      .filter(Boolean);

    if (items.length > 0) {
      params.set(key, items.join(","));
    }

    return;
  }

  const normalized = typeof value === "boolean" ? (value ? "true" : "false") : String(value).trim();

  if (!normalized) {
    return;
  }

  params.set(key, normalized);
}

export function serializeDashboardFilters(filters: DashboardFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    appendFilterValue(params, key, value);
  });

  return params.toString();
}