/**
 * @param {{ page: number, limit: number }} query
 * @param {number} total
 */
export function pageMeta(query, total) {
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
  };
}
