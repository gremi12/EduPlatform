document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const loginMessage = document.querySelector("#loginMessage");
  const registerMessage = document.querySelector("#registerMessage");
  const registerRole = document.querySelector("#registerRole");
  const registerClassGroup = document.querySelector("#registerClassGroup");
  const registerClassLevel = document.querySelector("#registerClassLevel");
  const registerPanel = document.querySelector("#registerPanel");
  const loginPanel = document.querySelector("#loginPanel");
  const showLoginButton = document.querySelector("#showLoginButton");
  const showRegisterButton = document.querySelector("#showRegisterButton");
  const loginEmail = document.querySelector("#loginEmail");
  const resetPasswordButton = document.querySelector("#resetPasswordButton");
  const passwordToggleButtons = document.querySelectorAll("[data-toggle-password]");

  const passwordRuleMessage =
    "Parola trebuie sa aiba minim 8 caractere, cel putin un numar si un simbol.";

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

  resetPasswordButton?.addEventListener("click", async () => {
    supabaseApi.clearMessage(loginMessage);
    const email = loginEmail?.value.trim();

    if (!email) {
      supabaseApi.showMessage(
        loginMessage,
        "Introdu emailul si apoi apasa pe resetare parola.",
        "warning"
      );
      showLoginView();
      loginEmail?.focus();
      return;
    }

    try {
      const { error } = await supabaseApi.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.href.split("#")[0]}#login`,
      });

      if (error) throw error;

      supabaseApi.showMessage(
        loginMessage,
        "Ti-am trimis emailul pentru resetarea parolei.",
        "success"
      );
      showLoginView();
    } catch (error) {
      supabaseApi.showMessage(
        loginMessage,
        error.message || "Nu am putut trimite emailul de resetare.",
        "danger"
      );
      showLoginView();
    }
  });

  try {
    const authState = await supabaseApi.requireSession({ redirectTo: null });
    if (authState?.user) {
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
    registerMessage.className = "alert alert-info mb-3";
    registerMessage.innerHTML = `
      Esti deja autentificat.
      <div class="mt-2 d-flex flex-wrap gap-2">
        <a class="btn btn-sm btn-primary" href="${destination}">Continua in cont</a>
        <button id="logoutFromLoginPage" type="button" class="btn btn-sm btn-outline-secondary">Deconecteaza-ma</button>
      </div>
    `;

    const logoutButton = document.querySelector("#logoutFromLoginPage");
    logoutButton?.addEventListener("click", async () => {
      await supabaseApi.signOut();
      supabaseApi.clearMessage(registerMessage);
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
    registerPanel?.classList.add("d-none");
    loginPanel?.classList.remove("d-none");
    window.history.replaceState(null, "", "#login");
  }

  function showRegisterView() {
    loginPanel?.classList.add("d-none");
    registerPanel?.classList.remove("d-none");
    window.history.replaceState(null, "", "#register");
  }

  function syncViewWithRoute() {
    if (window.location.hash === "#register") {
      showRegisterView();
      return;
    }

    showLoginView();
  }
});
