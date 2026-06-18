const state = {
  settings: null,
  projects: [],
  posts: [],
  currentPost: null,
};

const $ = (id) => document.getElementById(id);

function setStatus(text) {
  $("publish-output").textContent = text || "";
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
    button.innerHTML = `<strong>${post.title || post.slug}</strong><small>${post.published || ""}</small>`;
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
}

function renderProjects() {
  const container = $("project-list");
  container.innerHTML = "";
  state.projects.forEach((project, index) => {
    const item = document.createElement("div");
    item.className = "project-item";
    item.innerHTML = `
      <div class="project-head">
        <h3>${project.title || `项目 ${index + 1}`}</h3>
        <button class="danger" data-remove="${index}">删除</button>
      </div>
      <div class="project-grid">
        <label><span>标题</span><input data-field="title" data-index="${index}" type="text" value="${project.title || ""}"></label>
        <label><span>状态</span><input data-field="status" data-index="${index}" type="text" value="${project.status || ""}"></label>
        <label><span>一句话</span><input data-field="tagline" data-index="${index}" type="text" value="${project.tagline || ""}"></label>
        <label><span>技术栈</span><input data-field="stack" data-index="${index}" type="text" value="${(project.stack || []).join(", ")}"></label>
        <label><span>GitHub</span><input data-field="github" data-index="${index}" type="text" value="${project.github || ""}"></label>
        <label><span>Demo</span><input data-field="demo" data-index="${index}" type="text" value="${project.demo || ""}"></label>
        <label><span>标记</span><input data-field="mark" data-index="${index}" type="text" value="${project.mark || ""}"></label>
        <label><span>Accent</span><input data-field="accent" data-index="${index}" type="text" value="${project.accent || ""}"></label>
      </div>
      <label class="stacked"><span>描述</span><textarea data-field="description" data-index="${index}" rows="3">${project.description || ""}</textarea></label>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const target = event.currentTarget;
      const index = Number(target.dataset.index);
      const key = target.dataset.field;
      state.projects[index][key] = key === "stack" ? target.value.split(",").map((x) => x.trim()).filter(Boolean) : target.value;
    });
  });

  container.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.remove);
      state.projects.splice(index, 1);
      renderProjects();
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
    tags: $("post-tags").value.split(",").map((x) => x.trim()).filter(Boolean),
    category: $("post-category").value.trim(),
    draft: $("post-draft").checked,
    body: $("post-body").value,
  };
}

async function bootstrap() {
  const data = await api("/api/bootstrap");
  state.settings = data.settings;
  state.projects = data.projects;
  state.posts = data.posts;
  state.currentPost = state.posts[0] ? structuredClone(state.posts[0]) : null;
  renderSettings();
  renderPostList();
  renderPostEditor();
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
    state.currentPost = structuredClone(updated);
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

  $("add-project").addEventListener("click", () => {
    state.projects.push({
      title: "新项目",
      tagline: "",
      description: "",
      stack: [],
      github: "",
      demo: "",
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

  $("validate-site").addEventListener("click", async () => {
    setStatus("正在本地检查...");
    const result = await api("/api/validate", { method: "POST", body: JSON.stringify({}) });
    setStatus(result.output || (result.ok ? "检查通过。" : "检查失败。"));
  });

  $("publish-site").addEventListener("click", async () => {
    setStatus("正在提交并推送...");
    const result = await api("/api/publish", {
      method: "POST",
      body: JSON.stringify({ message: $("publish-message").value.trim() || "Update site content" }),
    });
    setStatus([result.message, result.output].filter(Boolean).join("\n\n"));
  });
}

bindTabs();
bindActions();
bootstrap().catch((error) => {
  setStatus(error.message);
});
