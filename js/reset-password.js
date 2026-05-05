document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const form = document.querySelector("#resetPasswordUpdateForm");
  const message = document.querySelector("#resetPasswordMessage");
  const newPasswordInput = document.querySelector("#newPassword");
  const confirmPasswordInput = document.querySelector("#confirmPassword");
  const passwordToggleButtons = document.querySelectorAll("[data-toggle-password]");
  const loginRedirectUrl = "login.html#login";
  const passwordRuleMessage =
    "Parola trebuie sa aiba minim 8 caractere, cel putin un numar si un simbol.";

  initializePasswordToggles();

  if (!supabaseApi?.isConfigured) {
    supabaseApi?.showMessage(
      message,
      "Completeaza mai intai valorile din js/supabaseClient.js cu URL-ul si cheia publica din Supabase.",
      "warning"
    );
    form?.querySelector("button[type='submit']")?.setAttribute("disabled", "disabled");
    return;
  }

  const recoverySession = await waitForRecoverySession();

  if (!recoverySession?.user) {
    supabaseApi.showMessage(
      message,
      "Linkul de resetare este invalid sau a expirat. Cere un email nou de resetare.",
      "warning"
    );
    form?.querySelector("button[type='submit']")?.setAttribute("disabled", "disabled");
    return;
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    supabaseApi.clearMessage(message);

    const newPassword = newPasswordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";

    if (!isValidPassword(newPassword)) {
      supabaseApi.showMessage(message, passwordRuleMessage, "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      supabaseApi.showMessage(
        message,
        "Confirmarea parolei nu se potriveste cu parola noua.",
        "warning"
      );
      return;
    }

    try {
      const { error } = await supabaseApi.client.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      supabaseApi.showMessage(
        message,
        "Parola a fost schimbata cu succes. Te redirectionam catre autentificare.",
        "success"
      );

      await supabaseApi.signOut();
      window.setTimeout(() => {
        window.location.href = loginRedirectUrl;
      }, 1200);
    } catch (error) {
      supabaseApi.showMessage(
        message,
        error.message || "Nu am putut schimba parola.",
        "danger"
      );
    }
  });

  async function waitForRecoverySession() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const session = await supabaseApi.getSession();
      if (session?.user) return session;
      await delay(250);
    }

    return null;
  }

  function delay(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
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
    return value.length >= 8 && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
  }
});
