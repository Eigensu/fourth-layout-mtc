"use client";

import React from "react";

type ToastVariant = "success" | "error" | "info";

export function showToast({ message, title, variant = "success", duration = 2500 }: { message: string; title?: string; variant?: ToastVariant; duration?: number; }) {
  if (typeof window === "undefined") return;

  const containerId = "__toast_container__";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "fixed bottom-4 right-4 z-[9999] flex flex-col gap-2";
    document.body.appendChild(container);
  }

  const el = document.createElement("div");
  const base = "min-w-[220px] max-w-[360px] rounded-xl shadow-lg border px-4 py-3 text-sm flex items-start gap-3 animate-in fade-in zoom-in duration-150";
  const styles: Record<ToastVariant, string> = {
    success: "bg-white border-green-200 text-green-800",
    error: "bg-white border-red-200 text-red-800",
    info: "bg-white border-blue-200 text-blue-800",
  };
  el.className = `${base} ${styles[variant]}`;

  el.innerHTML = `
    ${title ? `<div class="font-semibold text-[13px]">${escapeHtml(title)}</div>` : ""}
    <div class="text-[12px]">${escapeHtml(message)}</div>
    <button aria-label="Close" class="ml-auto text-[12px] opacity-70 hover:opacity-100">✕</button>
  `;

  const close = () => {
    try {
      el.classList.add("animate-out", "fade-out", "zoom-out", "duration-150");
      setTimeout(() => el.remove(), 160);
    } catch {}
  };

  el.querySelector("button")?.addEventListener("click", close);

  container.prepend(el);

  if (duration > 0) {
    setTimeout(close, duration);
  }
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
