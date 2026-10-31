/* Aurix — Supabase accounts + saved designs. The publishable key is safe to ship; access is enforced by row-level security. */
const AurixCloud = (() => {
  const SUPABASE_URL = 'https://itvlaanarwjhgqocnfby.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_kHz3St_2QQW9Fpo1cpKojQ_nK9uj4RQ';
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

  return { user, onAuth, signIn, signUp, signOut, saveDesign, listDesigns, deleteDesign };
})();
