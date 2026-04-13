"use client";

import { useEffect } from "react";

/**
 * Injects admin-configured HTML (scripts, GTM, etc.) after mount.
 * Runs once per full page load; scripts execute when moved into the live document.
 */
export function HtmlInjection({
  headHtml,
  bodyStartHtml,
  bodyEndHtml,
}: {
  headHtml: string;
  bodyStartHtml: string;
  bodyEndHtml: string;
}) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.documentElement.dataset.fgoHtmlInject === "1") return;
    document.documentElement.dataset.fgoHtmlInject = "1";

    const inject = (html: string, target: "head" | "body-start" | "body-end") => {
      const t = html?.trim();
      if (!t) return;
      const template = document.createElement("template");
      template.innerHTML = t;
      const frag = template.content;
      if (target === "head") {
        while (frag.firstChild) {
          document.head.appendChild(frag.firstChild);
        }
      } else if (target === "body-end") {
        while (frag.firstChild) {
          document.body.appendChild(frag.firstChild);
        }
      } else {
        const nodes = Array.from(frag.childNodes);
        for (let i = nodes.length - 1; i >= 0; i--) {
          document.body.insertBefore(nodes[i]!, document.body.firstChild);
        }
      }
    };

    inject(headHtml, "head");
    inject(bodyStartHtml, "body-start");
    inject(bodyEndHtml, "body-end");
  }, [headHtml, bodyStartHtml, bodyEndHtml]);

  return null;
}
