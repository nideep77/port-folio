(() => {
  const root = document.documentElement;
  const body = document.body;
  const motion = root.classList.contains("motion");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const debounce = (fn, ms) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage unavailable (private mode) */
      }
    },
  };

  /* ---------- Experience: computed from the timeline's data-start / data-end ---------- */
  const now = new Date();
  const toMonthIndex = (value) => {
    if (!value) return now.getFullYear() * 12 + now.getMonth();
    const [year, month] = value.split("-").map(Number);
    return year * 12 + (month - 1);
  };
  const formatDuration = (months) => {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    const parts = [];
    if (years) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
    if (rest) parts.push(`${rest} mo${rest > 1 ? "s" : ""}`);
    return parts.join(" ") || "1 mo";
  };

  let totalMonths = 0;
  let devMonths = 0;
  document.querySelectorAll(".timeline-item[data-start]").forEach((item) => {
    const months = toMonthIndex(item.dataset.end) - toMonthIndex(item.dataset.start) + 1;
    totalMonths += months;
    if (item.hasAttribute("data-dev")) devMonths += months;
    const label = item.querySelector(".timeline-duration");
    if (label) label.textContent = formatDuration(months);
  });

  const experience = { total: Math.floor(totalMonths / 12), dev: Math.floor(devMonths / 12) };
  document.querySelectorAll("[data-exp]").forEach((el) => {
    el.textContent = experience[el.dataset.exp];
  });
  document.querySelectorAll(".year").forEach((el) => {
    el.textContent = now.getFullYear();
  });

  /* ---------- Theme (dark by default) ---------- */
  const themeToggle = document.querySelector(".theme-toggle");
  const themeLabel = themeToggle.querySelector(".theme-label");
  const themeIcon = themeToggle.querySelector(".theme-icon");
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  if (store.get("portfolio-theme") === "light") body.classList.add("light-theme");

  const syncTheme = () => {
    const isLight = body.classList.contains("light-theme");
    themeToggle.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} theme`);
    themeLabel.textContent = isLight ? "Dark" : "Light";
    themeIcon.textContent = isLight ? "☾" : "☼";
    root.style.colorScheme = isLight ? "light" : "dark";
    themeMeta?.setAttribute("content", isLight ? "#f5f8f7" : "#10151d");
    document.dispatchEvent(new CustomEvent("themechange"));
  };
  syncTheme();

  themeToggle.addEventListener("click", (event) => {
    const apply = () => {
      body.classList.toggle("light-theme");
      store.set("portfolio-theme", body.classList.contains("light-theme") ? "light" : "dark");
      syncTheme();
    };

    themeToggle.classList.remove("is-switching");
    void themeToggle.offsetWidth;
    themeToggle.classList.add("is-switching");

    if (!motion || !document.startViewTransition) {
      apply();
      return;
    }

    // Circular "paint" reveal of the new theme, starting from the click point.
    const rect = themeToggle.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 750, easing: "cubic-bezier(0.76, 0, 0.24, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      })
      .catch(() => {});
  });

  /* ---------- Static decorations ---------- */
  document.querySelectorAll("[data-orbit]").forEach((el) => {
    const chars = [...el.dataset.orbit];
    chars.forEach((char, index) => {
      const span = document.createElement("span");
      span.textContent = char;
      span.style.setProperty("--r", `${(360 / chars.length) * index}deg`);
      el.append(span);
    });
  });

  document.querySelectorAll(".tag-list, .skill-list").forEach((list) => {
    [...list.children].forEach((tag, index) => tag.style.setProperty("--i", index));
  });

  /* ---------- Text effects ---------- */
  const splitChars = (el) => {
    const text = el.textContent.trim();
    el.textContent = "";
    [...text].forEach((char, index) => {
      if (char === " ") {
        el.append(" ");
        return;
      }
      const span = document.createElement("span");
      span.className = "char";
      span.style.setProperty("--ci", index);
      span.textContent = char;
      el.append(span);
    });
  };

  const splitWords = (el) => {
    let index = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const fragment = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              fragment.append(" ");
              return;
            }
            const outer = document.createElement("span");
            const inner = document.createElement("span");
            outer.className = "w";
            inner.textContent = part;
            inner.style.setProperty("--wi", index++);
            outer.append(inner);
            fragment.append(outer);
          });
          child.replaceWith(fragment);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
  };

  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/";
  const scramble = (el) => {
    if (!motion) return;
    const finalText = el.dataset.final || (el.dataset.final = el.textContent);
    const start = performance.now();
    const duration = 900;
    const frame = (time) => {
      const progress = clamp((time - start) / duration, 0, 1);
      const revealed = Math.floor(progress * finalText.length);
      let output = finalText.slice(0, revealed);
      for (let i = revealed; i < finalText.length; i++) {
        output += finalText[i] === " " ? " " : glyphs[(Math.random() * glyphs.length) | 0];
      }
      el.textContent = output;
      if (progress < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    };
    requestAnimationFrame(frame);
  };

  const countUp = (el) => {
    const target = parseInt(el.textContent, 10);
    if (!motion || !target || el.dataset.counted) return;
    el.dataset.counted = "true";
    const start = performance.now();
    const duration = 1600;
    el.textContent = "0";
    const tick = (time) => {
      const t = clamp((time - start) / duration, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const scrubEl = document.querySelector("[data-scrub]");
  const scrubWords = [];

  if (motion) {
    document.querySelectorAll("[data-split-chars]").forEach(splitChars);
    document.querySelectorAll("[data-split-words]").forEach(splitWords);

    if (scrubEl) {
      const words = scrubEl.textContent.trim().split(/\s+/);
      scrubEl.textContent = "";
      words.forEach((word, index) => {
        const span = document.createElement("span");
        span.className = "sw";
        span.textContent = word;
        scrubEl.append(span);
        if (index < words.length - 1) scrubEl.append(" ");
        scrubWords.push(span);
      });
    }
  }

  /* ---------- Reveal on scroll ---------- */
  const revealSelector = [
    ".section-heading",
    ".about-lead",
    ".about-copy",
    ".stat",
    ".skills-panel > .eyebrow",
    ".skill-group",
    ".career-path",
    ".timeline-date",
    ".timeline-content",
    ".project-card",
    ".privacy-note",
    ".education-card",
    ".contact-section > *",
  ].join(",");

  const onReveal = (el) => {
    el.classList.add("is-visible");
    if (el.matches("[data-scramble]")) scramble(el);
    el.querySelectorAll("[data-scramble]").forEach(scramble);
    el.querySelectorAll("[data-count]").forEach(countUp);
  };

  if (motion && "IntersectionObserver" in window) {
    const targets = [...document.querySelectorAll(revealSelector)];
    targets.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((child) => child.matches(revealSelector));
      el.classList.add("reveal");
      el.style.setProperty("--rd", `${Math.min(siblings.indexOf(el), 5) * 90}ms`);
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          onReveal(entry.target);
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Typing effect ---------- */
  const startTyping = () => {
    const typed = document.querySelector(".typed");
    if (!typed || !motion) return;
    const words = JSON.parse(typed.dataset.words);
    let wordIndex = 0;
    let charIndex = words[0].length;
    let deleting = false;
    const type = () => {
      let delay = deleting ? 35 : 75;
      if (!deleting && charIndex === words[wordIndex].length) {
        deleting = true;
        delay = 1800;
      } else if (deleting && charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        delay = 350;
      } else {
        charIndex += deleting ? -1 : 1;
      }
      typed.textContent = words[wordIndex].slice(0, charIndex);
      setTimeout(type, delay);
    };
    type();
  };

  /* ---------- Preloader → ready ---------- */
  const preloader = document.querySelector(".preloader");
  let isReady = false;
  const markReady = () => {
    if (isReady) return;
    isReady = true;
    root.classList.add("ready");
    root.classList.remove("is-loading");
    const role = document.querySelector(".hero-role");
    if (role) setTimeout(() => scramble(role), 150);
    setTimeout(startTyping, 2600);
  };

  if (!motion || !preloader) {
    preloader?.remove();
    markReady();
  } else {
    root.classList.add("is-loading");
    const count = preloader.querySelector(".preloader-count");
    const bar = preloader.querySelector(".preloader-bar span");
    const started = performance.now();
    let shown = 0;
    let loaded = false;
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([wait(1100), Promise.race([fontsReady, wait(2500)])]).then(() => {
      loaded = true;
    });

    const step = (time) => {
      const target = loaded ? 100 : Math.min(90, ((time - started) / 1100) * 90);
      shown = lerp(shown, target, 0.12);
      if (loaded && 100 - shown < 0.6) shown = 100;
      count.textContent = `${Math.round(shown)}%`;
      bar.style.transform = `scaleX(${shown / 100})`;
      if (shown < 100) {
        requestAnimationFrame(step);
        return;
      }
      preloader.classList.add("is-done");
      setTimeout(markReady, 250);
      setTimeout(() => preloader.remove(), 1200);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Scroll-linked effects ---------- */
  const progressBar = document.querySelector(".scroll-progress");
  const header = document.querySelector(".site-header");
  const toTop = document.querySelector(".to-top");
  const ringFill = toTop?.querySelector(".ring-fill");
  const ringLength = 2 * Math.PI * 21;
  const heroCopy = document.querySelector(".hero-copy");
  const heroVisual = document.querySelector(".hero-visual");
  const timeline = document.querySelector(".timeline");
  const timelineItems = [...document.querySelectorAll(".timeline-item")];
  if (ringFill) ringFill.style.strokeDasharray = `${ringLength}`;

  let lastScrollY = window.scrollY;
  let scrollDirty = true;

  const updateScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const progress = max > 0 ? clamp(y / max, 0, 1) : 0;

    progressBar.style.transform = `scaleX(${progress})`;
    if (ringFill) ringFill.style.strokeDashoffset = `${ringLength * (1 - progress)}`;
    toTop?.classList.toggle("is-visible", y > vh * 0.8);
    header.classList.toggle("is-scrolled", y > 10);

    const delta = y - lastScrollY;
    if (y < 80 || header.matches(":focus-within")) header.classList.remove("is-hidden");
    else if (Math.abs(delta) > 6) header.classList.toggle("is-hidden", delta > 0 && y > vh * 0.6);
    lastScrollY = y;

    if (!motion) return;

    if (y < vh * 1.2) {
      heroCopy.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
      heroCopy.style.opacity = `${clamp(1 - y / (vh * 0.9), 0, 1)}`;
      heroVisual.style.transform = `translate3d(0, ${y * -0.08}px, 0)`;
    }

    if (timeline) {
      const rect = timeline.getBoundingClientRect();
      timeline.style.setProperty("--progress", clamp((vh * 0.6 - rect.top) / rect.height, 0, 1).toFixed(4));
      timelineItems.forEach((item) => {
        item.classList.toggle("is-lit", item.getBoundingClientRect().top + 14 < vh * 0.6);
      });
    }

    if (scrubWords.length) {
      const rect = scrubEl.getBoundingClientRect();
      const lit = clamp((vh * 0.85 - rect.top) / (vh * 0.45), 0, 1) * scrubWords.length;
      scrubWords.forEach((word, index) => {
        word.style.opacity = `${clamp(lit - index, 0.18, 1)}`;
      });
    }
  };

  window.addEventListener("scroll", () => (scrollDirty = true), { passive: true });

  /* ---------- Scrollspy nav indicator ---------- */
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const indicator = document.querySelector(".nav-indicator");
  let activeLink = null;
  const moveIndicator = () => {
    if (!activeLink || !activeLink.offsetWidth) {
      indicator.classList.remove("is-visible");
      return;
    }
    indicator.style.width = `${activeLink.offsetWidth}px`;
    indicator.style.translate = `${activeLink.offsetLeft}px 0`;
    indicator.classList.add("is-visible");
  };

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          activeLink = navLinks.find((link) => link.getAttribute("href") === `#${entry.target.id}`) || null;
          navLinks.forEach((link) => {
            link.classList.toggle("is-active", link === activeLink);
            if (link === activeLink) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
          moveIndicator();
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    document.querySelectorAll("main section[id]").forEach((section) => spy.observe(section));
  }
  document.fonts?.ready.then(moveIndicator);

  /* ---------- Tapes (scroll-velocity marquee) ---------- */
  const tapes = [...document.querySelectorAll(".tape-track")].map((track) => ({
    track,
    direction: Number(track.dataset.direction) || -1,
    items: [...track.children].map((node) => node.cloneNode(true)),
    offset: 0,
    width: 0,
  }));
  let tapesVisible = false;

  const buildTapes = () => {
    if (!motion) return;
    tapes.forEach((tape) => {
      tape.track.replaceChildren(...tape.items.map((node) => node.cloneNode(true)));
      const setWidth = tape.track.scrollWidth || 1;
      const copies = Math.max(1, Math.ceil((window.innerWidth * 1.25) / setWidth));
      for (let c = 1; c < copies; c++) tape.items.forEach((node) => tape.track.append(node.cloneNode(true)));
      tape.width = tape.track.scrollWidth;
      [...tape.track.children].forEach((node) => tape.track.append(node.cloneNode(true)));
      tape.offset = tape.direction < 0 ? 0 : -tape.width;
    });
  };
  buildTapes();

  if (motion && "IntersectionObserver" in window) {
    const tapeSection = document.querySelector(".tapes");
    if (tapeSection) {
      new IntersectionObserver(([entry]) => {
        tapesVisible = entry.isIntersecting;
      }).observe(tapeSection);
    }
  }

  /* ---------- Cursor, tilt, magnetic buttons, ripple ---------- */
  const cursorRing = document.querySelector(".cursor-ring");
  const cursorGlow = document.querySelector(".cursor-glow");
  const cursorEnabled = motion && finePointer;
  let pointerX = innerWidth / 2;
  let pointerY = innerHeight / 2;
  let ringX = pointerX;
  let ringY = pointerY;
  let glowX = pointerX;
  let glowY = pointerY;

  if (cursorEnabled) {
    window.addEventListener(
      "pointermove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        cursorRing.classList.add("is-visible");
        cursorGlow.classList.add("is-visible");
        const target = event.target instanceof Element ? event.target : null;
        cursorRing.classList.toggle(
          "is-hover",
          Boolean(target?.closest("a, button, .project-card, .skill-list span, .stat"))
        );
        cursorRing.classList.toggle("is-hidden", Boolean(target?.closest("input, textarea")));
      },
      { passive: true }
    );
    document.addEventListener("mouseout", (event) => {
      if (event.relatedTarget) return;
      cursorRing.classList.remove("is-visible");
      cursorGlow.classList.remove("is-visible");
    });
    window.addEventListener("pointerdown", () => cursorRing.classList.add("is-down"));
    window.addEventListener("pointerup", () => cursorRing.classList.remove("is-down"));

    document.querySelectorAll(".tilt, .project-card, .education-card").forEach((card) => {
      const strength = card.classList.contains("hero-card") ? 10 : 6;
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--rx", `${(-y * strength).toFixed(2)}deg`);
        card.style.setProperty("--ry", `${(x * strength).toFixed(2)}deg`);
        card.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });

    document.querySelectorAll(".button").forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.2;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.3;
        button.style.transform = `translate(${x}px, ${y}px)`;
      });
      button.addEventListener("pointerleave", () => {
        button.style.transform = "";
      });
    });
  }

  if (motion) {
    document.querySelectorAll(".button").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        button.append(ripple);
        ripple.addEventListener("animationend", () => ripple.remove());
      });
    });
  }

  /* ---------- Main animation loop ---------- */
  let previousTime = performance.now();
  let previousFrameY = window.scrollY;
  let smoothVelocity = 0;
  let scrollSign = 1;

  const loop = (time) => {
    const dt = Math.min((time - previousTime) / 16.67, 3);
    previousTime = time;

    if (scrollDirty) {
      scrollDirty = false;
      updateScroll();
    }

    if (cursorEnabled) {
      const ringEase = 1 - Math.pow(1 - 0.22, dt);
      const glowEase = 1 - Math.pow(1 - 0.1, dt);
      ringX = lerp(ringX, pointerX, ringEase);
      ringY = lerp(ringY, pointerY, ringEase);
      glowX = lerp(glowX, pointerX, glowEase);
      glowY = lerp(glowY, pointerY, glowEase);
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
    }

    if (motion) {
      const y = window.scrollY;
      const velocity = y - previousFrameY;
      previousFrameY = y;
      if (velocity > 1) scrollSign = 1;
      else if (velocity < -1) scrollSign = -1;
      smoothVelocity = lerp(smoothVelocity, Math.abs(velocity), 0.1);

      if (tapesVisible) {
        const speed = (0.7 + Math.min(smoothVelocity * 0.35, 14)) * dt;
        tapes.forEach((tape) => {
          if (!tape.width) return;
          tape.offset += tape.direction * scrollSign * speed;
          if (tape.offset <= -tape.width) tape.offset += tape.width;
          if (tape.offset > 0) tape.offset -= tape.width;
          tape.track.style.transform = `translate3d(${tape.offset}px, 0, 0)`;
        });
      }
    }

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  window.addEventListener(
    "resize",
    debounce(() => {
      buildTapes();
      moveIndicator();
      scrollDirty = true;
    }, 150)
  );

  /* ---------- Hero particle network ---------- */
  const canvas = document.querySelector(".hero-canvas");
  if (canvas && motion) {
    const ctx = canvas.getContext("2d");
    const mouse = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let particles = [];
    let rgb = "119, 224, 189";
    let running = false;
    let frameId = 0;

    const readColor = () => {
      rgb = getComputedStyle(body).getPropertyValue("--accent-rgb").trim() || rgb;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((width * height) / 16000, 28, 90));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mouseDistance = Math.hypot(mdx, mdy);
        if (mouseDistance < 140 && mouseDistance > 0) {
          const force = ((140 - mouseDistance) / 140) * 0.6;
          p.x += (mdx / mouseDistance) * force;
          p.y += (mdy / mouseDistance) * force;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.x = clamp(p.x, 0, width);
        p.y = clamp(p.y, 0, height);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, 0.7)`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq < 14400) {
            ctx.strokeStyle = `rgba(${rgb}, ${(1 - Math.sqrt(distanceSq) / 120) * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        if (mouseDistance < 180) {
          ctx.strokeStyle = `rgba(${rgb}, ${(1 - mouseDistance / 180) * 0.45})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
      frameId = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      running = true;
      frameId = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
    };

    readColor();
    resize();
    document.addEventListener("themechange", readColor);
    window.addEventListener("resize", debounce(resize, 200));
    window.addEventListener(
      "pointermove",
      (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = event.clientX - rect.left;
        mouse.y = event.clientY - rect.top;
      },
      { passive: true }
    );
    document.addEventListener("mouseout", (event) => {
      if (!event.relatedTarget) mouse.x = mouse.y = -9999;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(canvas);
    } else {
      start();
    }
  }

  /* ---------- Confetti ---------- */
  const confetti = (origin) => {
    const layer = document.createElement("canvas");
    layer.className = "confetti";
    body.append(layer);
    const ctx = layer.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    layer.width = innerWidth * dpr;
    layer.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const rect = origin.getBoundingClientRect();
    const colors = ["#77e0bd", "#6aa7ff", "#c792ea", "#ffd166", "#ff8fab"];
    const pieces = Array.from({ length: 160 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 7 + Math.random() * 9;
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        color: colors[(Math.random() * colors.length) | 0],
      };
    });

    const start = performance.now();
    const duration = 2800;
    const frame = (time) => {
      const elapsed = time - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = clamp(1 - elapsed / duration, 0, 1);
      pieces.forEach((piece) => {
        piece.vy += 0.25;
        piece.vx *= 0.985;
        piece.vy *= 0.985;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rotation += piece.spin;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.scale(1, Math.cos(piece.rotation * 1.5));
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        ctx.restore();
      });
      if (elapsed < duration) requestAnimationFrame(frame);
      else layer.remove();
    };
    requestAnimationFrame(frame);
  };

  /* ---------- Contact form (emails the owner via FormSubmit) ---------- */
  const form = document.querySelector(".contact-form");
  if (form) {
    const statusEl = form.querySelector(".form-status");
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector(".btn-text");
    const requiredFields = [...form.querySelectorAll("input[required], textarea[required]")];

    requiredFields.forEach((input) => {
      input.addEventListener("input", () => input.closest(".field")?.classList.remove("is-invalid"));
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      statusEl.className = "form-status";
      statusEl.textContent = "";

      if (form.elements._honey.value) return;

      const invalid = requiredFields.filter((input) => !input.checkValidity());
      if (invalid.length) {
        invalid.forEach((input) => {
          const field = input.closest(".field");
          field.classList.remove("is-invalid");
          void field.offsetWidth;
          field.classList.add("is-invalid");
        });
        form.reportValidity();
        return;
      }

      submitButton.disabled = true;
      submitButton.classList.add("is-sending");
      buttonText.textContent = "Sending...";
      let sent = false;

      try {
        const response = await fetch(form.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || String(data.success) === "false") throw new Error(data.message || "Request failed");
        sent = true;
        form.reset();
        statusEl.textContent = "Thanks! Your message was sent. I’ll get back to you soon.";
        statusEl.classList.add("success");
        buttonText.textContent = "Sent ✓";
        if (motion) confetti(submitButton);
      } catch (error) {
        console.warn("Contact form error:", error);
        statusEl.innerHTML =
          'Sorry, that didn’t go through. Please email me directly at <a href="mailto:nideep77@gmail.com">nideep77@gmail.com</a>.';
        statusEl.classList.add("error");
        buttonText.textContent = "Send message";
      } finally {
        submitButton.classList.remove("is-sending");
        setTimeout(() => {
          submitButton.disabled = false;
          buttonText.textContent = "Send message";
        }, sent ? 3000 : 0);
      }
    });
  }
})();
