document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const pageMessage = document.querySelector("#webinarMessage");
  const formMessage = document.querySelector("#webinarRegisterFormMessage");
  const registerButtons = document.querySelectorAll(".webinar-register-button");
  const form = document.querySelector("#webinarRegisterForm");
  const submitButton = document.querySelector("#submitWebinarRegistrationButton");
  const modalElement = document.querySelector("#webinarRegisterModal");
  const modal = modalElement ? bootstrap.Modal.getOrCreateInstance(modalElement) : null;
  let authState = null;

  if (!supabaseApi?.isConfigured) {
    supabaseApi?.showMessage(
      pageMessage,
      "Completeaza intai configurarea Supabase pentru a folosi inscrierea la webinarii.",
      "warning"
    );
    disableRegistrationButtons();
    return;
  }

  try {
    authState = await supabaseApi.requireSession();

    if (authState.needsLogin) {
      supabaseApi.showMessage(
        pageMessage,
        'Trebuie sa te autentifici inainte de a te inscrie la webinar. <a href="login.html#login" class="alert-link">Autentifica-te</a>.',
        "warning"
      );
      disableRegistrationButtons();
      return;
    }

    const role = supabaseApi.normalizeRole(authState.profile?.role);
    if (role !== "profesor") {
      supabaseApi.showMessage(
        pageMessage,
        "Inscrierea la webinarii este disponibila doar pentru conturile de profesor.",
        "warning"
      );
      disableRegistrationButtons();
      return;
    }

    prefillTeacherData(authState);
  } catch (error) {
    supabaseApi.showMessage(
      pageMessage,
      error.message || "Nu am putut incarca formularul de inscriere la webinarii.",
      "danger"
    );
    disableRegistrationButtons();
    return;
  }

  registerButtons.forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector("#webinarSlug").value = button.dataset.webinarSlug || "";
      document.querySelector("#webinarTitle").value = button.dataset.webinarTitle || "";
      document.querySelector("#webinarRegisterModalLabel").textContent =
        `Inscriere: ${button.dataset.webinarTitle || "Webinar"}`;
      document.querySelector("#webinarRegisterMeta").textContent =
        button.dataset.webinarDate || "";
      supabaseApi.clearMessage(formMessage);
      modal?.show();
    });
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
        "Inscriere trimisa cu succes. Te vom contacta pe email.",
        "success"
      );

      form.reset();
      prefillTeacherData(authState);

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

  function prefillTeacherData(currentAuthState) {
    document.querySelector("#webinarFullName").value =
      supabaseApi.getDisplayName(currentAuthState.user, currentAuthState.profile);
    document.querySelector("#webinarEmail").value = currentAuthState.user.email || "";
    document.querySelector("#webinarRole").value = "Profesor";
  }

  function disableRegistrationButtons() {
    registerButtons.forEach(button => {
      button.disabled = true;
      button.classList.add("disabled");
    });
  }
});
