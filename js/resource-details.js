document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const fileName = window.location.pathname.split("/").pop() || "";
  const resourceConfig = getResourceConfig(fileName);

  if (!resourceConfig) return;

  const commentsSection = findSectionByHeading("Evalu");
  const infoSection = findSectionByHeading("Inform");
  const statsContainer = document.querySelector(".resource-stats");
  const downloadBox = document.querySelector(".download-box");

  if (downloadBox) {
    const reportCard = document.createElement("div");
    reportCard.className = "resource-report-box mt-3";
    reportCard.innerHTML = `
      <button class="btn btn-outline-danger w-100 mb-2" type="button" id="reportResourceToggleButton">
        Raporteaza aceasta resursa
      </button>
      <form id="resourceReportForm" class="d-none">
        <label class="form-label" for="resourceReportReason">Motiv</label>
        <select id="resourceReportReason" class="form-select mb-2" required>
          <option value="Licenta neclara">Licenta neclara</option>
          <option value="Continut incorect">Continut incorect</option>
          <option value="Material duplicat">Material duplicat</option>
          <option value="Alt motiv">Alt motiv</option>
        </select>
        <textarea id="resourceReportDetails" class="form-control mb-2" rows="3" placeholder="Detalii suplimentare"></textarea>
        <button class="btn btn-outline-danger w-100" type="submit">Trimite raportarea</button>
      </form>
    `;
    downloadBox.appendChild(reportCard);
  }

  if (commentsSection) {
    commentsSection.innerHTML = `
      <div id="resourceFeedbackPageMessage" class="mb-4"></div>
      <h2>Evaluari si comentarii</h2>
      <div class="rating-box mb-4">
        <h3 id="resourceAverageRating">0.0</h3>
        <div class="stars" id="resourceAverageStars"></div>
        <p id="resourceRatingsMeta">0 evaluari</p>
      </div>
      <div id="resourceFeedbackList" class="mb-4"></div>
      <form id="resourceFeedbackForm" class="resource-feedback-form">
        <label class="form-label fw-bold" for="resourceFeedbackRating">Evaluare</label>
        <select id="resourceFeedbackRating" class="form-select mb-3" required>
          <option value="">Selecteaza ratingul</option>
          <option value="5">5 - Excelent</option>
          <option value="4">4 - Foarte bun</option>
          <option value="3">3 - Bun</option>
          <option value="2">2 - Poate fi imbunatatit</option>
          <option value="1">1 - Slab</option>
        </select>
        <label class="form-label fw-bold" for="resourceFeedbackComment">Comentariul tau</label>
        <textarea id="resourceFeedbackComment" class="form-control mb-3" rows="4" placeholder="Scrie opinia ta despre resursa..." required></textarea>
        <button id="resourceFeedbackSubmitButton" class="btn btn-primary custom-btn" type="submit">Trimite feedback</button>
      </form>
    `;
  }

  if (infoSection) {
    const licenseLine = Array.from(infoSection.querySelectorAll(".info-line")).find(line =>
      line.textContent.toLowerCase().includes("licen")
    );

    if (licenseLine) {
      const strong = licenseLine.querySelector("strong");
      if (strong) strong.textContent = resourceConfig.license;
    }
  }

  const pageMessage = document.querySelector("#resourceFeedbackPageMessage");
  const feedbackList = document.querySelector("#resourceFeedbackList");
  const feedbackForm = document.querySelector("#resourceFeedbackForm");
  const reportForm = document.querySelector("#resourceReportForm");

  if (!supabaseApi?.isConfigured) {
    supabaseApi?.showMessage(
      pageMessage,
      "Completeaza configurarea Supabase pentru a folosi comentariile si evaluarile.",
      "warning"
    );
    return;
  }

  let authState = null;
  let currentFeedback = [];

  try {
    authState = await supabaseApi.requireSession({ allowedRoles: [] });
  } catch (error) {
    supabaseApi.showMessage(
      pageMessage,
      error.message || "Nu am putut verifica sesiunea curenta.",
      "danger"
    );
  }

  if (authState?.needsLogin) {
    supabaseApi.showMessage(
      pageMessage,
      'Poti citi resursa fara cont, dar pentru evaluari, comentarii si raportare trebuie sa te <a href="login.html#login" class="alert-link">autentifici</a>.',
      "info"
    );
  }

  feedbackForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!authState?.user) {
      supabaseApi.showMessage(
        pageMessage,
        "Autentifica-te mai intai pentru a lasa feedback.",
        "warning"
      );
      return;
    }

    const rating = Number(document.querySelector("#resourceFeedbackRating")?.value || 0);
    const comment = document.querySelector("#resourceFeedbackComment")?.value.trim();

    if (!rating || !comment) {
      supabaseApi.showMessage(pageMessage, "Selecteaza ratingul si scrie un comentariu.", "warning");
      return;
    }

    const submitButton = document.querySelector("#resourceFeedbackSubmitButton");

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Se trimite...";
      }

      const { error } = await supabaseApi.client.from("resource_feedback").upsert(
        {
          resource_slug: resourceConfig.slug,
          resource_title: resourceConfig.title,
          user_id: authState.user.id,
          rating,
          comment,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "resource_slug,user_id" }
      );

      if (error) throw error;

      feedbackForm.reset();
      supabaseApi.showMessage(pageMessage, "Feedback-ul tau a fost salvat.", "success");
      await loadFeedback();
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut salva feedback-ul.",
        "danger"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Trimite feedback";
      }
    }
  });

  reportForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!authState?.user) {
      supabaseApi.showMessage(
        pageMessage,
        "Autentifica-te pentru a raporta o resursa.",
        "warning"
      );
      return;
    }

    try {
      const { error } = await supabaseApi.client.from("resource_reports").insert({
        resource_slug: resourceConfig.slug,
        reported_by: authState.user.id,
        reason: document.querySelector("#resourceReportReason")?.value,
        details: document.querySelector("#resourceReportDetails")?.value.trim(),
      });

      if (error) throw error;

      reportForm.reset();
      reportForm.classList.add("d-none");
      supabaseApi.showMessage(pageMessage, "Raportarea a fost trimisa moderatorilor.", "success");
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut trimite raportarea.",
        "danger"
      );
    }
  });

  document.querySelector("#reportResourceToggleButton")?.addEventListener("click", () => {
    reportForm?.classList.toggle("d-none");
  });

  feedbackList?.addEventListener("click", async event => {
    const voteButton = event.target.closest("[data-feedback-vote]");
    if (!voteButton) return;

    if (!authState?.user) {
      supabaseApi.showMessage(
        pageMessage,
        "Autentifica-te pentru a marca un comentariu ca util.",
        "warning"
      );
      return;
    }

    const feedbackId = voteButton.dataset.feedbackVote;

    try {
      const { error: voteError } = await supabaseApi.client
        .from("resource_feedback_votes")
        .insert({
          feedback_id: feedbackId,
          user_id: authState.user.id,
        });

      if (voteError) throw voteError;

      const currentItem = currentFeedback.find(item => item.id === feedbackId);
      const helpfulCount = Number(currentItem?.helpful_count || 0) + 1;

      const { error: updateError } = await supabaseApi.client
        .from("resource_feedback")
        .update({
          helpful_count: helpfulCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", feedbackId);

      if (updateError) throw updateError;

      await loadFeedback();
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut inregistra votul util.",
        "danger"
      );
    }
  });

  await loadFeedback();

  async function loadFeedback() {
    if (!feedbackList) return;

    const feedbackResult = await supabaseApi.client
      .from("resource_feedback")
      .select("id, user_id, rating, comment, helpful_count, created_at")
      .eq("resource_slug", resourceConfig.slug)
      .order("created_at", { ascending: false });

    if (feedbackResult.error) {
      supabaseApi.showMessage(
        pageMessage,
        feedbackResult.error.message || "Nu am putut incarca feedback-ul pentru resursa.",
        "danger"
      );
      return;
    }

    currentFeedback = feedbackResult.data || [];

    const userIds = [...new Set(currentFeedback.map(item => item.user_id).filter(Boolean))];
    let profilesMap = new Map();
    let votedIds = new Set();

    if (userIds.length) {
      const profilesResult = await supabaseApi.client
        .from("profiles")
        .select("id, full_name, role")
        .in("id", userIds);

      if (!profilesResult.error) {
        profilesMap = new Map((profilesResult.data || []).map(profile => [profile.id, profile]));
      }
    }

    if (authState?.user && currentFeedback.length) {
      const voteResult = await supabaseApi.client
        .from("resource_feedback_votes")
        .select("feedback_id")
        .eq("user_id", authState.user.id)
        .in("feedback_id", currentFeedback.map(item => item.id));

      if (!voteResult.error) {
        votedIds = new Set((voteResult.data || []).map(item => item.feedback_id));
      }
    }

    renderStats(currentFeedback);

    if (!currentFeedback.length) {
      feedbackList.innerHTML = `
        <div class="community-post-card text-muted">
          Nu exista feedback inca. Fii primul care lasa o evaluare.
        </div>
      `;
      return;
    }

    feedbackList.innerHTML = currentFeedback
      .map(item => {
        const author = profilesMap.get(item.user_id);
        const alreadyVoted = votedIds.has(item.id);

        return `
          <article class="feedback-card">
            <div class="feedback-card-head">
              <div>
                <strong>${escapeHtml(author?.full_name || "Utilizator EduPlatform")}</strong>
                <small>${escapeHtml(capitalize(author?.role || "profesor"))} · ${escapeHtml(formatDate(item.created_at))}</small>
              </div>
              <span class="feedback-rating">${renderStarString(item.rating)}</span>
            </div>
            <p>${escapeHtml(item.comment)}</p>
            <div class="feedback-actions">
              <button class="btn btn-sm btn-outline-primary" type="button" data-feedback-vote="${item.id}" ${alreadyVoted ? "disabled" : ""}>
                Util · ${Number(item.helpful_count || 0)}
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderStats(feedbackItems) {
    const ratingsCount = feedbackItems.length;
    const average = ratingsCount
      ? feedbackItems.reduce((sum, item) => sum + Number(item.rating || 0), 0) / ratingsCount
      : 0;

    const averageRating = document.querySelector("#resourceAverageRating");
    const ratingsMeta = document.querySelector("#resourceRatingsMeta");
    const averageStars = document.querySelector("#resourceAverageStars");

    if (averageRating) averageRating.textContent = average.toFixed(1);
    if (ratingsMeta) ratingsMeta.textContent = `${ratingsCount} evaluari`;
    if (averageStars) averageStars.innerHTML = renderStars(Math.round(average));

    const stats = statsContainer?.querySelectorAll("span");
    if (stats?.length >= 3) {
      stats[0].innerHTML = `<i class="fa-solid fa-star"></i> ${average.toFixed(1)} rating`;
      stats[2].innerHTML = `<i class="fa-solid fa-comment"></i> ${ratingsCount} comentarii`;
    }
  }

  function renderStars(filled) {
    return Array.from({ length: 5 }, (_, index) =>
      `<i class="fa-solid fa-star${index < filled ? "" : " text-secondary"}"></i>`
    ).join("");
  }

  function renderStarString(rating) {
    return `${"★".repeat(Number(rating || 0))}${"☆".repeat(5 - Number(rating || 0))}`;
  }

  function findSectionByHeading(prefix) {
    return Array.from(document.querySelectorAll(".details-card")).find(section => {
      const heading = section.querySelector("h2");
      return heading && heading.textContent.toLowerCase().startsWith(prefix.toLowerCase());
    });
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("ro-RO");
  }

  function capitalize(value) {
    const text = (value || "").toString().trim();
    return text ? text[0].toUpperCase() + text.slice(1) : "Utilizator";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getResourceConfig(name) {
    const configs = {
      "resource-matematica.html": {
        slug: "resource-matematica",
        title: "Lectie Matematica: Ecuatii de gradul I",
        license: "Creative Commons",
      },
      "resource-informatica.html": {
        slug: "resource-informatica",
        title: "Lectie Informatica: Algoritmi si pseudocod",
        license: "Open Educational Resource",
      },
      "resource-biologie.html": {
        slug: "resource-biologie",
        title: "Lectie Biologie: Fotosinteza",
        license: "Creative Commons",
      },
      "resource-fizica.html": {
        slug: "resource-fizica",
        title: "Lectie Fizica: Circuit electric simplu",
        license: "Creative Commons",
      },
      "resource-romana.html": {
        slug: "resource-romana",
        title: "Lectie Limba Romana: Analiza textului literar",
        license: "Licenta proprie autor",
      },
    };

    return configs[name] || null;
  }
});
