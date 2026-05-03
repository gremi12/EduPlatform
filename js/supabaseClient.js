window.EDUPLATFORM_SUPABASE_CONFIG = window.EDUPLATFORM_SUPABASE_CONFIG || {
  url: "https://oxkzyfdwfwhuwzmifhvt.supabase.co",
  anonKey: "sb_publishable_Nvt9KWLou_Gfhu_ZDwVFUw_l60j8Kvc",
};

(function initEduPlatformSupabase() {
  const config = window.EDUPLATFORM_SUPABASE_CONFIG;
  const isConfigured =
    Boolean(window.supabase) &&
    typeof config?.url === "string" &&
    config.url.startsWith("https://") &&
    typeof config?.anonKey === "string" &&
    config.anonKey.length > 20 &&
    !config.url.includes("PASTE_YOUR_SUPABASE_URL_HERE") &&
    !config.anonKey.includes("PASTE_YOUR_SUPABASE_ANON_KEY_HERE");

  const client = isConfigured
    ? window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

  function showMessage(target, message, variant) {
    if (!target) return;
    target.className = `alert alert-${variant || "info"} mb-3`;
    target.textContent = message;
  }

  function clearMessage(target) {
    if (!target) return;
    target.className = "";
    target.textContent = "";
  }

  function normalizeRole(role) {
    return (role || "").toString().trim().toLowerCase();
  }

  function getDashboardPath(profile) {
    return normalizeRole(profile?.role) === "profesor"
      ? "teachers-dashboard.html"
      : "profile.html";
  }

  async function getSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function getProfile(userId) {
    if (!client || !userId) return null;
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  function getDisplayName(user, profile) {
    return (
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "Utilizator EduPlatform"
    );
  }

  function getInitials(name) {
    return (name || "EU")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || "")
      .join("");
  }

  async function requireSession(options) {
    const redirectTo = options?.redirectTo ?? "login.html";
    const allowedRoles = options?.allowedRoles || [];

    if (!client) {
      return { configured: false, session: null, user: null, profile: null };
    }

    const session = await getSession();
    if (!session?.user) {
      if (redirectTo) window.location.href = redirectTo;
      return { configured: true, session: null, user: null, profile: null };
    }

    const user = session.user;
    const profile = (await getProfile(user.id)) || {
      id: user.id,
      full_name: user.user_metadata?.full_name || "",
      role: normalizeRole(user.user_metadata?.role) || "elev",
      specialization: "Nespecificată",
      badges_cpd: 0,
      activity_years: 0,
    };

    if (allowedRoles.length && !allowedRoles.includes(normalizeRole(profile.role))) {
      window.location.href = getDashboardPath(profile);
      return { configured: true, session, user, profile };
    }

    return { configured: true, session, user, profile };
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  window.eduPlatformSupabase = {
    client,
    isConfigured,
    showMessage,
    clearMessage,
    normalizeRole,
    getDashboardPath,
    getDisplayName,
    getInitials,
    getProfile,
    getSession,
    requireSession,
    signOut,
  };
})();
