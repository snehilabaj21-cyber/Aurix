// Card payments for Aurix through Stripe (an on-page card form, Stripe Payment Element).
// The browser never sets a price: "create" re-prices the cart in the database (prepare_checkout) and opens a Stripe PaymentIntent
// for that amount; the order (fulfill_checkout) is only created once Stripe says the payment succeeded. It can be triggered by
// the browser ("complete") or by Stripe's webhook, and only one order can ever result.
//
// Secrets (`supabase secrets set ...`):
//   STRIPE_SECRET_KEY       sk_test_... while testing, sk_live_... later
//   STRIPE_PUBLISHABLE_KEY  pk_test_... / pk_live_... (safe to expose; served to the browser by "config")
//   STRIPE_WEBHOOK_SECRET   whsec_... (optional but recommended: finishes orders if a buyer closes the tab after paying)
// Deploy with --no-verify-jwt: Stripe's webhook has no Supabase login. Browser calls are still checked below.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SK = Deno.env.get('STRIPE_SECRET_KEY'), PK = Deno.env.get('STRIPE_PUBLISHABLE_KEY'), WHSEC = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (error: string, status = 400) => reply({ error }, status);

async function stripe(path: string, params?: Record<string, string>, idem?: string) {
  const res = await fetch('https://api.stripe.com' + path, {
    method: params ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${SK}`, ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(idem ? { 'Idempotency-Key': idem } : {}) },
    body: params ? new URLSearchParams(params).toString() : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

const touch = (ref: string, patch: Record<string, unknown>) => admin.from('checkouts').update({ ...patch, updated_at: new Date().toISOString() }).eq('provider_ref', ref);

// Looks the payment up at Stripe (never trusts the browser) and creates the order if it succeeded.
async function finalize(ref: string, userId?: string): Promise<{ order_id?: string; pending?: string; error?: string }> {
  const { data: c } = await admin.from('checkouts').select('*').eq('provider_ref', ref).maybeSingle();
  if (!c || (userId && c.user_id !== userId)) return { error: 'Unknown checkout' };
  if (c.status === 'done') return { order_id: c.order_id };
  const r = await stripe(`/v1/payment_intents/${encodeURIComponent(ref)}`);
  if (!r.ok) return { error: 'Couldn’t confirm the payment with Stripe.' };
  const pi = r.json;
  if (pi.status !== 'succeeded') return { pending: pi.status };
  if (pi.amount_received !== Math.round(Number(c.total) * 100)) {
    await touch(ref, { status: 'needs_review', payment_id: pi.id, note: `amount mismatch: paid ${pi.amount_received}, expected ${c.total}` });
    return { error: 'The paid amount didn’t match your order. Contact support with reference ' + pi.id };
  }
  const { data: oid, error } = await admin.rpc('fulfill_checkout', { p_ref: ref, p_provider: 'stripe', p_payment_id: pi.id, p_method: 'card', p_amount: pi.amount_received / 100 });
  if (error) {
    // money was taken but the order couldn't be written: keep the evidence for a manual fix or refund
    await touch(ref, { status: 'needs_review', payment_id: pi.id, note: 'fulfil failed: ' + error.message });
    console.error('fulfil failed after payment', ref, error);
    return { error: 'Your payment was received but we couldn’t finish your order. Contact support with reference ' + pi.id + ' and we’ll sort it out.' };
  }
  return { order_id: oid };
}

async function validWebhook(raw: string, header: string): Promise<boolean> {
  if (!WHSEC) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = parts.t, sig = parts.v1;
  if (!t || !sig || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(WHSEC), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.length === sig.length && hex.split('').reduce((d, ch, i) => d | (ch.charCodeAt(0) ^ sig.charCodeAt(i)), 0) === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('POST only', 405);

  // Stripe webhook
  const sigHeader = req.headers.get('stripe-signature');
  if (sigHeader) {
    const raw = await req.text();
    if (!(await validWebhook(raw, sigHeader))) return fail('bad signature', 400);
    const ev = JSON.parse(raw);
    if (ev.type === 'payment_intent.succeeded') {
      const out = await finalize(ev.data.object.id);
      if (out.error && out.error !== 'Unknown checkout') console.error('webhook finalize', ev.data.object.id, out.error);
    }
    return reply({ received: true });
  }

  let body: any;
  try { body = await req.json(); } catch { return fail('Bad request'); }
  if (body.action === 'config') return reply({ configured: !!(SK && PK), publishableKey: PK ?? null, currency: 'usd' });
  if (!SK || !PK) return fail('Payments are not set up yet.', 503);

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: u } = await admin.auth.getUser(jwt);
  const user = u?.user;
  if (!user) return fail('Sign in to check out', 401);

  try {
    if (body.action === 'create') {
      const items = Array.isArray(body.items) ? body.items.map((i: any) => ({ ref: i?.ref, config: i?.config, thumbnail: i?.thumbnail })) : [];
      const { data: prep, error } = await admin.rpc('prepare_checkout', { p_user: user.id, p_items: items, p_share: !!body.share });
      if (error) return fail(error.message);
      const total = Number(prep.total).toFixed(2);
      const r = await stripe('/v1/payment_intents', {
        amount: String(Math.round(Number(total) * 100)), currency: 'usd',
        // Stripe no longer accepts payment_method_types here; the methods come from the Dashboard (Settings -> Payment methods).
        // Keep only "Cards" switched on there. Redirect-based methods (banks, Klarna...) are excluded in code too.
        'automatic_payment_methods[enabled]': 'true', 'automatic_payment_methods[allow_redirects]': 'never',
        description: 'Aurix designs', ...(user.email ? { receipt_email: user.email } : {})
      }, crypto.randomUUID());
      if (!r.ok || !r.json.client_secret) { console.error('stripe create failed', r.status, JSON.stringify(r.json)); return fail('Couldn’t start the payment. Try again.', 502); }
      const { error: e2 } = await admin.from('checkouts').insert({ provider_ref: r.json.id, provider: 'stripe', user_id: user.id, items: prep.items, share: !!body.share, total });
      if (e2) throw e2;
      return reply({ id: r.json.id, client_secret: r.json.client_secret });
    }
    if (body.action === 'complete') {
      const out = await finalize(String(body.id ?? ''), user.id);
      if (out.error) return fail(out.error, 400);
      if (out.pending) return fail('Your payment is still processing. Check My orders in a moment.', 202);
      return reply({ order_id: out.order_id, method: 'card' });
    }
    return fail('Unknown action');
  } catch (e) {
    console.error('stripe-checkout error', e);
    return fail('Something went wrong. You haven’t been charged. Please try again.', 500);
  }
});
