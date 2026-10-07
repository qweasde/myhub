"use client";

import { useEffect, useRef } from "react";

function send(payload: Record<string, unknown>) {
  const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
  // sendBeacon survives the page being left (a click on an external link); fetch is the fallback
  if (!navigator.sendBeacon?.("/api/v1/track", body)) {
    fetch("/api/v1/track", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

/** Counts a page view and clicks on links marked with data-track-link on the public page. */
export function ProfileTracker({ username }: { username: string }) {
  const sent = useRef(false);

  useEffect(() => {
    // Strict Mode runs effects twice in development; one view per page load
    if (!sent.current) {
      sent.current = true;
      send({ username, type: "view", referrer: document.referrer });
    }

    function onClick(event: MouseEvent) {
      const link = (event.target as Element).closest<HTMLElement>("[data-track-link]");
      if (link) send({ username, type: "click", link: Number(link.dataset.trackLink) });
    }
    // auxclick: middle-click "open in new tab" is a click too
    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, [username]);

  return null;
}
