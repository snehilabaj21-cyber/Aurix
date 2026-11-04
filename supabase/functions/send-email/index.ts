// Sends Aurix's transactional emails through SendGrid. Called by database triggers with { event, id } only: the recipients and
// content are always looked up here from real records, so a caller can't choose who gets an email or what it says.
// Each email is sent once (email_log), so repeated calls with the same id do nothing.
//
// Secrets (Supabase dashboard -> Edge Functions -> Secrets, or `supabase secrets set`):
//   SENDGRID_API_KEY  a SendGrid key with "Mail Send" permission
//   EMAIL_FROM        a sender address verified in SendGrid, e.g. hello@yourdomain.com
//   SITE_URL          optional, defaults to the live site
// Without the first two the function does nothing and reports "skipped".
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as T from './emails.ts';

const SITE = (Deno.env.get('SITE_URL') ?? 'https://aurix-seven-vert.vercel.app').replace(/\/$/, '');
const KEY = Deno.env.get('SENDGRID_API_KEY'), FROM = Deno.env.get('EMAIL_FROM');
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const emailOf = async (userId: string | null): Promise<string | null> => {
  if (!userId) return null;
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
};

// claim the right to send this email; false if it was already sent
async function claim(key: string): Promise<boolean> {
  const { data, error } = await admin.from('email_log').upsert({ key }, { onConflict: 'key', ignoreDuplicates: true }).select('key');
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function send(to: string | null, mail: T.Mail, key: string, sent: string[]): Promise<void> {
  if (!to) return;
  if (!(await claim(key))) return;
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: FROM, name: 'Aurix' }, subject: mail.subject,
      content: [{ type: 'text/plain', value: mail.text }, { type: 'text/html', value: mail.html }] })
  });
  if (!res.ok) {
    await admin.from('email_log').delete().eq('key', key); // let a later retry send it
    throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  sent.push(key);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  let body: { event?: string; id?: string };
  try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  const { event, id } = body;
  if (!event || !id || !UUID.test(id)) return new Response('bad request', { status: 400 });
  if (!KEY || !FROM) return Response.json({ ok: true, skipped: 'SendGrid is not configured (SENDGRID_API_KEY / EMAIL_FROM)' });

  const sent: string[] = [];
  try {
    if (event === 'order_placed') {
      const { data: order } = await admin.from('orders').select('id,user_id').eq('id', id).maybeSingle();
      if (!order) return Response.json({ ok: true, skipped: 'order not found' });
      const { data: items } = await admin.from('order_items').select('title,seller_name,price,seller_id,shared_contact').eq('order_id', id);
      const rows = items ?? [];
      if (rows.length) {
        const shared = rows.some((i) => i.shared_contact);
        await send(await emailOf(order.user_id), T.orderConfirmation(SITE, id, rows, shared), `order:${id}`, sent);
        const bySeller = new Map<string, typeof rows>();
        for (const i of rows) if (i.seller_id) bySeller.set(i.seller_id, [...(bySeller.get(i.seller_id) ?? []), i]);
        for (const [sellerId, mine] of bySeller) await send(await emailOf(sellerId), T.newSale(SITE, id, mine, mine[0].shared_contact), `sale:${id}:${sellerId}`, sent);
      }
    } else if (event === 'item_delivered') {
      const { data: item } = await admin.from('order_items').select('user_id,title,seller_name,price,status').eq('id', id).maybeSingle();
      if (item && item.status === 'delivered') await send(await emailOf(item.user_id), T.delivered(SITE, item), `delivered:${id}`, sent);
    } else if (event === 'review_created') {
      const { data: rv } = await admin.from('reviews').select('listing_ref,user_id,author,rating,comment').eq('id', id).maybeSingle();
      if (rv && UUID.test(rv.listing_ref)) {
        const { data: l } = await admin.from('listings').select('user_id,title').eq('id', rv.listing_ref).maybeSingle();
        if (l && l.user_id !== rv.user_id) await send(await emailOf(l.user_id), T.newReview(SITE, l.title, rv.rating, rv.author, rv.comment), `review:${id}`, sent);
      }
    } else if (event === 'welcome') {
      const email = await emailOf(id);
      if (email) await send(email, T.welcome(SITE, email), `welcome:${id}`, sent);
    } else return new Response('unknown event', { status: 400 });
  } catch (e) {
    console.error('send-email failed', event, id, e);
    return Response.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 500 });
  }
  return Response.json({ ok: true, sent });
});
