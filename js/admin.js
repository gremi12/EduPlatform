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
  const promoteForm = document.querySelector("#adminPromoteForm");
  const promoteMessage = document.querySelector("#adminPromoteMessage");
  const promoteButton = document.querySelector("#adminPromoteButton");
  const searchInput = document.querySelector("#adminUserSearch");
  const roleFilter = document.querySelector("#adminRoleFilter");
  const resetFiltersButton = document.querySelector("#resetAdminFiltersButton");
  const usersTableBody = document.querySelector("#adminUsersTableBody");
  const resultsMeta = document.querySelector("#adminResultsMeta");
  const adminIdentity = document.querySelector("#adminIdentity");
  const editUserForm = document.querySelector("#editAdminUserForm");
  const editUserRole = document.querySelector("#editAdminRole");
  const saveAdminUserButton = document.querySelector("#saveAdminUserButton");
  const editUserModalElement = document.querySelector("#editAdminUserModal");
  const editUserModal = editUserModalElement ? bootstrap.Modal.getOrCreateInstance(editUserModalElement) : null;
  const coursesTableBody = document.querySelector("#adminCoursesTableBody");
  const addCourseButton = document.querySelector("#addAdminCourseButton");
  const editCourseForm = document.querySelector("#editAdminCourseForm");
  const saveCourseButton = document.querySelector("#saveAdminCourseButton");
  const courseModalElement = document.querySelector("#editAdminCourseModal");
  const courseModal = courseModalElement ? bootstrap.Modal.getOrCreateInstance(courseModalElement) : null;
  const lessonsTableBody = document.querySelector("#adminLessonsTableBody");
  const addLessonButton = document.querySelector("#addAdminLessonButton");
  const editLessonForm = document.querySelector("#editAdminLessonForm");
  const saveLessonButton = document.querySelector("#saveAdminLessonButton");
  const lessonModalElement = document.querySelector("#editAdminLessonModal");
  const lessonModal = lessonModalElement ? bootstrap.Modal.getOrCreateInstance(lessonModalElement) : null;
  const lessonSourceType = document.querySelector("#editLessonSourceType");
  const selectedCourseTitle = document.querySelector("#adminSelectedCourseTitle");
  const selectedCourseMeta = document.querySelector("#adminSelectedCourseMeta");

  let users = [];
  let filteredUsers = [];
  let currentAdminId = null;
  let totalResources = 0;
  let courses = [];
  let lessons = [];
  let selectedCourseSlug = "";

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
  promoteForm?.addEventListener("submit", handlePromoteAdmin);
  searchInput?.addEventListener("input", applyFilters);
  roleFilter?.addEventListener("change", applyFilters);
  resetFiltersButton?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (roleFilter) roleFilter.value = "";
    applyFilters();
  });

  usersTableBody?.addEventListener("click", async event => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const userId = actionButton.dataset.userId;
    const action = actionButton.dataset.action;

    if (action === "edit-user") {
      openEditUserModal(userId);
      return;
    }

    if (action === "toggle-ban") {
      await updateUserStatus(userId, actionButton.dataset.nextStatus, actionButton.dataset.note || "");
      return;
    }

    if (action === "toggle-disable") {
      await updateUserStatus(userId, actionButton.dataset.nextStatus, actionButton.dataset.note || "");
    }
  });

  coursesTableBody?.addEventListener("click", async event => {
    const actionButton = event.target.closest("[data-course-action]");
    if (!actionButton) return;

    const slug = actionButton.dataset.courseSlug;
    const action = actionButton.dataset.courseAction;

    if (action === "edit-course") {
      openCourseModal(slug);
      return;
    }

    if (action === "select-course") {
      selectCourse(slug);
      return;
    }

    if (action === "toggle-publish") {
      await toggleCoursePublish(slug, actionButton.dataset.nextPublished === "true");
    }
  });

  lessonsTableBody?.addEventListener("click", async event => {
    const actionButton = event.target.closest("[data-lesson-action]");
    if (!actionButton) return;

    const lessonId = actionButton.dataset.lessonId;
    const action = actionButton.dataset.lessonAction;

    if (action === "edit-lesson") {
      openLessonModal(lessonId);
      return;
    }

    if (action === "delete-lesson") {
      await deleteLesson(lessonId);
    }
  });

  addCourseButton?.addEventListener("click", () => openCourseModal());
  addLessonButton?.addEventListener("click", () => openLessonModal());
  editUserRole?.addEventListener("change", updateRoleSpecificFields);
  lessonSourceType?.addEventListener("change", updateLessonSourceFields);
  editUserForm?.addEventListener("submit", handleUserSave);
  editCourseForm?.addEventListener("submit", handleCourseSave);
  editLessonForm?.addEventListener("submit", handleLessonSave);

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

      if ((profile?.account_status || "active") !== "active") {
        await supabaseApi.signOut();
        throw new Error("Contul de admin este blocat sau dezactivat.");
      }

      currentAdminId = data.user.id;
      renderAdminIdentity(data.user, profile);
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
    courses = [];
    lessons = [];
    showAuthState("Te-ai deconectat din zona de administrare.", "info");
  }

  async function refreshDashboardData() {
    try {
      if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.innerHTML = '<i class="fa-solid fa-rotate-right me-2"></i>Se actualizeaza...';
      }

      supabaseApi.clearMessage(pageMessage);

      const [profilesResult, resourcesResult, coursesResult, lessonsResult] = await Promise.all([
        supabaseApi.client
          .from("profiles")
          .select("id, full_name, email, role, specialization, class_level, badges_cpd, activity_years, enrolled_classes, account_status, status_note, created_at")
          .order("created_at", { ascending: false }),
        supabaseApi.client.from("resources").select("id", { count: "exact", head: true }),
        supabaseApi.client
          .from("webinar_courses")
          .select("slug, title, subtitle, presenter_name, scheduled_label, summary, is_published, created_at")
          .order("created_at", { ascending: true }),
        supabaseApi.client
          .from("webinar_course_lessons")
          .select("id, webinar_slug, lesson_title, lesson_description, video_url, video_source_type, video_storage_path, duration_minutes, sort_order, created_at")
          .order("webinar_slug", { ascending: true })
          .order("sort_order", { ascending: true }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (resourcesResult.error) throw resourcesResult.error;
      if (coursesResult.error) throw coursesResult.error;
      if (lessonsResult.error) throw lessonsResult.error;

      users = profilesResult.data || [];
      totalResources = resourcesResult.count || 0;
      courses = coursesResult.data || [];
      lessons = lessonsResult.data || [];

      renderStats();
      applyFilters();
      renderCoursesTable();

      if (selectedCourseSlug && courses.some(course => course.slug === selectedCourseSlug)) {
        selectCourse(selectedCourseSlug);
      } else if (courses[0]) {
        selectCourse(courses[0].slug);
      } else {
        resetLessonsState();
      }
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut actualiza dashboard-ul admin.",
        "danger"
      );
    } finally {
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.innerHTML = '<i class="fa-solid fa-rotate-right me-2"></i>Actualizeaza';
      }
    }
  }

  async function handlePromoteAdmin(event) {
    event.preventDefault();
    const email = document.querySelector("#adminPromoteEmail")?.value.trim().toLowerCase();

    if (!email) {
      supabaseApi.showMessage(promoteMessage, "Introdu emailul utilizatorului.", "warning");
      return;
    }

    try {
      promoteButton.disabled = true;
      promoteButton.textContent = "Se promoveaza...";
      supabaseApi.clearMessage(promoteMessage);

      const existingUser = users.find(user => normalize(user.email) === email);
      if (!existingUser) {
        throw new Error("Nu exista niciun cont in platforma cu acest email.");
      }

      const { data, error } = await supabaseApi.client
        .from("profiles")
        .update({
          role: "admin",
          account_status: "active",
          status_note: "",
          specialization: existingUser.specialization || "Administrare platforma",
        })
        .eq("email", email)
        .select("id, full_name, email, role, specialization, class_level, badges_cpd, activity_years, enrolled_classes, account_status, status_note, created_at")
        .single();

      if (error) throw error;

      users = users.map(user => (user.id === data.id ? data : user));
      renderStats();
      applyFilters();
      promoteForm.reset();
      supabaseApi.showMessage(promoteMessage, `Contul ${email} este acum admin.`, "success");
    } catch (error) {
      supabaseApi.showMessage(
        promoteMessage,
        error.message || "Nu am putut promova utilizatorul la admin.",
        "danger"
      );
    } finally {
      promoteButton.disabled = false;
      promoteButton.textContent = "Fa admin";
    }
  }

  function renderStats() {
    const activeUsers = users.filter(user => normalize(user.account_status || "active") === "active");
    const teacherCount = activeUsers.filter(user => normalize(user.role) === "profesor").length;
    const studentCount = activeUsers.filter(user => normalize(user.role) === "elev").length;

    setText("#adminTotalUsers", String(users.length));
    setText("#adminTotalStudents", String(studentCount));
    setText("#adminTotalTeachers", String(teacherCount));
    setText("#adminTotalResources", String(totalResources));
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
        user.account_status,
        user.status_note,
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
      .map(user => {
        const status = normalize(user.account_status || "active");
        const isBanned = status === "banned";
        const isDisabled = status === "disabled";
        return `
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
            <td>
              <span class="admin-status-badge admin-status-${status}">
                ${escapeHtml(getStatusLabel(status))}
              </span>
              ${user.status_note ? `<div class="small text-muted mt-1">${escapeHtml(user.status_note)}</div>` : ""}
            </td>
            <td>${escapeHtml(getUserDetail(user))}</td>
            <td>${escapeHtml(formatDate(user.created_at))}</td>
            <td class="text-end">
              <div class="d-flex gap-2 justify-content-end flex-wrap">
                <button class="btn btn-sm btn-outline-primary" type="button" data-action="edit-user" data-user-id="${user.id}">Editeaza</button>
                <button class="btn btn-sm ${isBanned ? "btn-outline-success" : "btn-outline-warning"}" type="button" data-action="toggle-ban" data-user-id="${user.id}" data-next-status="${isBanned ? "active" : "banned"}" data-note="${isBanned ? "" : "Ban din dashboard admin"}">
                  ${isBanned ? "Deblocheaza" : "Ban"}
                </button>
                <button class="btn btn-sm ${isDisabled ? "btn-outline-success" : "btn-outline-secondary"}" type="button" data-action="toggle-disable" data-user-id="${user.id}" data-next-status="${isDisabled ? "active" : "disabled"}" data-note="${isDisabled ? "" : "Cont dezactivat din dashboard admin"}">
                  ${isDisabled ? "Reactiveaza" : "Scoate"}
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function updateUserStatus(userId, nextStatus, note) {
    const user = users.find(entry => entry.id === userId);
    if (!user) return;

    try {
      const { data, error } = await supabaseApi.client
        .from("profiles")
        .update({
          account_status: nextStatus,
          status_note: nextStatus === "active" ? "" : note,
        })
        .eq("id", userId)
        .select("id, full_name, email, role, specialization, class_level, badges_cpd, activity_years, enrolled_classes, account_status, status_note, created_at")
        .single();

      if (error) throw error;

      users = users.map(entry => (entry.id === userId ? data : entry));
      renderStats();
      applyFilters();

      if (userId === currentAdminId && normalize(nextStatus) !== "active") {
        await supabaseApi.signOut();
        showAuthState("Ti-ai schimbat propriul status si ai iesit din zona de administrare.", "warning");
        return;
      }

      supabaseApi.showMessage(pageMessage, "Statusul utilizatorului a fost actualizat.", "success");
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut actualiza statusul utilizatorului.",
        "danger"
      );
    }
  }

  function openEditUserModal(userId) {
    const user = users.find(entry => entry.id === userId);
    if (!user) return;

    document.querySelector("#editAdminUserId").value = user.id;
    document.querySelector("#editAdminFullName").value = user.full_name || "";
    document.querySelector("#editAdminEmail").value = user.email || "";
    document.querySelector("#editAdminRole").value = normalize(user.role) || "elev";
    document.querySelector("#editAdminStatus").value = normalize(user.account_status || "active");
    document.querySelector("#editAdminClassLevel").value = user.class_level || "";
    document.querySelector("#editAdminSpecialization").value = user.specialization || "";
    document.querySelector("#editAdminStatusNote").value = user.status_note || "";
    document.querySelector("#editAdminBadges").value = Number(user.badges_cpd || 0);
    document.querySelector("#editAdminActivityYears").value = Number(user.activity_years || 0);
    updateRoleSpecificFields();
    editUserModal?.show();
  }

  async function handleUserSave(event) {
    event.preventDefault();

    const userId = document.querySelector("#editAdminUserId")?.value;
    const role = normalize(document.querySelector("#editAdminRole")?.value) || "elev";
    const accountStatus = normalize(document.querySelector("#editAdminStatus")?.value) || "active";
    const fullName = document.querySelector("#editAdminFullName")?.value.trim();
    const specializationInput = document.querySelector("#editAdminSpecialization")?.value.trim();
    const classLevelInput = document.querySelector("#editAdminClassLevel")?.value.trim();
    const statusNote = document.querySelector("#editAdminStatusNote")?.value.trim();
    const badgesInput = document.querySelector("#editAdminBadges")?.value;
    const activityYearsInput = document.querySelector("#editAdminActivityYears")?.value;

    if (!userId || !fullName) {
      supabaseApi.showMessage(pageMessage, "Numele utilizatorului este obligatoriu.", "warning");
      return;
    }

    const enrolledClasses = role === "elev" && classLevelInput
      ? classLevelInput.split(",").map(value => value.trim()).filter(Boolean)
      : [];

    const payload = {
      full_name: fullName,
      role,
      account_status: accountStatus,
      status_note: accountStatus === "active" ? "" : statusNote,
      specialization: role === "elev" ? "" : specializationInput || getDefaultSpecialization(role),
      class_level: role === "elev" ? classLevelInput || null : null,
      enrolled_classes: role === "elev" ? enrolledClasses : [],
      badges_cpd: Math.max(0, Number(badgesInput || 0)),
      activity_years: Math.max(0, Number(activityYearsInput || 0)),
    };

    try {
      saveAdminUserButton.disabled = true;
      saveAdminUserButton.textContent = "Se salveaza...";

      const { data, error } = await supabaseApi.client
        .from("profiles")
        .update(payload)
        .eq("id", userId)
        .select("id, full_name, email, role, specialization, class_level, badges_cpd, activity_years, enrolled_classes, account_status, status_note, created_at")
        .single();

      if (error) throw error;

      users = users.map(user => (user.id === userId ? data : user));
      applyFilters();
      renderStats();
      editUserModal?.hide();

      supabaseApi.showMessage(pageMessage, "Utilizatorul a fost actualizat.", "success");

      if (userId === currentAdminId && (role !== "admin" || accountStatus !== "active")) {
        await supabaseApi.signOut();
        showAuthState("Contul tau nu mai are acces admin activ. Intra din nou cu un admin valid.", "warning");
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

  function renderCoursesTable() {
    if (!coursesTableBody) return;

    if (!courses.length) {
      coursesTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">Nu exista cursuri create inca.</td>
        </tr>
      `;
      return;
    }

    coursesTableBody.innerHTML = courses
      .map(course => {
        const lessonCount = lessons.filter(lesson => lesson.webinar_slug === course.slug).length;
        return `
          <tr>
            <td>
              <div class="fw-semibold">${escapeHtml(course.title)}</div>
              <div class="small text-muted">${escapeHtml(course.slug)}</div>
            </td>
            <td>
              <div>${escapeHtml(course.scheduled_label || "Fara program")}</div>
              <div class="small text-muted">${escapeHtml(course.presenter_name || "Prezentator necompletat")}</div>
            </td>
            <td>${lessonCount}</td>
            <td>
              <span class="admin-status-badge ${course.is_published ? "admin-status-active" : "admin-status-disabled"}">
                ${course.is_published ? "Publicat" : "Ascuns"}
              </span>
            </td>
            <td class="text-end">
              <div class="d-flex gap-2 justify-content-end flex-wrap">
                <button class="btn btn-sm btn-outline-primary" type="button" data-course-action="select-course" data-course-slug="${course.slug}">Structura</button>
                <button class="btn btn-sm btn-outline-secondary" type="button" data-course-action="edit-course" data-course-slug="${course.slug}">Editeaza</button>
                <button class="btn btn-sm ${course.is_published ? "btn-outline-warning" : "btn-outline-success"}" type="button" data-course-action="toggle-publish" data-course-slug="${course.slug}" data-next-published="${course.is_published ? "false" : "true"}">
                  ${course.is_published ? "Ascunde" : "Publica"}
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function selectCourse(slug) {
    selectedCourseSlug = slug;
    const course = courses.find(entry => entry.slug === slug);
    if (!course) {
      resetLessonsState();
      return;
    }

    if (selectedCourseTitle) {
      selectedCourseTitle.textContent = `Lectiile cursului: ${course.title}`;
    }
    if (selectedCourseMeta) {
      selectedCourseMeta.textContent = course.summary || "Poti schimba ordinea lectiilor sau adauga video nou.";
    }
    if (addLessonButton) {
      addLessonButton.disabled = false;
    }

    renderLessonsTable(slug);
  }

  function renderLessonsTable(slug) {
    if (!lessonsTableBody) return;

    const courseLessons = lessons.filter(lesson => lesson.webinar_slug === slug);
    if (!courseLessons.length) {
      lessonsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">Nu exista lectii inca pentru acest curs.</td>
        </tr>
      `;
      return;
    }

    lessonsTableBody.innerHTML = courseLessons
      .map(lesson => `
        <tr>
          <td>${Number(lesson.sort_order || 0)}</td>
          <td>
            <div class="fw-semibold">${escapeHtml(lesson.lesson_title)}</div>
            <div class="small text-muted">${escapeHtml(lesson.lesson_description || "Fara descriere")}</div>
          </td>
          <td>${formatDuration(lesson.duration_minutes)}</td>
          <td>
            <div>${lesson.video_source_type === "file" ? "Fisier incarcat" : "Link extern"}</div>
            ${
              lesson.video_source_type === "file"
                ? `<div class="small text-muted">${escapeHtml(lesson.video_storage_path || "Stocat in bucket-ul webinar-videos")}</div>`
                : `<a href="${escapeAttribute(lesson.video_url)}" target="_blank" rel="noreferrer">Deschide video</a>`
            }
          </td>
          <td class="text-end">
            <div class="d-flex gap-2 justify-content-end flex-wrap">
              <button class="btn btn-sm btn-outline-secondary" type="button" data-lesson-action="edit-lesson" data-lesson-id="${lesson.id}">Editeaza</button>
              <button class="btn btn-sm btn-outline-danger" type="button" data-lesson-action="delete-lesson" data-lesson-id="${lesson.id}">Sterge</button>
            </div>
          </td>
        </tr>
      `)
      .join("");
  }

  function openCourseModal(slug) {
    const course = courses.find(entry => entry.slug === slug);
    document.querySelector("#editAdminCourseModalTitle").textContent = course ? "Editeaza curs" : "Adauga curs";
    document.querySelector("#editCourseSlug").value = course?.slug || "";
    document.querySelector("#editCourseSlug").disabled = Boolean(course);
    document.querySelector("#editCourseTitle").value = course?.title || "";
    document.querySelector("#editCourseSubtitle").value = course?.subtitle || "";
    document.querySelector("#editCoursePresenter").value = course?.presenter_name || "";
    document.querySelector("#editCourseSchedule").value = course?.scheduled_label || "";
    document.querySelector("#editCourseSummary").value = course?.summary || "";
    document.querySelector("#editCoursePublished").value = String(course?.is_published ?? true);
    courseModal?.show();
  }

  async function handleCourseSave(event) {
    event.preventDefault();

    const slug = normalizeSlug(document.querySelector("#editCourseSlug")?.value);
    const payload = {
      slug,
      title: document.querySelector("#editCourseTitle")?.value.trim(),
      subtitle: document.querySelector("#editCourseSubtitle")?.value.trim(),
      presenter_name: document.querySelector("#editCoursePresenter")?.value.trim(),
      scheduled_label: document.querySelector("#editCourseSchedule")?.value.trim(),
      summary: document.querySelector("#editCourseSummary")?.value.trim(),
      is_published: document.querySelector("#editCoursePublished")?.value === "true",
    };

    if (!payload.slug || !payload.title) {
      supabaseApi.showMessage(pageMessage, "Slugul si titlul cursului sunt obligatorii.", "warning");
      return;
    }

    try {
      saveCourseButton.disabled = true;
      saveCourseButton.textContent = "Se salveaza...";

      const { error } = await supabaseApi.client.from("webinar_courses").upsert(payload);
      if (error) throw error;

      await refreshDashboardData();
      selectedCourseSlug = payload.slug;
      selectCourse(payload.slug);
      courseModal?.hide();
      supabaseApi.showMessage(pageMessage, "Cursul a fost salvat.", "success");
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut salva cursul.",
        "danger"
      );
    } finally {
      saveCourseButton.disabled = false;
      saveCourseButton.textContent = "Salveaza cursul";
    }
  }

  async function toggleCoursePublish(slug, shouldPublish) {
    try {
      const { error } = await supabaseApi.client
        .from("webinar_courses")
        .update({ is_published: shouldPublish, updated_at: new Date().toISOString() })
        .eq("slug", slug);

      if (error) throw error;

      await refreshDashboardData();
      selectedCourseSlug = slug;
      selectCourse(slug);
      supabaseApi.showMessage(pageMessage, "Vizibilitatea cursului a fost actualizata.", "success");
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut schimba vizibilitatea cursului.",
        "danger"
      );
    }
  }

  function openLessonModal(lessonId) {
    const lesson = lessons.find(entry => entry.id === lessonId);
    const courseSlug = lesson?.webinar_slug || selectedCourseSlug;
    if (!courseSlug) return;

    document.querySelector("#editAdminLessonModalTitle").textContent = lesson ? "Editeaza lectie" : "Adauga lectie";
    document.querySelector("#editLessonId").value = lesson?.id || "";
    document.querySelector("#editLessonCourseSlug").value = courseSlug;
    document.querySelector("#editLessonStoragePath").value = lesson?.video_storage_path || "";
    document.querySelector("#editLessonTitle").value = lesson?.lesson_title || "";
    document.querySelector("#editLessonDescription").value = lesson?.lesson_description || "";
    document.querySelector("#editLessonSourceType").value = lesson?.video_source_type || "embed";
    document.querySelector("#editLessonUrl").value =
      lesson?.video_source_type === "file" ? "" : lesson?.video_url || "";
    document.querySelector("#editLessonFile").value = "";
    document.querySelector("#editLessonDuration").value = Number(lesson?.duration_minutes || 0);
    document.querySelector("#editLessonOrder").value = Number(
      lesson?.sort_order ||
      getNextLessonOrder(courseSlug)
    );
    updateLessonSourceFields();
    lessonModal?.show();
  }

  async function handleLessonSave(event) {
    event.preventDefault();

    const lessonId = document.querySelector("#editLessonId")?.value;
    const webinarSlug = document.querySelector("#editLessonCourseSlug")?.value;
    const sourceType = document.querySelector("#editLessonSourceType")?.value || "embed";
    const existingStoragePath = document.querySelector("#editLessonStoragePath")?.value || "";
    const lessonFile = document.querySelector("#editLessonFile")?.files?.[0] || null;
    const payload = {
      webinar_slug: webinarSlug,
      lesson_title: document.querySelector("#editLessonTitle")?.value.trim(),
      lesson_description: document.querySelector("#editLessonDescription")?.value.trim(),
      video_url: document.querySelector("#editLessonUrl")?.value.trim(),
      video_source_type: sourceType,
      video_storage_path: existingStoragePath || null,
      duration_minutes: Math.max(0, Number(document.querySelector("#editLessonDuration")?.value || 0)),
      sort_order: Math.max(1, Number(document.querySelector("#editLessonOrder")?.value || 1)),
    };

    if (!payload.webinar_slug || !payload.lesson_title) {
      supabaseApi.showMessage(pageMessage, "Completeaza cursul si titlul lectiei.", "warning");
      return;
    }

    try {
      saveLessonButton.disabled = true;
      saveLessonButton.textContent = "Se salveaza...";

      if (sourceType === "file") {
        if (lessonFile) {
          const uploadedVideo = await uploadLessonVideo(payload.webinar_slug, lessonFile);
          payload.video_url = uploadedVideo.path;
          payload.video_storage_path = uploadedVideo.path;

          if (existingStoragePath && existingStoragePath !== uploadedVideo.path) {
            await supabaseApi.client.storage.from("webinar-videos").remove([existingStoragePath]);
          }
        } else if (existingStoragePath) {
          payload.video_url = existingStoragePath;
          payload.video_storage_path = existingStoragePath;
        } else {
          throw new Error("Alege un fisier video pentru aceasta lectie.");
        }
      } else {
        if (!payload.video_url) {
          throw new Error("Completeaza linkul video pentru aceasta lectie.");
        }
        payload.video_storage_path = null;
      }

      const query = lessonId
        ? supabaseApi.client.from("webinar_course_lessons").update(payload).eq("id", lessonId)
        : supabaseApi.client.from("webinar_course_lessons").insert(payload);

      const { error } = await query;
      if (error) throw error;

      await refreshDashboardData();
      selectedCourseSlug = payload.webinar_slug;
      selectCourse(payload.webinar_slug);
      lessonModal?.hide();
      supabaseApi.showMessage(pageMessage, "Lectia a fost salvata.", "success");
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut salva lectia.",
        "danger"
      );
    } finally {
      saveLessonButton.disabled = false;
      saveLessonButton.textContent = "Salveaza lectia";
    }
  }

  async function deleteLesson(lessonId) {
    const confirmed = window.confirm("Sigur vrei sa stergi aceasta lectie?");
    if (!confirmed) return;

    try {
      const lesson = lessons.find(entry => entry.id === lessonId);
      if (lesson?.video_storage_path) {
        await supabaseApi.client.storage.from("webinar-videos").remove([lesson.video_storage_path]);
      }
      const { error } = await supabaseApi.client
        .from("webinar_course_lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;

      await refreshDashboardData();
      if (selectedCourseSlug) selectCourse(selectedCourseSlug);
      supabaseApi.showMessage(pageMessage, "Lectia a fost stearsa.", "success");
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut sterge lectia.",
        "danger"
      );
    }
  }

  function getNextLessonOrder(slug) {
    const courseLessons = lessons.filter(lesson => lesson.webinar_slug === slug);
    return courseLessons.length
      ? Math.max(...courseLessons.map(lesson => Number(lesson.sort_order || 0))) + 1
      : 1;
  }

  function resetLessonsState() {
    selectedCourseSlug = "";
    if (selectedCourseTitle) selectedCourseTitle.textContent = "Lectiile cursului";
    if (selectedCourseMeta) selectedCourseMeta.textContent = "Selecteaza un curs pentru a-i modifica structura.";
    if (addLessonButton) addLessonButton.disabled = true;
    if (lessonsTableBody) {
      lessonsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">Selecteaza un curs pentru a vedea lectiile.</td>
        </tr>
      `;
    }
  }

  function updateLessonSourceFields() {
    const sourceType = document.querySelector("#editLessonSourceType")?.value || "embed";
    const urlField = document.querySelector("#editLessonUrl");
    const fileGroup = document.querySelector("#editLessonFileGroup");

    if (urlField) {
      urlField.disabled = sourceType !== "embed";
      urlField.required = sourceType === "embed";
    }

    if (fileGroup) {
      fileGroup.classList.toggle("d-none", sourceType !== "file");
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

  function getUserDetail(user) {
    const role = normalize(user.role);
    if (role === "elev") {
      if (Array.isArray(user.enrolled_classes) && user.enrolled_classes.length) {
        return user.enrolled_classes.join(", ");
      }
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

  function getStatusLabel(status) {
    if (status === "banned") return "Banat";
    if (status === "disabled") return "Dezactivat";
    return "Activ";
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("ro-RO");
  }

  function formatDuration(minutes) {
    const value = Number(minutes || 0);
    if (!value) return "-";
    if (value < 60) return `${value} min`;
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }

  async function uploadLessonVideo(courseSlug, file) {
    const safeName = file.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/-+/g, "-");
    const path = `${courseSlug}/${Date.now()}-${safeName}`;

    const { error } = await supabaseApi.client.storage
      .from("webinar-videos")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "video/mp4",
      });

    if (error) throw error;

    return {
      path,
    };
  }

  function normalize(value) {
    return (value || "").toString().trim().toLowerCase();
  }

  function normalizeSlug(value) {
    return (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
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

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
});
