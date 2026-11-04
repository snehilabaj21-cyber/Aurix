// Aurix transactional emails. Pure functions: data in, { subject, html, text } out. Everything that comes from a user
// (design titles, names, comments, contact details) is escaped before it goes into the HTML.
export type Mail = { subject: string; html: string; text: string };
export type Item = { title: string; seller_name: string; price: number | string; status?: string };
export type Contact = Partial<Record<'full_name' | 'phone' | 'address_line1' | 'address_line2' | 'city' | 'region' | 'postal_code' | 'country', string>>;

export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
export const money = (n: number | string): string => '$' + Number(n).toFixed(2);
const orderNo = (id: string): string => '#' + id.slice(0, 8).toUpperCase();
const stars = (n: number): string => '★'.repeat(n) + '☆'.repeat(5 - n);

function layout(preheader: string, heading: string, inner: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0e0d0c;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0d0c;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#16130f;border:1px solid #2c2822;border-radius:12px;font-family:Helvetica,Arial,sans-serif;color:#ece6dc;">
<tr><td style="padding:22px 28px;border-bottom:1px solid #2c2822;font-family:Georgia,serif;font-size:24px;letter-spacing:6px;color:#e6c77f;">AURIX</td></tr>
<tr><td style="padding:26px 28px;"><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:24px;color:#e6c77f;font-weight:600;">${esc(heading)}</h1>
<div style="font-size:14px;line-height:1.6;color:#ece6dc;">${inner}</div>
${cta ? `<p style="margin:24px 0 0;"><a href="${esc(cta.url)}" style="display:inline-block;background:#c9a45c;color:#1a1408;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #2c2822;font-size:11px;color:#8f877b;">You are receiving this because of activity on your Aurix account. This is a demo store: no payment is taken.</td></tr>
</table></td></tr></table></body></html>`;
}

const itemRows = (items: Item[]): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">${items.map((i) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #2c2822;"><b>${esc(i.title)}</b><br><span style="color:#8f877b;font-size:12px;">by ${esc(i.seller_name)}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #2c2822;color:#e6c77f;font-weight:600;white-space:nowrap;">${money(i.price)}</td></tr>`).join('')}</table>`;
const itemLines = (items: Item[]): string => items.map((i) => `- ${i.title} (by ${i.seller_name}): ${money(i.price)}`).join('\n');
const total = (items: Item[]): number => items.reduce((s, i) => s + Number(i.price), 0);

export function contactLines(c: Contact | null | undefined): string[] {
  if (!c) return [];
  const addr = [c.address_line1, c.address_line2, [c.city, c.region, c.postal_code].filter(Boolean).join(', '), c.country].filter((x) => x && String(x).trim());
  return [c.full_name ? `Name: ${c.full_name}` : '', c.phone ? `Phone: ${c.phone}` : '', addr.length ? `Address: ${addr.join(', ')}` : ''].filter(Boolean);
}

export function orderConfirmation(site: string, orderId: string, items: Item[], shared: boolean): Mail {
  const sum = total(items), subject = `Your Aurix order ${orderNo(orderId)} is confirmed`;
  const note = shared ? 'You chose to share your contact details with the seller.' : 'Your contact details were not shared with the sellers.';
  return {
    subject,
    html: layout(`Order ${orderNo(orderId)}: ${money(sum)}`, 'Thank you for your order',
      `<p style="margin:0 0 8px;">Order <b>${orderNo(orderId)}</b> is confirmed.</p>${itemRows(items)}<p style="margin:10px 0 4px;text-align:right;">Total <b style="color:#e6c77f;font-size:18px;">${money(sum)}</b></p>` +
      `<p style="margin:14px 0 0;color:#8f877b;font-size:12px;">${esc(note)} Designs open in your studio from Orders.</p>`, { label: 'View your orders', url: site + '/#sell' }),
    text: `Thank you for your order.\n\nOrder ${orderNo(orderId)} is confirmed.\n\n${itemLines(items)}\n\nTotal: ${money(sum)}\n\n${note}\nOpen your designs from Orders: ${site}/\n`
  };
}

export function newSale(site: string, orderId: string, items: Item[], buyerContact: Contact | null): Mail {
  const sum = total(items), lines = contactLines(buyerContact);
  const subject = items.length === 1 ? `New sale: ${items[0].title} (${money(sum)})` : `New sale: ${items.length} designs (${money(sum)})`;
  const contactHtml = lines.length
    ? `<p style="margin:14px 0 4px;"><b>Buyer contact details</b> <span style="color:#8f877b;font-size:12px;">(shared by the buyer for this order only)</span></p><div style="background:#1d1a17;border:1px solid #2c2822;border-radius:8px;padding:10px 12px;">${lines.map(esc).join('<br>')}</div>`
    : '<p style="margin:14px 0 0;color:#8f877b;font-size:12px;">The buyer did not share contact details.</p>';
  return {
    subject,
    html: layout(`${money(sum)} from order ${orderNo(orderId)}`, 'You made a sale', `<p style="margin:0 0 8px;">Order <b>${orderNo(orderId)}</b> includes your design${items.length === 1 ? '' : 's'}:</p>${itemRows(items)}<p style="margin:10px 0 0;text-align:right;">Demo revenue <b style="color:#e6c77f;">${money(sum)}</b></p>${contactHtml}`,
      { label: 'Open your seller dashboard', url: site + '/#sell' }),
    text: `You made a sale.\n\nOrder ${orderNo(orderId)}:\n${itemLines(items)}\n\nDemo revenue: ${money(sum)}\n\n${lines.length ? 'Buyer contact details (shared for this order only):\n' + lines.join('\n') : 'The buyer did not share contact details.'}\n\nSeller dashboard: ${site}/#sell\n`
  };
}

export function delivered(site: string, item: Item): Mail {
  return {
    subject: `Delivered: ${item.title}`,
    html: layout(`${item.title} is ready`, 'Your design was delivered', `<p style="margin:0 0 8px;">The seller marked this design as delivered:</p>${itemRows([item])}<p style="margin:10px 0 0;">Open it in your studio from <b>Orders</b>, and leave a review if you like it.</p>`, { label: 'Open your orders', url: site + '/' }),
    text: `Your design was delivered.\n\n${itemLines([item])}\n\nOpen it in your studio from Orders: ${site}/\n`
  };
}

export function newReview(site: string, listingTitle: string, rating: number, author: string, comment: string): Mail {
  return {
    subject: `New ${rating}-star review on ${listingTitle}`,
    html: layout(`${rating} of 5 from ${author}`, 'You have a new review',
      `<p style="margin:0 0 6px;"><b>${esc(listingTitle)}</b></p><p style="margin:0 0 6px;font-size:20px;color:#e6c77f;letter-spacing:2px;">${stars(rating)}</p><p style="margin:0 0 6px;color:#8f877b;font-size:12px;">from ${esc(author)}</p>${comment ? `<p style="margin:10px 0 0;border-left:3px solid #c9a45c;padding-left:12px;">${esc(comment)}</p>` : ''}`,
      { label: 'See it on the marketplace', url: site + '/#marketplace' }),
    text: `You have a new review.\n\n${listingTitle}\n${stars(rating)} (${rating} of 5) from ${author}\n${comment ? '\n"' + comment + '"\n' : ''}\nMarketplace: ${site}/#marketplace\n`
  };
}

export function welcome(site: string, email: string): Mail {
  return {
    subject: 'Welcome to Aurix',
    html: layout('Your account is ready', 'Welcome to Aurix', `<p style="margin:0 0 8px;">Your account <b>${esc(email)}</b> is ready.</p><p style="margin:0;">Design rings, pendants and name plates in the studio, save your work, and sell designs in the marketplace. Add your phone number and address on <b>My profile</b> if you would like sellers to be able to reach you.</p>`, { label: 'Open the studio', url: site + '/' }),
    text: `Welcome to Aurix.\n\nYour account ${email} is ready. Design rings, pendants and name plates, save your work, and sell designs in the marketplace.\n\nOpen the studio: ${site}/\n`
  };
}
