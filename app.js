const OSS_BASE = "https://huzuopinji.oss-cn-hangzhou.aliyuncs.com/portfolio-gallery-site";

const ossAsset = (path) =>
  `${OSS_BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;

const makeMedia = (folder, prefix, count) =>
  Array.from({ length: count }, (_, i) => ({
    type: "image",
    src: ossAsset(`图片/${folder}/${prefix}${i + 1}.png`),
    poster: "",
    alt: `${folder} ${i + 1}`,
  }));

const puzzleMedia    = makeMedia("拼图", "p_", 10);
const photoMedia     = makeMedia("摄影", "r", 10);
const sketchMedia    = makeMedia("素描", "s_", 10);
const oilMedia       = makeMedia("油画", "y_", 10);
const cyberMedia     = makeMedia("赛博朋克", "s", 5);
const render3DMedia  = makeMedia("3D动画渲染", "d", 9);
const voxMedia       = makeMedia("Vox", "v", 4);

const videoMedia = [
  { type: "video", src: ossAsset("图片/Agent.mp4"),    poster: "", alt: "Agent" },
  { type: "video", src: ossAsset("图片/xihu.mp4"),     poster: "", alt: "西湖" },
  { type: "video", src: ossAsset("图片/hongshui.mp4"), poster: "", alt: "洪水" },
  { type: "video", src: ossAsset("图片/huojian.mp4"),  poster: "", alt: "火箭" },
];

const projects = [
  { id: "project-1", title: "拼图作品",   cover: ossAsset("图片/拼图/p_1.png"),      media: puzzleMedia },
  { id: "project-2", title: "摄影作品",   cover: ossAsset("图片/摄影/r1.png"),       media: photoMedia },
  { id: "project-3", title: "素描作品",   cover: ossAsset("图片/素描/s_1.png"),      media: sketchMedia },
  { id: "project-4", title: "油画作品",   cover: ossAsset("图片/油画/y_1.png"),      media: oilMedia },
  { id: "project-5", title: "赛博朋克",   cover: ossAsset("图片/赛博朋克/s1.png"),    media: cyberMedia },
  { id: "project-6", title: "3D动画渲染", cover: ossAsset("图片/3D动画渲染/d1.png"),  media: render3DMedia },
  { id: "project-7", title: "插画流程图", cover: ossAsset("图片/Vox/v1.png"),         media: voxMedia },
  { id: "project-8", title: "视频作品",   cover: ossAsset("图片/Agent.mp4"),          media: videoMedia },
];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  projectIndex: 0,
  slideIndex: 4,
  cardOrder: [],
  drag: null,
  dragFrame: null,
  dismissing: false,
  rail: {
    current: 0,
    target: 0,
    spacing: 190,
    frame: null,
    drag: null,
    suppressClick: false,
    wheelTimer: null,
  },
};

const elements = {
  stage: document.querySelector("[data-media-stage]"),
  viewport: document.querySelector("[data-media-viewport]"),
  track: document.querySelector("[data-media-track]"),
  projectName: document.querySelector("[data-project-name]"),
  slideCount: document.querySelector("[data-slide-count]"),
  projectScroller: document.querySelector("[data-project-scroller]"),
  projectTrack: document.querySelector("[data-project-track]"),
  aboutButton: document.querySelector("[data-about-button]"),
  aboutDialog: document.querySelector("[data-about-dialog]"),
  dialogClose: document.querySelector("[data-dialog-close]"),
  profileOpen: document.querySelector("[data-profile-open]"),
  profileDialog: document.querySelector("[data-profile-dialog]"),
  profilePanel: document.querySelector("[data-profile-panel]"),
  profileClose: document.querySelector("[data-profile-close]"),
  profileCard: document.querySelector("[data-profile-card]"),
};

const profileTilt = {
  frame: null,
  currentX: 0,
  currentY: 0,
  targetX: 0,
  targetY: 0,
  pointerX: 50,
  pointerY: 50,
};

function createPlaceholder(label, detail, isError = false) {
  const placeholder = document.createElement("div");
  const title = document.createElement("strong");
  const description = document.createElement("span");

  placeholder.className = `media-placeholder${isError ? " media-error" : ""}`;
  title.textContent = label;
  description.textContent = detail;
  placeholder.append(title, description);
  return placeholder;
}

function createMediaCard(media, mediaIndex) {
  const card = document.createElement("article");
  card.className = "media-slide";
  card.dataset.mediaIndex = String(mediaIndex);
  card.setAttribute("aria-label", `${mediaIndex + 1} / ${projects[state.projectIndex].media.length}`);

  if (!media.src) {
    const label = media.type === "video" ? "VIDEO" : "IMAGE";
    card.append(createPlaceholder(label, "在 app.js 中替换媒体地址"));
    return card;
  }

  if (media.type === "video") {
    const video = document.createElement("video");
    video.src = media.src;
    video.poster = media.poster || "";
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.setAttribute("aria-label", media.alt);
    video.addEventListener("error", () => {
      card.replaceChildren(createPlaceholder("无法载入视频", "请检查文件地址", true));
    });
    card.append(video);
    return card;
  }

  const image = document.createElement("img");
  const loading = createPlaceholder("正在载入", "图片准备中");
  image.alt = media.alt;
  image.decoding = "async";
  image.fetchPriority = mediaIndex === projects[state.projectIndex].media.length - 1 ? "high" : "auto";
  const revealImage = () => {
    image.classList.add("is-loaded");
    loading.remove();
  };
  const finishImageLoad = async () => {
    try {
      await image.decode();
    } catch {
      // The load event already confirmed the file; reveal even if decode() is unavailable.
    }
    revealImage();
  };
  image.addEventListener("load", finishImageLoad, { once: true });
  image.addEventListener("error", () => {
    card.replaceChildren(createPlaceholder("无法载入图片", "请检查文件地址", true));
  }, { once: true });
  card.append(loading, image);
  image.src = media.src;
  if (image.complete && image.naturalWidth > 0) finishImageLoad();
  return card;
}

function getTopCard() {
  const topMediaIndex = state.cardOrder.at(-1);
  return elements.track.querySelector(`[data-media-index="${topMediaIndex}"]`);
}

function updateIndicators() {
  const project = projects[state.projectIndex];
  elements.projectName.textContent = project.title;
  elements.slideCount.textContent = `${state.slideIndex + 1} / ${project.media.length}`;
}

function updateStack({ instant = false } = {}) {
  const cards = Array.from(elements.track.children);
  const topIndex = state.cardOrder.at(-1);
  const total = state.cardOrder.length;

  cards.forEach((card) => {
    const mediaIndex = Number(card.dataset.mediaIndex);
    const orderIndex = state.cardOrder.indexOf(mediaIndex);
    const depth = total - orderIndex - 1;

    card.classList.toggle("is-top", depth === 0);
    card.tabIndex = depth === 0 ? 0 : -1;
    card.setAttribute("aria-hidden", String(depth !== 0));
    card.style.zIndex = String(orderIndex + 1);
    card.style.setProperty("--stack-rotate", `${depth * 4}deg`);
    card.style.setProperty("--stack-scale", String(1 - depth * 0.055));
    card.style.setProperty("--stack-opacity", String(Math.max(0.5, 1 - depth * 0.11)));

    if (instant) card.classList.add("is-instant");
  });

  if (instant) {
    requestAnimationFrame(() => {
      cards.forEach((card) => card.classList.remove("is-instant"));
    });
  }

  state.slideIndex = topIndex;
  updateIndicators();
}

function renderMedia() {
  const project = projects[state.projectIndex];
  state.cardOrder = project.media.map((_, index) => index);
  state.slideIndex = state.cardOrder.at(-1);
  state.dismissing = false;

  elements.track.replaceChildren(
    ...project.media.map((media, index) => createMediaCard(media, index)),
  );

  updateStack({ instant: true });
}

function resetCardTransform(card) {
  card.style.setProperty("--drag-x", "0px");
  card.style.setProperty("--drag-y", "0px");
  card.style.setProperty("--tilt-x", "0deg");
  card.style.setProperty("--tilt-y", "0deg");
  card.classList.remove("is-dragging", "is-dismissing");
}

function pauseCardVideos(card) {
  card.querySelectorAll("video").forEach(v => { v.pause(); v.currentTime = 0; });
}

function sendTopToBack() {
  if (state.dismissing || state.cardOrder.length < 2) return;
  state.dismissing = true;

  const topCard = getTopCard();
  if (topCard) pauseCardVideos(topCard);

  const movedIndex = state.cardOrder.pop();
  state.cardOrder.unshift(movedIndex);

  updateStack({ instant: reducedMotion.matches });
  state.dismissing = false;
}

function queueDragPaint() {
  if (state.dragFrame !== null) return;
  state.dragFrame = requestAnimationFrame(() => {
    state.dragFrame = null;
    if (!state.drag) return;

    const { card, dx, dy } = state.drag;
    const tiltX = Math.max(-60, Math.min(60, -dy * 0.6));
    const tiltY = Math.max(-60, Math.min(60, dx * 0.6));
    card.style.setProperty("--drag-x", `${dx}px`);
    card.style.setProperty("--drag-y", `${dy}px`);
    card.style.setProperty("--tilt-x", `${tiltX}deg`);
    card.style.setProperty("--tilt-y", `${tiltY}deg`);
  });
}

elements.viewport.addEventListener("pointerdown", (event) => {
  if (reducedMotion.matches || state.dismissing) return;
  const card = event.target.closest(".media-slide.is-top");
  if (!card || event.target.closest("video")) return;

  state.drag = {
    card,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    dx: 0,
    dy: 0,
  };
  card.classList.add("is-dragging");
  card.setPointerCapture?.(event.pointerId);
});

elements.viewport.addEventListener("pointermove", (event) => {
  if (!state.drag || event.pointerId !== state.drag.pointerId) return;
  state.drag.dx = event.clientX - state.drag.startX;
  state.drag.dy = event.clientY - state.drag.startY;
  queueDragPaint();
});

function finishDrag(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) return;
  const { card, dx, dy } = state.drag;
  const distance = Math.hypot(dx, dy);
  state.drag = null;

  if (distance >= 200) {
    resetCardTransform(card);
    sendTopToBack();
    return;
  }

  resetCardTransform(card);
}

elements.viewport.addEventListener("pointerup", finishDrag);
elements.viewport.addEventListener("pointercancel", finishDrag);

elements.viewport.addEventListener("click", (event) => {
  if (reducedMotion.matches || state.dismissing) return;
  const card = event.target.closest(".media-slide.is-top");
  if (!card || event.target.closest("video")) return;
  // ignore if it was a drag (pointer moved significantly)
  if (state.drag) return;
  sendTopToBack();
});

function createProjectCard(project, index) {
  const card = document.createElement("button");
  const preview = document.createElement("span");
  const title = document.createElement("strong");

  card.type = "button";
  card.className = "project-card";
  card.dataset.projectIndex = String(index);
  card.setAttribute("aria-label", `显示${project.title}`);
  preview.className = "card-preview";

  if (project.cover) {
    const isVideoCover = /\.(mp4|webm|mov)$/i.test(project.cover);
    if (isVideoCover) {
      const video = document.createElement("video");
      video.src = project.cover;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;";
      preview.textContent = "";
      preview.append(video);
    } else {
      const img = document.createElement("img");
      img.src = project.cover;
      img.alt = project.title;
      img.loading = "lazy";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;";
      preview.textContent = "";
      preview.append(img);
    }
  } else {
    preview.textContent = "COVER PLACEHOLDER";
  }

  title.textContent = project.title;
  card.append(preview, title);
  card.addEventListener("click", () => {
    if (state.rail.suppressClick) return;
    selectProject(index);
  });
  return card;
}

function measureRail() {
  const firstCard = elements.projectTrack.firstElementChild;
  if (!firstCard) return;
  const gap = Number.parseFloat(getComputedStyle(elements.projectScroller).getPropertyValue("--rail-gap")) || 12;
  const nextSpacing = (isVerticalRail() ? firstCard.offsetHeight : firstCard.offsetWidth) + gap;
  const previousSpacing = state.rail.spacing;

  if (previousSpacing > 0 && nextSpacing !== previousSpacing) {
    state.rail.current = (state.rail.current / previousSpacing) * nextSpacing;
    state.rail.target = (state.rail.target / previousSpacing) * nextSpacing;
  }

  state.rail.spacing = nextSpacing;
}

function isVerticalRail() {
  return window.innerWidth >= 768;
}

function wrapRailPosition(value, totalSpan) {
  return ((value + totalSpan / 2) % totalSpan + totalSpan) % totalSpan - totalSpan / 2;
}

function renderRail() {
  const cards = Array.from(elements.projectTrack.children);
  if (!cards.length) return;

  const vertical = isVerticalRail();
  const totalSpan = state.rail.spacing * cards.length;
  const viewportSpan = vertical
    ? elements.projectScroller.clientHeight
    : elements.projectScroller.clientWidth;
  const halfViewport = Math.max(1, viewportSpan / 2);
  const arcDepth = vertical
    ? Math.min(92, Math.max(54, elements.projectScroller.clientWidth * 0.24))
    : 0;

  cards.forEach((card, index) => {
    const position = wrapRailPosition(index * state.rail.spacing - state.rail.current, totalSpan);
    const curve = Math.min(1, Math.abs(position) / halfViewport);
    const rotation = -Math.sign(position) * curve * (vertical ? 2 : 5);
    const scale = 1 - curve * 0.08;
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    const x = vertical ? -(1 - curve * curve) * arcDepth : position;
    const y = vertical ? position : curve * curve * 22;
    const translateX = x - cardWidth / 2;
    const translateY = vertical ? y - cardHeight / 2 : y;

    card.style.zIndex = String(Math.max(1, 100 - Math.round(Math.abs(position) / 10)));
    card.style.opacity = String(Math.max(0.52, 1 - curve * 0.34));
    card.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) rotateZ(${rotation}deg) scale(${scale})`;
  });
}

function requestRailFrame() {
  if (reducedMotion.matches) {
    state.rail.current = state.rail.target;
    renderRail();
    return;
  }
  if (state.rail.frame !== null) return;
  state.rail.frame = requestAnimationFrame(animateRail);
}

function animateRail() {
  state.rail.frame = null;
  state.rail.current += (state.rail.target - state.rail.current) * 0.1;
  renderRail();

  if (Math.abs(state.rail.target - state.rail.current) > 0.1 || state.rail.drag) {
    state.rail.frame = requestAnimationFrame(animateRail);
    return;
  }

  state.rail.current = state.rail.target;
  renderRail();
}

function snapRail() {
  state.rail.target = Math.round(state.rail.target / state.rail.spacing) * state.rail.spacing;
  requestRailFrame();
}

elements.aboutButton.addEventListener("click", openProfile);

function centerRailOnProject(index) {
  const currentSlot = Math.round(state.rail.target / state.rail.spacing);
  const cycle = Math.round((currentSlot - index) / projects.length);
  state.rail.target = (index + cycle * projects.length) * state.rail.spacing;
  requestRailFrame();
}

function renderProjects() {
  elements.projectTrack.replaceChildren(...projects.map(createProjectCard));
  updateProjectSelection();
  measureRail();
  renderRail();
}

function updateProjectSelection() {
  Array.from(elements.projectTrack.children).forEach((card, index) => {
    const active = index === state.projectIndex;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-pressed", String(active));
  });
}

function selectProject(index) {
  const total = projects.length;
  state.projectIndex = (index + total) % total;
  renderMedia();
  updateProjectSelection();
  centerRailOnProject(state.projectIndex);

  const isWide = projects[state.projectIndex].id === "project-7";
  elements.viewport.classList.toggle("is-wide", isWide);
  elements.stage.classList.toggle("is-wide", isWide);
}

elements.stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    sendTopToBack();
  }
});

elements.projectScroller.addEventListener("pointerdown", (event) => {
  const vertical = isVerticalRail();
  state.rail.drag = {
    pointerId: event.pointerId,
    axis: vertical ? "y" : "x",
    startPosition: vertical ? event.clientY : event.clientX,
    startTarget: state.rail.target,
    moved: false,
  };
  elements.projectScroller.classList.add("is-dragging");
});

elements.projectScroller.addEventListener("pointermove", (event) => {
  if (!state.rail.drag || event.pointerId !== state.rail.drag.pointerId) return;
  const currentPosition = state.rail.drag.axis === "y" ? event.clientY : event.clientX;
  const distance = state.rail.drag.startPosition - currentPosition;
  if (!state.rail.drag.moved && Math.abs(distance) > 5) {
    state.rail.drag.moved = true;
    elements.projectScroller.setPointerCapture?.(event.pointerId);
  }
  state.rail.target = state.rail.drag.startTarget + distance;
  requestRailFrame();
});

function finishRailDrag(event) {
  if (!state.rail.drag || event.pointerId !== state.rail.drag.pointerId) return;
  const moved = state.rail.drag.moved;
  state.rail.drag = null;
  elements.projectScroller.classList.remove("is-dragging");
  snapRail();

  if (moved) {
    state.rail.suppressClick = true;
    window.setTimeout(() => {
      state.rail.suppressClick = false;
    }, 120);
  }
}

elements.projectScroller.addEventListener("pointerup", finishRailDrag);
elements.projectScroller.addEventListener("pointercancel", finishRailDrag);

elements.projectScroller.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = isVerticalRail()
    ? event.deltaY
    : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  state.rail.target += delta * 0.55;
  requestRailFrame();
  window.clearTimeout(state.rail.wheelTimer);
  state.rail.wheelTimer = window.setTimeout(snapRail, 110);
}, { passive: false });

elements.projectScroller.addEventListener("keydown", (event) => {
  const previousKey = isVerticalRail() ? "ArrowUp" : "ArrowLeft";
  const nextKey = isVerticalRail() ? "ArrowDown" : "ArrowRight";
  if (event.key === previousKey || event.key === nextKey) {
    event.preventDefault();
    state.rail.target += event.key === nextKey ? state.rail.spacing : -state.rail.spacing;
    snapRail();
  }
  if (event.key === "Home") {
    event.preventDefault();
    state.rail.target = 0;
    requestRailFrame();
  }
});



function paintProfileTilt() {
  profileTilt.frame = null;
  profileTilt.currentX += (profileTilt.targetX - profileTilt.currentX) * 0.16;
  profileTilt.currentY += (profileTilt.targetY - profileTilt.currentY) * 0.16;

  elements.profileCard.style.setProperty("--profile-rotate-x", `${profileTilt.currentX.toFixed(2)}deg`);
  elements.profileCard.style.setProperty("--profile-rotate-y", `${profileTilt.currentY.toFixed(2)}deg`);
  elements.profileCard.style.setProperty("--profile-pointer-x", `${profileTilt.pointerX.toFixed(1)}%`);
  elements.profileCard.style.setProperty("--profile-pointer-y", `${profileTilt.pointerY.toFixed(1)}%`);

  const unsettled =
    Math.abs(profileTilt.targetX - profileTilt.currentX) > 0.02 ||
    Math.abs(profileTilt.targetY - profileTilt.currentY) > 0.02;

  if (unsettled) profileTilt.frame = requestAnimationFrame(paintProfileTilt);
}

function requestProfileTiltFrame() {
  if (reducedMotion.matches || window.innerWidth < 768 || profileTilt.frame !== null) return;
  profileTilt.frame = requestAnimationFrame(paintProfileTilt);
}

function resetProfileTilt() {
  profileTilt.targetX = 0;
  profileTilt.targetY = 0;
  profileTilt.pointerX = 50;
  profileTilt.pointerY = 50;

  if (reducedMotion.matches || window.innerWidth < 768) {
    profileTilt.currentX = 0;
    profileTilt.currentY = 0;
    elements.profileCard.style.setProperty("--profile-rotate-x", "0deg");
    elements.profileCard.style.setProperty("--profile-rotate-y", "0deg");
    elements.profileCard.style.setProperty("--profile-pointer-x", "50%");
    elements.profileCard.style.setProperty("--profile-pointer-y", "50%");
    return;
  }

  requestProfileTiltFrame();
}

function openProfile() {
  elements.profileOpen.setAttribute("aria-expanded", "true");
  resetProfileTilt();

  if (typeof elements.profileDialog.showModal === "function") {
    elements.profileDialog.showModal();
  } else {
    elements.profileDialog.setAttribute("open", "");
  }
}

function closeProfile() {
  if (elements.profileDialog.open && typeof elements.profileDialog.close === "function") {
    elements.profileDialog.close();
  } else {
    elements.profileDialog.removeAttribute("open");
  }
}

elements.profileClose.addEventListener("click", closeProfile);
elements.profileDialog.addEventListener("close", () => {
  elements.profileOpen.setAttribute("aria-expanded", "false");
  resetProfileTilt();
});
elements.profileDialog.addEventListener("click", (event) => {
  if (event.target === elements.profileDialog) closeProfile();
});

elements.profileCard.addEventListener("pointermove", (event) => {
  if (reducedMotion.matches || window.innerWidth < 768) return;
  const bounds = elements.profileCard.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));

  profileTilt.targetX = (0.5 - y) * 14;
  profileTilt.targetY = (x - 0.5) * 16;
  profileTilt.pointerX = x * 100;
  profileTilt.pointerY = y * 100;
  requestProfileTiltFrame();
});
elements.profileCard.addEventListener("pointerleave", resetProfileTilt);

reducedMotion.addEventListener("change", () => {
  if (state.drag) {
    resetCardTransform(state.drag.card);
    state.drag = null;
  }
  updateStack({ instant: true });
  requestRailFrame();
  resetProfileTilt();
});

renderProjects();
renderMedia();

function initParticleField() {
  const canvas = document.querySelector("[data-particle-field]");
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;

  const particleCount = 300;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let particles = [];
  let frame = null;
  let width = 0;
  let height = 0;
  let accent = [196, 74, 50];

  function readAccent() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const hex = raw.replace("#", "");
    if (hex.length === 6) {
      accent = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    }
  }

  function makeParticles() {
    particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      depth: 0.2 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * 0.12,
      driftY: (Math.random() - 0.5) * 0.08,
      pulse: 0.2 + Math.random() * 0.55,
    }));
  }

  function resizeParticles() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    readAccent();
    makeParticles();
    paintParticles(performance.now());
  }

  function paintParticles(time) {
    context.clearRect(0, 0, width, height);
    pointer.x += (pointer.targetX - pointer.x) * 0.035;
    pointer.y += (pointer.targetY - pointer.y) * 0.035;

    particles.forEach((particle) => {
      if (!reducedMotion.matches) {
        particle.x += particle.driftX * particle.depth;
        particle.y += particle.driftY * particle.depth;
        if (particle.x < -4) particle.x = width + 4;
        if (particle.x > width + 4) particle.x = -4;
        if (particle.y < -4) particle.y = height + 4;
        if (particle.y > height + 4) particle.y = -4;
      }

      const waveX = Math.sin(time * 0.0003 + particle.phase) * 7 * particle.depth;
      const waveY = Math.cos(time * 0.00024 + particle.phase) * 5 * particle.depth;
      const x = particle.x + waveX - pointer.x * 20 * particle.depth;
      const y = particle.y + waveY - pointer.y * 14 * particle.depth;
      const radius = 0.45 + particle.depth * 1.35;
      const alpha = (0.035 + particle.depth * 0.085) * (0.78 + Math.sin(time * 0.0008 + particle.phase) * particle.pulse);

      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${Math.max(0.018, alpha)})`;
      context.fill();
    });
  }

  function animateParticles(time) {
    paintParticles(time);
    frame = requestAnimationFrame(animateParticles);
  }

  function startParticles() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    paintParticles(performance.now());
    if (!reducedMotion.matches) frame = requestAnimationFrame(animateParticles);
  }

  function onPointerMove(event) {
    pointer.targetX = event.clientX / Math.max(1, width) - 0.5;
    pointer.targetY = event.clientY / Math.max(1, height) - 0.5;
  }

  function resetPointer() {
    pointer.targetX = 0;
    pointer.targetY = 0;
  }

  resizeParticles();
  startParticles();
  window.addEventListener("resize", resizeParticles, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("mouseleave", resetPointer);
  reducedMotion.addEventListener("change", startParticles);

  window.addEventListener("pagehide", () => {
    if (frame !== null) cancelAnimationFrame(frame);
    window.removeEventListener("resize", resizeParticles);
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("mouseleave", resetPointer);
    reducedMotion.removeEventListener("change", startParticles);
  }, { once: true });
}

initParticleField();

document.addEventListener("lanyard-card-activate", sendTopToBack);

const railResizeObserver = new ResizeObserver(() => {
  measureRail();
  renderRail();
});
railResizeObserver.observe(elements.projectScroller);
