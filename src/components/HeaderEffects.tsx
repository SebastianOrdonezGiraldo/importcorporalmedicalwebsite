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
    const onScroll = () => header.classList.toggle("scrolled", scrollY > 40);
    menuBtn.addEventListener("click", toggle);
    nav.addEventListener("click", close);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      menuBtn.removeEventListener("click", toggle);
      nav.removeEventListener("click", close);
      removeEventListener("scroll", onScroll);
    };
  }, []);
  return null;
}
