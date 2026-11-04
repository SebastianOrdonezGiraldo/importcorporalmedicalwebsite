"use client";
import { useEffect } from "react";
import { REGIONS } from "@/lib/site";

/**
 * Interactive behaviour of the home page, ported from the original single-file site:
 * hero slider, counters, brand highlight, coverage hub, offer countdown,
 * copy-to-clipboard.
 */
export default function HomeEffects() {
  useEffect(() => {
    const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = motionPreference.matches;
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: EventTarget, ev: K | string, fn: (e: any) => void, opt?: AddEventListenerOptions) => {
      t.addEventListener(ev, fn, opt);
      cleanups.push(() => t.removeEventListener(ev, fn, opt));
    };
    on(motionPreference, "change", () => { reduceMotion = motionPreference.matches; });
    const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

    /* Only advance the hero while it is visible and the user is not interacting. */
    {
      const SLIDE_MS = 6500;
      const hero = document.getElementById("inicio")!;
      const slides = [...document.querySelectorAll<HTMLElement>("#slides .slide")];
      const dotsEl = document.getElementById("heroDots")!;
      const toggle = document.getElementById("heroToggle") as HTMLButtonElement;
      const slideGroup = document.getElementById("slides")!;
      hero.style.setProperty("--dur", SLIDE_MS + "ms");
      dotsEl.innerHTML = slides.map((_, k) => `<button type="button" aria-label="Diapositiva ${k + 1}"></button>`).join("");
      const dots = [...dotsEl.children] as HTMLElement[];
      let i = 0;
      let timer: ReturnType<typeof setInterval> | undefined;
      let inView = false;
      let rotationRequested = !reduceMotion;
      let hovering = false;
      let pointerIntent: boolean | null = null;
      const go = (n: number) => {
        i = (n + slides.length) % slides.length;
        const image = slides[i].querySelector<HTMLImageElement>("img[data-src]");
        if (image?.dataset.src) { image.src = image.dataset.src; delete image.dataset.src; }
        slides.forEach((s, k) => { s.classList.toggle("on", k === i); s.inert = k !== i; });
        dots.forEach((d, k) => { d.removeAttribute("aria-current"); if (k === i) { void d.offsetWidth; d.setAttribute("aria-current", "true"); } });
      };
      const play = () => {
        clearInterval(timer);
        const paused = reduceMotion || !rotationRequested || !inView || hovering || document.hidden;
        hero.classList.toggle("paused", paused);
        toggle.disabled = reduceMotion;
        toggle.textContent = reduceMotion ? "En pausa" : rotationRequested ? "Pausar" : "Reanudar";
        toggle.setAttribute("aria-label", reduceMotion ? "Carrusel en pausa por movimiento reducido" : rotationRequested ? "Pausar carrusel" : "Reanudar carrusel");
        slideGroup.setAttribute("aria-live", rotationRequested && !reduceMotion ? "off" : "polite");
        if (!paused) timer = setInterval(() => go(i + 1), SLIDE_MS);
      };
      on(document.getElementById("heroPrev")!, "click", () => { go(i - 1); play(); });
      on(document.getElementById("heroNext")!, "click", () => { go(i + 1); play(); });
      dots.forEach((d, k) => on(d, "click", () => { go(k); play(); }));
      // Focusing any control stops rotation until the visitor explicitly resumes it.
      on(hero, "focusin", () => { rotationRequested = false; play(); });
      on(toggle, "pointerdown", () => { pointerIntent = !rotationRequested; });
      on(toggle, "pointercancel", () => { pointerIntent = null; });
      on(toggle, "pointerleave", () => { pointerIntent = null; });
      on(toggle, "click", () => { rotationRequested = pointerIntent ?? !rotationRequested; pointerIntent = null; play(); });
      on(hero, "pointerenter", (e: PointerEvent) => { if (e.pointerType === "mouse") { hovering = true; play(); } });
      on(hero, "pointerleave", () => { hovering = false; play(); });
      on(motionPreference, "change", () => { if (reduceMotion) rotationRequested = false; play(); });
      on(document, "visibilitychange", play);
      let x0: number | null = null;
      on(hero, "pointerdown", (e: PointerEvent) => { x0 = e.clientX; });
      on(hero, "pointerup", (e: PointerEvent) => {
        if (x0 === null) return;
        const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 50) { go(dx < 0 ? i + 1 : i - 1); play(); }
      });
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; play(); });
        observer.observe(hero);
        cleanups.push(() => observer.disconnect());
      } else {
        inView = true;
      }
      go(0); play();
      cleanups.push(() => clearInterval(timer));
    }

    /* The keyword strip moves only while visible in the active tab. */
    {
      const marquee = document.querySelector<HTMLElement>(".marquee")!;
      const toggle = document.getElementById("marqueeToggle") as HTMLButtonElement;
      let inView = !("IntersectionObserver" in window);
      let stopped = reduceMotion;
      const sync = () => {
        marquee.classList.toggle("is-running", inView && !document.hidden && !reduceMotion && !stopped);
        toggle.disabled = reduceMotion;
        toggle.textContent = reduceMotion ? "Movimiento reducido" : stopped ? "Reanudar palabras" : "Pausar palabras";
      };
      on(toggle, "click", () => { stopped = !stopped; sync(); });
      on(motionPreference, "change", () => { if (reduceMotion) stopped = true; sync(); });
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
        observer.observe(marquee);
        cleanups.push(() => observer.disconnect());
      }
      on(document, "visibilitychange", sync);
      sync();
      cleanups.push(() => marquee.classList.remove("is-running"));
    }

    /* Counters: final numbers are in the HTML; count up once when scrolled into view */
    if (!reduceMotion && "IntersectionObserver" in window) {
      const els = [...document.querySelectorAll<HTMLElement>("#counters [data-to]")];
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        let frame = 0;
        const step = (t: number) => {
          const p = reduceMotion ? 1 : Math.min(1, (t - t0) / 1600), ease = 1 - Math.pow(1 - p, 3);
          els.forEach((el) => { el.textContent = (el.dataset.prefix || "") + Math.round(+el.dataset.to! * ease); });
          if (p < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        cleanups.push(() => cancelAnimationFrame(frame));
      }, { threshold: 0.6 });
      io.observe(document.getElementById("counters")!);
      cleanups.push(() => io.disconnect());
    }

    /* Brand list hover highlights the matching orbit bubble */
    {
      const list = document.getElementById("brandList")!;
      const mark = (k: string | null) =>
        document.querySelectorAll<HTMLElement>("#orbitSpin .bubble, #brandList li").forEach((el) => el.classList.toggle("hl", el.dataset.k === k));
      on(list, "mouseover", (e: MouseEvent) => { const li = (e.target as Element).closest("li"); if (li) mark(li.dataset.k ?? null); });
      on(list, "mouseleave", () => mark(null));
    }

    /* Coverage tabs and a static hub: no perpetual SVG animation. */
    {
      const tabs = document.getElementById("tabs")!;
      const panel = document.getElementById("tabpanel")!;
      const hub = document.getElementById("hub")!;
      const cx = 280, cy = 260, R = 190;
      const pts = REGIONS.map((_, k) => {
        const a = (k / REGIONS.length) * Math.PI * 2 - Math.PI / 2;
        return { x: +(cx + R * Math.cos(a)).toFixed(1), y: +(cy + R * Math.sin(a)).toFixed(1) };
      });
      const draw = (sel: number) => {
        const lines = pts.map((p, k) => `<line class="${k === sel ? "" : "flow"}" x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="${k === sel ? "#b4377e" : "#d9c6dd"}" stroke-width="${k === sel ? 4 : 2}" stroke-dasharray="${k === sel ? "0" : "6 8"}"/>`).join("");
        const nodes = pts.map((p, k) => {
          const sel_ = k === sel;
          const words = REGIONS[k].name.split(" ");
          const half = Math.ceil(words.length / 2);
          const l1 = words.slice(0, half).join(" "), l2 = words.slice(half).join(" ");
          return `<g data-k="${k}" role="button" tabindex="0" aria-label="Seleccionar región ${esc(REGIONS[k].name)}" aria-pressed="${sel_}" aria-controls="tabpanel" style="cursor:pointer">
            <circle cx="${p.x}" cy="${p.y}" r="${sel_ ? 46 : 40}" fill="${sel_ ? "#b4377e" : "#ffffff"}" stroke="${sel_ ? "#b4377e" : "#e6e1e8"}" stroke-width="2"/>
            <text x="${p.x}" y="${p.y - (l2 ? 3 : -4)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${sel_ ? "#ffffff" : "#231b26"}">${esc(l1)}</text>
            ${l2 ? `<text x="${p.x}" y="${p.y + 12}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${sel_ ? "#ffffff" : "#231b26"}">${esc(l2)}</text>` : ""}
          </g>`;
        }).join("");
        hub.innerHTML = `
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#f1e8f2" stroke-width="40"/>
          ${lines}${nodes}
          <circle class="core-ring" cx="${cx}" cy="${cy}" r="76" fill="none" stroke="#98c454" stroke-width="3" stroke-dasharray="14 10"/>
          <circle cx="${cx}" cy="${cy}" r="64" fill="#6e2378"/>
          <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="17" font-weight="800" fill="#ffffff">Import</text>
          <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" font-weight="600" fill="#e8dcea">Centro de despacho</text>`;
      };
      const tabEls = () => [...tabs.children] as HTMLElement[];
      const select = (k: number) => {
        tabEls().forEach((t, n) => { t.setAttribute("aria-selected", String(n === k)); t.tabIndex = n === k ? 0 : -1; });
        panel.setAttribute("aria-labelledby", `tab-${k}`);
        const r = REGIONS[k];
        panel.innerHTML = `<div class="deps">${r.deps.map((d, n) => `<span style="--i:${n}">${esc(d)}</span>`).join("")}</div>
          <p>Despacho por transportadora nacional.</p>`;
        draw(k);
      };
      on(tabs, "click", (e: MouseEvent) => { const t = (e.target as Element).closest(".tab"); if (t) select(tabEls().indexOf(t as HTMLElement)); });
      on(tabs, "keydown", (e: KeyboardEvent) => {
        const cur = tabEls().findIndex((t) => t.getAttribute("aria-selected") === "true");
        if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const n = e.key === "Home" ? 0 : e.key === "End" ? REGIONS.length - 1 : (cur + (e.key === "ArrowRight" ? 1 : -1) + REGIONS.length) % REGIONS.length;
          select(n); tabEls()[n].focus();
        }
      });
      const activateNode = (target: EventTarget | null) => {
        const g = (target as Element).closest<SVGGElement>("g[data-k]");
        if (!g) return;
        const k = +g.dataset.k!;
        select(k);
        hub.querySelector<SVGElement>(`g[data-k="${k}"]`)?.focus();
      };
      on(hub, "click", (e: MouseEvent) => activateNode(e.target));
      on(hub, "keydown", (e: KeyboardEvent) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault(); activateNode(e.target);
      });
      select(0);
    }

    /* Welcome offer countdown */
    {
      const el = document.getElementById("countdown")!;
      const end = Number(el.dataset.end);
      const set = (u: string, val: number) => {
        const b = el.querySelector(`[data-u="${u}"]`)!, s = String(val).padStart(2, "0");
        if (b.textContent !== s) b.textContent = s;
      };
      const tick = () => {
        const ms = Math.max(0, end - Date.now());
        set("d", Math.floor(ms / 864e5)); set("h", Math.floor(ms / 36e5) % 24); set("m", Math.floor(ms / 6e4) % 60);
      };
      tick();
      const t = setInterval(tick, 15000);
      cleanups.push(() => clearInterval(t));
    }

    /* Copy buttons */
    on(document, "click", (e: MouseEvent) => {
      const cp = (e.target as Element).closest<HTMLElement>(".copy");
      if (!cp) return;
      const done = () => { cp.textContent = "Copiado"; setTimeout(() => (cp.textContent = "Copiar"), 1600); };
      const selectText = () => {
        const r = document.createRange(); r.selectNodeContents(document.getElementById(cp.dataset.target!)!);
        const s = getSelection()!; s.removeAllRanges(); s.addRange(r);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(cp.dataset.copy!).then(done).catch(selectText);
      else selectText();
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
