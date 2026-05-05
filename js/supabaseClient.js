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
    target.innerHTML = message;
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
    const role = normalizeRole(profile?.role);

    if (role === "admin") {
      return "admin.html";
    }

    if (["moderator", "organizator", "profesor"].includes(role)) {
      return "teachers-dashboard.html";
    }

    return role === "elev" ? "student-dashboard.html" : "profile.html";
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
      user?.user_metadata?.full_name ||
      profile?.full_name ||
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
    const allowedRoles = options?.allowedRoles || [];

    if (!client) {
      return {
        configured: false,
        session: null,
        user: null,
        profile: null,
        needsLogin: false,
        unauthorized: false,
      };
    }

    const session = await getSession();
    if (!session?.user) {
      return {
        configured: true,
        session: null,
        user: null,
        profile: null,
        needsLogin: true,
        unauthorized: false,
      };
    }

    const user = session.user;
    const profile = (await getProfile(user.id)) || {
      id: user.id,
      full_name: user.user_metadata?.full_name || "",
      role: normalizeRole(user.user_metadata?.role) || "elev",
      specialization: "Nespecificata",
      badges_cpd: 0,
      activity_years: 0,
    };

    if (user.user_metadata?.full_name && !profile.full_name) {
      profile.full_name = user.user_metadata.full_name;
    }
    if (user.user_metadata?.role && !profile.role) {
      profile.role = normalizeRole(user.user_metadata.role);
    }

    syncSessionSnapshot(session, profile);

    if (profile.account_status && profile.account_status !== "active") {
      await signOut();
      const label =
        profile.account_status === "banned" ? "banat" : "dezactivat";
      throw new Error(
        `Contul tau este ${label}. Contacteaza administratorul platformei pentru reactivare.`
      );
    }

    const unauthorized =
      allowedRoles.length > 0 &&
      !allowedRoles.includes(normalizeRole(profile.role));

    return {
      configured: true,
      session,
      user,
      profile,
      needsLogin: false,
      unauthorized,
    };
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  function syncSessionSnapshot(session, profile) {
    try {
      const sessionUser = session?.user;
      if (!sessionUser || !profile) return;

      const nextRole = normalizeRole(profile.role) || normalizeRole(sessionUser.user_metadata?.role);
      const nextFullName =
        profile.full_name ||
        sessionUser.user_metadata?.full_name ||
        sessionUser.email?.split("@")[0] ||
        "";

      sessionUser.user_metadata = {
        ...(sessionUser.user_metadata || {}),
        role: nextRole,
        full_name: nextFullName,
      };

      const sessionKeys = Object.keys(window.localStorage).filter(key =>
        key.includes("-auth-token")
      );

      sessionKeys.forEach(key => {
        const rawValue = window.localStorage.getItem(key);
        if (!rawValue) return;

        const parsed = JSON.parse(rawValue);
        if (!parsed?.user || parsed.user.id !== sessionUser.id) return;

        parsed.user.user_metadata = {
          ...(parsed.user.user_metadata || {}),
          role: nextRole,
          full_name: nextFullName,
        };

        window.localStorage.setItem(key, JSON.stringify(parsed));
      });
    } catch (error) {
      console.error("Nu am putut sincroniza rolul din sesiune cu profilul.", error);
    }
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
