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

/* ----- subscription ($20 / month): unlocks STL export ----- */
const PLAN_KEY = 'aurix_pro_monthly', PLAN_CENTS = 2000; // change PLAN_CENTS (and PLAN_KEY, to make a new price) to change the price
const SITES = ['https://aurix-seven-vert.vercel.app', 'http://localhost:8080'];
const LIVE = ['active', 'trialing'];

// the plan's Stripe Price, created on first use and found again by its lookup key afterwards
async function planPrice(): Promise<string> {
  const f = await stripe(`/v1/prices?lookup_keys[]=${PLAN_KEY}&active=true`);
  if (f.ok && f.json.data?.length) return f.json.data[0].id;
  const c = await stripe('/v1/prices', {
    currency: 'usd', unit_amount: String(PLAN_CENTS), 'recurring[interval]': 'month', lookup_key: PLAN_KEY, 'product_data[name]': 'Aurix Pro: STL export'
  }, 'price-' + PLAN_KEY);
  if (!c.ok) throw new Error('could not create the plan price: ' + JSON.stringify(c.json));
  return c.json.id;
}

async function saveSub(userId: string, sub: any) {
  const end = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end; // newer API versions keep it on the item
  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId, stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id, stripe_subscription_id: sub.id,
    status: sub.status, current_period_end: end ? new Date(end * 1000).toISOString() : null, cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

async function userForSub(sub: any): Promise<string | null> {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  const cust = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  const { data } = await admin.from('subscriptions').select('user_id').eq('stripe_customer_id', cust).maybeSingle();
  return data?.user_id ?? null;
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
    if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev.type)) {
      try {
        const uid = await userForSub(ev.data.object);
        if (uid) await saveSub(uid, ev.data.object); else console.error('webhook: subscription with no known user', ev.data.object.id);
      } catch (e) { console.error('webhook subscription save failed', e); return fail('retry', 500); } // Stripe retries a 500
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
    if (body.action === 'subscribe' || body.action === 'manage') {
      let origin = ''; try { origin = new URL(String(body.return_url)).origin; } catch { /* checked below */ }
      if (!SITES.includes(origin)) return fail('Bad return address');
      const { data: row } = await admin.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
      if (body.action === 'manage') {
        if (!row?.stripe_customer_id) return fail('No subscription found.');
        const p = await stripe('/v1/billing_portal/sessions', { customer: row.stripe_customer_id, return_url: origin + '/' });
        if (!p.ok) { console.error('portal failed', JSON.stringify(p.json)); return fail('Couldn’t open billing. Try again later.', 502); }
        return reply({ url: p.json.url });
      }
      if (row && LIVE.includes(row.status)) return fail('You’re already subscribed.');
      let customer = row?.stripe_customer_id as string | undefined;
      if (!customer) {
        const c = await stripe('/v1/customers', { ...(user.email ? { email: user.email } : {}), 'metadata[user_id]': user.id });
        if (!c.ok) { console.error('customer create failed', JSON.stringify(c.json)); return fail('Couldn’t start the subscription. Try again.', 502); }
        customer = c.json.id as string;
        await admin.from('subscriptions').upsert({ user_id: user.id, stripe_customer_id: customer }, { onConflict: 'user_id' });
      }
      const s = await stripe('/v1/checkout/sessions', {
        mode: 'subscription', customer, client_reference_id: user.id,
        'line_items[0][price]': await planPrice(), 'line_items[0][quantity]': '1',
        'subscription_data[metadata][user_id]': user.id,
        success_url: origin + '/?subscribed=1', cancel_url: origin + '/'
      });
      if (!s.ok || !s.json.url) { console.error('subscribe session failed', s.status, JSON.stringify(s.json)); return fail('Couldn’t start the subscription. Try again.', 502); }
      return reply({ url: s.json.url });
    }
    if (body.action === 'sub_sync') {
      // asks Stripe directly (not the browser) for this customer's subscription, so access appears right after paying
      const { data: row } = await admin.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
      if (!row?.stripe_customer_id) return reply({ status: 'none' });
      const l = await stripe(`/v1/subscriptions?customer=${encodeURIComponent(row.stripe_customer_id)}&status=all&limit=10`);
      if (!l.ok) return fail('Couldn’t check your subscription.', 502);
      const subs: any[] = l.json.data ?? [];
      const best = subs.find((x) => LIVE.includes(x.status)) ?? subs[0];
      if (!best) return reply({ status: 'none' });
      await saveSub(user.id, best);
      return reply({ status: best.status });
    }
    return fail('Unknown action');
  } catch (e) {
    console.error('stripe-checkout error', e);
    return fail('Something went wrong. You haven’t been charged. Please try again.', 500);
  }
});
