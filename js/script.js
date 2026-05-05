document.addEventListener("DOMContentLoaded", () => {
  const search = document.querySelector("#resourceSearch");
  const category = document.querySelector("#categoryFilter");
  const classFilter = document.querySelector("#classFilter");
  const reset = document.querySelector("#resetFilters");
  const items = document.querySelectorAll(".resource-item");
  const categoryCards = document.querySelectorAll("[data-filter-card]");
  const resourceClassSelects = document.querySelectorAll(".resource-class-select");
  const resourceOpenButtons = document.querySelectorAll(".resource-open-button");
  const homeSearchSection = document.querySelector(".home-search");
  const guestRestrictedHeroLinks = document.querySelectorAll(
    '.hero-section a[href="resources.html"], .hero-section a[href="/resources"], .hero-section a[href="webinars.html"], .hero-section a[href="/webinars"]'
  );
  const session = readSupabaseSession();
  const user = session?.user || null;
  const role = normalizeRole(user?.user_metadata?.role);

  document.body.classList.toggle("is-authenticated", Boolean(user));

  initializeNavbarSessionState(user, role);
  initializeFooterSessionState(user);
  initializeGuestVisibility(user);
  normalizeAuthEntryLinks();

  if (search) search.addEventListener("input", filterResources);
  if (category) category.addEventListener("change", filterResources);
  if (classFilter) classFilter.addEventListener("change", filterResources);
  if (reset) {
    reset.addEventListener("click", () => {
      if (search) search.value = "";
      if (category) category.value = "";
      if (classFilter) classFilter.value = "";
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

  resourceClassSelects.forEach(select => {
    select.addEventListener("change", () => {
      const resourceItem = select.closest(".resource-item");
      const classLabel = resourceItem?.querySelector("[data-resource-class-label]");
      const selectedClass = select.options[select.selectedIndex]?.textContent?.trim() || "";

      if (resourceItem) {
        resourceItem.dataset.classLevel = normalize(selectedClass);
      }

      if (classLabel) {
        classLabel.textContent = selectedClass;
      }

      filterResources();
    });
  });

  items.forEach(initializeResourceCardSummary);
  resourceOpenButtons.forEach(button => {
    button.addEventListener("click", () => {
      const resourceItem = button.closest(".resource-item");
      if (!resourceItem) return;
      const summary = getResourceSummary(resourceItem);
      summary.installs += 1;
      saveResourceSummary(resourceItem, summary);
      renderResourceSummary(resourceItem, summary);
    });
  });

  function normalize(text) {
    return (text || "").toLowerCase().trim();
  }

  function normalizeRole(value) {
    return (value || "").toString().trim().toLowerCase();
  }

  function filterResources() {
    if (!items.length) return;

    const query = normalize(search?.value);
    const selectedCategory = normalize(category?.value);
    const selectedClass = normalize(classFilter?.value);

    items.forEach(item => {
      const text = normalize(item.innerText);
      const itemCategory = normalize(item.dataset.category);
      const itemClassLevel = normalize(item.dataset.classLevel);
      const matchesSearch = !query || text.includes(query);
      const matchesCategory = !selectedCategory || itemCategory === selectedCategory;
      const matchesClass = !selectedClass || itemClassLevel === selectedClass;
      item.style.display = matchesSearch && matchesCategory && matchesClass ? "" : "none";
    });
  }

  function initializeResourceCardSummary(resourceItem) {
    renderResourceSummary(resourceItem, getResourceSummary(resourceItem));

    resourceItem.querySelectorAll(".resource-card-star").forEach(button => {
      button.addEventListener("click", () => {
        const rating = Number(button.dataset.resourceRate || 0);
        const currentSummary = getResourceSummary(resourceItem);
        const nextSummary = {
          ...currentSummary,
          rating,
        };
        saveResourceSummary(resourceItem, nextSummary);
        renderResourceSummary(resourceItem, nextSummary);
      });
    });
  }

  function renderResourceSummary(resourceItem, summary) {
    const ratingDisplay = resourceItem.querySelector("[data-resource-rating-display]");
    const installDisplay = resourceItem.querySelector("[data-resource-install-display]");
    const language = window.eduPlatformI18n?.getLanguage?.() || "ro";
    const ratingLabel = language === "ru" ? "звезды" : "stele";
    const installLabel = language === "ru" ? "установки" : "instalari";

    if (ratingDisplay) {
      ratingDisplay.innerHTML = `<i class="fa-solid fa-star"></i> ${summary.rating} ${ratingLabel}`;
    }

    if (installDisplay) {
      installDisplay.innerHTML = `<i class="fa-solid fa-download"></i> ${summary.installs} ${installLabel}`;
    }

    resourceItem.querySelectorAll(".resource-card-star").forEach(button => {
      const value = Number(button.dataset.resourceRate || 0);
      button.classList.toggle("is-active", value <= summary.rating);
    });
  }

  function getResourceSummary(resourceItem) {
    const slug = resourceItem.dataset.resourceSlug;
    const defaultSummary = { rating: 0, installs: 0 };
    if (!slug) return defaultSummary;

    try {
      const rawValue = window.localStorage.getItem(`eduplatform-resource-card:${slug}`);
      if (!rawValue) return defaultSummary;
      const parsed = JSON.parse(rawValue);
      return {
        rating: Number(parsed?.rating || 0),
        installs: Number(parsed?.installs || 0),
      };
    } catch (error) {
      console.error("Nu am putut citi sumarul resursei din localStorage.", error);
      return defaultSummary;
    }
  }

  function saveResourceSummary(resourceItem, summary) {
    const slug = resourceItem.dataset.resourceSlug;
    if (!slug) return;

    window.localStorage.setItem(
      `eduplatform-resource-card:${slug}`,
      JSON.stringify({
        rating: Number(summary.rating || 0),
        installs: Number(summary.installs || 0),
      })
    );
  }

  function initializeNavbarSessionState(currentUser, currentRole) {
    const navbarList = document.querySelector(".navbar-nav");
    if (!navbarList) return;

    const restrictedRoutes = ["resources", "webinars", "community", "profile"];

    restrictedRoutes.forEach(route => {
      const item = Array.from(navbarList.querySelectorAll("a")).find(link =>
        matchesRoute(link, route)
      )?.closest("li");

      if (!currentUser) {
        item?.remove();
      }
    });

    if (!currentUser) return;

    Array.from(navbarList.querySelectorAll("a"))
      .filter(link => isAuthEntryLink(link) || matchesRoute(link, "login"))
      .forEach(link => link.closest("li")?.remove());

    const displayName = getDisplayName(currentUser);
    const dashboardEntries = getDashboardEntries(currentRole);
    const profileItem = document.createElement("li");
    profileItem.className = "nav-item dropdown";
    profileItem.innerHTML = `
      <a class="btn btn-outline-light px-4 dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="fa-solid fa-user me-2"></i>${escapeHtml(displayName)}
      </a>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item" href="profile.html">Profilul meu</a></li>
        ${dashboardEntries
          .map(entry => `<li><a class="dropdown-item" href="${entry.href}">${entry.label}</a></li>`)
          .join("")}
        ${dashboardEntries.length ? '<li><hr class="dropdown-divider"></li>' : ""}
        <li><button class="dropdown-item" type="button" id="logoutNavButton">Deconectare</button></li>
      </ul>
    `;

    navbarList.appendChild(profileItem);

    document.querySelector("#logoutNavButton")?.addEventListener("click", async () => {
      await signOutEverywhere();
      window.location.href = "login.html#login";
    });
  }

  function initializeFooterSessionState(currentUser) {
    const footer = document.querySelector(".footer");
    if (!footer) return;

    const platformSection = findFooterSection("platform");
    const supportSection = findFooterSection("suport");
    const featuresSection = findFooterSection("funct");

    featuresSection?.remove();
    if (!platformSection) return;

    if (!currentUser) {
      setFooterLinks(platformSection, [
        { href: "index.html", label: "Acasa" },
        { href: "contact.html", label: "Contact" },
      ]);

      if (supportSection) {
        setFooterLinks(supportSection, [
          { href: "contact.html", label: "Contact" },
          { href: "contact.html#gdpr", label: "GDPR" },
        ]);
      }
      return;
    }

    setFooterLinks(platformSection, [
      { href: "resources.html", label: "Resurse" },
      { href: "webinars.html", label: "Webinarii" },
      { href: "community.html", label: "Comunitati" },
      { href: "profile.html", label: "Profil" },
    ]);

    if (supportSection) {
      setFooterLinks(supportSection, [
        { href: "contact.html", label: "Contact" },
        { href: "contact.html#gdpr", label: "GDPR" },
      ]);
    }
  }

  function initializeGuestVisibility(currentUser) {
    if (currentUser) return;
    homeSearchSection?.remove();
    guestRestrictedHeroLinks.forEach(link => link.remove());
  }

  function normalizeAuthEntryLinks() {
    document.querySelectorAll("a").forEach(link => {
      if (!isAuthEntryLink(link) && !matchesRoute(link, "login")) return;

      if (link.hash === "#register") {
        link.setAttribute("href", "login.html#register");
      } else {
        link.setAttribute("href", "login.html#login");
      }
    });
  }

  function matchesRoute(link, routeName) {
    const rawHref = link.getAttribute("href") || "";
    const normalizedHref = rawHref.replace(/^\.\//, "").replace(/^\/+/, "");
    const pathOnly = normalizedHref.split("#")[0];

    if (pathOnly === `${routeName}.html` || pathOnly === routeName) {
      return true;
    }

    try {
      const url = new URL(link.href, window.location.origin);
      const pathname = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      return pathname === routeName || pathname === `${routeName}.html`;
    } catch (error) {
      return false;
    }
  }

  function isAuthEntryLink(link) {
    const href = (link.getAttribute("href") || "").trim().toLowerCase();
    return (
      href === "login.html" ||
      href === "login.html#login" ||
      href === "login.html#register" ||
      href === "/login" ||
      href === "/login#login" ||
      href === "/login#register"
    );
  }

  function findFooterSection(keyword) {
    const headings = Array.from(document.querySelectorAll(".footer h6"));
    return (
      headings.find(heading =>
        normalize(heading.textContent)
          .replaceAll("ă", "a")
          .replaceAll("â", "a")
          .replaceAll("î", "i")
          .replaceAll("ș", "s")
          .replaceAll("ş", "s")
          .replaceAll("ț", "t")
          .replaceAll("ţ", "t")
          .includes(keyword)
      )?.parentElement || null
    );
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

  function getDashboardEntries(currentRole) {
    if (currentRole === "admin") {
      return [
        { href: "admin.html", label: "Dashboard admin" },
        { href: "teachers-dashboard.html", label: "Dashboard profesor" },
        { href: "student-dashboard.html", label: "Dashboard elev" },
      ];
    }

    if (["moderator", "organizator", "profesor"].includes(currentRole)) {
      return [{ href: "teachers-dashboard.html", label: "Dashboard profesor" }];
    }

    if (currentRole === "elev") {
      return [{ href: "student-dashboard.html", label: "Dashboard elev" }];
    }

    return [];
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

  function getDisplayName(currentUser) {
    return (
      currentUser?.user_metadata?.full_name ||
      currentUser?.email?.split("@")[0] ||
      "Contul meu"
    );
  }

  async function signOutEverywhere() {
    if (window.eduPlatformSupabase?.signOut) {
      try {
        await window.eduPlatformSupabase.signOut();
      } catch (error) {
        console.error("Nu am putut face sign out complet.", error);
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

  window.addEventListener("eduplatform:languagechange", () => {
    items.forEach(item => renderResourceSummary(item, getResourceSummary(item)));
  });
});
