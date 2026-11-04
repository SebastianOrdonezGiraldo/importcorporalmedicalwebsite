"use client";
import { useEffect } from "react";

/** Mobile menu toggle and header shrink on scroll (same behaviour as the original page). */
export default function HeaderEffects() {
  useEffect(() => {
    const menuBtn = document.getElementById("menuBtn")!;
    const nav = document.getElementById("mainNav")!;
    const header = document.getElementById("top")!;
    const toggle = () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    const close = (e: Event) => {
      if ((e.target as Element).closest("a")) {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !nav.classList.contains("open")) return;
      e.preventDefault();
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.focus();
    };
    let scrolled: boolean | undefined;
    const onScroll = () => {
      const next = scrollY > 40;
      if (next === scrolled) return;
      scrolled = next;
      header.classList.toggle("scrolled", next);
    };
    menuBtn.addEventListener("click", toggle);
    nav.addEventListener("click", close);
    header.addEventListener("keydown", onKeyDown);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      menuBtn.removeEventListener("click", toggle);
      nav.removeEventListener("click", close);
      header.removeEventListener("keydown", onKeyDown);
      removeEventListener("scroll", onScroll);
    };
  }, []);
  return null;
}
