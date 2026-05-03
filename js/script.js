document.addEventListener("DOMContentLoaded", () => {
  const search = document.querySelector("#resourceSearch");
  const category = document.querySelector("#categoryFilter");
  const reset = document.querySelector("#resetFilters");
  const items = document.querySelectorAll(".resource-item");
  const categoryCards = document.querySelectorAll("[data-filter-card]");
  const homeSearchSection = document.querySelector(".home-search");
  const session = readSupabaseSession();
  const user = session?.user || null;

  initializeNavbarSessionState(user);
  initializeFooterSessionState(user);
  initializeGuestVisibility(user);
  normalizeAuthEntryLinks();

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

  function initializeNavbarSessionState(user) {
    const navbarList = document.querySelector(".navbar-nav");
    if (!navbarList) return;

    const restrictedHrefs = ["resources.html", "webinars.html", "community.html", "profile.html"];

    restrictedHrefs.forEach(href => {
      const item = Array.from(navbarList.querySelectorAll("a")).find(
        link => link.getAttribute("href") === href
      )?.closest("li");

      if (!user) {
        item?.remove();
      }
    });

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

  function initializeFooterSessionState(user) {
    const footer = document.querySelector(".footer");
    if (!footer) return;

    const platformSection = findFooterSection("Platformă");
    const featuresSection = findFooterSection("Funcții");
    const supportSection = findFooterSection("Suport");

    featuresSection?.remove();

    if (!platformSection) return;

    if (!user) {
      setFooterLinks(platformSection, [
        { href: "index.html", label: "Acasă" },
        { href: "contact.html", label: "Contact" },
      ]);

      if (supportSection) {
        setFooterLinks(supportSection, [
          { href: "contact.html", label: "Contact" },
          { href: "contact.html#gdpr", label: "GDPR" },
          { href: "contact.html#terms", label: "Termeni" },
        ]);
      }
      return;
    }

    setFooterLinks(platformSection, [
      { href: "resources.html", label: "Resurse" },
      { href: "webinars.html", label: "Webinarii" },
      { href: "community.html", label: "Comunități" },
      { href: "profile.html", label: "Profil" },
    ]);

    if (supportSection) {
      setFooterLinks(supportSection, [
        { href: "contact.html", label: "Contact" },
        { href: "contact.html#gdpr", label: "GDPR" },
        { href: "contact.html#terms", label: "Termeni" },
      ]);
    }
  }

  function initializeGuestVisibility(user) {
    if (user) return;
    homeSearchSection?.remove();
  }

  function normalizeAuthEntryLinks() {
    document.querySelectorAll('a[href="login.html"]').forEach(link => {
      link.setAttribute("href", "login.html#login");
    });

    document.querySelectorAll('a[href="login.html#register"]').forEach(link => {
      link.setAttribute("href", "login.html#register");
    });
  }

  function findFooterSection(title) {
    const headings = Array.from(document.querySelectorAll(".footer h6"));
    return headings.find(heading => heading.textContent.trim() === title)?.parentElement || null;
  }

  function setFooterLinks(section, links) {
    if (!section) return;
    const heading = section.querySelector("h6");
    section.querySelectorAll("a").forEach(link => link.remove());
    links.forEach(linkData => {
      const link = document.createElement("a");
      link.href = linkData.href;
      link.textContent = linkData.label;
      section.appendChild(link);
    });
    if (heading) {
      section.prepend(heading);
    }
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
