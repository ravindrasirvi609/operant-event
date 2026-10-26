CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending_manual_per_order
ON payments ("orderId")
WHERE provider = 'MANUAL'
  AND status = 'PENDING';
