(() => {
  const canvas = document.querySelector("[data-lanyard-canvas]");
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cardImage = new Image();
  cardImage.src = "https://huzuopinji.oss-cn-hangzhou.aliyuncs.com/portfolio-gallery-site/lanyard-card.png";

  const pointCount = 6;
  const points = [];
  const pointer = {
    id: null,
    pressed: false,
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    previousX: 0,
    previousY: 0,
    offsetX: 0,
    offsetY: 0,
  };

  let width = 0;
  let height = 0;
  let segmentLength = 30;
  let cardWidth = 105;
  let cardHeight = 90;
  let cardAngle = 0;
  let frame = null;
  let lastTime = performance.now();

  function activateCard() {
    document.dispatchEvent(new CustomEvent("lanyard-card-activate"));
  }

  function resetPoints() {
    const anchorX = width / 2;
    const anchorY = -18;
    points.length = 0;
    for (let index = 0; index < pointCount; index += 1) {
      const y = anchorY + index * segmentLength;
      points.push({ x: anchorX, y, previousX: anchorX, previousY: y, pinned: index === 0 });
    }
    if (!reduceMotion.matches) points.at(-1).previousX -= Math.min(11, width * 0.05);
    cardAngle = 0;
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    cardWidth = Math.min(109, width * 0.27);
    cardHeight = cardWidth * 451 / 524;
    segmentLength = Math.min(30, Math.max(24, (height - cardHeight - 29) / (pointCount - 1)));
    resetPoints();
    paint();
  }

  function constrainPoints() {
    for (let iteration = 0; iteration < 9; iteration += 1) {
      points[0].x = width / 2;
      points[0].y = -18;
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        const distance = Math.max(0.001, Math.hypot(dx, dy));
        const difference = (distance - segmentLength) / distance;
        if (previous.pinned) {
          current.x -= dx * difference;
          current.y -= dy * difference;
        } else if (pointer.dragging && index === points.length - 1) {
          previous.x += dx * difference;
          previous.y += dy * difference;
        } else {
          const correctionX = dx * difference * 0.5;
          const correctionY = dy * difference * 0.5;
          previous.x += correctionX;
          previous.y += correctionY;
          current.x -= correctionX;
          current.y -= correctionY;
        }
      }
      if (pointer.dragging) {
        const end = points.at(-1);
        end.x = Math.max(cardWidth / 2 + 7, Math.min(width - cardWidth / 2 - 7, pointer.x - pointer.offsetX));
        end.y = Math.max(34, Math.min(height - cardHeight - 12, pointer.y - pointer.offsetY));
      }
    }
  }

  function simulate(time) {
    const delta = Math.min(2, Math.max(0.45, (time - lastTime) / 16.667));
    lastTime = time;
    points.forEach((point, index) => {
      if (point.pinned || (pointer.dragging && index === points.length - 1)) return;
      const velocityX = (point.x - point.previousX) * 0.982;
      const velocityY = (point.y - point.previousY) * 0.982;
      point.previousX = point.x;
      point.previousY = point.y;
      point.x += velocityX;
      point.y += velocityY + 0.36 * delta * delta;
    });
    constrainPoints();
    const end = points.at(-1);
    const targetAngle = Math.max(-0.32, Math.min(0.32, (end.x - end.previousX) * 0.018));
    cardAngle += (targetAngle - cardAngle) * (pointer.dragging ? 0.22 : 0.075);
  }

  function traceRope() {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    const end = points.at(-1);
    context.lineTo(end.x, end.y);
  }

  function drawRope() {
    const end = points.at(-1);
    context.save();
    traceRope();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = "rgba(32, 33, 31, 0.18)";
    context.shadowBlur = 4;
    context.lineWidth = 11;
    context.strokeStyle = "rgba(32, 33, 31, 0.15)";
    context.stroke();
    context.shadowBlur = 0;
    context.lineWidth = 9;
    context.strokeStyle = "rgba(250, 250, 247, 0.98)";
    context.stroke();
    context.beginPath();
    context.arc(end.x, end.y + 4, 4.5, 0, Math.PI * 2);
    context.lineWidth = 2;
    context.strokeStyle = "rgba(47, 48, 45, 0.88)";
    context.stroke();
    context.restore();
  }

  function roundedRect(x, y, rectWidth, rectHeight, radius) {
    context.beginPath();
    context.roundRect(x, y, rectWidth, rectHeight, radius);
  }

  function drawCard() {
    const end = points.at(-1);
    const cardTop = 9;
    const left = -cardWidth / 2;
    context.save();
    context.translate(end.x, end.y);
    context.rotate(cardAngle);
    context.shadowColor = "rgba(55, 51, 42, 0.2)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 7;
    roundedRect(left, cardTop, cardWidth, cardHeight, 7);
    context.fillStyle = "#f7f7f4";
    context.fill();
    context.shadowColor = "transparent";
    context.save();
    roundedRect(left, cardTop, cardWidth, cardHeight, 7);
    context.clip();
    if (cardImage.complete && cardImage.naturalWidth > 0) {
      context.drawImage(cardImage, left, cardTop, cardWidth, cardHeight);
    }
    context.restore();
    roundedRect(left, cardTop, cardWidth, cardHeight, 7);
    context.lineWidth = 1;
    context.strokeStyle = "rgba(32, 33, 31, 0.22)";
    context.stroke();
    context.restore();
  }

  function paint() {
    context.clearRect(0, 0, width, height);
    if (!points.length) return;
    drawRope();
    drawCard();
  }

  function loop(time) {
    simulate(time);
    paint();
    frame = requestAnimationFrame(loop);
  }

  function startMotion() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    resetPoints();
    paint();
    lastTime = performance.now();
    if (!reduceMotion.matches) frame = requestAnimationFrame(loop);
  }

  function pointerPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function cardHitTest(x, y) {
    const end = points.at(-1);
    const dx = x - end.x;
    const dy = y - end.y;
    const cosine = Math.cos(-cardAngle);
    const sine = Math.sin(-cardAngle);
    const localX = dx * cosine - dy * sine;
    const localY = dx * sine + dy * cosine;
    return Math.abs(localX) <= cardWidth / 2 && localY >= 9 && localY <= cardHeight + 9;
  }

  canvas.addEventListener("pointerdown", (event) => {
    const position = pointerPosition(event);
    if (!cardHitTest(position.x, position.y)) return;
    const end = points.at(-1);
    pointer.id = event.pointerId;
    pointer.pressed = true;
    pointer.dragging = !reduceMotion.matches;
    pointer.moved = false;
    pointer.startX = position.x;
    pointer.startY = position.y;
    pointer.previousX = position.x;
    pointer.previousY = position.y;
    pointer.x = position.x;
    pointer.y = position.y;
    pointer.offsetX = position.x - end.x;
    pointer.offsetY = position.y - end.y;
    canvas.setPointerCapture?.(event.pointerId);
    canvas.style.cursor = pointer.dragging ? "grabbing" : "pointer";
  });

  canvas.addEventListener("pointermove", (event) => {
    const position = pointerPosition(event);
    if (!pointer.pressed || event.pointerId !== pointer.id) {
      canvas.style.cursor = cardHitTest(position.x, position.y) ? "grab" : "default";
      return;
    }
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = position.x;
    pointer.y = position.y;
    pointer.moved ||= Math.hypot(position.x - pointer.startX, position.y - pointer.startY) > 7;
  });

  function finishPointer(event) {
    if (!pointer.pressed || event.pointerId !== pointer.id) return;
    const end = points.at(-1);
    if (!pointer.moved) {
      activateCard();
    } else if (pointer.dragging) {
      end.previousX = end.x - (pointer.x - pointer.previousX) * 0.9;
      end.previousY = end.y - (pointer.y - pointer.previousY) * 0.5;
    }
    pointer.id = null;
    pointer.pressed = false;
    pointer.dragging = false;
    canvas.releasePointerCapture?.(event.pointerId);
    canvas.style.cursor = "grab";
  }

  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateCard();
    }
  });

  cardImage.addEventListener("load", paint, { once: true });
  cardImage.addEventListener("error", paint, { once: true });
  window.addEventListener("resize", resize, { passive: true });
  reduceMotion.addEventListener("change", startMotion);
  resize();
  startMotion();

  window.addEventListener("pagehide", () => {
    if (frame !== null) cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    reduceMotion.removeEventListener("change", startMotion);
  }, { once: true });
})();
