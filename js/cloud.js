/* Aurix — Supabase accounts + saved designs. The publishable key is safe to ship; access is enforced by row-level security. */
const AurixCloud = (() => {
  const SUPABASE_URL = 'https://pmabhsalknzgnxcklfva.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Qa50xuPDNN01uWqQfmxQ5w_h5ddIHmW';
  // supabase-js serialises auth work across browser tabs with a lock. A tab that holds it forever (an old or frozen tab)
  // makes every request in the other tabs wait silently, so run without the cross-tab lock.
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { lock: async (_name, _acquireTimeout, fn) => await fn() } });

  const user = () => db.auth.getUser().then(({ data }) => data.user);
  // Listeners run after the auth call finishes: supabase-js awaits whatever this callback returns, so a slow or failing
  // listener (they load orders, listings...) would otherwise leave sign-in hanging with no message.
  const onAuth = (fn) => db.auth.onAuthStateChange((_e, session) => {
    const u = session && session.user;
    setTimeout(() => { try { Promise.resolve(fn(u)).catch((e) => console.error('auth listener failed', e)); } catch (e) { console.error('auth listener failed', e); } }, 0);
  });

  async function signIn(email, password) {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function signUp(email, password) {
    const { error } = await db.auth.signUp({ email, password });
    if (error) throw error;
  }
  const signOut = () => db.auth.signOut();

  async function saveDesign(name, config, retailPrice, id) {
    const row = { name, config, retail_price: retailPrice };
    const q = id ? db.from('designs').update(row).eq('id', id) : db.from('designs').insert(row);
    const { data, error } = await q.select('id').single();
    if (error) throw error;
    return data.id;
  }
  async function listDesigns() {
    const { data, error } = await db.from('designs').select('id,name,config,retail_price,updated_at').order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  async function deleteDesign(id) {
    const { error } = await db.from('designs').delete().eq('id', id);
    if (error) throw error;
  }

  /* marketplace: public listings, likes. Rejects if the listings table has not been created yet. */
  async function listListings() {
    const { data, error } = await db.from('listings')
      .select('id,user_id,seller_name,title,description,product,price,config,thumbnail,created_at,listing_likes(count)')
      .eq('status', 'published').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return data.map((r) => ({ ...r, likes: r.listing_likes && r.listing_likes[0] ? r.listing_likes[0].count : 0 }));
  }
  async function myLikes() {
    const { data, error } = await db.from('listing_likes').select('listing_id');
    if (error) throw error;
    return data.map((r) => r.listing_id);
  }
  async function publishListing(row) {
    const { data, error } = await db.from('listings').insert(row).select('id').single();
    if (error) throw error;
    return data.id;
  }
  async function deleteListing(id) {
    const { error } = await db.from('listings').delete().eq('id', id);
    if (error) throw error;
  }
  async function setLike(listingId, on) {
    const q = on ? db.from('listing_likes').insert({ listing_id: listingId }) : db.from('listing_likes').delete().eq('listing_id', listingId);
    const { error } = await q;
    if (error) throw error;
  }

  /* demo checkout: no payment is taken (see supabase/migrations/*_orders.sql) */
  async function placeOrder(items) {
    const { data, error } = await db.rpc('place_order', { p_items: items });
    if (error) throw error;
    return data;
  }
  async function listOrders() {
    const { data, error } = await db.from('orders')
      .select('id,created_at,order_items(id,listing_ref,title,seller_name,price,config,thumbnail,status)')
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  }
  async function listSales(sellerId) {
    const { data, error } = await db.from('order_items')
      .select('id,listing_ref,title,price,created_at,status').eq('seller_id', sellerId).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return data;
  }

  /* seller dashboard */
  async function listMyListings(userId) {
    const { data, error } = await db.from('listings')
      .select('id,title,description,price,thumbnail,created_at,status,listing_likes(count)')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return data.map((r) => ({ ...r, likes: r.listing_likes && r.listing_likes[0] ? r.listing_likes[0].count : 0 }));
  }
  async function updateListing(id, patch) {
    const { data, error } = await db.from('listings').update(patch).eq('id', id).select('id');
    if (error) throw error;
    if (!data.length) throw new Error('listing not found');
  }

  async function setItemStatus(itemId, status) {
    const { data, error } = await db.from('order_items').update({ status }).eq('id', itemId).select('id');
    if (error) throw error;
    if (!data.length) throw new Error('order item not found');
  }
  async function likesSince(listingIds, sinceIso) {
    if (!listingIds.length) return [];
    const { data, error } = await db.from('listing_likes').select('created_at').in('listing_id', listingIds).gte('created_at', sinceIso).limit(5000);
    if (error) throw error;
    return data;
  }

  /* seller profiles */
  async function getProfile(userId) {
    const { data, error } = await db.from('profiles').select('user_id,display_name,bio').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function saveProfile(userId, displayName, bio) {
    const { error } = await db.from('profiles').upsert({ user_id: userId, display_name: displayName, bio, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  /* reviews: only buyers can post (enforced by the database) */
  async function listReviews() {
    const { data, error } = await db.from('reviews').select('id,listing_ref,user_id,author,rating,comment,created_at').order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    return data;
  }
  async function addReview(row) {
    const { error } = await db.from('reviews').insert(row);
    if (error) throw error;
  }
  async function deleteReview(id) {
    const { error } = await db.from('reviews').delete().eq('id', id);
    if (error) throw error;
  }

  return { user, onAuth, signIn, signUp, signOut, saveDesign, listDesigns, deleteDesign, listListings, myLikes, publishListing, deleteListing, setLike, placeOrder, listOrders, listSales, listMyListings, updateListing, setItemStatus, likesSince, getProfile, saveProfile, listReviews, addReview, deleteReview };
})();
