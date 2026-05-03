document.addEventListener("DOMContentLoaded", () => {
  const search = document.querySelector("#resourceSearch");
  const category = document.querySelector("#categoryFilter");
  const reset = document.querySelector("#resetFilters");
  const items = document.querySelectorAll(".resource-item");
  const categoryCards = document.querySelectorAll("[data-filter-card]");

  initializeNavbarSessionState();

  function normalize(text) {
    return (text || "").toLowerCase().trim();
  }

  function filterResources() {
    if (!items.length) return;
    const q = normalize(search?.value);
    const selected = normalize(category?.value);

    items.forEach(item => {
      const text = normalize(item.innerText);
      const cat = normalize(item.dataset.category);
      const matchesSearch = !q || text.includes(q);
      const matchesCategory = !selected || cat === selected;
      item.style.display = matchesSearch && matchesCategory ? "" : "none";
    });
  }

  if (search) search.addEventListener("input", filterResources);
  if (category) category.addEventListener("change", filterResources);
  if (reset) {
    reset.addEventListener("click", () => {
      if (search) search.value = "";
      if (category) category.value = "";
      filterResources();
    });
  }

  categoryCards.forEach(card => {
    card.addEventListener("click", () => {
      if (category) category.value = card.dataset.filterCard;
      filterResources();
      document.querySelector("#resourcesGrid")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  function initializeNavbarSessionState() {
    const navbarList = document.querySelector(".navbar-nav");
    if (!navbarList) return;

    const session = readSupabaseSession();
    const user = session?.user;
    if (!user) return;

    const authItem = Array.from(navbarList.querySelectorAll("a")).find(
      link => link.getAttribute("href") === "login.html"
    )?.closest("li");
    const registerItem = Array.from(navbarList.querySelectorAll("a")).find(
      link => link.getAttribute("href") === "login.html#register"
    )?.closest("li");

    authItem?.remove();
    registerItem?.remove();

    const displayName = getDisplayName(user);
    const profileItem = document.createElement("li");
    profileItem.className = "nav-item dropdown";
    profileItem.innerHTML = `
      <a class="btn btn-outline-light px-4 dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="fa-solid fa-user me-2"></i>${escapeHtml(displayName)}
      </a>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item" href="profile.html">Profilul meu</a></li>
        <li><a class="dropdown-item" href="teachers-dashboard.html">Dashboard profesor</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item" type="button" id="logoutNavButton">Deconectare</button></li>
      </ul>
    `;

    navbarList.appendChild(profileItem);

    document.querySelector("#logoutNavButton")?.addEventListener("click", async () => {
      await signOutEverywhere();
      window.location.href = "login.html";
    });
  }

  function readSupabaseSession() {
    try {
      const keys = Object.keys(window.localStorage).filter(key =>
        key.includes("-auth-token")
      );

      for (const key of keys) {
        const rawValue = window.localStorage.getItem(key);
        if (!rawValue) continue;
        const parsed = JSON.parse(rawValue);
        if (parsed?.user) return parsed;
      }
    } catch (error) {
      console.error("Nu am putut citi sesiunea Supabase din localStorage.", error);
    }

    return null;
  }

  function getDisplayName(user) {
    return (
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "Contul meu"
    );
  }

  async function signOutEverywhere() {
    if (window.eduPlatformSupabase?.signOut) {
      try {
        await window.eduPlatformSupabase.signOut();
      } catch (error) {
        console.error("Sign out Supabase a eșuat, curăț local sesiunea.", error);
      }
    }

    Object.keys(window.localStorage)
      .filter(key => key.includes("-auth-token"))
      .forEach(key => window.localStorage.removeItem(key));
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
