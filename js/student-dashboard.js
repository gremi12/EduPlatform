document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const messageBox = document.querySelector("#studentDashboardMessage");

  if (!supabaseApi?.isConfigured) {
    supabaseApi?.showMessage(
      messageBox,
      "Completeaza intai valorile din js/supabaseClient.js pentru a incarca dashboard-ul elevului.",
      "warning"
    );
    return;
  }

  try {
    const authState = await supabaseApi.requireSession({ allowedRoles: ["elev", "admin"] });

    if (authState.needsLogin) {
      supabaseApi.showMessage(
        messageBox,
        'Nu esti autentificat. <a href="login.html#login" class="alert-link">Mergi la autentificare</a>.',
        "warning"
      );
      return;
    }

    if (authState.unauthorized) {
      const destination = supabaseApi.getDashboardPath(authState.profile);
      supabaseApi.showMessage(
        messageBox,
        `Contul tau nu are acces la dashboard-ul de elev. <a href="${destination}" class="alert-link">Deschide dashboard-ul potrivit</a>.`,
        "warning"
      );
      return;
    }

    const enrolledClasses = getEnrolledClasses(authState.profile);
    renderStudentProfile(authState.user, authState.profile, enrolledClasses);
    await Promise.all([
      renderResourcesForStudent(enrolledClasses),
      renderCommunitiesForStudent(enrolledClasses),
    ]);
  } catch (error) {
    supabaseApi.showMessage(
      messageBox,
      error.message || "Nu am putut incarca dashboard-ul elevului.",
      "danger"
    );
  }

  function renderStudentProfile(user, profile, enrolledClasses) {
    const displayName = supabaseApi.getDisplayName(user, profile);
    const primaryClass = enrolledClasses[0] || profile?.class_level || "Nespecificata";
    const badges = profile?.badges_cpd ?? 0;
    const activityYears = profile?.activity_years ?? 0;

    document.querySelector("#studentAvatar").textContent = supabaseApi.getInitials(displayName);
    document.querySelector("#studentName").textContent = displayName;
    document.querySelector("#studentSubtitle").textContent =
      `Elev - ${primaryClass} - resurse si comunitati potrivite clasei tale`;
    document.querySelector("#studentAccountName").textContent = displayName;
    document.querySelector("#studentRole").textContent = "Elev";
    document.querySelector("#studentPrimaryClass").textContent = primaryClass;
    document.querySelector("#studentBadges").textContent = String(badges);
    document.querySelector("#studentActivity").textContent = `${activityYears} ani`;
    document.querySelector("#studentClassesCount").textContent = String(enrolledClasses.length);
    document.querySelector("#studentEmailShort").textContent = shrinkEmail(user?.email);

    const classesList = document.querySelector("#studentClassesList");
    classesList.innerHTML = enrolledClasses.length
      ? enrolledClasses
          .map(className => `<span class="badge text-bg-primary px-3 py-2">${escapeHtml(className)}</span>`)
          .join("")
      : '<span class="badge text-bg-light">Nu exista clase setate in profil.</span>';
  }

  async function renderResourcesForStudent(enrolledClasses) {
    const resourcesList = document.querySelector("#studentResourcesList");
    const resourcesCount = document.querySelector("#studentResourcesCount");

    if (!enrolledClasses.length) {
      resourcesCount.textContent = "0";
      resourcesList.innerHTML = `
        <div class="recommended-resource">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            <strong>Nu ai clase setate in profil</strong>
            <small>Adauga clasa in cont pentru a primi materiale potrivite.</small>
          </div>
        </div>
      `;
      return;
    }

    const { data, error } = await supabaseApi.client
      .from("resources")
      .select("id, title, category, class_level, format, public_url, description")
      .in("class_level", enrolledClasses)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) throw error;

    const resources = data || [];
    resourcesCount.textContent = String(resources.length);

    if (!resources.length) {
      resourcesList.innerHTML = `
        <div class="recommended-resource">
          <i class="fa-solid fa-folder-open"></i>
          <div>
            <strong>Nu exista fisiere pentru clasele tale inca</strong>
            <small>Profesorii vor putea publica materiale care apar aici.</small>
          </div>
        </div>
      `;
      return;
    }

    resourcesList.innerHTML = resources
      .map(
        resource => `
          <a class="recommended-resource" href="${escapeHtml(resource.public_url || "#")}" target="_blank" rel="noopener noreferrer">
            <i class="fa-solid fa-file-lines"></i>
            <div>
              <strong>${escapeHtml(resource.title)}</strong>
              <small>${escapeHtml(resource.category || "Fara categorie")} - ${escapeHtml(resource.class_level || "-")} - ${escapeHtml(resource.format || "-")}</small>
              <div class="small text-secondary mt-1">${escapeHtml(resource.description || "Fara descriere")}</div>
            </div>
          </a>
        `
      )
      .join("");
  }

  async function renderCommunitiesForStudent(enrolledClasses) {
    const communitiesList = document.querySelector("#studentCommunitiesList");
    const communitiesCount = document.querySelector("#studentCommunitiesCount");

    const { data, error } = await supabaseApi.client
      .from("community_groups")
      .select("slug, name, description, subject, target_class, icon")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const normalizedClasses = enrolledClasses.map(normalizeClass);
    const communities = (data || []).filter(group => {
      if (!group.target_class) return true;
      return normalizedClasses.includes(normalizeClass(group.target_class));
    });

    communitiesCount.textContent = String(communities.length);

    if (!communities.length) {
      communitiesList.innerHTML = `
        <div class="recommended-resource">
          <i class="fa-solid fa-users-slash"></i>
          <div>
            <strong>Nu exista comunitati potrivite inca</strong>
            <small>Cand profesorii creeaza grupuri pentru clasa ta, vor aparea aici.</small>
          </div>
        </div>
      `;
      return;
    }

    communitiesList.innerHTML = communities
      .slice(0, 8)
      .map(
        group => `
          <a class="recommended-resource" href="community.html">
            <i class="fa-solid ${escapeHtml(group.icon || "fa-users")}"></i>
            <div>
              <strong>${escapeHtml(group.name)}</strong>
              <small>${escapeHtml(group.subject || "Comunitate")} ${group.target_class ? `- ${escapeHtml(group.target_class)}` : "- Deschisa tuturor"}</small>
              <div class="small text-secondary mt-1">${escapeHtml(group.description || "")}</div>
            </div>
          </a>
        `
      )
      .join("");
  }

  function getEnrolledClasses(profile) {
    const fromArray = Array.isArray(profile?.enrolled_classes)
      ? profile.enrolled_classes
      : [];
    const fromPrimary = profile?.class_level ? [profile.class_level] : [];

    return [
      ...new Set(
        [...fromArray, ...fromPrimary]
          .map(value => String(value || "").trim())
          .filter(Boolean)
      ),
    ];
  }

  function normalizeClass(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
  }

  function shrinkEmail(email) {
    if (!email) return "-";
    const [name, domain] = email.split("@");
    if (!domain) return email;
    return `${name.slice(0, 10)}@${domain}`;
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
