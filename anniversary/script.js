(() => {
  const C = window.CONTENT;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- doodles ---------- */
  function charSVG(who) {
    const fill = C.characters[who].color;
    const topper = who === "a"
      ? `<path class="nofill" d="M60 18 q-3 -6 0 -11"/><path fill="#e5486d" d="M60 9 c-9 -6 -7 -13 -3 -13 c2 0 3 2 3 2 c0 0 1 -2 3 -2 c4 0 6 7 -3 13z"/>`
      : `<path class="nofill" d="M50 20 q-2 -10 6 -13 M60 18 q0 -11 8 -12 M69 20 q3 -8 10 -7"/>`;
    return `<svg class="doodle" viewBox="0 -8 120 156" aria-hidden="true">
      <g class="leg l"><path class="nofill" d="M48 118 v20 h-8"/></g>
      <g class="leg r"><path class="nofill" d="M72 118 v20 h8"/></g>
      <path class="arm l nofill" d="M24 78 q-14 8 -12 22"/>
      <path class="arm r nofill" d="M96 78 q14 8 12 22"/>
      <path fill="${fill}" d="M60 18 C92 18 102 50 100 82 C98 112 84 124 60 124 C36 124 22 112 20 82 C18 50 28 18 60 18Z"/>
      ${topper}
      <circle class="eye ink" cx="46" cy="62" r="4"/><circle class="eye ink" cx="74" cy="62" r="4"/>
      <ellipse class="blush" cx="35" cy="75" rx="7" ry="4.5"/><ellipse class="blush" cx="85" cy="75" rx="7" ry="4.5"/>
      <path class="nofill" d="M52 76 q8 8 16 0"/>
    </svg>`;
  }
  const ICONS = {
    heart: `<path fill="#ff8fab" d="M30 50 C8 34 10 14 22 14 C28 14 30 20 30 20 C30 20 32 14 38 14 C50 14 52 34 30 50Z"/>`,
    star: `<path fill="#ffd97d" d="M30 8 L36 23 L52 24 L40 34 L44 50 L30 41 L16 50 L20 34 L8 24 L24 23Z"/>`,
    sun: `<circle fill="#ffd97d" cx="30" cy="30" r="11"/><path class="nofill" d="M30 6v7M30 47v7M6 30h7M47 30h7M13 13l5 5M42 42l5 5M47 13l-5 5M18 42l-5 5"/>`,
    cup: `<path fill="#bde0fe" d="M14 24 h28 v12 a14 14 0 0 1 -28 0Z"/><path class="nofill" d="M42 27 q10 0 8 8 q-2 6 -9 5 M24 17 q-3 -4 0 -8 M32 17 q-3 -4 0 -8"/>`,
    moon: `<path fill="#cdb4db" d="M38 10 A20 20 0 1 0 50 38 A16 16 0 0 1 38 10Z"/>`,
    chat: `<path fill="#caffbf" d="M10 14 h40 v24 h-22 l-10 9 v-9 h-8Z"/><path class="nofill" d="M20 23h20M20 30h12"/>`,
    camera: `<path fill="#bde0fe" d="M10 20 h12 l3 -6 h10 l3 6 h12 v26 h-40Z"/><circle fill="#fff" cx="30" cy="33" r="8"/>`,
    flower: `<g fill="#ff8fab"><circle cx="30" cy="16" r="8"/><circle cx="43" cy="26" r="8"/><circle cx="38" cy="41" r="8"/><circle cx="22" cy="41" r="8"/><circle cx="17" cy="26" r="8"/></g><circle fill="#ffd97d" cx="30" cy="30" r="7"/>`,
  };
  const icon = (name) => `<div class="icon"><svg class="doodle" viewBox="0 0 60 60" aria-hidden="true">${ICONS[name] || ICONS.heart}</svg></div>`;

  /* ---------- floating hearts and stars ---------- */
  const sky = $("#sky");
  const COLORS = ["#ff8fab", "#e5486d", "#ffd97d", "#cdb4db", "#bde0fe"];
  function floatOne() {
    if (document.hidden) return;
    const el = document.createElement("span");
    el.className = "float";
    el.textContent = Math.random() < 0.65 ? "♥" : "✦";
    el.style.cssText = `left:${rand(0, 100)}vw;font-size:${rand(14, 34)}px;color:${COLORS[Math.floor(rand(0, 5))]};` +
      `animation-duration:${rand(9, 18)}s;--dx:${rand(-80, 80)}px;--rot:${rand(-60, 60)}deg`;
    el.onanimationend = () => el.remove();
    sky.append(el);
  }
  if (!calm) { for (let i = 0; i < 6; i++) setTimeout(floatOne, i * 300); setInterval(floatOne, 900); }

  function burst(x, y, n = 10) {
    for (let i = 0; i < n; i++) {
      const el = document.createElement("span");
      el.className = "pop";
      el.textContent = "♥";
      const a = rand(0, Math.PI * 2), d = rand(40, 120);
      el.style.cssText = `left:${x}px;top:${y}px;font-size:${rand(12, 26)}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px`;
      el.onanimationend = () => el.remove();
      document.body.append(el);
    }
  }
  addEventListener("pointerdown", (e) => burst(e.clientX, e.clientY, 5));

  /* ---------- background song ---------- */
  // wanted: the listener has not switched it off. held: a video on the page is playing.
  const music = { ready: false, wanted: false, held: false, timer: 0, play() {}, pause() {} };
  const musicBtn = $("#music");
  function syncMusic() {
    const on = music.wanted && !music.held;
    musicBtn.classList.toggle("off", !music.wanted);
    musicBtn.classList.toggle("playing", on);
    musicBtn.setAttribute("aria-label", music.wanted ? "Pause the song" : "Play the song");
    if (!music.ready) return;
    if (on) music.play(); else music.pause();
  }
  const hasMusic = !!(C.music && (C.music.file || C.music.youtubeId));
  if (hasMusic) {
    const volume = C.music.volume ?? 60;
    const useYouTube = () => {
      if (!C.music.youtubeId) { musicBtn.hidden = true; return; }
      window.onYouTubeIframeAPIReady = () => {
        const yt = new YT.Player("yt", {
          width: 200, height: 200, videoId: C.music.youtubeId,
          playerVars: { playsinline: 1, controls: 0, disablekb: 1, loop: 1, playlist: C.music.youtubeId },
          events: {
            onReady: () => {
              yt.setVolume(volume);
              Object.assign(music, { ready: true, play: () => yt.playVideo(), pause: () => yt.pauseVideo() });
              syncMusic();
            },
            onStateChange: (e) => { if (e.data === 0) { yt.seekTo(0); syncMusic(); } },
            // YouTube refuses to play some songs outside youtube.com; without a song there is nothing to control
            onError: () => { music.ready = false; musicBtn.hidden = true; },
          },
        });
      };
      document.head.append(Object.assign(document.createElement("script"), { src: "https://www.youtube.com/iframe_api" }));
    };
    if (C.music.file) {
      // a song file in the site folder is the most reliable option; YouTube is the fallback
      const audio = new Audio(C.music.file);
      audio.loop = true;
      audio.volume = volume / 100;
      audio.addEventListener("error", () => { music.ready = false; useYouTube(); }, { once: true });
      Object.assign(music, { ready: true, play: () => audio.play().catch(() => {}), pause: () => audio.pause() });
    } else useYouTube();
    musicBtn.onclick = () => { music.wanted = !music.wanted; syncMusic(); };
    // the song steps aside for any video on the page and comes back when it stops
    const videoChange = () => {
      clearTimeout(music.timer);
      const playing = [...document.querySelectorAll("video")].some((v) => !v.paused && !v.ended);
      if (playing) { music.held = true; syncMusic(); }
      else music.timer = setTimeout(() => { music.held = false; syncMusic(); }, 350);
    };
    for (const ev of ["play", "pause", "ended"]) document.addEventListener(ev, videoChange, true);
  }

  /* ---------- opening ---------- */
  const O = C.opening;
  $("#op-title").textContent = O.title;
  $("#op-hint").textContent = O.hint;
  $("#op-l1").textContent = O.letterLine1;
  $("#op-l2").textContent = O.letterLine2;
  $("#op-btn").textContent = O.button + " ↓";
  $("#op-a").innerHTML = charSVG("a");
  $("#op-b").innerHTML = charSVG("b");
  const env = $("#envelope");
  env.addEventListener("click", () => {
    if (env.classList.contains("open")) return;
    env.classList.add("open");
    const r = env.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 3, 24);
    navigator.vibrate?.(15);
    $("#op-hint").style.visibility = "hidden";
    if (hasMusic) { music.wanted = true; musicBtn.hidden = false; syncMusic(); }
    $("#main").hidden = false;
    $("#op-btn").hidden = false;
    document.body.classList.remove("locked");
    observe();
  });

  /* ---------- character stage: walk, hug, kiss, speech bubbles ---------- */
  function makeStage(el) {
    el.innerHTML = `<div class="ground"></div>
      <div class="char a"><div class="bubble"></div>${charSVG("a")}</div>
      <div class="char b"><div class="bubble"></div>${charSVG("b")}</div>
      <div class="stage-heart">♥</div>`;
    // every action is interruptible: a new tap takes over from wherever the characters are
    let token = 0, arriveAt = 0;
    const set = (s) => (el.dataset.state = s);
    const bubbles = el.querySelectorAll(".bubble");
    set("apart");
    return async function run(act, lines = []) {
      const me = ++token, live = () => me === token;
      bubbles.forEach((b) => b.classList.remove("show"));
      if (act === "reset") {
        set("back"); arriveAt = 0;
        await wait(2300);
        if (live()) set("apart");
        return;
      }
      const s = el.dataset.state;
      if (s === "apart" || s === "back") { set("walking"); arriveAt = performance.now() + 2300; }
      const left = arriveAt - performance.now();
      if (left > 0) { await wait(left); if (!live()) return; }
      set(act === "hug" || act === "kiss" ? act : "together");
      if (act !== "walk") {
        const r = el.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, 14);
        navigator.vibrate?.(act === "kiss" ? [10, 60, 10] : 12);
      }
      for (const [who, text] of lines) {
        const b = $(`.char.${who} .bubble`, el);
        b.textContent = text;
        b.classList.add("show");
        await wait(1800);
        if (!live()) return;
        b.classList.remove("show");
        await wait(200);
        if (!live()) return;
      }
      if (act === "kiss") { await wait(1500); if (live()) set("together"); }
    };
  }
  const stages = { start: makeStage($("#stage-start")), end: makeStage($("#stage-end")) };
  const lines = { start: C.storyBubbles, end: C.letter.hugBubbles };
  document.querySelectorAll(".stage-btns").forEach((box) =>
    box.addEventListener("click", (e) => {
      const act = e.target.dataset.act;
      if (act) stages[box.dataset.stage](act, act === "walk" || box.dataset.stage === "end" && act === "hug" ? lines[box.dataset.stage] : []);
    }));

  /* ---------- content ---------- */
  // one frame can hold several photos and videos; more than one becomes a swipeable strip
  const isVideo = (src) => /\.(mp4|webm|m4v|mov|ogv)$/i.test(src);
  function media(item, alt) {
    const list = [].concat(item.media || item.photo || []);
    const n = list.length;
    const items = list.map((src, i) => isVideo(src)
      ? `<video src="${esc(src)}" data-src="${esc(src)}" controls playsinline preload="metadata" aria-label="${esc(alt)} (video ${i + 1})"></video>`
      : `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" data-src="${esc(src)}">`).join("");
    const extras = n > 1
      ? `<span class="media-count">1/${n}</span>
         <button class="media-arrow prev" aria-label="Previous" hidden>\u2039</button><button class="media-arrow next" aria-label="Next">\u203a</button>
         <div class="dots">${list.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>`
      : "";
    return `<div class="media"><div class="media-track">${items}</div>${extras}</div>`;
  }
  const SHADOWS = ["var(--pink)", "var(--butter)"]; // the two main colours; blue, mint and lilac stay as small accents
  const tilt = (i) => `--tilt:${[-1.5, 1.2, -0.8, 1.6][i % 4]}deg`;

  $("#story").innerHTML = C.story.map((s, i) =>
    `<button class="card chapter reveal" data-chapter="${i}" style="--c:${SHADOWS[i % 2]};${tilt(i)}">${icon(s.doodle)}
      <span class="num">chapter ${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
      <span class="more">tap to read \u2192</span></button>`).join("");
  $("#beginning").textContent = C.beginningMessage;

  $("#timeline").innerHTML = C.timeline.map((t, i) =>
    `<div class="t-item reveal"><span class="t-date">${esc(t.date)}</span>
      <figure class="polaroid" style="rotate:${[-2, 1.5, -1, 2.5][i % 4]}deg">${media(t, t.caption)}<figcaption>${esc(t.caption)}</figcaption></figure></div>`).join("");

  $("#memories").innerHTML = C.relive.map((m, i) =>
    `<div class="memory reveal">
      <figure class="polaroid" style="rotate:${i % 2 ? 2 : -2}deg">${media(m, m.title)}<figcaption>${esc(m.date)}</figcaption></figure>
      <div class="card">${icon(m.doodle)}<h3>${esc(m.title)}</h3><span class="m-date">${esc(m.date)}</span>
        <dl><dt>What happened</dt><dd>${esc(m.what)}</dd><dt>Why it was special</dt><dd>${esc(m.special)}</dd>
        <dt>Why I would relive it</dt><dd>${esc(m.relive)}</dd></dl></div>
    </div>`).join("");

  // a missing photo or video becomes a doodle placeholder that names the file to add
  function wireMedia(root) {
  root.querySelectorAll("[data-src]").forEach((el) => {
    const swap = () => {
      const ph = document.createElement("div");
      ph.className = "ph";
      ph.innerHTML = `<svg class="doodle" viewBox="0 0 60 60">${ICONS.camera}</svg><span>add ${esc(el.dataset.src)}</span>`;
      el.replaceWith(ph);
    };
    if (el.tagName === "IMG" && el.complete && !el.naturalWidth) return swap();
    el.addEventListener("error", swap, { once: true });
    if (el.tagName === "IMG") {
      if (el.complete) el.classList.add("loaded"); else el.addEventListener("load", () => el.classList.add("loaded"), { once: true });
    }
  });
  root.querySelectorAll(".media").forEach((box) => {
    const track = $(".media-track", box), dots = box.querySelectorAll(".dots i");
    if (!dots.length) return;
    const count = $(".media-count", box), prev = $(".prev", box), next = $(".next", box);
    let idx = 0;
    const go = (i) => track.scrollTo({ left: i * track.clientWidth, behavior: calm ? "auto" : "smooth" });
    track.addEventListener("scroll", () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i === idx) return;
      idx = i;
      dots.forEach((d, n) => d.classList.toggle("on", n === i));
      count.textContent = `${i + 1}/${dots.length}`;
      prev.hidden = i === 0;
      next.hidden = i === dots.length - 1;
      [...track.children].forEach((el, n) => { if (n !== i && el.tagName === "VIDEO") el.pause(); });
    }, { passive: true });
    prev.onclick = () => go(idx - 1);
    next.onclick = () => go(idx + 1);
  });
  }
  wireMedia(document);

  /* ---------- chapter pop-up ---------- */
  const dlg = $("#chapter"), dlgBody = $("#chapter-body");
  let chapter = 0;
  function openChapter(i) {
    chapter = (i + C.story.length) % C.story.length;
    const s = C.story[chapter];
    dlgBody.innerHTML = `${icon(s.doodle)}<span class="num">chapter ${chapter + 1} of ${C.story.length}</span>
      <h3>${esc(s.title)}</h3>${s.media || s.photo ? `<figure class="polaroid">${media(s, s.title)}</figure>` : ""}<p>${esc(s.text)}</p>`;
    wireMedia(dlgBody);
    dlgBody.scrollTop = 0;
    dlg.style.setProperty("--c", SHADOWS[chapter % 2]);
    if (!dlg.open) { dlg.showModal(); document.body.classList.add("locked"); }
  }
  $("#story").addEventListener("click", (e) => {
    const card = e.target.closest("[data-chapter]");
    if (card) openChapter(+card.dataset.chapter);
  });
  dlg.addEventListener("click", (e) => {
    const act = e.target.dataset.go;
    if (e.target === dlg || act === "close") dlg.close();   // a tap on the dimmed backdrop lands on the dialog itself
    else if (act) openChapter(chapter + +act);
  });
  dlg.addEventListener("close", () => {
    document.body.classList.remove("locked");
    dlgBody.querySelectorAll("video").forEach((v) => v.pause());
  });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") openChapter(chapter + 1);
    if (e.key === "ArrowLeft") openChapter(chapter - 1);
  });

  const L = C.letter;
  $("#paper").innerHTML = `<p>${esc(L.greeting)}</p>` +
    L.parts.map((p) => `<h3>${esc(p.heading)}</h3><p>${esc(p.text)}</p>`).join("") +
    `<p class="sign">${esc(L.signOff)}<br>${esc(C.yourName)}</p>`;
  $("#final").textContent = L.finalMessage;

  document.querySelectorAll("h2").forEach((h) => h.insertAdjacentHTML("beforeend",
    `<svg class="squiggle" viewBox="0 0 120 10" aria-hidden="true"><path pathLength="1" d="M2 6 q14 -8 28 0 t28 0 t28 0 t28 0"/></svg>`));

  /* ---------- wrapped ---------- */
  const start = new Date(C.startDate + "T00:00");
  // before the first anniversary, count as of the anniversary itself so the card reads a full year
  const anniversary = new Date(start); anniversary.setFullYear(start.getFullYear() + 1);
  const now = new Date(Math.max(Date.now(), anniversary));
  const days = Math.max(0, Math.floor((now - start) / 864e5));
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() - (now.getDate() < start.getDate() ? 1 : 0);
  months = Math.max(0, months);
  const W = C.wrapped;
  const since = start.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const qa = (label, key, ic, bg) => ({ bg, html: `${icon(ic)}<p class="s-label">${label}</p><p class="s-big">${esc(W[key].answer)}</p><p class="s-note">${esc(W[key].note)}</p>` });
  const slides = [
    { bg: "#ff9db5", html: `${icon("heart")}<p class="s-label">${esc(C.yourName)} + ${esc(C.partnerName)}</p><p class="s-big">Our year, wrapped</p><p class="s-note">a lot happened. let's look back.</p>` },
    { bg: "#ffe29a", html: `<p class="s-label">Total days together</p><p class="s-num" data-count="${days}">0</p><p class="s-note">every single one since ${esc(since)}</p>` },
    { bg: "#ffd0dc", html: `<p class="s-label">That is</p><p class="s-num" data-count="${months}">0</p><p class="s-big">months of us</p><p class="s-note">and about ${(days * 24).toLocaleString()} hours of being yours</p>` },
    qa("Favourite date", "favouriteDate", "cup", "#ffe29a"),
    qa("Funniest memory", "funniestMemory", "sun", "#ffd0dc"),
    qa("Most-used nickname", "nickname", "chat", "#ffe29a"),
    qa("Our song", "song", "star", "#ffd0dc"),
    qa("Most memorable conversation", "conversation", "moon", "#ffe29a"),
    qa("Best adventure", "adventure", "camera", "#ffd0dc"),
    qa("Biggest achievement as a couple", "achievement", "flower", "#ffe29a"),
    qa("Most unforgettable moment", "unforgettable", "heart", "#ffd0dc"),
    { bg: "#ff9db5", html: `${icon("heart")}<p class="s-label">Top genre</p><p class="s-big">Us.</p><p class="s-note">here's to year two, ${esc(C.partnerName)}</p>` },
  ];
  $("#wrap-slides").innerHTML = slides.map((s) => `<div class="slide" style="--bg:${s.bg}">${s.html}</div>`).join("");
  $("#wrap-bars").innerHTML = slides.map(() => "<i></i>").join("");
  const slideEls = [...document.querySelectorAll(".slide")], bars = [...document.querySelectorAll("#wrap-bars i")];
  let cur = -1;
  function show(i, dir = 1) {
    // dir: 1 going forward, -1 going back, so the words arrive from the side you are heading to
    $("#wrap-slides").style.setProperty("--d", dir);
    cur = (i + slides.length) % slides.length;
    slideEls.forEach((s, n) => s.classList.toggle("on", n === cur));
    bars.forEach((b, n) => b.classList.toggle("on", n <= cur));
    slideEls[cur].querySelectorAll("[data-count]").forEach((el) => {
      const to = +el.dataset.count, t0 = performance.now();
      if (calm) return void (el.textContent = to);
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 1400);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  $(".wrap-nav.next").onclick = () => show(cur + 1);
  $(".wrap-nav.prev").onclick = () => show(cur - 1, -1);
  show(0);
  // swipe: a quick flick counts even when it is short, so use speed as well as distance
  const wrap = $("#wrap");
  let sx = null, st = 0, swiped = false;
  wrap.addEventListener("pointerdown", (e) => { sx = e.clientX; st = e.timeStamp; swiped = false; });
  wrap.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, v = Math.abs(dx) / (e.timeStamp - st || 1);
    sx = null;
    if (Math.abs(dx) > 40 || (Math.abs(dx) > 12 && v > 0.3)) { swiped = true; show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
  });
  wrap.addEventListener("pointercancel", () => (sx = null));
  wrap.addEventListener("click", (e) => { if (swiped) { e.stopPropagation(); swiped = false; } }, true);
  wrap.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(cur + 1);
    if (e.key === "ArrowLeft") show(cur - 1, -1);
  });

  /* ---------- scroll reveals and auto-played scenes ---------- */
  let observed = false;
  function observe() {
    if (observed) return;
    observed = true;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (e.target.id === "stage-start") stages.start("walk", lines.start);
      else if (e.target.id === "stage-end") stages.end("hug", lines.end);
      else if (e.target.id === "wrap") show(0);
      else {
        e.target.classList.add("in");
        if (e.target.id === "final" && !calm) {
          const r = e.target.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2, 18);
        }
      }
    }), { threshold: 0.25 });
    document.querySelectorAll(".reveal, .stage, #wrap, h2, #final").forEach((el) => io.observe(el));
  }
})();
