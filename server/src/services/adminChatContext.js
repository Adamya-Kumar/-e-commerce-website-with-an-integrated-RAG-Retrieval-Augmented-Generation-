import { getAdminStats } from './adminStatsService.js';
import { listAdminOrders } from './orderService.js';

export async function buildAdminChatContext() {
  const [stats, orderPage] = await Promise.all([
    getAdminStats(),
    listAdminOrders({ page: 1, limit: 8 }),
  ]);

  return {
    stats: {
      revenue_paise: stats.revenue,
      orders_count: stats.ordersCount,
      new_customers: stats.newCustomers,
      orders_by_status: stats.ordersByStatus,
      low_stock: (stats.lowStock || []).slice(0, 12),
    },
    recent_orders: (orderPage.orders || []).slice(0, 8).map((order) => ({
      id: order.id,
      status: order.status,
      total_paise: order.total,
      created_at: order.createdAt,
      items: (order.items || []).slice(0, 4).map((item) => ({
        title: item.title,
        qty: item.qty,
      })),
    })),
  };
}
