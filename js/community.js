document.addEventListener("DOMContentLoaded", async () => {
  const supabaseApi = window.eduPlatformSupabase;
  const pageMessage = document.querySelector("#communityPageMessage");
  const createSection = document.querySelector("#communityCreateSection");
  const createForm = document.querySelector("#communityCreateForm");
  const createMessage = document.querySelector("#communityCreateMessage");
  const createButton = document.querySelector("#communityCreateSubmitButton");
  const groupsGrid = document.querySelector("#communityGroupsGrid");
  const groupsMeta = document.querySelector("#communityGroupsMeta");
  const feedSection = document.querySelector("#communityFeedSection");
  const postForm = document.querySelector("#communityPostForm");
  const formMessage = document.querySelector("#communityFormMessage");
  const submitButton = document.querySelector("#communityPostSubmitButton");
  const refreshButton = document.querySelector("#communityRefreshPostsButton");
  const joinButton = document.querySelector("#communityJoinButton");
  const postsList = document.querySelector("#communityPostsList");
  const postsMeta = document.querySelector("#communityPostsMeta");
  const activeTitle = document.querySelector("#communityActiveTitle");
  const activeDescription = document.querySelector("#communityActiveDescription");
  const activeBadge = document.querySelector("#communityFocusBadge");
  const membersList = document.querySelector("#communityMembersList");
  const membersMeta = document.querySelector("#communityMembersMeta");
  const rosterPanel = document.querySelector("#communityRosterPanel");
  const rosterTitle = document.querySelector("#communityRosterTitle");
  const rosterMeta = document.querySelector("#communityRosterMeta");
  const rosterList = document.querySelector("#communityRosterList");

  let authState = null;
  let allGroups = [];
  let visibleGroups = [];
  let currentGroupSlug = "";
  let membershipMap = new Map();
  let membershipCounts = new Map();

  if (!supabaseApi?.isConfigured) {
    supabaseApi?.showMessage(
      pageMessage,
      "Completeaza configurarea Supabase pentru a folosi comunitatile interactive.",
      "warning"
    );
    return;
  }

  try {
    authState = await supabaseApi.requireSession();

    if (authState.needsLogin) {
      supabaseApi.showMessage(
        pageMessage,
        'Trebuie sa te autentifici pentru a vedea comunitatile. <a href="login.html#login" class="alert-link">Autentifica-te</a>.',
        "warning"
      );
      return;
    }

    toggleCreateSection();
    await loadGroups();
  } catch (error) {
    supabaseApi.showMessage(
      pageMessage,
      error.message || "Nu am putut incarca modulul de comunitati.",
      "danger"
    );
    return;
  }

  createForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!canCreateCommunity()) {
      supabaseApi.showMessage(
        createMessage,
        "Doar profesorii sau conturile de staff pot crea comunitati.",
        "warning"
      );
      return;
    }

    const name = document.querySelector("#communityName")?.value.trim();
    const subject = document.querySelector("#communitySubject")?.value.trim();
    const targetClass = document.querySelector("#communityTargetClass")?.value.trim().toUpperCase();
    const icon = document.querySelector("#communityIcon")?.value;
    const focusArea = document.querySelector("#communityFocusArea")?.value.trim();
    const description = document.querySelector("#communityDescription")?.value.trim();

    if (!name || !subject || !targetClass || !focusArea || !description) {
      supabaseApi.showMessage(createMessage, "Completeaza toate campurile comunitatii.", "warning");
      return;
    }

    const slug = buildSlug(`${subject}-${targetClass}-${name}`);

    try {
      createButton.disabled = true;
      createButton.textContent = "Se creeaza...";
      supabaseApi.clearMessage(createMessage);

      const { error } = await supabaseApi.client.from("community_groups").insert({
        slug,
        name,
        description,
        icon,
        focus_area: focusArea,
        subject,
        target_class: targetClass,
        created_by: authState.user.id,
      });

      if (error) throw error;

      createForm.reset();
      supabaseApi.showMessage(createMessage, "Comunitatea a fost creata.", "success");
      await loadGroups(slug);
    } catch (error) {
      supabaseApi.showMessage(
        createMessage,
        error.message || "Nu am putut crea comunitatea.",
        "danger"
      );
    } finally {
      createButton.disabled = false;
      createButton.textContent = "Creeaza comunitatea";
    }
  });

  postForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentGroupSlug) return;

    const title = document.querySelector("#communityPostTitle")?.value.trim();
    const content = document.querySelector("#communityPostContent")?.value.trim();

    if (!title || !content) {
      supabaseApi.showMessage(formMessage, "Completeaza titlul si mesajul postarii.", "warning");
      return;
    }

    try {
      submitButton.disabled = true;
      submitButton.textContent = "Se publica...";
      supabaseApi.clearMessage(formMessage);

      const { error } = await supabaseApi.client.from("community_posts").insert({
        group_slug: currentGroupSlug,
        user_id: authState.user.id,
        title,
        content,
      });

      if (error) throw error;

      postForm.reset();
      supabaseApi.showMessage(formMessage, "Postarea a fost publicata.", "success");
      await loadPosts(currentGroupSlug);
    } catch (error) {
      supabaseApi.showMessage(
        formMessage,
        error.message || "Nu am putut publica postarea.",
        "danger"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Publica postarea";
    }
  });

  refreshButton?.addEventListener("click", async () => {
    if (currentGroupSlug) {
      await loadPosts(currentGroupSlug);
    }
  });

  joinButton?.addEventListener("click", async () => {
    if (!currentGroupSlug) return;

    const isJoined = membershipMap.has(currentGroupSlug);
    joinButton.disabled = true;

    try {
      if (isJoined) {
        const { error } = await supabaseApi.client
          .from("community_memberships")
          .delete()
          .eq("group_slug", currentGroupSlug)
          .eq("user_id", authState.user.id);

        if (error) throw error;
      } else {
        const { error } = await supabaseApi.client
          .from("community_memberships")
          .insert({
            group_slug: currentGroupSlug,
            user_id: authState.user.id,
          });

        if (error) throw error;
      }

      await loadGroups(currentGroupSlug);
      await loadMembersAndRoster(currentGroupSlug);
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut actualiza apartenenta la comunitate.",
        "danger"
      );
    } finally {
      joinButton.disabled = false;
    }
  });

  groupsGrid?.addEventListener("click", async event => {
    const actionButton = event.target.closest("[data-group-slug]");
    if (!actionButton) return;

    const groupSlug = actionButton.dataset.groupSlug;

    if (actionButton.dataset.action === "join-group") {
      await toggleMembership(groupSlug);
      return;
    }

    await loadPosts(groupSlug);
  });

  postsList?.addEventListener("click", async event => {
    const deleteButton = event.target.closest("[data-delete-post-id]");
    if (!deleteButton) return;
    await deletePost(deleteButton.dataset.deletePostId);
  });

  async function loadGroups(preferredGroupSlug) {
    const [groupsResult, postsResult, membershipsResult] = await Promise.all([
      supabaseApi.client
        .from("community_groups")
        .select("slug, name, description, icon, focus_area, subject, target_class, created_by, created_at")
        .order("created_at", { ascending: false }),
      supabaseApi.client
        .from("community_posts")
        .select("id, group_slug, user_id, title, content, created_at")
        .order("created_at", { ascending: false }),
      supabaseApi.client
        .from("community_memberships")
        .select("group_slug, user_id, created_at"),
    ]);

    if (groupsResult.error) throw groupsResult.error;
    if (postsResult.error) throw postsResult.error;
    if (membershipsResult.error) throw membershipsResult.error;

    allGroups = groupsResult.data || [];
    visibleGroups = filterGroupsForCurrentUser(allGroups);
    updateMembershipState(membershipsResult.data || []);

    const posts = postsResult.data || [];
    const postCounts = posts.reduce((accumulator, post) => {
      accumulator[post.group_slug] = (accumulator[post.group_slug] || 0) + 1;
      return accumulator;
    }, {});

    groupsMeta.textContent = `${visibleGroups.length} comunitati disponibile`;
    renderGroups(postCounts);

    const targetGroupSlug =
      preferredGroupSlug && visibleGroups.some(group => group.slug === preferredGroupSlug)
        ? preferredGroupSlug
        : currentGroupSlug && visibleGroups.some(group => group.slug === currentGroupSlug)
          ? currentGroupSlug
          : visibleGroups[0]?.slug;

    if (targetGroupSlug) {
      await loadPosts(targetGroupSlug);
    } else {
      currentGroupSlug = "";
      feedSection.classList.add("d-none");
      postsList.innerHTML = '<div class="text-muted">Nu exista comunitati disponibile pentru acest cont.</div>';
    }
  }

  async function loadPosts(groupSlug) {
    currentGroupSlug = groupSlug;
    const group = visibleGroups.find(entry => entry.slug === groupSlug);
    if (!group) return;

    feedSection.classList.remove("d-none");
    activeTitle.textContent = group.name;
    activeDescription.textContent = `${group.description} ${group.target_class ? `Clasa tinta: ${group.target_class}.` : ""}`;
    activeBadge.textContent = `${group.subject || group.focus_area || "Comunitate"}${group.target_class ? ` - ${group.target_class}` : ""}`;
    updateJoinButtonState(groupSlug);
    postsList.innerHTML = '<div class="text-muted">Se incarca postarile...</div>';

    await Promise.all([
      loadMembersAndRoster(groupSlug),
      loadPostsFeed(groupSlug),
    ]);

    highlightActiveGroup(groupSlug);
  }

  async function loadPostsFeed(groupSlug) {
    const postsResult = await supabaseApi.client
      .from("community_posts")
      .select("id, group_slug, user_id, title, content, created_at")
      .eq("group_slug", groupSlug)
      .order("created_at", { ascending: false });

    if (postsResult.error) {
      supabaseApi.showMessage(
        pageMessage,
        postsResult.error.message || "Nu am putut incarca postarile grupului.",
        "danger"
      );
      return;
    }

    const posts = postsResult.data || [];
    postsMeta.textContent = `${posts.length} postari`;

    const userIds = [...new Set(posts.map(post => post.user_id).filter(Boolean))];
    let profilesMap = new Map();

    if (userIds.length) {
      const members = await supabaseApi.client.rpc("get_community_members", {
        p_group_slug: groupSlug,
      });

      if (!members.error) {
        profilesMap = new Map(
          (members.data || []).map(member => [
            member.user_id,
            { full_name: member.full_name, role: member.role },
          ])
        );
      }
    }

    if (!posts.length) {
      postsList.innerHTML = `
        <div class="community-post-card text-muted">
          Nu exista postari inca in acest grup. Fii primul care deschide discutia.
        </div>
      `;
      return;
    }

    postsList.innerHTML = posts
      .map(post => {
        const author = profilesMap.get(post.user_id);
        const canDelete =
          post.user_id === authState.user.id ||
          ["admin", "moderator"].includes(supabaseApi.normalizeRole(authState.profile?.role));

        return `
          <article class="community-post-card">
            <div class="community-post-head">
              <div>
                <h4>${escapeHtml(post.title)}</h4>
                <small>${escapeHtml(author?.full_name || "Membru comunitate")} - ${escapeHtml(getRoleLabel(author?.role || "profesor"))} - ${escapeHtml(formatDate(post.created_at))}</small>
              </div>
              ${canDelete ? `<button class="btn btn-sm btn-outline-danger" type="button" data-delete-post-id="${post.id}">Sterge</button>` : ""}
            </div>
            <p class="mb-0">${escapeHtml(post.content)}</p>
          </article>
        `;
      })
      .join("");
  }

  async function loadMembersAndRoster(groupSlug) {
    const group = visibleGroups.find(entry => entry.slug === groupSlug);
    if (!group) return;

    const membersResult = await supabaseApi.client.rpc("get_community_members", {
      p_group_slug: groupSlug,
    });

    if (membersResult.error) {
      membersList.innerHTML = '<div class="text-muted">Nu am putut incarca membrii.</div>';
      membersMeta.textContent = "0 membri";
    } else {
      const members = membersResult.data || [];
      membersMeta.textContent = `${members.length} membri`;
      renderMembersList(members);
    }

    if (!canViewClassRoster() || !group.target_class) {
      rosterPanel.classList.add("d-none");
      return;
    }

    rosterPanel.classList.remove("d-none");
    rosterTitle.textContent = `Lista clasei ${group.target_class}`;

    const rosterResult = await supabaseApi.client.rpc("get_class_students", {
      p_target_class: group.target_class,
    });

    if (rosterResult.error) {
      rosterList.innerHTML = '<div class="text-muted">Nu am putut incarca lista clasei.</div>';
      rosterMeta.textContent = "0 elevi";
      return;
    }

    const students = rosterResult.data || [];
    rosterMeta.textContent = `${students.length} elevi`;
    renderRosterList(students);
  }

  async function toggleMembership(groupSlug) {
    const isJoined = membershipMap.has(groupSlug);

    try {
      if (isJoined) {
        const { error } = await supabaseApi.client
          .from("community_memberships")
          .delete()
          .eq("group_slug", groupSlug)
          .eq("user_id", authState.user.id);

        if (error) throw error;
      } else {
        const { error } = await supabaseApi.client
          .from("community_memberships")
          .insert({
            group_slug: groupSlug,
            user_id: authState.user.id,
          });

        if (error) throw error;
      }

      await loadGroups(groupSlug);
    } catch (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut actualiza apartenenta la comunitate.",
        "danger"
      );
    }
  }

  async function deletePost(postId) {
    const confirmed = window.confirm("Sigur vrei sa stergi aceasta postare?");
    if (!confirmed) return;

    const { error } = await supabaseApi.client
      .from("community_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      supabaseApi.showMessage(
        pageMessage,
        error.message || "Nu am putut sterge postarea.",
        "danger"
      );
      return;
    }

    await loadPosts(currentGroupSlug);
  }

  function renderGroups(postCounts) {
    if (!visibleGroups.length) {
      groupsGrid.innerHTML = `
        <div class="col-12">
          <div class="info-card text-center text-muted">
            Nu exista comunitati disponibile pentru profilul tau momentan.
          </div>
        </div>
      `;
      return;
    }

    groupsGrid.innerHTML = visibleGroups
      .map(group => {
        const isJoined = membershipMap.has(group.slug);
        const memberCount = membershipCounts.get(group.slug) || 0;
        return `
          <div class="col-md-6 col-lg-4">
            <div class="info-card h-100 community-group-card" data-group-card="${group.slug}">
              <i class="fa-solid ${escapeHtml(group.icon || "fa-users")}"></i>
              <h5>${escapeHtml(group.name)}</h5>
              <p>${escapeHtml(group.description)}</p>
              <div class="community-group-meta">
                <span>${escapeHtml(group.subject || group.focus_area || "General")}</span>
                <span>${escapeHtml(group.target_class || "Toate clasele")}</span>
                <span>${postCounts[group.slug] || 0} postari</span>
                <span>${memberCount} membri</span>
              </div>
              <div class="d-flex gap-2 mt-3 flex-wrap">
                <button class="btn btn-outline-primary" type="button" data-group-slug="${group.slug}">
                  Deschide feed-ul
                </button>
                <button class="btn ${isJoined ? "btn-outline-secondary" : "btn-outline-success"}" type="button" data-action="join-group" data-group-slug="${group.slug}">
                  ${isJoined ? "Leave" : "Join"}
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    highlightActiveGroup(currentGroupSlug);
  }

  function renderMembersList(members) {
    if (!members.length) {
      membersList.innerHTML = `
        <div class="text-muted">
          Nu exista membri inca. Foloseste butonul Join pentru a intra in comunitate.
        </div>
      `;
      return;
    }

    membersList.innerHTML = members
      .map(member => `
        <div class="community-member-item">
          <div>
            <strong>${escapeHtml(member.full_name || "Utilizator")}</strong>
            <small>${escapeHtml(getRoleLabel(member.role))}${member.class_level ? ` - ${escapeHtml(member.class_level)}` : ""}</small>
          </div>
          <span class="community-member-badge">${escapeHtml(formatDate(member.joined_at))}</span>
        </div>
      `)
      .join("");
  }

  function renderRosterList(students) {
    if (!students.length) {
      rosterList.innerHTML = `
        <div class="text-muted">
          Nu exista elevi inregistrati pentru aceasta clasa momentan.
        </div>
      `;
      return;
    }

    rosterList.innerHTML = students
      .map(student => `
        <div class="community-member-item">
          <div>
            <strong>${escapeHtml(student.full_name || "Elev")}</strong>
            <small>${escapeHtml(student.class_level || "-")}</small>
          </div>
          <span class="community-member-badge">Elev</span>
        </div>
      `)
      .join("");
  }

  function filterGroupsForCurrentUser(groups) {
    const role = supabaseApi.normalizeRole(authState.profile?.role);
    const studentClasses = getStudentClasses();

    if (role !== "elev") {
      return groups;
    }

    return groups.filter(group => {
      const target = normalizeClass(group.target_class);
      return !target || studentClasses.includes(target);
    });
  }

  function updateMembershipState(memberships) {
    membershipMap = new Map();
    membershipCounts = new Map();

    memberships.forEach(membership => {
      membershipCounts.set(
        membership.group_slug,
        (membershipCounts.get(membership.group_slug) || 0) + 1
      );

      if (membership.user_id === authState.user.id) {
        membershipMap.set(membership.group_slug, membership);
      }
    });
  }

  function updateJoinButtonState(groupSlug) {
    if (!joinButton) return;
    const isJoined = membershipMap.has(groupSlug);
    joinButton.className = isJoined
      ? "btn btn-outline-secondary"
      : "btn btn-outline-success";
    joinButton.textContent = isJoined ? "Leave comunitate" : "Join comunitate";
  }

  function getStudentClasses() {
    const fromArray = Array.isArray(authState.profile?.enrolled_classes)
      ? authState.profile.enrolled_classes
      : [];
    const fromPrimary = authState.profile?.class_level ? [authState.profile.class_level] : [];

    return [...new Set([...fromArray, ...fromPrimary].map(normalizeClass).filter(Boolean))];
  }

  function toggleCreateSection() {
    if (!createSection) return;
    createSection.classList.toggle("d-none", !canCreateCommunity());
  }

  function canCreateCommunity() {
    const role = supabaseApi.normalizeRole(authState?.profile?.role);
    return ["admin", "moderator", "organizator", "profesor"].includes(role);
  }

  function canViewClassRoster() {
    const role = supabaseApi.normalizeRole(authState?.profile?.role);
    return ["admin", "moderator", "organizator", "profesor"].includes(role);
  }

  function highlightActiveGroup(groupSlug) {
    document.querySelectorAll("[data-group-card]").forEach(card => {
      card.classList.toggle("community-group-card-active", card.dataset.groupCard === groupSlug);
    });
  }

  function buildSlug(value) {
    return (
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) + `-${Date.now().toString().slice(-5)}`
    );
  }

  function normalizeClass(value) {
    return (value || "")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function getRoleLabel(role) {
    const value = supabaseApi.normalizeRole(role);
    if (value === "organizator") return "Organizator webinar";
    if (value === "moderator") return "Moderator";
    if (value === "admin") return "Admin";
    if (value === "elev") return "Elev";
    return "Profesor";
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return `${date.toLocaleDateString("ro-RO")} ${date.toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
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
