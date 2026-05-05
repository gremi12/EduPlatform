document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const loginMessage = document.querySelector("#loginMessage");
  const registerMessage = document.querySelector("#registerMessage");
  const registerRole = document.querySelector("#registerRole");
  const registerClassGroup = document.querySelector("#registerClassGroup");
  const registerClassLevel = document.querySelector("#registerClassLevel");
  const sessionPanel = document.querySelector("#sessionPanel");
  const sessionMessage = document.querySelector("#sessionMessage");
  const registerPanel = document.querySelector("#registerPanel");
  const loginPanel = document.querySelector("#loginPanel");
  const resetPanel = document.querySelector("#resetPanel");
  const showLoginButton = document.querySelector("#showLoginButton");
  const showRegisterButton = document.querySelector("#showRegisterButton");
  const backToLoginButton = document.querySelector("#backToLoginButton");
  const loginEmail = document.querySelector("#loginEmail");
  const resetEmail = document.querySelector("#resetEmail");
  const resetPasswordButton = document.querySelector("#resetPasswordButton");
  const resetForm = document.querySelector("#resetForm");
  const resetMessage = document.querySelector("#resetMessage");
  const passwordToggleButtons = document.querySelectorAll("[data-toggle-password]");

  const passwordRuleMessage =
    "Parola trebuie sa aiba minim 8 caractere, cel putin un numar si un simbol.";
  const resetPasswordRedirectUrl = new URL(
    "reset-password.html",
    window.location.href.split("#")[0]
  ).href;
  let hasActiveSession = false;

  syncViewWithRoute();
  window.addEventListener("hashchange", syncViewWithRoute);

  if (!supabaseApi?.isConfigured) {
    const configMessage =
      "Completeaza mai intai valorile din js/supabaseClient.js cu URL-ul si cheia publica din Supabase.";
    supabaseApi?.showMessage(registerMessage, configMessage, "warning");
    supabaseApi?.showMessage(loginMessage, configMessage, "warning");
    return;
  }

  toggleStudentClassField();
  registerRole?.addEventListener("change", toggleStudentClassField);
  initializePasswordToggles();

  showLoginButton?.addEventListener("click", () => {
    showLoginView();
    loginEmail?.focus();
  });

  showRegisterButton?.addEventListener("click", () => {
    showRegisterView();
  });

  backToLoginButton?.addEventListener("click", () => {
    showLoginView();
    loginEmail?.focus();
  });

  resetPasswordButton?.addEventListener("click", () => {
    supabaseApi.clearMessage(loginMessage);
    supabaseApi.clearMessage(resetMessage);
    if (resetEmail) {
      resetEmail.value = loginEmail?.value.trim() || "";
    }
    showResetView();
    resetEmail?.focus();
  });

  resetForm?.addEventListener("submit", async event => {
    event.preventDefault();
    supabaseApi.clearMessage(resetMessage);
    const email = resetEmail?.value.trim();

    if (!email) {
      supabaseApi.showMessage(
        resetMessage,
        "Introdu emailul contului pentru resetarea parolei.",
        "warning"
      );
      resetEmail?.focus();
      return;
    }

    try {
      const { error } = await supabaseApi.client.auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordRedirectUrl,
      });

      if (error) throw error;

      supabaseApi.showMessage(
        resetMessage,
        "Ti-am trimis emailul pentru resetarea parolei.",
        "success"
      );
      if (loginEmail) {
        loginEmail.value = email;
      }
    } catch (error) {
      supabaseApi.showMessage(
        resetMessage,
        error.message || "Nu am putut trimite emailul de resetare.",
        "danger"
      );
    }
  });

  try {
    const authState = await supabaseApi.requireSession({ redirectTo: null });
    if (authState?.user) {
      hasActiveSession = true;
      renderActiveSessionMessage(authState.profile);
    }
  } catch (error) {
    supabaseApi.showMessage(
      registerMessage,
      error.message || "Nu am putut verifica sesiunea curenta.",
      "danger"
    );
  }

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    supabaseApi.clearMessage(loginMessage);

    const email = loginEmail?.value.trim();
    const password = document.querySelector("#loginPassword")?.value;

    if (!isValidPassword(password)) {
      supabaseApi.showMessage(loginMessage, passwordRuleMessage, "warning");
      showLoginView();
      return;
    }

    try {
      const { error } = await supabaseApi.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const authState = await supabaseApi.requireSession({ redirectTo: null });
      window.location.href = supabaseApi.getDashboardPath(authState?.profile);
    } catch (error) {
      supabaseApi.showMessage(
        loginMessage,
        error.message || "Autentificarea a esuat.",
        "danger"
      );
      showLoginView();
    }
  });

  registerForm?.addEventListener("submit", async event => {
    event.preventDefault();
    supabaseApi.clearMessage(registerMessage);

    const fullName = document.querySelector("#registerName")?.value.trim();
    const email = document.querySelector("#registerEmail")?.value.trim();
    const password = document.querySelector("#registerPassword")?.value;
    const role = supabaseApi.normalizeRole(registerRole?.value);
    const classLevel = registerClassLevel?.value.trim() || "";
    const enrolledClasses = classLevel
      ? classLevel
          .split(",")
          .map(value => value.trim())
          .filter(Boolean)
      : [];

    if (!isValidPassword(password)) {
      supabaseApi.showMessage(registerMessage, passwordRuleMessage, "warning");
      return;
    }

    if (role === "elev" && !classLevel) {
      supabaseApi.showMessage(
        registerMessage,
        "Completeaza clasa pentru contul de elev.",
        "warning"
      );
      return;
    }

    try {
      const { data, error } = await supabaseApi.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            class_level: role === "elev" ? classLevel : null,
            enrolled_classes: role === "elev" ? enrolledClasses : [],
          },
        },
      });

      if (error) throw error;

      if (data.session?.user) {
        const authState = await supabaseApi.requireSession({ redirectTo: null });
        window.location.href = supabaseApi.getDashboardPath(authState?.profile);
        return;
      }

      supabaseApi.showMessage(
        registerMessage,
        "Cont creat. Verifica emailul pentru confirmare, apoi autentifica-te.",
        "success"
      );
      registerForm.reset();
      toggleStudentClassField();
      showLoginView();
      loginEmail?.focus();
    } catch (error) {
      supabaseApi.showMessage(
        registerMessage,
        error.message || "Inregistrarea a esuat.",
        "danger"
      );
    }
  });

  function renderActiveSessionMessage(profile) {
    const destination = supabaseApi.getDashboardPath(profile);
    sessionPanel?.classList.remove("d-none");
    registerPanel?.classList.add("d-none");
    loginPanel?.classList.add("d-none");
    resetPanel?.classList.add("d-none");

    sessionMessage.className = "alert alert-info mb-3";
    sessionMessage.innerHTML = `
      Esti deja autentificat.
      <div class="mt-2 d-flex flex-wrap gap-2">
        <a class="btn btn-sm btn-primary" href="${destination}">Continua in cont</a>
        <button id="logoutFromLoginPage" type="button" class="btn btn-sm btn-outline-secondary">Deconecteaza-ma</button>
      </div>
    `;

    const logoutButton = document.querySelector("#logoutFromLoginPage");
    logoutButton?.addEventListener("click", async () => {
      await supabaseApi.signOut();
      hasActiveSession = false;
      supabaseApi.clearMessage(sessionMessage);
      sessionPanel?.classList.add("d-none");
      syncViewWithRoute();
    });
  }

  function toggleStudentClassField() {
    const isStudent = supabaseApi.normalizeRole(registerRole?.value) === "elev";
    registerClassGroup?.classList.toggle("d-none", !isStudent);
    if (registerClassLevel) {
      registerClassLevel.required = isStudent;
      if (!isStudent) registerClassLevel.value = "";
    }
  }

  function initializePasswordToggles() {
    passwordToggleButtons.forEach(button => {
      button.addEventListener("click", () => {
        const inputId = button.dataset.togglePassword;
        const input = document.querySelector(`#${inputId}`);
        const icon = button.querySelector("i");
        if (!input) return;

        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";

        if (icon) {
          icon.className = showPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
        }

        button.setAttribute("aria-label", showPassword ? "Ascunde parola" : "Arata parola");
      });
    });
  }

  function isValidPassword(password) {
    const value = String(password || "");
    return (
      value.length >= 8 &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  }

  function showLoginView() {
    if (hasActiveSession) return;
    sessionPanel?.classList.add("d-none");
    registerPanel?.classList.add("d-none");
    resetPanel?.classList.add("d-none");
    loginPanel?.classList.remove("d-none");
    window.history.replaceState(null, "", "#login");
  }

  function showRegisterView() {
    if (hasActiveSession) return;
    sessionPanel?.classList.add("d-none");
    loginPanel?.classList.add("d-none");
    resetPanel?.classList.add("d-none");
    registerPanel?.classList.remove("d-none");
    window.history.replaceState(null, "", "#register");
  }

  function showResetView() {
    if (hasActiveSession) return;
    sessionPanel?.classList.add("d-none");
    registerPanel?.classList.add("d-none");
    loginPanel?.classList.add("d-none");
    resetPanel?.classList.remove("d-none");
    window.history.replaceState(null, "", "#reset");
  }

  function syncViewWithRoute() {
    if (hasActiveSession) {
      sessionPanel?.classList.remove("d-none");
      registerPanel?.classList.add("d-none");
      loginPanel?.classList.add("d-none");
      resetPanel?.classList.add("d-none");
      return;
    }

    if (window.location.hash === "#register") {
      showRegisterView();
      return;
    }

    if (window.location.hash === "#reset") {
      showResetView();
      return;
    }

    showLoginView();
  }
});
