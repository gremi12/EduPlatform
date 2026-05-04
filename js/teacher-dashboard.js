document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const messageBox = document.querySelector("#dashboardMessage");
  const form = document.querySelector("#resourceUploadForm");
  const publishButton = document.querySelector("#publishResourceButton");
  const uploadModalElement = document.querySelector("#resourceUploadModal");
  const uploadModal = uploadModalElement ? bootstrap.Modal.getOrCreateInstance(uploadModalElement) : null;
  const statsElements = {
    totalResources: document.querySelector("#totalResources"),
    totalDownloads: document.querySelector("#totalDownloads"),
    averageRating: document.querySelector("#averageRating"),
  };

  if (!supabaseApi?.isConfigured) {
    supabaseApi?.showMessage(
      messageBox,
      "Completeaza intai valorile din js/supabaseClient.js pentru a folosi upload-ul de resurse.",
      "warning"
    );
    if (publishButton) publishButton.disabled = true;
    return;
  }

  let authState;

  try {
    authState = await supabaseApi.requireSession({
      allowedRoles: ["admin", "moderator", "organizator", "profesor"],
    });

    if (authState.needsLogin) {
      supabaseApi.showMessage(
        messageBox,
        'Trebuie sa te autentifici inainte de a incarca resurse. <a href="login.html#login" class="alert-link">Mergi la autentificare</a>.',
        "warning"
      );
      if (publishButton) publishButton.disabled = true;
      return;
    }

    if (authState.unauthorized) {
      supabaseApi.showMessage(
        messageBox,
        'Contul curent nu are un rol care permite publicarea de resurse. <a href="profile.html" class="alert-link">Deschide profilul</a>.',
        "warning"
      );
      if (publishButton) publishButton.disabled = true;
      return;
    }

    await loadStats(authState.user.id);
  } catch (error) {
    supabaseApi.showMessage(
      messageBox,
      error.message || "Nu am putut incarca modulul de upload.",
      "danger"
    );
    return;
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    supabaseApi.clearMessage(messageBox);

    const file = document.querySelector("#resourceFile")?.files?.[0];
    if (!file) {
      supabaseApi.showMessage(
        messageBox,
        "Selecteaza un fisier inainte de upload.",
        "warning"
      );
      return;
    }

    const title = document.querySelector("#resourceTitle")?.value.trim();
    const category = document.querySelector("#resourceCategory")?.value;
    const classLevel = document.querySelector("#resourceClassLevel")?.value.trim();
    const format = document.querySelector("#resourceFormat")?.value;
    const licenseType = document.querySelector("#resourceLicense")?.value;
    const description = document.querySelector("#resourceDescription")?.value.trim();

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${authState.user.id}/${Date.now()}-${safeFileName}`;

    try {
      publishButton.disabled = true;
      publishButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Se publica...';

      const { error: uploadError } = await supabaseApi.client.storage
        .from("resources")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabaseApi.client.storage.from("resources").getPublicUrl(filePath);

      const { error: insertError } = await supabaseApi.client.from("resources").insert({
        user_id: authState.user.id,
        title,
        category,
        class_level: classLevel,
        format,
        license_type: licenseType,
        description,
        file_path: filePath,
        public_url: publicUrl,
      });

      if (insertError) throw insertError;

      form.reset();
      await loadStats(authState.user.id);
      supabaseApi.showMessage(messageBox, "Resursa a fost publicata cu succes.", "success");

      if (uploadModal) {
        setTimeout(() => {
          uploadModal.hide();
          supabaseApi.clearMessage(messageBox);
        }, 900);
      }
    } catch (error) {
      supabaseApi.showMessage(
        messageBox,
        error.message || "Nu am putut publica resursa.",
        "danger"
      );
    } finally {
      publishButton.disabled = false;
      publishButton.innerHTML =
        '<i class="fa-solid fa-cloud-arrow-up me-2"></i>Publica resursa';
    }
  });

  async function loadStats(userId) {
    const { data, error } = await supabaseApi.client
      .from("resources")
      .select("id, download_count, rating_avg")
      .eq("user_id", userId);

    if (error) throw error;

    const resources = data || [];
    const totalResources = resources.length;
    const totalDownloads = resources.reduce(
      (sum, resource) => sum + Number(resource.download_count || 0),
      0
    );
    const ratedResources = resources.filter(resource => Number(resource.rating_avg || 0) > 0);
    const averageRating = ratedResources.length
      ? (
          ratedResources.reduce(
            (sum, resource) => sum + Number(resource.rating_avg || 0),
            0
          ) / ratedResources.length
        ).toFixed(1)
      : "0";

    if (statsElements.totalResources) {
      statsElements.totalResources.textContent = String(totalResources);
    }
    if (statsElements.totalDownloads) {
      statsElements.totalDownloads.textContent = String(totalDownloads);
    }
    if (statsElements.averageRating) {
      statsElements.averageRating.textContent = String(averageRating);
    }
  }
});
