const state = {
  settings: null,
  projects: [],
  posts: [],
  tags: [],
  currentPost: null,
  removedTags: [],
};

const $ = (id) => document.getElementById(id);
let previewTimer = null;

function setStatus(text) {
  $("publish-output").textContent = text || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeTagName(value) {
  return String(value || "").trim();
}

function dedupeTagList(values) {
  return [...new Set((values || []).map(normalizeTagName).filter(Boolean))];
}

function projectSlug(project, index) {
  const base = (project.title || project.mark || `project-${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `project-${index + 1}`;
}

function setPreviewPlaceholder(text = "这里会显示 Markdown 预览。") {
  $("post-preview").innerHTML = `<div class="preview-empty">${escapeHtml(text)}</div>`;
}

function getCurrentPostTagsFromInput() {
  return dedupeTagList(($("post-tags").value || "").split(","));
}

function setCurrentPostTags(tags) {
  $("post-tags").value = dedupeTagList(tags).join(", ");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
}

async function updateMarkdownPreview(markdown) {
  if (!markdown.trim()) {
    setPreviewPlaceholder();
    return;
  }
  const result = await api("/api/markdown-preview", {
    method: "POST",
    body: JSON.stringify({ markdown }),
  });
  $("post-preview").innerHTML = result.html || "";
}

function schedulePreview(markdown) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    updateMarkdownPreview(markdown).catch((error) => {
      setPreviewPlaceholder(`预览失败：${error.message}`);
    });
  }, 180);
}

async function suggestCommitMessage() {
  const result = await api("/api/commit-message");
  if (!result.hasChanges) {
    $("publish-message").value = "";
    setStatus("当前没有可提交的改动。");
    return "";
  }
  $("publish-message").value = result.message || "";
  setStatus(`已生成提交说明：${result.message}`);
  return result.message || "";
}

function refreshTagHint() {
  const names = state.tags.map((tag) => tag.name).filter(Boolean);
  $("tag-hint").textContent = names.length ? `当前标签库：${names.join(" / ")}` : "当前还没有标签。";
}

function renderPostTagLibrary() {
  const container = $("post-tag-library");
  const selectedTags = new Set(getCurrentPostTagsFromInput());
  const registryNames = dedupeTagList(state.tags.map((tag) => tag.name));
  const rawInput = $("post-tags").value || "";
  const currentToken = normalizeTagName(rawInput.split(",").at(-1));

  container.innerHTML = "";

  registryNames.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-chip${selectedTags.has(name) ? " active" : ""}`;
    button.textContent = name;
    button.addEventListener("click", () => {
      const next = selectedTags.has(name)
        ? [...selectedTags].filter((tag) => tag !== name)
        : [...selectedTags, name];
      setCurrentPostTags(next);
      renderPostTagLibrary();
    });
    container.appendChild(button);
  });

  if (currentToken && !registryNames.includes(currentToken) && !selectedTags.has(currentToken)) {
    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.className = "tag-chip create";
    createButton.textContent = `新增: ${currentToken}`;
    createButton.addEventListener("click", () => {
      setCurrentPostTags([...selectedTags, currentToken]);
      renderPostTagLibrary();
    });
    container.appendChild(createButton);
  }
}

function bindTabs() {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((x) => x.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`[data-panel="${button.dataset.tab}"]`).classList.add("active");
    });
  });
}

function renderSettings() {
  const settings = state.settings;
  $("site-title").value = settings.title || "";
  $("site-subtitle").value = settings.subtitle || "";
  $("profile-name").value = settings.profile.name || "";
  $("profile-bio").value = settings.profile.bio || "";
  $("theme-hue").value = settings.themeColor.hue ?? 205;
  $("avatar-preview").src = settings.profile.avatar || "";
  $("banner-preview").src = settings.banner.src || "";
}

function renderPostList() {
  const container = $("post-list");
  container.innerHTML = "";
  for (const post of state.posts) {
    const button = document.createElement("button");
    button.className = `list-item${state.currentPost?.slug === post.slug ? " active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(post.title || post.slug)}</strong><small>${escapeHtml(post.published || "")}</small>`;
    button.addEventListener("click", () => {
      state.currentPost = structuredClone(post);
      renderPostList();
      renderPostEditor();
    });
    container.appendChild(button);
  }
}

function renderPostEditor() {
  const post = state.currentPost || {
    slug: "",
    title: "",
    published: new Date().toISOString().slice(0, 10),
    description: "",
    image: "",
    tags: [],
    category: "",
    draft: false,
    body: "",
  };
  $("post-title").value = post.title || "";
  $("post-slug").value = post.slug || "";
  $("post-published").value = post.published || "";
  $("post-description").value = post.description || "";
  $("post-image").value = post.image || "";
  $("post-tags").value = Array.isArray(post.tags) ? post.tags.join(", ") : "";
  $("post-category").value = post.category || "";
  $("post-draft").checked = Boolean(post.draft);
  $("post-body").value = post.body || "";
  $("post-cover-preview").src = post.image || "";
  schedulePreview(post.body || "");
  refreshTagHint();
  renderPostTagLibrary();
}

function renderTags() {
  const container = $("tag-list");
  container.innerHTML = "";
  state.tags.forEach((tag, index) => {
    const item = document.createElement("div");
    item.className = "tag-admin-item";
    item.innerHTML = `
      <div class="tag-admin-main">
        <label>
          <span>标签名</span>
          <input data-tag-field="name" data-index="${index}" type="text" value="${escapeHtml(tag.name || "")}">
        </label>
        <div class="tag-meta-pill">${Number(tag.count || 0)} 篇文章</div>
      </div>
      <div class="tag-admin-actions">
        <button class="danger" data-remove-tag="${index}">删除</button>
      </div>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll("[data-tag-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const target = event.currentTarget;
      const index = Number(target.dataset.index);
      state.tags[index].name = target.value;
      refreshTagHint();
      renderPostTagLibrary();
    });
  });

  container.querySelectorAll("[data-remove-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeTag);
      const [removed] = state.tags.splice(index, 1);
      if (removed?.originalName) {
        state.removedTags.push(removed.originalName);
      }
      renderTags();
    });
  });

  refreshTagHint();
  renderPostTagLibrary();
}

function renderProjects() {
  const container = $("project-list");
  container.innerHTML = "";
  state.projects.forEach((project, index) => {
    const item = document.createElement("div");
    item.className = "project-item";
    item.innerHTML = `
      <div class="project-head">
        <h3>${escapeHtml(project.title || `项目 ${index + 1}`)}</h3>
        <button class="danger" data-remove="${index}">删除</button>
      </div>
      <div class="project-grid">
        <label><span>标题</span><input data-field="title" data-index="${index}" type="text" value="${escapeHtml(project.title || "")}"></label>
        <label><span>状态</span><input data-field="status" data-index="${index}" type="text" value="${escapeHtml(project.status || "")}"></label>
        <label><span>一句话</span><input data-field="tagline" data-index="${index}" type="text" value="${escapeHtml(project.tagline || "")}"></label>
        <label><span>标记</span><input data-field="mark" data-index="${index}" type="text" value="${escapeHtml(project.mark || "")}"></label>
        <label><span>GitHub 链接</span><input data-field="github" data-index="${index}" type="text" value="${escapeHtml(project.github || "")}"></label>
        <label><span>Demo 链接</span><input data-field="demo" data-index="${index}" type="text" value="${escapeHtml(project.demo || "")}"></label>
        <label><span>技术栈</span><input data-field="stack" data-index="${index}" type="text" value="${escapeHtml((project.stack || []).join(", "))}"></label>
        <label><span>渐变色</span><input data-field="accent" data-index="${index}" type="text" value="${escapeHtml(project.accent || "")}"></label>
      </div>
      <div class="cover-row project-cover-grid">
        <div class="cover-preview-wrap">
          <img src="${escapeHtml(project.cover || "")}" alt="project cover preview" data-project-preview="${index}" />
        </div>
        <div class="cover-controls">
          <label class="stacked">
            <span>项目封面路径</span>
            <input data-field="cover" data-index="${index}" type="text" value="${escapeHtml(project.cover || "")}">
          </label>
          <input data-project-upload="${index}" type="file" accept="image/*" />
        </div>
      </div>
      <label class="stacked"><span>项目说明</span><textarea data-field="description" data-index="${index}" rows="3">${escapeHtml(project.description || "")}</textarea></label>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const target = event.currentTarget;
      const index = Number(target.dataset.index);
      const key = target.dataset.field;
      state.projects[index][key] =
        key === "stack"
          ? target.value.split(",").map((x) => x.trim()).filter(Boolean)
          : target.value;
      if (key === "cover") {
        const preview = container.querySelector(`[data-project-preview="${index}"]`);
        if (preview) preview.src = target.value;
      }
    });
  });

  container.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.remove);
      state.projects.splice(index, 1);
      renderProjects();
    });
  });

  container.querySelectorAll("[data-project-upload]").forEach((input) => {
    input.addEventListener("change", async (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      const index = Number(event.currentTarget.dataset.projectUpload);
      const slug = projectSlug(state.projects[index], index);
      const assetPath = await uploadImage("project-cover", file, { slug });
      state.projects[index].cover = assetPath;
      renderProjects();
      setStatus("项目封面已上传，记得保存项目。");
    });
  });
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImage(kind, file, extra = {}) {
  const dataUrl = await readFileAsDataUrl(file);
  const result = await api("/api/upload-image", {
    method: "POST",
    body: JSON.stringify({ kind, fileName: file.name, dataUrl, ...extra }),
  });
  return result.path;
}

function collectSettings() {
  return {
    ...state.settings,
    title: $("site-title").value.trim(),
    subtitle: $("site-subtitle").value.trim(),
    themeColor: {
      ...state.settings.themeColor,
      hue: Number($("theme-hue").value || 205),
    },
    banner: {
      ...state.settings.banner,
    },
    profile: {
      ...state.settings.profile,
      name: $("profile-name").value.trim(),
      bio: $("profile-bio").value.trim(),
    },
  };
}

function collectCurrentPost() {
  return {
    ...state.currentPost,
    title: $("post-title").value.trim(),
    slug: $("post-slug").value.trim(),
    published: $("post-published").value,
    description: $("post-description").value.trim(),
    image: $("post-image").value.trim(),
    tags: getCurrentPostTagsFromInput(),
    category: $("post-category").value.trim(),
    draft: $("post-draft").checked,
    body: $("post-body").value,
  };
}

function collectTagOperations() {
  const operations = [];
  const seenNames = new Set();

  for (const tag of state.tags) {
    const name = normalizeTagName(tag.name);
    if (!name || seenNames.has(name)) continue;
    seenNames.add(name);

    if (!tag.originalName) {
      operations.push({ type: "create", name });
      continue;
    }

    if (tag.originalName !== name) {
      operations.push({ type: "rename", from: tag.originalName, to: name });
    }
  }

  for (const name of [...new Set(state.removedTags.map(normalizeTagName).filter(Boolean))]) {
    operations.push({ type: "delete", name });
  }

  return operations;
}

async function bootstrap() {
  const data = await api("/api/bootstrap");
  state.settings = data.settings;
  state.projects = data.projects;
  state.posts = data.posts;
  state.tags = (data.tags || []).map((tag) => ({
    originalName: tag.name,
    name: tag.name,
    count: tag.count,
  }));
  state.removedTags = [];
  state.currentPost = state.posts[0] ? structuredClone(state.posts[0]) : null;
  renderSettings();
  renderPostList();
  renderPostEditor();
  renderTags();
  renderProjects();
}

function bindActions() {
  $("save-settings").addEventListener("click", async () => {
    state.settings = collectSettings();
    await api("/api/settings", { method: "POST", body: JSON.stringify({ settings: state.settings }) });
    setStatus("站点设置已保存。");
  });

  $("avatar-upload").addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const assetPath = await uploadImage("avatar", file);
    state.settings.profile.avatar = assetPath;
    $("avatar-preview").src = assetPath;
    setStatus("头像已上传，记得保存站点设置。");
  });

  $("banner-upload").addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const assetPath = await uploadImage("banner", file);
    state.settings.banner.src = assetPath;
    $("banner-preview").src = assetPath;
    setStatus("头图已上传，记得保存站点设置。");
  });

  $("new-post").addEventListener("click", () => {
    state.currentPost = {
      slug: "",
      title: "",
      published: new Date().toISOString().slice(0, 10),
      description: "",
      image: "",
      tags: [],
      category: "",
      draft: false,
      body: "",
    };
    renderPostList();
    renderPostEditor();
  });

  $("save-post").addEventListener("click", async () => {
    const payload = collectCurrentPost();
    payload.originalSlug = state.currentPost?.slug || "";
    const result = await api("/api/post", { method: "POST", body: JSON.stringify(payload) });
    await bootstrap();
    const updated = state.posts.find((post) => post.slug === result.slug);
    state.currentPost = updated ? structuredClone(updated) : state.currentPost;
    renderPostList();
    renderPostEditor();
    setStatus("文章已保存。");
  });

  $("delete-post").addEventListener("click", async () => {
    if (!state.currentPost?.slug) return;
    if (!window.confirm(`删除文章 ${state.currentPost.title || state.currentPost.slug} ?`)) return;
    await api("/api/delete-post", { method: "POST", body: JSON.stringify({ slug: state.currentPost.slug }) });
    await bootstrap();
    setStatus("文章已删除。");
  });

  $("post-cover-upload").addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const payload = collectCurrentPost();
    const slug = payload.slug || payload.title;
    if (!slug) {
      window.alert("先填标题或 slug，再上传封面。");
      return;
    }
    const assetPath = await uploadImage("post-cover", file, { slug });
    $("post-image").value = assetPath;
    $("post-cover-preview").src = assetPath;
    setStatus("文章封面已上传，记得保存文章。");
  });

  $("post-body").addEventListener("input", (event) => {
    schedulePreview(event.currentTarget.value);
  });

  $("post-tags").addEventListener("input", () => {
    renderPostTagLibrary();
  });

  $("post-tags").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setCurrentPostTags(getCurrentPostTagsFromInput());
    renderPostTagLibrary();
  });

  $("post-tags").addEventListener("blur", () => {
    setCurrentPostTags(getCurrentPostTagsFromInput());
    renderPostTagLibrary();
  });

  $("add-tag").addEventListener("click", () => {
    state.tags.push({
      originalName: "",
      name: "新标签",
      count: 0,
    });
    renderTags();
  });

  $("save-tags").addEventListener("click", async () => {
    const operations = collectTagOperations();
    if (!operations.length) {
      setStatus("标签没有变化。");
      return;
    }
    const result = await api("/api/tags", {
      method: "POST",
      body: JSON.stringify({ operations }),
    });
    state.posts = result.posts || state.posts;
    state.tags = (result.tags || []).map((tag) => ({
      originalName: tag.name,
      name: tag.name,
      count: tag.count,
    }));
    state.removedTags = [];
    if (state.currentPost?.slug) {
      const updated = state.posts.find((post) => post.slug === state.currentPost.slug);
      if (updated) state.currentPost = structuredClone(updated);
    }
    renderPostList();
    renderPostEditor();
    renderTags();
    setStatus("标签库已保存，并同步到相关文章。");
  });

  $("add-project").addEventListener("click", () => {
    state.projects.push({
      title: "新项目",
      tagline: "",
      description: "",
      stack: [],
      github: "",
      demo: "",
      cover: "",
      status: "项目",
      mark: "NP",
      accent: "",
    });
    renderProjects();
  });

  $("save-projects").addEventListener("click", async () => {
    const result = await api("/api/projects", { method: "POST", body: JSON.stringify({ projects: state.projects }) });
    state.projects = result.projects;
    renderProjects();
    setStatus("项目列表已保存。");
  });

  $("suggest-message").addEventListener("click", async () => {
    await suggestCommitMessage();
  });

  $("validate-site").addEventListener("click", async () => {
    setStatus("正在本地检查...");
    const result = await api("/api/validate", { method: "POST", body: JSON.stringify({}) });
    setStatus(result.output || (result.ok ? "检查通过。" : "检查失败。"));
  });

  $("publish-site").addEventListener("click", async () => {
    let message = $("publish-message").value.trim();
    if (!message) {
      message = await suggestCommitMessage();
    }
    setStatus("正在提交并推送...");
    const result = await api("/api/publish", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    if (result.commitMessage) {
      $("publish-message").value = result.commitMessage;
    }
    setStatus([result.message, result.commitMessage ? `commit: ${result.commitMessage}` : "", result.output].filter(Boolean).join("\n\n"));
  });
}

bindTabs();
bindActions();
bootstrap().catch((error) => {
  setStatus(error.message);
  setPreviewPlaceholder(`加载失败：${error.message}`);
});
