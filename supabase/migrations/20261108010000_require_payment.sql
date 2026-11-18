-- Aurix: with payments live, orders can no longer be created for free. Run this AFTER you have tested a PayPal sandbox payment
-- end to end (20261108000000_payments.sql + the paypal-checkout function). place_order() was the demo checkout.
revoke execute on function public.place_order(jsonb, boolean) from authenticated;
