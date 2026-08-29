"use client";

import { useEffect } from "react";
import { CSRF_COOKIE, CSRF_FIELD } from "@/lib/constants";

/**
 * Keep every form's CSRF field in step with the live cookie.
 *
 * The token is rendered into a hidden input when the page is built on the
 * server, but the `asmaa_csrf` cookie can move on afterwards — it rotates when a
 * session starts or ends, and a page restored from the back/forward cache is
 * served with whatever token it was built with. Any form still holding the older
 * value then fails `verifyCsrf` with "فشل التحقق الأمني", which is what a visitor
 * hits after signing out and pressing Back, or after leaving a tab open across a
 * sign-in.
 *
 * Rewriting the field from the cookie at submit time makes the stale case
 * impossible: the value posted is always the one the browser is about to send in
 * the Cookie header, so the two halves of the double-submit check cannot drift.
 *
 * This does not weaken the check. The cookie is deliberately `httpOnly: false`
 * so the page can read it back (see middleware.ts); the same-origin policy still
 * stops a cross-site attacker from reading it, so they still cannot populate the
 * field. The origin check in lib/auth/csrf.ts is untouched.
 *
 * Done once here rather than in each of the ~20 forms so that a form added later
 * inherits it without anyone remembering to.
 */
export function CsrfSync() {
  useEffect(() => {
    function readToken(): string | null {
      const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`),
      );
      return match ? decodeURIComponent(match[1]!) : null;
    }

    function sync(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const token = readToken();
      if (!token) return; // nothing to sync; let the server reject as before

      form
        .querySelectorAll<HTMLInputElement>(`input[name="${CSRF_FIELD}"]`)
        .forEach((input) => {
          if (input.value !== token) input.value = token;
        });
    }

    // Capture phase: run before React processes the Server Action submission.
    document.addEventListener("submit", sync, true);
    return () => document.removeEventListener("submit", sync, true);
  }, []);

  return null;
}
