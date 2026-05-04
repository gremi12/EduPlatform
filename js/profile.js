document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const messageBox = document.querySelector("#profileMessage");
  const resourcesContainer = document.querySelector("#profileResources");
  const uploadCta = document.querySelector("#uploadResourceCta");
  const logoutButton = document.querySelector("#logoutButton");
  const profileSecondaryLabel = document.querySelector("#profileSecondaryLabel");
  const editResourceForm = document.querySelector("#editResourceForm");
  const saveResourceChangesButton = document.querySelector("#saveResourceChangesButton");
  const editModalElement = document.querySelector("#editResourceModal");
  const editModal = editModalElement ? new bootstrap.Modal(editModalElement) : null;

  let currentUserId = null;
  let currentResources = [];

  if (!supabaseApi?.isConfigured) {
    supabaseApi?.showMessage(
      messageBox,
      "Completeaza mai intai valorile din js/supabaseClient.js pentru a incarca profilul din Supabase.",
      "warning"
    );
    return;
  }

  try {
    const authState = await supabaseApi.requireSession();

    if (authState.needsLogin) {
      supabaseApi.showMessage(
        messageBox,
        'Nu esti autentificat. <a href="login.html#login" class="alert-link">Mergi la autentificare</a>.',
        "warning"
      );
      resourcesContainer.innerHTML = "";
      return;
    }

    currentUserId = authState.user.id;
    renderProfile(authState.user, authState.profile);
    await renderResources(authState.user.id);
  } catch (error) {
    supabaseApi.showMessage(
      messageBox,
      error.message || "Profilul nu a putut fi incarcat.",
      "danger"
    );
  }

  logoutButton?.addEventListener("click", async () => {
    await supabaseApi.signOut();
    window.location.replace("login.html#login");
  });

  resourcesContainer?.addEventListener("click", async event => {
    const editButton = event.target.closest("[data-action='edit-resource']");
    const deleteButton = event.target.closest("[data-action='delete-resource']");

    if (editButton) {
      openEditModal(editButton.dataset.resourceId);
      return;
    }

    if (deleteButton) {
      await deleteResource(deleteButton.dataset.resourceId);
    }
  });

  editResourceForm?.addEventListener("submit", async event => {
    event.preventDefault();
    supabaseApi.clearMessage(messageBox);

    const resourceId = document.querySelector("#editResourceId")?.value;
    const payload = {
      title: document.querySelector("#editResourceTitle")?.value.trim(),
      category: document.querySelector("#editResourceCategory")?.value,
      class_level: document.querySelector("#editResourceClassLevel")?.value.trim(),
      format: document.querySelector("#editResourceFormat")?.value,
      license_type: document.querySelector("#editResourceLicense")?.value,
      description: document.querySelector("#editResourceDescription")?.value.trim(),
    };

    try {
      if (saveResourceChangesButton) {
        saveResourceChangesButton.disabled = true;
        saveResourceChangesButton.textContent = "Se salveaza...";
      }

      const { error } = await supabaseApi.client
        .from("resources")
        .update(payload)
        .eq("id", resourceId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      editModal?.hide();
      await renderResources(currentUserId);
      supabaseApi.showMessage(messageBox, "Resursa a fost actualizata.", "success");
    } catch (error) {
      supabaseApi.showMessage(
        messageBox,
        error.message || "Nu am putut actualiza resursa.",
        "danger"
      );
    } finally {
      if (saveResourceChangesButton) {
        saveResourceChangesButton.disabled = false;
        saveResourceChangesButton.textContent = "Salveaza modificarile";
      }
    }
  });

  function renderProfile(user, profile) {
    const displayName = supabaseApi.getDisplayName(user, profile);
    const role = profile?.role || "elev";
    const specialization = profile?.specialization || "Nespecificata";
    const classLevel = profile?.class_level || "Nespecificata";
    const badges = profile?.badges_cpd ?? 0;
    const activityYears = profile?.activity_years ?? 0;
    const normalizedRole = supabaseApi.normalizeRole(role);
    const canUpload = ["admin", "moderator", "organizator", "profesor"].includes(normalizedRole);

    document.querySelector("#profileAvatar").textContent = supabaseApi.getInitials(displayName);
    document.querySelector("#profileName").textContent = displayName;
    document.querySelector("#profileSubtitle").textContent =
      `${capitalize(role)} · ${canUpload ? specialization : classLevel} · profil conectat la Supabase`;
    document.querySelector("#profileRole").textContent = capitalize(role);

    if (profileSecondaryLabel) {
      profileSecondaryLabel.textContent = canUpload ? "Specializare" : "Clasa";
    }

    document.querySelector("#profileSpecialization").textContent =
      canUpload ? specialization : classLevel;
    document.querySelector("#profileBadges").textContent = String(badges);
    document.querySelector("#profileActivity").textContent = `${activityYears} ani`;

    if (!canUpload && uploadCta) {
      uploadCta.style.display = "none";
    }
  }

  async function renderResources(userId) {
    const { data, error } = await supabaseApi.client
      .from("resources")
      .select("id, title, category, class_level, format, license_type, description, download_count, file_path, public_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    currentResources = data || [];

    if (!currentResources.length) {
      resourcesContainer.innerHTML = `
        <div class="recommended-resource">
          <i class="fa-solid fa-folder-open"></i>
          <div>
            <strong>Nu exista resurse inca</strong>
            <small>Prima resursa publicata va aparea aici.</small>
          </div>
        </div>
      `;
      return;
    }

    resourcesContainer.innerHTML = currentResources
      .map(
        resource => `
          <div class="owned-resource-card">
            <div class="owned-resource-main">
              <i class="fa-solid fa-file-lines owned-resource-icon"></i>
              <div class="owned-resource-copy">
                <strong>${escapeHtml(resource.title)}</strong>
                <small>${escapeHtml(resource.category || "Fara categorie")} · ${resource.download_count || 0} descarcari · ${escapeHtml(resource.format || "-")} · ${escapeHtml(resource.license_type || "Creative Commons")}</small>
                <p class="mb-0">${escapeHtml(resource.description || "Fara descriere")}</p>
              </div>
            </div>
            <div class="owned-resource-actions">
              <a class="btn btn-sm btn-outline-primary" href="${escapeHtml(resource.public_url || "#")}" target="_blank" rel="noopener noreferrer">
                Vezi
              </a>
              <button class="btn btn-sm btn-outline-secondary" type="button" data-action="edit-resource" data-resource-id="${resource.id}">
                Editeaza
              </button>
              <button class="btn btn-sm btn-outline-danger" type="button" data-action="delete-resource" data-resource-id="${resource.id}">
                Sterge
              </button>
            </div>
          </div>
        `
      )
      .join("");
  }

  function openEditModal(resourceId) {
    const resource = currentResources.find(item => item.id === resourceId);
    if (!resource) return;

    document.querySelector("#editResourceId").value = resource.id;
    document.querySelector("#editResourceTitle").value = resource.title || "";
    document.querySelector("#editResourceCategory").value = resource.category || "Informatica";
    document.querySelector("#editResourceClassLevel").value = resource.class_level || "";
    document.querySelector("#editResourceFormat").value = resource.format || "PDF";
    document.querySelector("#editResourceLicense").value =
      resource.license_type || "Creative Commons";
    document.querySelector("#editResourceDescription").value = resource.description || "";
    editModal?.show();
  }

  async function deleteResource(resourceId) {
    const resource = currentResources.find(item => item.id === resourceId);
    if (!resource) return;

    const confirmed = window.confirm(`Sigur vrei sa stergi resursa "${resource.title}"?`);
    if (!confirmed) return;

    supabaseApi.clearMessage(messageBox);

    try {
      if (resource.file_path) {
        const { error: storageError } = await supabaseApi.client.storage
          .from("resources")
          .remove([resource.file_path]);

        if (storageError) throw storageError;
      }

      const { error } = await supabaseApi.client
        .from("resources")
        .delete()
        .eq("id", resourceId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      await renderResources(currentUserId);
      supabaseApi.showMessage(messageBox, "Resursa a fost stearsa.", "success");
    } catch (error) {
      supabaseApi.showMessage(
        messageBox,
        error.message || "Nu am putut sterge resursa.",
        "danger"
      );
    }
  }

  function capitalize(value) {
    const text = (value || "").trim();
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
});
