import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

export type OrderHistoryEntry = {
  order: Order;
  items: OrderItem[];
};

export type OrderHistoryPage = {
  entries: OrderHistoryEntry[];
  totalCount: number;
};

export const ORDER_HISTORY_PAGE_SIZE = 10;

export async function loadOrderHistory(
  client: SupabaseClient<Database>,
  userId: string,
  page: number,
): Promise<OrderHistoryPage> {
  const start = (page - 1) * ORDER_HISTORY_PAGE_SIZE;
  const {
    data: orders,
    error,
    count,
  } = await client
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(start, start + ORDER_HISTORY_PAGE_SIZE - 1);

  if (error) {
    throw new Error(`Your orders could not be loaded: ${error.message}`);
  }
  if (!orders) {
    throw new Error('Your orders could not be loaded. Please try again.');
  }
  if (orders.length === 0) {
    return { entries: [], totalCount: count ?? 0 };
  }

  const { data: items, error: itemsError } = await client
    .from('order_items')
    .select('*')
    .in(
      'order_id',
      orders.map((order) => order.id),
    )
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (itemsError) {
    throw new Error(`Order item details could not be loaded: ${itemsError.message}`);
  }
  if (!items) {
    throw new Error('Order item details could not be loaded. Please try again.');
  }

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return {
    entries: orders.map((order) => ({ order, items: itemsByOrder.get(order.id) ?? [] })),
    totalCount: count ?? 0,
  };
}
