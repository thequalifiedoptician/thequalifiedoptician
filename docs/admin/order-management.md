# Admin order management

The admin console includes a read-only customer order list at `/admin/orders`.
Admins can search by order number, filter by the current order status, browse
pages of recent orders, and expand a row to review its item, customer, shipping,
and total snapshots. Date presets and a custom date range filter the list and
summary cards. Expanded pending orders show their temporary inventory
reservation expiry.

The summary distinguishes pending order value from collected revenue. Payment
is not connected yet, so the displayed pending value must not be treated as
sales or money received.

Access is enforced in two places:

- The route is nested under the existing authenticated `AdminRoute`.
- The `20261107100000_allow_admin_order_read.sql` migration adds select-only
  row-level security policies using the existing `is_catalog_admin()` JWT role
  check. Customer order read policies remain unchanged.
- The `20261107110000_add_admin_order_summary.sql` migration adds a read-only
  aggregate function protected by the same admin role check.

Apply both Supabase migrations before using the page. This screen does not
change order status, collect payments, or start fulfillment.
