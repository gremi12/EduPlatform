document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const loginMessage = document.querySelector("#loginMessage");
  const registerMessage = document.querySelector("#registerMessage");

  if (!supabaseApi?.isConfigured) {
    const configMessage =
      "Completează mai întâi valorile din js/supabaseClient.js cu URL-ul și cheia publică din Supabase.";
    supabaseApi?.showMessage(loginMessage, configMessage, "warning");
    supabaseApi?.showMessage(registerMessage, configMessage, "warning");
    return;
  }

  try {
    const authState = await supabaseApi.requireSession({ redirectTo: null });
    if (authState?.user) {
      renderActiveSessionMessage(authState.profile);
    }
  } catch (error) {
    supabaseApi.showMessage(
      loginMessage,
      error.message || "Nu am putut verifica sesiunea curentă.",
      "danger"
    );
  }

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    supabaseApi.clearMessage(loginMessage);

    const email = document.querySelector("#loginEmail")?.value.trim();
    const password = document.querySelector("#loginPassword")?.value;

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
        error.message || "Autentificarea a eșuat.",
        "danger"
      );
    }
  });

  registerForm?.addEventListener("submit", async event => {
    event.preventDefault();
    supabaseApi.clearMessage(registerMessage);

    const fullName = document.querySelector("#registerName")?.value.trim();
    const email = document.querySelector("#registerEmail")?.value.trim();
    const password = document.querySelector("#registerPassword")?.value;
    const role = supabaseApi.normalizeRole(
      document.querySelector("#registerRole")?.value
    );

    try {
      const { data, error } = await supabaseApi.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
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
        "Cont creat. Verifică emailul pentru confirmare, apoi autentifică-te.",
        "success"
      );
      registerForm.reset();
    } catch (error) {
      supabaseApi.showMessage(
        registerMessage,
        error.message || "Înregistrarea a eșuat.",
        "danger"
      );
    }
  });

  function renderActiveSessionMessage(profile) {
    const destination = supabaseApi.getDashboardPath(profile);
    loginMessage.className = "alert alert-info mb-3";
    loginMessage.innerHTML = `
      Ești deja autentificat.
      <div class="mt-2 d-flex flex-wrap gap-2">
        <a class="btn btn-sm btn-primary" href="${destination}">Continuă în cont</a>
        <button id="logoutFromLoginPage" type="button" class="btn btn-sm btn-outline-secondary">Deconectează-mă</button>
      </div>
    `;

    const logoutButton = document.querySelector("#logoutFromLoginPage");
    logoutButton?.addEventListener("click", async () => {
      await supabaseApi.signOut();
      supabaseApi.clearMessage(loginMessage);
    });
  }
});
