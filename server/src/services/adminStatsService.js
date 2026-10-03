import {
  ADMIN_STATS_DAYS,
  LOW_STOCK_THRESHOLD,
  ORDER_STATUSES,
} from '../config/commerce.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';

const EXCLUDED_REVENUE_STATUSES = ['cancelled', 'returned'];

export async function getAdminStats() {
  const windowStart = startOfUtcDay(ADMIN_STATS_DAYS);

  const [
    revenueRow,
    ordersCount,
    newCustomers,
    lowStockDocs,
    revenueRows,
    statusRows,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $nin: EXCLUDED_REVENUE_STATUSES } } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
    Order.countDocuments(),
    User.countDocuments({
      role: 'customer',
      createdAt: { $gte: windowStart },
    }),
    Product.find({
      isActive: true,
      stock: { $lte: LOW_STOCK_THRESHOLD },
    })
      .sort({ stock: 1, title: 1 })
      .select('title slug stock brand'),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: windowStart },
          status: { $nin: EXCLUDED_REVENUE_STATUSES },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'UTC',
            },
          },
          revenue: { $sum: '$total' },
        },
      },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const revenueByDate = new Map(
    revenueRows.map((row) => [row._id, row.revenue]),
  );
  const ordersByStatus = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0]),
  );
  for (const row of statusRows) {
    if (row._id in ordersByStatus) {
      ordersByStatus[row._id] = row.count;
    }
  }

  return {
    revenue: revenueRow[0]?.revenue ?? 0,
    ordersCount,
    newCustomers,
    lowStock: lowStockDocs.map((product) => {
      const json = product.toJSON();
      return {
        id: json.id,
        title: json.title,
        slug: json.slug,
        stock: json.stock,
        brand: json.brand,
      };
    }),
    revenueByDay: utcDayKeys(ADMIN_STATS_DAYS).map((date) => ({
      date,
      revenue: revenueByDate.get(date) ?? 0,
    })),
    ordersByStatus,
  };
}

/** @param {number} days */
function startOfUtcDay(days) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

/** @param {number} days */
function utcDayKeys(days) {
  const start = startOfUtcDay(days);
  const keys = [];
  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + offset);
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}
