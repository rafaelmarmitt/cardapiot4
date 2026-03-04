-- Admin action helper: mark approved order as delivered
CREATE OR REPLACE FUNCTION public.mark_order_delivered(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.orders
  SET status = 'delivered'
  WHERE id = _order_id
    AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found_or_not_approved';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_delivered(uuid) TO authenticated;