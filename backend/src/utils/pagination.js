// Parse common list query params into Prisma skip/take + page metadata.
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function paginatedResult(data, total, page, limit) {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = { getPagination, paginatedResult };
