"use client";
import { useEffect } from "react";
import { REGIONS } from "@/lib/site";

/**
 * Interactive behaviour of the home page, ported from the original single-file site:
 * hero slider, counters, brand highlight, card tilt, coverage hub, offer countdown,
 * copy-to-clipboard and section-by-section scrolling on desktop.
 */
export default function HomeEffects() {
  useEffect(() => {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: Window | Document | Element, ev: K | string, fn: (e: any) => void, opt?: AddEventListenerOptions) => {
      t.addEventListener(ev, fn, opt);
      cleanups.push(() => t.removeEventListener(ev, fn, opt));
    };
    const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const header = document.getElementById("top")!;

    /* Hero slider with parallax */
    {
      const SLIDE_MS = 6500;
      const hero = document.getElementById("inicio")!;
      const slides = [...document.querySelectorAll<HTMLElement>("#slides .slide")];
      const dotsEl = document.getElementById("heroDots")!;
      hero.style.setProperty("--dur", SLIDE_MS + "ms");
      dotsEl.innerHTML = slides.map((_, k) => `<button type="button" aria-label="Diapositiva ${k + 1}"></button>`).join("");
      const dots = [...dotsEl.children] as HTMLElement[];
      let i = 0;
      let timer: ReturnType<typeof setInterval> | undefined;
      const go = (n: number) => {
        i = (n + slides.length) % slides.length;
        slides.forEach((s, k) => { s.classList.toggle("on", k === i); s.inert = k !== i; });
        dots.forEach((d, k) => { d.removeAttribute("aria-current"); if (k === i) { void d.offsetWidth; d.setAttribute("aria-current", "true"); } });
      };
      const stop = () => { clearInterval(timer); hero.classList.add("paused"); };
      const play = () => { clearInterval(timer); hero.classList.remove("paused"); if (!reduceMotion) timer = setInterval(() => go(i + 1), SLIDE_MS); };
      on(document.getElementById("heroPrev")!, "click", () => { go(i - 1); play(); });
      on(document.getElementById("heroNext")!, "click", () => { go(i + 1); play(); });
      dots.forEach((d, k) => on(d, "click", () => { go(k); play(); }));
      on(hero, "focusin", stop);
      on(hero, "focusout", play);
      let x0: number | null = null;
      on(hero, "pointerdown", (e: PointerEvent) => { x0 = e.clientX; });
      on(hero, "pointerup", (e: PointerEvent) => {
        if (x0 === null) return;
        const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 50) { go(dx < 0 ? i + 1 : i - 1); play(); }
      });
      if (finePointer && !reduceMotion) {
        on(hero, "pointermove", (e: PointerEvent) => {
          const r = hero.getBoundingClientRect();
          hero.style.setProperty("--px", ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
          hero.style.setProperty("--py", ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
        });
        on(hero, "pointerleave", () => { hero.style.setProperty("--px", "0"); hero.style.setProperty("--py", "0"); });
      }
      go(0); play();
      cleanups.push(() => clearInterval(timer));
    }

    /* Counters: final numbers are in the HTML; count up once when scrolled into view */
    if (!reduceMotion && "IntersectionObserver" in window) {
      const els = [...document.querySelectorAll<HTMLElement>("#counters [data-to]")];
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / 1600), ease = 1 - Math.pow(1 - p, 3);
          els.forEach((el) => { el.textContent = (el.dataset.prefix || "") + Math.round(+el.dataset.to! * ease); });
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
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

    /* Tilt + spotlight on cards */
    if (finePointer && !reduceMotion) {
      on(document, "pointermove", (e: PointerEvent) => {
        const el = (e.target as Element).closest<HTMLElement>("[data-tilt]");
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--ry", ((x - 0.5) * 10).toFixed(2) + "deg");
        el.style.setProperty("--rx", ((0.5 - y) * 10).toFixed(2) + "deg");
        el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      });
      on(document, "pointerout", (e: PointerEvent) => {
        const el = (e.target as Element).closest<HTMLElement>("[data-tilt]");
        if (el && !el.contains(e.relatedTarget as Node)) { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); }
      });
    }

    /* Coverage tabs + hub with moving shipments */
    {
      const tabs = document.getElementById("tabs")!;
      const panel = document.getElementById("tabpanel")!;
      const hub = document.getElementById("hub")!;
      const cx = 280, cy = 260, R = 190;
      const pts = REGIONS.map((_, k) => {
        const a = (k / REGIONS.length) * Math.PI * 2 - Math.PI / 2;
        return { x: +(cx + R * Math.cos(a)).toFixed(1), y: +(cy + R * Math.sin(a)).toFixed(1) };
      });
      tabs.innerHTML = REGIONS.map((r, k) => `<button class="tab" role="tab" id="tab-${k}" type="button" aria-controls="tabpanel">${esc(r.name)}</button>`).join("");
      const draw = (sel: number) => {
        const lines = pts.map((p, k) => `<line class="${k === sel ? "" : "flow"}" x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="${k === sel ? "#b4377e" : "#d9c6dd"}" stroke-width="${k === sel ? 4 : 2}" stroke-dasharray="${k === sel ? "0" : "6 8"}"/>`).join("");
        const trucks = reduceMotion ? "" : pts.map((p, k) => `<circle r="${k === sel ? 7 : 4}" fill="${k === sel ? "#98c454" : "#b4377e"}" opacity="${k === sel ? 1 : 0.55}"><animateMotion dur="${k === sel ? 1.6 : 3.2}s" begin="${(k * 0.37).toFixed(2)}s" repeatCount="indefinite" path="M${cx},${cy} L${p.x},${p.y}"/></circle>`).join("");
        const nodes = pts.map((p, k) => {
          const sel_ = k === sel;
          const words = REGIONS[k].name.split(" ");
          const half = Math.ceil(words.length / 2);
          const l1 = words.slice(0, half).join(" "), l2 = words.slice(half).join(" ");
          return `<g data-k="${k}" style="cursor:pointer">
            <circle cx="${p.x}" cy="${p.y}" r="${sel_ ? 46 : 40}" fill="${sel_ ? "#b4377e" : "#ffffff"}" stroke="${sel_ ? "#b4377e" : "#e6e1e8"}" stroke-width="2"/>
            <text x="${p.x}" y="${p.y - (l2 ? 3 : -4)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${sel_ ? "#ffffff" : "#231b26"}">${esc(l1)}</text>
            ${l2 ? `<text x="${p.x}" y="${p.y + 12}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${sel_ ? "#ffffff" : "#231b26"}">${esc(l2)}</text>` : ""}
          </g>`;
        }).join("");
        hub.innerHTML = `
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#f1e8f2" stroke-width="40"/>
          ${lines}${trucks}${nodes}
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
        panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap");
        panel.innerHTML = `<div class="deps">${r.deps.map((d, n) => `<span style="--i:${n}">${esc(d)}</span>`).join("")}</div>
          <p>Despacho por transportadora nacional.</p>`;
        draw(k);
      };
      on(tabs, "click", (e: MouseEvent) => { const t = (e.target as Element).closest(".tab"); if (t) select(tabEls().indexOf(t as HTMLElement)); });
      on(tabs, "keydown", (e: KeyboardEvent) => {
        const cur = tabEls().findIndex((t) => t.getAttribute("aria-selected") === "true");
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const n = (cur + (e.key === "ArrowRight" ? 1 : -1) + REGIONS.length) % REGIONS.length;
          select(n); tabEls()[n].focus();
        }
      });
      on(hub, "click", (e: MouseEvent) => { const g = (e.target as Element).closest<SVGGElement>("g[data-k]"); if (g) select(+g.dataset.k!); });
      select(0);
    }

    /* Welcome offer countdown */
    {
      const el = document.getElementById("countdown")!;
      const end = Number(el.dataset.end);
      const set = (u: string, val: number) => {
        const b = el.querySelector(`[data-u="${u}"]`)!, s = String(val).padStart(2, "0");
        if (b.textContent !== s) { b.textContent = s; b.classList.remove("flip"); void (b as HTMLElement).offsetWidth; b.classList.add("flip"); }
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

    /* Section-by-section scrolling on desktop (wheel/keys glide one full section).
       Sections taller than the screen scroll normally until their edge. Touch keeps native scrolling. */
    {
      const ids = ["inicio", "valores", "nosotros", "marcas", "lineas", "programa", "bienvenida", "cobertura", "registro", "preguntas"];
      const labels = ["Inicio", "Ventajas", "Nosotros", "Marcas", "Catálogo", "Programa", "Bienvenida", "Cobertura", "Registro", "Preguntas", "Contacto"];
      const secs = ids.map((id) => document.getElementById(id)!).concat(document.querySelector("footer")!);
      const navEl = document.getElementById("secNav")!;
      navEl.innerHTML = secs.map((_, k) => `<button type="button" aria-label="${labels[k]}"><span>${labels[k]}</span></button>`).join("");
      const dots = [...navEl.children] as HTMLElement[];
      const headH = () => header.offsetHeight;
      const absTop = (el: Element) => el.getBoundingClientRect().top + scrollY;
      const maxY = () => document.documentElement.scrollHeight - innerHeight;
      const target = (k: number) => Math.min(maxY(), k === 0 ? 0 : absTop(secs[k]) - headH());
      const current = () => {
        const y = scrollY + headH() + 12;
        let k = 0;
        secs.forEach((s, n) => { if (absTop(s) <= y) k = n; });
        if (scrollY >= maxY() - 2) k = secs.length - 1;
        return k;
      };
      const markDot = () => { const k = current(); dots.forEach((d, n) => d.setAttribute("aria-current", String(n === k))); };
      let ticking = false;
      on(window, "scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { markDot(); ticking = false; }); } }, { passive: true });
      markDot();

      const jack = finePointer && !reduceMotion;
      let busy = false, cooling = false, lastWheel = 0, acc = 0, raf = 0;
      const glide = (to: number) => {
        to = Math.max(0, Math.min(to, maxY()));
        if (!jack) { scrollTo({ top: to, behavior: reduceMotion ? "auto" : "smooth" }); return; }
        const from = scrollY, d = to - from, t0 = performance.now();
        const dur = Math.min(1100, 600 + Math.abs(d) * 0.2);
        busy = true;
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          scrollTo({ top: from + d * ease, behavior: "instant" });
          if (p < 1) raf = requestAnimationFrame(step);
          else { busy = false; cooling = true; lastWheel = performance.now(); }
        };
        raf = requestAnimationFrame(step);
      };
      cleanups.push(() => cancelAnimationFrame(raf));
      dots.forEach((d, k) => on(d, "click", () => glide(target(k))));

      if (jack) {
        const step = (dir: number) => {
          const k = current(), r = secs[k].getBoundingClientRect(), vh = innerHeight;
          if (dir > 0) {
            if (r.bottom > vh + 4) return false;
            if (k < secs.length - 1) { glide(target(k + 1)); return true; }
            return false;
          }
          if (k > 0 && r.top < headH() - 4) return false;
          if (k === 0) { if (scrollY > 0) { glide(0); return true; } return false; }
          glide(Math.max(target(k - 1), absTop(secs[k]) - vh));
          return true;
        };
        on(window, "wheel", (e: WheelEvent) => {
          if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
          if ((e.target as Element).closest("textarea, select")) return;
          const now = performance.now();
          if (busy) { e.preventDefault(); return; }
          if (cooling) {
            if (now - lastWheel < 180) { lastWheel = now; e.preventDefault(); return; }
            cooling = false;
          }
          const dir = Math.sign(e.deltaY);
          if (!dir) return;
          const k = current(), r = secs[k].getBoundingClientRect();
          const native = dir > 0 ? r.bottom > innerHeight + 4 : k > 0 && r.top < headH() - 4;
          if (native) { acc = 0; return; }
          e.preventDefault();
          acc += e.deltaY;
          if (Math.abs(acc) < 24) return;
          acc = 0;
          step(dir);
        }, { passive: false });
        on(window, "keydown", (e: KeyboardEvent) => {
          if (busy || e.altKey || e.ctrlKey || e.metaKey) return;
          if ((e.target as Element).closest("input, textarea, select, button, [role=tablist], summary, [contenteditable]")) return;
          const down = ["PageDown", "ArrowDown"].includes(e.key) || (e.key === " " && !e.shiftKey);
          const up = ["PageUp", "ArrowUp"].includes(e.key) || (e.key === " " && e.shiftKey);
          if (!down && !up) return;
          if (step(down ? 1 : -1)) e.preventDefault();
        });
      }
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
