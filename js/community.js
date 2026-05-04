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
  const topicForm = document.querySelector("#communityTopicForm");
  const topicFormMessage = document.querySelector("#communityTopicFormMessage");
  const topicSubmitButton = document.querySelector("#communityTopicSubmitButton");
  const topicsList = document.querySelector("#communityTopicsList");
  const topicsMeta = document.querySelector("#communityTopicsMeta");
  const activeTopicTitle = document.querySelector("#communityActiveTopicTitle");
  const activeTopicDescription = document.querySelector("#communityActiveTopicDescription");
  const topicMessages = document.querySelector("#communityTopicMessages");
  const chatMeta = document.querySelector("#communityChatMeta");
  const chatMessage = document.querySelector("#communityChatMessage");
  const messageForm = document.querySelector("#communityMessageForm");
  const messageSubmitButton = document.querySelector("#communityMessageSubmitButton");
  const messageInput = document.querySelector("#communityMessageContent");

  let authState = null;
  let allGroups = [];
  let visibleGroups = [];
  let currentGroupSlug = "";
  let currentTopicId = "";
  let currentTopics = [];
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

      await supabaseApi.client.from("community_memberships").upsert({
        group_slug: slug,
        user_id: authState.user.id,
      });

      await supabaseApi.client.from("community_topics").insert({
        group_slug: slug,
        created_by: authState.user.id,
        title: `Start pentru ${name}`,
        description: "Tema generala pentru primele intrebari, anunturi si organizare.",
      });

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

    if (!canParticipateInGroup(currentGroupSlug)) {
      supabaseApi.showMessage(
        formMessage,
        "Apasa Join in comunitate inainte sa publici anunturi sau intrebari.",
        "warning"
      );
      return;
    }

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
      await loadPostsFeed(currentGroupSlug);
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
    if (!currentGroupSlug) return;
    await Promise.all([loadPostsFeed(currentGroupSlug), loadTopics(currentGroupSlug, currentTopicId)]);
  });

  joinButton?.addEventListener("click", async () => {
    if (!currentGroupSlug) return;
    await toggleMembership(currentGroupSlug);
  });

  topicForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentGroupSlug) return;
    if (!canParticipateInGroup(currentGroupSlug)) {
      supabaseApi.showMessage(
        topicFormMessage,
        "Trebuie sa intri in comunitate ca sa creezi teme de discutie.",
        "warning"
      );
      return;
    }

    const title = document.querySelector("#communityTopicTitle")?.value.trim();
    const description = document.querySelector("#communityTopicDescription")?.value.trim();

    if (!title) {
      supabaseApi.showMessage(topicFormMessage, "Adauga un titlu pentru tema.", "warning");
      return;
    }

    try {
      topicSubmitButton.disabled = true;
      topicSubmitButton.textContent = "Se creeaza...";
      supabaseApi.clearMessage(topicFormMessage);

      const { data, error } = await supabaseApi.client
        .from("community_topics")
        .insert({
          group_slug: currentGroupSlug,
          created_by: authState.user.id,
          title,
          description,
        })
        .select("id")
        .single();

      if (error) throw error;

      topicForm.reset();
      supabaseApi.showMessage(topicFormMessage, "Tema a fost creata.", "success");
      await loadTopics(currentGroupSlug, data?.id || "");
    } catch (error) {
      supabaseApi.showMessage(
        topicFormMessage,
        error.message || "Nu am putut crea tema de discutie.",
        "danger"
      );
    } finally {
      topicSubmitButton.disabled = false;
      topicSubmitButton.textContent = "Creeaza tema";
    }
  });

  messageForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentGroupSlug || !currentTopicId) return;
    if (!canParticipateInGroup(currentGroupSlug)) {
      supabaseApi.showMessage(
        chatMessage,
        "Trebuie sa intri in comunitate ca sa trimiti mesaje.",
        "warning"
      );
      return;
    }

    const message = messageInput?.value.trim();
    if (!message) {
      supabaseApi.showMessage(chatMessage, "Scrie un mesaj pentru tema activa.", "warning");
      return;
    }

    try {
      messageSubmitButton.disabled = true;
      messageSubmitButton.textContent = "Se trimite...";
      supabaseApi.clearMessage(chatMessage);

      const { error } = await supabaseApi.client.from("community_topic_messages").insert({
        topic_id: currentTopicId,
        group_slug: currentGroupSlug,
        user_id: authState.user.id,
        message,
      });

      if (error) throw error;

      messageForm.reset();
      await loadTopicMessages(currentTopicId);
      await loadTopics(currentGroupSlug, currentTopicId);
    } catch (error) {
      supabaseApi.showMessage(
        chatMessage,
        error.message || "Nu am putut trimite mesajul.",
        "danger"
      );
    } finally {
      messageSubmitButton.disabled = false;
      messageSubmitButton.textContent = "Trimite mesaj";
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

    await loadGroupWorkspace(groupSlug);
  });

  postsList?.addEventListener("click", async event => {
    const deleteButton = event.target.closest("[data-delete-post-id]");
    if (!deleteButton) return;
    await deletePost(deleteButton.dataset.deletePostId);
  });

  topicsList?.addEventListener("click", async event => {
    const topicButton = event.target.closest("[data-topic-id]");
    if (topicButton) {
      await loadTopicMessages(topicButton.dataset.topicId);
      return;
    }

    const deleteTopicButton = event.target.closest("[data-delete-topic-id]");
    if (deleteTopicButton) {
      await deleteTopic(deleteTopicButton.dataset.deleteTopicId);
    }
  });

  topicMessages?.addEventListener("click", async event => {
    const deleteMessageButton = event.target.closest("[data-delete-message-id]");
    if (!deleteMessageButton) return;
    await deleteTopicMessage(deleteMessageButton.dataset.deleteMessageId);
  });

  async function loadGroups(preferredGroupSlug) {
    const [groupsResult, postsResult, membershipsResult] = await Promise.all([
      supabaseApi.client
        .from("community_groups")
        .select("slug, name, description, icon, focus_area, subject, target_class, created_by, created_at")
        .order("created_at", { ascending: false }),
      supabaseApi.client
        .from("community_posts")
        .select("id, group_slug")
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

    const postCounts = (postsResult.data || []).reduce((accumulator, post) => {
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
      await loadGroupWorkspace(targetGroupSlug);
    } else {
      resetFeedState();
    }
  }

  async function loadGroupWorkspace(groupSlug) {
    currentGroupSlug = groupSlug;
    const group = visibleGroups.find(entry => entry.slug === groupSlug);
    if (!group) return;

    feedSection.classList.remove("d-none");
    activeTitle.textContent = group.name;
    activeDescription.textContent = `${group.description} ${group.target_class ? `Clasa tinta: ${group.target_class}.` : ""}`;
    activeBadge.textContent = `${group.subject || group.focus_area || "Comunitate"}${group.target_class ? ` - ${group.target_class}` : ""}`;
    updateJoinButtonState(groupSlug);
    updateInteractionState(groupSlug);
    postsList.innerHTML = '<div class="text-muted">Se incarca postarile...</div>';
    topicsList.innerHTML = '<div class="text-muted">Se incarca temele...</div>';
    topicMessages.innerHTML = '<div class="text-muted">Alege o tema ca sa vezi discutia.</div>';

    await Promise.all([
      loadMembersAndRoster(groupSlug),
      loadPostsFeed(groupSlug),
      loadTopics(groupSlug, currentTopicId),
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

    let profilesMap = new Map();
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
        const canDelete = canModerateEntry(post.user_id);

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

  async function loadTopics(groupSlug, preferredTopicId) {
    currentTopicId = "";
    updateInteractionState(groupSlug);

    const topicsResult = await supabaseApi.client.rpc("get_community_topics", {
      p_group_slug: groupSlug,
    });

    if (topicsResult.error) {
      topicsMeta.textContent = "0 teme";
      topicsList.innerHTML = '<div class="text-muted">Nu am putut incarca temele.</div>';
      topicMessages.innerHTML = '<div class="text-muted">Nu am putut incarca discutia.</div>';
      return;
    }

    currentTopics = topicsResult.data || [];
    topicsMeta.textContent = `${currentTopics.length} teme`;
    renderTopicsList(currentTopics);

    const targetTopicId =
      preferredTopicId && currentTopics.some(topic => topic.id === preferredTopicId)
        ? preferredTopicId
        : currentTopics[0]?.id;

    if (targetTopicId) {
      await loadTopicMessages(targetTopicId);
      return;
    }

    activeTopicTitle.textContent = "Nu exista teme inca";
    activeTopicDescription.textContent = canParticipateInGroup(groupSlug)
      ? "Creeaza prima tema pentru aceasta comunitate."
      : "Intra mai intai in comunitate pentru a crea o tema sau pentru a scrie in chat.";
    chatMeta.textContent = "0 mesaje";
    topicMessages.innerHTML = '<div class="text-muted">Nu exista discutii active inca.</div>';
  }

  async function loadTopicMessages(topicId) {
    currentTopicId = topicId;
    const topic = currentTopics.find(entry => entry.id === topicId);

    if (!topic) {
      topicMessages.innerHTML = '<div class="text-muted">Tema selectata nu mai exista.</div>';
      return;
    }

    activeTopicTitle.textContent = topic.title || "Tema activa";
    activeTopicDescription.textContent =
      topic.description || "Pune intrebari si raspunde pe acest subiect.";

    const messagesResult = await supabaseApi.client.rpc("get_topic_messages", {
      p_topic_id: topicId,
    });

    if (messagesResult.error) {
      chatMeta.textContent = "0 mesaje";
      topicMessages.innerHTML = '<div class="text-muted">Nu am putut incarca mesajele.</div>';
      return;
    }

    const messages = messagesResult.data || [];
    chatMeta.textContent = `${messages.length} mesaje`;
    renderTopicMessages(messages);
    highlightActiveTopic(topicId);
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
      updateInteractionState(groupSlug);
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

    await loadPostsFeed(currentGroupSlug);
  }

  async function deleteTopic(topicId) {
    const confirmed = window.confirm("Sigur vrei sa stergi aceasta tema si tot chatul ei?");
    if (!confirmed) return;

    const { error } = await supabaseApi.client
      .from("community_topics")
      .delete()
      .eq("id", topicId);

    if (error) {
      supabaseApi.showMessage(
        chatMessage,
        error.message || "Nu am putut sterge tema.",
        "danger"
      );
      return;
    }

    await loadTopics(currentGroupSlug, "");
  }

  async function deleteTopicMessage(messageId) {
    const confirmed = window.confirm("Sigur vrei sa stergi acest mesaj?");
    if (!confirmed) return;

    const { error } = await supabaseApi.client
      .from("community_topic_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      supabaseApi.showMessage(
        chatMessage,
        error.message || "Nu am putut sterge mesajul.",
        "danger"
      );
      return;
    }

    await loadTopicMessages(currentTopicId);
    await loadTopics(currentGroupSlug, currentTopicId);
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

  function renderTopicsList(topics) {
    if (!topics.length) {
      topicsList.innerHTML = `
        <div class="text-muted">
          Nu exista teme inca. Creeaza prima tema pentru a porni chatul.
        </div>
      `;
      return;
    }

    topicsList.innerHTML = topics
      .map(topic => {
        const canDelete = canModerateEntry(topic.created_by);
        return `
          <div class="community-topic-card ${currentTopicId === topic.id ? "community-topic-card-active" : ""}">
            <button type="button" class="community-topic-select" data-topic-id="${topic.id}">
              <strong>${escapeHtml(topic.title)}</strong>
              <small>${escapeHtml(topic.description || "Tema dedicata pentru intrebari si raspunsuri.")}</small>
              <span>${escapeHtml(topic.author_name || "Membru")} - ${escapeHtml(topic.message_count)} mesaje</span>
            </button>
            ${canDelete ? `<button class="btn btn-sm btn-outline-danger mt-2" type="button" data-delete-topic-id="${topic.id}">Sterge</button>` : ""}
          </div>
        `;
      })
      .join("");
  }

  function renderTopicMessages(messages) {
    if (!messages.length) {
      topicMessages.innerHTML = `
        <div class="text-muted">
          Nu exista mesaje inca pe aceasta tema. Trimite primul mesaj.
        </div>
      `;
      return;
    }

    topicMessages.innerHTML = messages
      .map(message => {
        const ownMessage = message.user_id === authState.user.id;
        const canDelete = canModerateEntry(message.user_id);
        return `
          <article class="community-chat-message ${ownMessage ? "community-chat-message-own" : ""}">
            <div class="community-chat-message-head">
              <div>
                <strong>${escapeHtml(message.full_name || "Membru")}</strong>
                <small>${escapeHtml(getRoleLabel(message.role || "elev"))} - ${escapeHtml(formatDate(message.created_at))}</small>
              </div>
              ${canDelete ? `<button class="btn btn-sm btn-outline-danger" type="button" data-delete-message-id="${message.id}">Sterge</button>` : ""}
            </div>
            <p class="mb-0">${escapeHtml(message.message)}</p>
          </article>
        `;
      })
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

  function updateInteractionState(groupSlug) {
    const canParticipate = canParticipateInGroup(groupSlug);
    if (submitButton) submitButton.disabled = !canParticipate;
    if (topicSubmitButton) topicSubmitButton.disabled = !canParticipate;
    if (messageSubmitButton) messageSubmitButton.disabled = !canParticipate || !currentTopicId;
    if (messageInput) messageInput.disabled = !canParticipate || !currentTopicId;

    if (!canParticipate) {
      if (messageInput) {
        messageInput.placeholder = "Intra mai intai in comunitate pentru a putea scrie in chat.";
      }
      return;
    }

    if (messageInput) {
      messageInput.placeholder = "Pune o intrebare, ofera un raspuns sau cere ajutor pe aceasta tema.";
    }
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

  function canParticipateInGroup(groupSlug) {
    const role = supabaseApi.normalizeRole(authState?.profile?.role);
    if (["admin", "moderator", "organizator"].includes(role)) {
      return true;
    }
    return membershipMap.has(groupSlug);
  }

  function canModerateEntry(ownerId) {
    const role = supabaseApi.normalizeRole(authState?.profile?.role);
    return ownerId === authState.user.id || ["admin", "moderator"].includes(role);
  }

  function highlightActiveGroup(groupSlug) {
    document.querySelectorAll("[data-group-card]").forEach(card => {
      card.classList.toggle("community-group-card-active", card.dataset.groupCard === groupSlug);
    });
  }

  function highlightActiveTopic(topicId) {
    document.querySelectorAll(".community-topic-card").forEach(card => {
      card.classList.toggle("community-topic-card-active", card.querySelector("[data-topic-id]")?.dataset.topicId === topicId);
    });
    updateInteractionState(currentGroupSlug);
  }

  function resetFeedState() {
    currentGroupSlug = "";
    currentTopicId = "";
    currentTopics = [];
    feedSection.classList.add("d-none");
    postsList.innerHTML = '<div class="text-muted">Nu exista comunitati disponibile pentru acest cont.</div>';
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
