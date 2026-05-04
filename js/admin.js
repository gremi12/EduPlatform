document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const authSection = document.querySelector("#adminAuthSection");
  const dashboardSection = document.querySelector("#adminDashboardSection");
  const authMessage = document.querySelector("#adminAuthMessage");
  const pageMessage = document.querySelector("#adminPageMessage");
  const loginForm = document.querySelector("#adminLoginForm");
  const loginButton = document.querySelector("#adminLoginButton");
  const logoutButton = document.querySelector("#adminLogoutButton");
  const refreshButton = document.querySelector("#refreshAdminDataButton");
  const searchInput = document.querySelector("#adminUserSearch");
  const roleFilter = document.querySelector("#adminRoleFilter");
  const resetFiltersButton = document.querySelector("#resetAdminFiltersButton");
  const usersTableBody = document.querySelector("#adminUsersTableBody");
  const resultsMeta = document.querySelector("#adminResultsMeta");
  const adminIdentity = document.querySelector("#adminIdentity");
  const editUserForm = document.querySelector("#editAdminUserForm");
  const editUserRole = document.querySelector("#editAdminRole");
  const saveAdminUserButton = document.querySelector("#saveAdminUserButton");
  const editModalElement = document.querySelector("#editAdminUserModal");
  const editModal = editModalElement ? new bootstrap.Modal(editModalElement) : null;

  let users = [];
  let filteredUsers = [];
  let currentAdminId = null;
  let totalResources = 0;

  if (!supabaseApi?.isConfigured) {
    showAuthState(
      "Completeaza mai intai configurarea din js/supabaseClient.js pentru dashboard-ul de administrare.",
      "warning"
    );
    return;
  }

  loginForm?.addEventListener("submit", handleAdminLogin);
  logoutButton?.addEventListener("click", handleLogout);
  refreshButton?.addEventListener("click", refreshDashboardData);
  searchInput?.addEventListener("input", applyFilters);
  roleFilter?.addEventListener("change", applyFilters);
  resetFiltersButton?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (roleFilter) roleFilter.value = "";
    applyFilters();
  });

  usersTableBody?.addEventListener("click", event => {
    const button = event.target.closest("[data-action='edit-user']");
    if (!button) return;
    openEditModal(button.dataset.userId);
  });

  editUserRole?.addEventListener("change", updateRoleSpecificFields);
  editUserForm?.addEventListener("submit", handleUserSave);

  await bootstrapDashboard();

  async function bootstrapDashboard() {
    try {
      const authState = await supabaseApi.requireSession({ allowedRoles: ["admin"] });

      if (authState.needsLogin) {
        showAuthState();
        return;
      }

      if (authState.unauthorized) {
        await supabaseApi.signOut();
        showAuthState(
          "Contul curent nu are acces admin. Intra cu un cont care are rolul admin.",
          "danger"
        );
        return;
      }

      currentAdminId = authState.user.id;
      renderAdminIdentity(authState.user, authState.profile);
      patchNavbarForAdmin();
      await refreshDashboardData();
      showDashboardState();
    } catch (error) {
      showAuthState(error.message || "Nu am putut porni dashboard-ul admin.", "danger");
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault();

    const email = document.querySelector("#adminEmail")?.value.trim();
    const password = document.querySelector("#adminPassword")?.value;

    if (!email || !password) {
      supabaseApi.showMessage(authMessage, "Completeaza emailul si parola.", "warning");
      return;
    }

    try {
      loginButton.disabled = true;
      loginButton.textContent = "Se autentifica...";
      supabaseApi.clearMessage(authMessage);

      const { data, error } = await supabaseApi.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const profile = await supabaseApi.getProfile(data.user.id);
      if (supabaseApi.normalizeRole(profile?.role) !== "admin") {
        await supabaseApi.signOut();
        throw new Error("Acest cont exista, dar nu are rol admin.");
      }

      currentAdminId = data.user.id;
      renderAdminIdentity(data.user, profile);
      patchNavbarForAdmin();
      await refreshDashboardData();
      showDashboardState();
      loginForm.reset();
    } catch (error) {
      showAuthState(error.message || "Autentificarea admin a esuat.", "danger");
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Intra in dashboard";
    }
  }

  async function handleLogout() {
    await supabaseApi.signOut();
    currentAdminId = null;
    users = [];
    filteredUsers = [];
    showAuthState("Te-ai deconectat din zona de administrare.", "info");
  }

  async function refreshDashboardData() {
    try {
      if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.innerHTML = '<i class="fa-solid fa-rotate-right me-2"></i>Se actualizeaza...';
      }

      supabaseApi.clearMessage(pageMessage);

      const [profilesResult, resourcesResult] = await Promise.all([
        supabaseApi.client
          .from("profiles")
          .select("id, full_name, email, role, specialization, class_level, badges_cpd, activity_years, created_at")
          .order("created_at", { ascending: false }),
        supabaseApi.client.from("resources").select("id", { count: "exact", head: true }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (resourcesResult.error) throw resourcesResult.error;

      users = profilesResult.data || [];
      totalResources = resourcesResult.count || 0;

      renderStats();
      applyFilters();
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut actualiza lista de utilizatori.",
        "danger"
      );
    } finally {
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.innerHTML = '<i class="fa-solid fa-rotate-right me-2"></i>Actualizeaza';
      }
    }
  }

  function renderStats() {
    const adminCount = countRole("admin");
    const moderatorCount = countRole("moderator");
    const organizerCount = countRole("organizator");
    const teacherCount = countRole("profesor");
    const studentCount = countRole("elev");

    setText("#adminTotalUsers", String(users.length));
    setText("#adminTotalStudents", String(studentCount));
    setText("#adminTotalTeachers", String(teacherCount));
    setText("#adminTotalResources", String(totalResources));

    if (resultsMeta) {
      resultsMeta.textContent =
        `${users.length} utilizatori · ${adminCount} admini · ${moderatorCount} moderatori · ${organizerCount} organizatori · ${teacherCount} profesori · ${studentCount} elevi`;
    }
  }

  function applyFilters() {
    const query = normalize(searchInput?.value);
    const selectedRole = normalize(roleFilter?.value);

    filteredUsers = users.filter(user => {
      const role = normalize(user.role);
      const haystack = [
        user.full_name,
        user.email,
        role,
        user.specialization,
        user.class_level,
      ]
        .join(" ")
        .toLowerCase();

      const matchesRole = !selectedRole || role === selectedRole;
      const matchesQuery = !query || haystack.includes(query);
      return matchesRole && matchesQuery;
    });

    if (resultsMeta) {
      resultsMeta.textContent = `${filteredUsers.length} rezultate din ${users.length} utilizatori`;
    }

    renderUsersTable();
  }

  function renderUsersTable() {
    if (!usersTableBody) return;

    if (!filteredUsers.length) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">
            Nu exista utilizatori pentru filtrele selectate.
          </td>
        </tr>
      `;
      return;
    }

    usersTableBody.innerHTML = filteredUsers
      .map(
        user => `
          <tr>
            <td>
              <div class="fw-semibold">${escapeHtml(user.full_name || "Fara nume")}</div>
              <div class="small text-muted">${escapeHtml(user.email || "Email indisponibil")}</div>
            </td>
            <td>
              <span class="admin-role-badge admin-role-${normalize(user.role)}">
                ${escapeHtml(getRoleLabel(user.role))}
              </span>
            </td>
            <td>${escapeHtml(getUserDetail(user))}</td>
            <td>${Number(user.badges_cpd || 0)}</td>
            <td>${escapeHtml(formatDate(user.created_at))}</td>
            <td class="text-end">
              <button
                class="btn btn-sm btn-outline-primary"
                type="button"
                data-action="edit-user"
                data-user-id="${user.id}"
              >
                Editeaza
              </button>
            </td>
          </tr>
        `
      )
      .join("");
  }

  function openEditModal(userId) {
    const user = users.find(entry => entry.id === userId);
    if (!user) return;

    document.querySelector("#editAdminUserId").value = user.id;
    document.querySelector("#editAdminFullName").value = user.full_name || "";
    document.querySelector("#editAdminEmail").value = user.email || "";
    document.querySelector("#editAdminRole").value = normalize(user.role) || "elev";
    document.querySelector("#editAdminClassLevel").value = user.class_level || "";
    document.querySelector("#editAdminSpecialization").value = user.specialization || "";
    document.querySelector("#editAdminBadges").value = Number(user.badges_cpd || 0);
    document.querySelector("#editAdminActivityYears").value = Number(user.activity_years || 0);
    updateRoleSpecificFields();
    editModal?.show();
  }

  async function handleUserSave(event) {
    event.preventDefault();

    const userId = document.querySelector("#editAdminUserId")?.value;
    const role = normalize(document.querySelector("#editAdminRole")?.value) || "elev";
    const fullName = document.querySelector("#editAdminFullName")?.value.trim();
    const specializationInput = document.querySelector("#editAdminSpecialization")?.value.trim();
    const classLevelInput = document.querySelector("#editAdminClassLevel")?.value.trim();
    const badgesInput = document.querySelector("#editAdminBadges")?.value;
    const activityYearsInput = document.querySelector("#editAdminActivityYears")?.value;

    if (!userId || !fullName) {
      supabaseApi.showMessage(pageMessage, "Numele utilizatorului este obligatoriu.", "warning");
      return;
    }

    const payload = {
      full_name: fullName,
      role,
      specialization: specializationInput || getDefaultSpecialization(role),
      class_level: role === "elev" ? classLevelInput || null : null,
      badges_cpd: Math.max(0, Number(badgesInput || 0)),
      activity_years: Math.max(0, Number(activityYearsInput || 0)),
    };

    try {
      saveAdminUserButton.disabled = true;
      saveAdminUserButton.textContent = "Se salveaza...";
      supabaseApi.clearMessage(pageMessage);

      const { data, error } = await supabaseApi.client
        .from("profiles")
        .update(payload)
        .eq("id", userId)
        .select("id, full_name, email, role, specialization, class_level, badges_cpd, activity_years, created_at")
        .single();

      if (error) throw error;

      users = users.map(user => (user.id === userId ? data : user));
      applyFilters();
      renderStats();
      editModal?.hide();

      supabaseApi.showMessage(pageMessage, "Utilizatorul a fost actualizat.", "success");

      if (userId === currentAdminId && role !== "admin") {
        await supabaseApi.signOut();
        showAuthState(
          "Ti-ai schimbat propriul rol si ai iesit din zona de administrare. Intra din nou cu un admin.",
          "warning"
        );
      } else if (userId === currentAdminId) {
        const session = await supabaseApi.getSession();
        renderAdminIdentity(session?.user, data);
      }
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut salva modificarile utilizatorului.",
        "danger"
      );
    } finally {
      saveAdminUserButton.disabled = false;
      saveAdminUserButton.textContent = "Salveaza";
    }
  }

  function updateRoleSpecificFields() {
    const role = normalize(editUserRole?.value);
    const classField = document.querySelector("#editAdminClassLevel");
    const specializationField = document.querySelector("#editAdminSpecialization");

    if (classField) {
      classField.disabled = role !== "elev";
      if (role !== "elev") classField.value = "";
    }

    if (specializationField) {
      specializationField.disabled = role === "elev";
      if (role !== "elev" && !specializationField.value.trim()) {
        specializationField.value = getDefaultSpecialization(role);
      }
    }
  }

  function showAuthState(message, variant) {
    authSection.hidden = false;
    dashboardSection.hidden = true;
    supabaseApi.clearMessage(pageMessage);
    if (message) {
      supabaseApi.showMessage(authMessage, message, variant || "info");
    } else {
      supabaseApi.clearMessage(authMessage);
    }
  }

  function showDashboardState() {
    authSection.hidden = true;
    dashboardSection.hidden = false;
    supabaseApi.clearMessage(authMessage);
  }

  function renderAdminIdentity(user, profile) {
    adminIdentity.textContent = `${supabaseApi.getDisplayName(user, profile)} · ${profile?.email || user?.email || ""}`;
  }

  function patchNavbarForAdmin() {
    const dashboardLink = Array.from(document.querySelectorAll(".dropdown-menu a")).find(
      link => link.getAttribute("href") === "teachers-dashboard.html"
    );

    if (dashboardLink) {
      dashboardLink.textContent = "Dashboard admin";
      dashboardLink.setAttribute("href", "admin.html");
    }
  }

  function countRole(roleName) {
    return users.filter(user => normalize(user.role) === roleName).length;
  }

  function getUserDetail(user) {
    const role = normalize(user.role);
    if (role === "elev") {
      return user.class_level || "Clasa necompletata";
    }
    return user.specialization || getDefaultSpecialization(role);
  }

  function getDefaultSpecialization(role) {
    if (role === "admin") return "Administrare platforma";
    if (role === "moderator") return "Moderare comunitate";
    if (role === "organizator") return "Coordonare webinarii";
    if (role === "profesor") return "Nespecificata";
    return "";
  }

  function getRoleLabel(role) {
    const value = normalize(role);
    if (value === "organizator") return "Organizator webinar";
    return value ? value[0].toUpperCase() + value.slice(1) : "Utilizator";
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("ro-RO");
  }

  function normalize(value) {
    return (value || "").toString().trim().toLowerCase();
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
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
