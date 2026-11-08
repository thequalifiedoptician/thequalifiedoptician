import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';

export type AdminOrder = Database['public']['Tables']['orders']['Row'];
export type AdminOrderItem = Database['public']['Tables']['order_items']['Row'];
export type AdminOrderStatus = AdminOrder['status'] | 'all';

export type AdminOrderWithItems = {
  order: AdminOrder;
  items: AdminOrderItem[];
};

export type AdminOrderPage = {
  orders: AdminOrderWithItems[];
  totalCount: number;
  summary: {
    orderCount: number;
    pendingCount: number;
    inactiveCount: number;
    pendingOrderValue: number;
  };
};

const PAGE_SIZE = 25;

function throwOnError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadAdminOrders(
  client: SupabaseClient<Database>,
  options: {
    page: number;
    status: AdminOrderStatus;
    search: string;
    startAt: string | null;
    endAt: string | null;
  },
): Promise<AdminOrderPage> {
  const offset = (options.page - 1) * PAGE_SIZE;
  let query = client
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (options.startAt) {
    query = query.gte('created_at', options.startAt);
  }
  if (options.endAt) {
    query = query.lt('created_at', options.endAt);
  }
  if (options.status !== 'all') {
    query = query.eq('status', options.status);
  }
  if (options.search.trim()) {
    query = query.ilike('order_number', `%${options.search.trim()}%`);
  }

  const [ordersResult, summaryResult] = await Promise.all([
    query,
    client.rpc('get_admin_order_summary', {
      p_start_at: options.startAt,
      p_end_at: options.endAt,
    }),
  ]);
  const { data: orders, error, count } = ordersResult;
  throwOnError(error);
  throwOnError(summaryResult.error);
  if (!orders) {
    throw new Error('Orders could not be loaded.');
  }
  const summary = summaryResult.data?.[0];
  if (!summary) {
    throw new Error('Order summary could not be loaded.');
  }
  if (orders.length === 0) {
    return {
      orders: [],
      totalCount: count ?? 0,
      summary: {
        orderCount: summary.order_count,
        pendingCount: summary.pending_count,
        inactiveCount: summary.inactive_count,
        pendingOrderValue: Number(summary.pending_order_value),
      },
    };
  }

  const { data: items, error: itemError } = await client
    .from('order_items')
    .select('*')
    .in(
      'order_id',
      orders.map((order) => order.id),
    )
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  throwOnError(itemError);
  if (!items) {
    throw new Error('Order items could not be loaded.');
  }

  const itemsByOrder = new Map<string, AdminOrderItem[]>();
  for (const item of items) {
    const orderItems = itemsByOrder.get(item.order_id) ?? [];
    orderItems.push(item);
    itemsByOrder.set(item.order_id, orderItems);
  }

  return {
    orders: orders.map((order) => ({ order, items: itemsByOrder.get(order.id) ?? [] })),
    totalCount: count ?? 0,
    summary: {
      orderCount: summary.order_count,
      pendingCount: summary.pending_count,
      inactiveCount: summary.inactive_count,
      pendingOrderValue: Number(summary.pending_order_value),
    },
  };
}

export const ADMIN_ORDER_PAGE_SIZE = PAGE_SIZE;
