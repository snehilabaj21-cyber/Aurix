/* Aurix — Supabase accounts + saved designs. The publishable key is safe to ship; access is enforced by row-level security. */
const AurixCloud = (() => {
  const SUPABASE_URL = 'https://pmabhsalknzgnxcklfva.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Qa50xuPDNN01uWqQfmxQ5w_h5ddIHmW';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const user = () => db.auth.getUser().then(({ data }) => data.user);
  const onAuth = (fn) => db.auth.onAuthStateChange((_e, session) => fn(session && session.user));

  async function signIn(email, password) {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function signUp(email, password) {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) throw error;
    return !!data.session; // false when email confirmation is required
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
      .order('created_at', { ascending: false }).limit(200);
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
      .select('id,created_at,order_items(id,listing_ref,title,seller_name,price,config,thumbnail)')
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  }
  async function listSales(sellerId) {
    const { data, error } = await db.from('order_items')
      .select('id,listing_ref,title,price,created_at').eq('seller_id', sellerId).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return data;
  }

  return { user, onAuth, signIn, signUp, signOut, saveDesign, listDesigns, deleteDesign, listListings, myLikes, publishListing, deleteListing, setLike, placeOrder, listOrders, listSales };
})();
