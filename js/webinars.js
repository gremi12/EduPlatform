document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const pageMessage = document.querySelector("#webinarMessage");
  const formMessage = document.querySelector("#webinarRegisterFormMessage");
  const form = document.querySelector("#webinarRegisterForm");
  const submitButton = document.querySelector("#submitWebinarRegistrationButton");
  const modalElement = document.querySelector("#webinarRegisterModal");
  const modal = modalElement ? bootstrap.Modal.getOrCreateInstance(modalElement) : null;
  const webinarsGrid = document.querySelector("#webinarsGrid");
  const librarySection = document.querySelector("#webinarLibrarySection");
  const libraryMeta = document.querySelector("#webinarLibraryMeta");
  const libraryGrid = document.querySelector("#webinarLibraryGrid");
  const lessonModalElement = document.querySelector("#webinarLessonModal");
  const lessonModal = lessonModalElement ? bootstrap.Modal.getOrCreateInstance(lessonModalElement) : null;
  const lessonFrame = document.querySelector("#webinarLessonFrame");
  const lessonVideo = document.querySelector("#webinarLessonVideo");
  const lessonTitle = document.querySelector("#webinarLessonTitle");
  const lessonDescription = document.querySelector("#webinarLessonDescription");
  const lessonModalTitle = document.querySelector("#webinarLessonModalLabel");
  const lessonModalMeta = document.querySelector("#webinarLessonModalMeta");
  const commentsMeta = document.querySelector("#webinarCommentsMeta");
  const commentsMessage = document.querySelector("#webinarCommentsMessage");
  const commentsList = document.querySelector("#webinarCommentsList");
  const commentForm = document.querySelector("#webinarCommentForm");
  const commentButton = document.querySelector("#submitWebinarCommentButton");
  const commentInput = document.querySelector("#webinarCommentInput");

  let authState = null;
  let role = "";
  let registeredWebinars = new Map();
  let courses = [];
  let lessons = [];
  let currentLesson = null;

  if (!supabaseApi?.isConfigured) {
    supabaseApi?.showMessage(
      pageMessage,
      "Completeaza intai configurarea Supabase pentru a folosi inscrierea la webinarii.",
      "warning"
    );
    renderCatalogMessage("Completeaza configurarea Supabase pentru a vedea webinariile.");
    renderLibraryState("Biblioteca video devine disponibila dupa configurarea Supabase.");
    return;
  }

  try {
    authState = await supabaseApi.requireSession();
    role = supabaseApi.normalizeRole(authState.profile?.role);

    if (authState.needsLogin) {
      supabaseApi.showMessage(
        pageMessage,
        'Trebuie sa te autentifici inainte de a te inscrie la webinar. <a href="login.html#login" class="alert-link">Autentifica-te</a>.',
        "warning"
      );
      renderCatalogMessage("Autentifica-te pentru a vedea cursurile disponibile.");
      renderLibraryState("Autentifica-te pentru a vedea cursurile video disponibile.");
      return;
    }

    if (role !== "profesor") {
      supabaseApi.showMessage(
        pageMessage,
        "Inscrierea la webinarii si accesul la biblioteca video sunt disponibile doar pentru conturile de profesor.",
        "warning"
      );
    }

    prefillTeacherData(authState);
    await refreshPageState();
  } catch (error) {
    supabaseApi.showMessage(
      pageMessage,
      error.message || "Nu am putut incarca webinariile.",
      "danger"
    );
    renderCatalogMessage("Nu am putut incarca webinariile momentan.");
    renderLibraryState("Nu am putut incarca biblioteca video momentan.");
    return;
  }

  webinarsGrid?.addEventListener("click", event => {
    const registerButton = event.target.closest("[data-register-webinar]");
    if (!registerButton || registerButton.disabled) return;

    document.querySelector("#webinarSlug").value = registerButton.dataset.webinarSlug || "";
    document.querySelector("#webinarTitle").value = registerButton.dataset.webinarTitle || "";
    document.querySelector("#webinarRegisterModalLabel").textContent =
      `Inscriere: ${registerButton.dataset.webinarTitle || "Webinar"}`;
    document.querySelector("#webinarRegisterMeta").textContent =
      registerButton.dataset.webinarDate || "";
    supabaseApi.clearMessage(formMessage);
    modal?.show();
  });

  libraryGrid?.addEventListener("click", async event => {
    const lessonButton = event.target.closest("[data-lesson-id]");
    if (!lessonButton) return;

    const lessonId = lessonButton.dataset.lessonId || "";
    const lesson = lessons.find(entry => entry.id === lessonId);
    if (!lesson) return;

    await openLessonModal(lesson);
  });

  lessonModalElement?.addEventListener("hidden.bs.modal", () => {
    currentLesson = null;
    if (lessonFrame) {
      lessonFrame.src = "";
      lessonFrame.classList.add("d-none");
    }
    if (lessonVideo) {
      lessonVideo.pause();
      lessonVideo.removeAttribute("src");
      lessonVideo.load();
      lessonVideo.classList.add("d-none");
    }
    supabaseApi.clearMessage(commentsMessage);
    if (commentForm) commentForm.reset();
  });

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    supabaseApi.clearMessage(formMessage);

    const payload = {
      user_id: authState.user.id,
      webinar_slug: document.querySelector("#webinarSlug")?.value,
      webinar_title: document.querySelector("#webinarTitle")?.value,
      full_name: document.querySelector("#webinarFullName")?.value.trim(),
      email: document.querySelector("#webinarEmail")?.value.trim(),
      school_name: document.querySelector("#webinarSchool")?.value.trim(),
      message: document.querySelector("#webinarMessageInput")?.value.trim(),
    };

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Se trimite...";
      }

      const { error } = await supabaseApi.client
        .from("webinar_registrations")
        .insert(payload);

      if (error) throw error;

      supabaseApi.showMessage(
        formMessage,
        "Inscriere trimisa cu succes. Ai primit acces la sectiunea de curs pentru acest webinar.",
        "success"
      );

      form.reset();
      prefillTeacherData(authState);
      await refreshPageState();

      setTimeout(() => {
        modal?.hide();
        supabaseApi.clearMessage(formMessage);
      }, 1200);
    } catch (error) {
      supabaseApi.showMessage(
        formMessage,
        error.message || "Nu am putut trimite inscrierea la webinar.",
        "danger"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Trimite inscrierea";
      }
    }
  });

  commentForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentLesson) return;
    const comment = commentInput?.value.trim();
    if (!comment) {
      supabaseApi.showMessage(commentsMessage, "Scrie un comentariu inainte sa trimiti.", "warning");
      return;
    }

    try {
      if (commentButton) {
        commentButton.disabled = true;
        commentButton.textContent = "Se trimite...";
      }

      const { error } = await supabaseApi.client
        .from("webinar_lesson_comments")
        .insert({
          lesson_id: currentLesson.id,
          webinar_slug: currentLesson.webinar_slug,
          user_id: authState.user.id,
          comment,
        });

      if (error) throw error;

      commentForm.reset();
      await loadLessonComments(currentLesson.id);
    } catch (error) {
      supabaseApi.showMessage(
        commentsMessage,
        error.message || "Nu am putut trimite comentariul.",
        "danger"
      );
    } finally {
      if (commentButton) {
        commentButton.disabled = false;
        commentButton.textContent = "Trimite comentariul";
      }
    }
  });

  async function refreshPageState() {
    await loadCourseCatalog();
    if (role === "profesor") {
      await loadRegistrations();
      await loadLessonsForRegisteredCourses();
    } else {
      registeredWebinars = new Map();
      lessons = [];
    }
    renderCatalog();
    renderUdemyLibrary();
  }

  async function loadCourseCatalog() {
    const { data, error } = await supabaseApi.client
      .from("webinar_courses")
      .select("slug, title, subtitle, presenter_name, scheduled_label, summary, is_published")
      .eq("is_published", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    courses = data || [];
  }

  async function loadRegistrations() {
    const { data, error } = await supabaseApi.client
      .from("webinar_registrations")
      .select("webinar_slug, webinar_title")
      .eq("user_id", authState.user.id);

    if (error) throw error;

    registeredWebinars = new Map(
      (data || []).map(entry => [entry.webinar_slug, entry.webinar_title])
    );
  }

  async function loadLessonsForRegisteredCourses() {
    if (!registeredWebinars.size) {
      lessons = [];
      return;
    }

    const webinarSlugs = [...registeredWebinars.keys()];
    const { data, error } = await supabaseApi.client
      .from("webinar_course_lessons")
      .select("id, webinar_slug, lesson_title, lesson_description, video_url, video_source_type, video_storage_path, duration_minutes, sort_order")
      .in("webinar_slug", webinarSlugs)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    lessons = data || [];
  }

  function renderCatalog() {
    if (!courses.length) {
      renderCatalogMessage("Nu exista cursuri publicate momentan.");
      return;
    }

    webinarsGrid.innerHTML = courses
      .map(course => {
        const alreadyRegistered = registeredWebinars.has(course.slug);
        const canRegister = role === "profesor";
        const buttonLabel = !canRegister
          ? "Disponibil pentru profesori"
          : alreadyRegistered
            ? "Deja inscris"
            : "Inscrie-te";

        return `
          <div class="col-md-6 col-lg-4">
            <div class="info-card h-100 webinar-card">
              <i class="fa-solid ${escapeHtml(getCourseIcon(course.slug))}"></i>
              <h5>${escapeHtml(course.title)}</h5>
              <p>${escapeHtml(course.scheduled_label)}${course.presenter_name ? ` · ${escapeHtml(course.presenter_name)}` : ""}</p>
              <p class="small text-secondary">${escapeHtml(course.subtitle || course.summary || "Curs dedicat profesorilor inscrisi pe platforma.")}</p>
              <button
                type="button"
                class="btn btn-outline-primary"
                data-register-webinar="true"
                data-webinar-slug="${escapeHtml(course.slug)}"
                data-webinar-title="${escapeHtml(course.title)}"
                data-webinar-date="${escapeHtml(course.scheduled_label)}"
                ${!canRegister || alreadyRegistered ? "disabled" : ""}
              >
                ${buttonLabel}
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderUdemyLibrary() {
    if (!librarySection || !libraryGrid || !libraryMeta) return;
    librarySection.classList.remove("d-none");

    if (role !== "profesor") {
      renderLibraryState("Biblioteca video este rezervata profesorilor inscrisi la cursuri.");
      return;
    }

    if (!registeredWebinars.size) {
      renderLibraryState("Dupa ce te inscrii la un webinar, aici iti apar lectiile video si materialele de curs.");
      return;
    }

    const webinarSlugs = [...registeredWebinars.keys()];
    libraryMeta.textContent = `${registeredWebinars.size} cursuri active`;
    libraryGrid.innerHTML = webinarSlugs
      .map(slug => {
        const course = courses.find(entry => entry.slug === slug);
        const courseLessons = lessons.filter(lesson => lesson.webinar_slug === slug);
        const totalMinutes = courseLessons.reduce((sum, lesson) => sum + Number(lesson.duration_minutes || 0), 0);

        return `
          <div class="col-12">
            <article class="details-card webinar-course-shell">
              <div class="row g-4 align-items-start">
                <div class="col-lg-5">
                  <div class="webinar-course-hero">
                    <span class="community-member-badge mb-3 d-inline-flex">Curs activ</span>
                    <h3>${escapeHtml(course?.title || registeredWebinars.get(slug) || slug)}</h3>
                    <p class="webinar-course-summary">${escapeHtml(course?.summary || course?.subtitle || "Ai acces la lectiile video si le poti parcurge in ritmul tau.")}</p>
                    <div class="webinar-course-meta">
                      <span><i class="fa-solid fa-user me-2"></i>${escapeHtml(course?.presenter_name || "Trainer EduPlatform")}</span>
                      <span><i class="fa-solid fa-calendar-days me-2"></i>${escapeHtml(course?.scheduled_label || "Program flexibil")}</span>
                      <span><i class="fa-solid fa-play-circle me-2"></i>${courseLessons.length} lectii</span>
                      <span><i class="fa-solid fa-clock me-2"></i>${formatDuration(totalMinutes)}</span>
                    </div>
                  </div>
                </div>
                <div class="col-lg-7">
                  <div class="webinar-curriculum-card">
                    <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-3">
                      <div>
                        <h4 class="h5 mb-1">Curriculum curs</h4>
                        <p class="text-secondary mb-0">Deschide orice lectie din structura cursului.</p>
                      </div>
                      <span class="text-muted small">${courseLessons.length} lectii disponibile</span>
                    </div>
                    ${
                      courseLessons.length
                        ? `
                          <div class="webinar-lesson-list">
                            ${courseLessons
                              .map(
                                lesson => `
                                  <button type="button" class="webinar-lesson-item webinar-lesson-item-button" data-lesson-id="${lesson.id}">
                                    <div class="flex-grow-1 text-start">
                                      <strong>${escapeHtml(lesson.lesson_title)}</strong>
                                      <p class="mb-0 text-secondary">${escapeHtml(lesson.lesson_description || "Lectie video disponibila pentru acest curs.")}</p>
                                    </div>
                                    <div class="text-end">
                                      <small class="d-block text-muted mb-2">${escapeHtml(getLessonSourceLabel(lesson.video_source_type))}</small>
                                      <span class="community-member-badge">${escapeHtml(formatDuration(lesson.duration_minutes))}</span>
                                    </div>
                                  </button>
                                `
                              )
                              .join("")}
                          </div>
                        `
                        : `
                          <div class="info-card text-center text-muted mb-0">
                            Cursul este activ, dar lectiile video vor fi adaugate in curand.
                          </div>
                        `
                    }
                  </div>
                </div>
              </div>
            </article>
          </div>
        `;
      })
      .join("");
  }

  async function openLessonModal(lesson) {
    currentLesson = lesson;
    supabaseApi.clearMessage(commentsMessage);

    lessonModalTitle.textContent = getCourseTitle(lesson.webinar_slug);
    lessonModalMeta.textContent = `${formatDuration(lesson.duration_minutes)} · ${getLessonSourceLabel(lesson.video_source_type)}`;
    lessonTitle.textContent = lesson.lesson_title || "Lectie";
    lessonDescription.textContent = lesson.lesson_description || "";
    document.querySelector("#webinarCommentLessonId").value = lesson.id;
    document.querySelector("#webinarCommentSlug").value = lesson.webinar_slug;

    await renderLessonPlayer(lesson);
    await loadLessonComments(lesson.id);
    lessonModal?.show();
  }

  async function renderLessonPlayer(lesson) {
    if (!lessonFrame || !lessonVideo) return;

    lessonFrame.classList.add("d-none");
    lessonVideo.classList.add("d-none");
    lessonFrame.src = "";
    lessonVideo.pause();
    lessonVideo.removeAttribute("src");
    lessonVideo.load();

    let sourceUrl = lesson.video_url || "";
    if (lesson.video_source_type === "file" && lesson.video_storage_path) {
      sourceUrl = await createSignedVideoUrl(lesson.video_storage_path);
    }

    if (lesson.video_source_type === "file") {
      lessonVideo.src = sourceUrl;
      lessonVideo.classList.remove("d-none");
      return;
    }

    lessonFrame.src = toEmbedUrl(sourceUrl);
    lessonFrame.classList.remove("d-none");
  }

  async function loadLessonComments(lessonId) {
    if (!commentsList || !commentsMeta) return;

    const { data, error } = await supabaseApi.client.rpc("get_webinar_lesson_comments", {
      p_lesson_id: lessonId,
    });

    if (error) {
      commentsMeta.textContent = "0 comentarii";
      commentsList.innerHTML = '<div class="text-muted">Nu am putut incarca comentariile.</div>';
      return;
    }

    const comments = data || [];
    commentsMeta.textContent = `${comments.length} comentarii`;

    if (!comments.length) {
      commentsList.innerHTML = '<div class="text-muted">Nu exista comentarii inca. Fii primul care lasa o intrebare.</div>';
      return;
    }

    commentsList.innerHTML = comments
      .map(comment => `
        <article class="community-chat-message ${comment.user_id === authState.user.id ? "community-chat-message-own" : ""}">
          <div class="community-chat-message-head">
            <div>
              <strong>${escapeHtml(comment.full_name || "Membru EduPlatform")}</strong>
              <small>${escapeHtml(getRoleLabel(comment.role))} · ${escapeHtml(formatDateTime(comment.created_at))}</small>
            </div>
          </div>
          <p class="mb-0">${escapeHtml(comment.comment)}</p>
        </article>
      `)
      .join("");
  }

  function prefillTeacherData(currentAuthState) {
    const fullNameInput = document.querySelector("#webinarFullName");
    const emailInput = document.querySelector("#webinarEmail");
    const roleInput = document.querySelector("#webinarRole");

    if (fullNameInput) {
      fullNameInput.value = supabaseApi.getDisplayName(currentAuthState.user, currentAuthState.profile);
    }
    if (emailInput) {
      emailInput.value = currentAuthState.user.email || "";
    }
    if (roleInput) {
      roleInput.value = "Profesor";
    }
  }

  function getCourseTitle(slug) {
    return courses.find(course => course.slug === slug)?.title || registeredWebinars.get(slug) || slug;
  }

  function renderCatalogMessage(message) {
    if (!webinarsGrid) return;
    webinarsGrid.innerHTML = `
      <div class="col-12">
        <div class="info-card text-center text-muted">
          ${escapeHtml(message)}
        </div>
      </div>
    `;
  }

  function renderLibraryState(message) {
    if (!librarySection || !libraryGrid || !libraryMeta) return;
    librarySection.classList.remove("d-none");
    libraryMeta.textContent = "0 cursuri active";
    libraryGrid.innerHTML = `
      <div class="col-12">
        <div class="info-card text-center text-muted">
          ${escapeHtml(message)}
        </div>
      </div>
    `;
  }

  async function createSignedVideoUrl(path) {
    const { data, error } = await supabaseApi.client.storage
      .from("webinar-videos")
      .createSignedUrl(path, 60 * 60 * 6);

    if (error) throw error;
    return data?.signedUrl || "";
  }

  function getCourseIcon(slug) {
    if (slug.includes("strategii")) return "fa-calendar-days";
    if (slug.includes("instrumente")) return "fa-video";
    if (slug.includes("evaluare")) return "fa-chalkboard-user";
    return "fa-graduation-cap";
  }

  function getLessonSourceLabel(type) {
    return type === "file" ? "Video curs" : "Video extern";
  }

  function getRoleLabel(roleValue) {
    const normalized = supabaseApi.normalizeRole(roleValue);
    if (normalized === "admin") return "Admin";
    if (normalized === "moderator") return "Moderator";
    if (normalized === "organizator") return "Organizator";
    if (normalized === "elev") return "Elev";
    return "Profesor";
  }

  function toEmbedUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtube.com") && parsed.pathname === "/watch") {
        return `https://www.youtube.com/embed/${parsed.searchParams.get("v") || ""}`;
      }
      if (parsed.hostname === "youtu.be") {
        return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
      }
      return url;
    } catch (error) {
      return url;
    }
  }

  function formatDuration(minutes) {
    const value = Number(minutes || 0);
    if (!value) return "Durata flexibila";
    if (value < 60) return `${value} min`;
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return `${date.toLocaleDateString("ro-RO")} ${date.toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
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
