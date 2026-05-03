document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const messageBox = document.querySelector("#profileMessage");
  const resourcesContainer = document.querySelector("#profileResources");
  const uploadCta = document.querySelector("#uploadResourceCta");
  const logoutButton = document.querySelector("#logoutButton");

  if (!supabaseApi?.isConfigured) {
    supabaseApi?.showMessage(
      messageBox,
      "Completează întâi valorile din js/supabaseClient.js pentru a încărca profilul din Supabase.",
      "warning"
    );
    return;
  }

  try {
    const authState = await supabaseApi.requireSession({ redirectTo: "login.html" });
    if (!authState?.user) return;

    renderProfile(authState.user, authState.profile);
    await renderResources(authState.user.id);
  } catch (error) {
    supabaseApi.showMessage(
      messageBox,
      error.message || "Profilul nu a putut fi încărcat.",
      "danger"
    );
  }

  logoutButton?.addEventListener("click", async () => {
    await supabaseApi.signOut();
    window.location.href = "login.html";
  });

  function renderProfile(user, profile) {
    const displayName = supabaseApi.getDisplayName(user, profile);
    const role = profile?.role || "elev";
    const specialization = profile?.specialization || "Nespecificată";
    const badges = profile?.badges_cpd ?? 0;
    const activityYears = profile?.activity_years ?? 0;

    document.querySelector("#profileAvatar").textContent =
      supabaseApi.getInitials(displayName);
    document.querySelector("#profileName").textContent = displayName;
    document.querySelector("#profileSubtitle").textContent =
      `${capitalize(role)} · ${specialization} · profil conectat la Supabase`;
    document.querySelector("#profileRole").textContent = capitalize(role);
    document.querySelector("#profileSpecialization").textContent = specialization;
    document.querySelector("#profileBadges").textContent = String(badges);
    document.querySelector("#profileActivity").textContent = `${activityYears} ani`;

    if (supabaseApi.normalizeRole(role) !== "profesor") {
      uploadCta.style.display = "none";
    }
  }

  async function renderResources(userId) {
    const { data, error } = await supabaseApi.client
      .from("resources")
      .select("id, title, category, download_count")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!data?.length) {
      resourcesContainer.innerHTML = `
        <div class="recommended-resource">
          <i class="fa-solid fa-folder-open"></i>
          <div>
            <strong>Nu există resurse încă</strong>
            <small>Prima resursă publicată va apărea aici.</small>
          </div>
        </div>
      `;
      return;
    }

    resourcesContainer.innerHTML = data
      .map(
        resource => `
          <div class="recommended-resource">
            <i class="fa-solid fa-file-lines"></i>
            <div>
              <strong>${escapeHtml(resource.title)}</strong>
              <small>${escapeHtml(resource.category || "Fără categorie")} · ${resource.download_count || 0} descărcări</small>
            </div>
          </div>
        `
      )
      .join("");
  }

  function capitalize(value) {
    const text = (value || "").trim();
    return text ? text[0].toUpperCase() + text.slice(1) : "Utilizator";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
});
