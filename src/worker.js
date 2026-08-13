/**
 * Evening Brewing Handover — Worker entry point
 *
 * Responsibilities, in order:
 *   1. Password-gate every route behind a signed session cookie
 *      (HMAC-SHA256, HttpOnly, Secure, SameSite=Lax). Checked before
 *      anything else is served — static files and API routes alike.
 *   2. Proxy cloud-sync reads/writes to JSONBin.io server-side, so the
 *      real JSONBin API key never reaches the browser.
 *   3. Fall through to the static site in public/ for everything else.
 *
 * Required secrets (Worker Settings → Variables and Secrets, type "Secret"):
 *   SITE_PASSWORD    the shared password staff use to log in
 *   SESSION_SECRET    long random string used to sign session cookies
 *   JSONBIN_BIN_ID    the JSONBin.io bin that stores the shared draft
 *   JSONBIN_API_KEY  JSONBin.io "X-Master-Key"
 *
 * See README.md for how to generate/obtain each of these and where to
 * set them.
 */

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ---- Routes that must be reachable *without* a session -------------
    if (url.pathname === "/login" && request.method === "GET") {
      return renderLogin();
    }
    if (url.pathname === "/login" && request.method === "POST") {
      return handleLoginSubmit(request, env);
    }
    if (url.pathname === "/logout") {
      return handleLogout();
    }

    // ---- Everything else requires a valid session -----------------------
    const cookieToken = getCookie(request, COOKIE_NAME);
    const authed = await verifySession(cookieToken, env.SESSION_SECRET);

    if (!authed) {
      if (url.pathname.startsWith("/api/")) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      return renderLogin({ status: 401 });
    }

    if (url.pathname === "/api/sync") {
      return handleSync(request, env);
    }

    // ---- Fall through to the static site --------------------------------
    return env.ASSETS.fetch(request);
  },
};

/* =====================================================================
   Auth: login, logout, session cookie signing/verification
===================================================================== */

async function handleLoginSubmit(request, env) {
  let password = "";
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      password = String(form.get("password") || "");
    } else {
      const body = await request.json().catch(() => ({}));
      password = String(body.password || "");
    }
  } catch (e) {
    password = "";
  }

  const expected = env.SITE_PASSWORD || "";
  const ok = expected.length > 0 && timingSafeEqualStr(password, expected);

  if (!ok) {
    return renderLogin({ status: 401, error: "Incorrect password — try again." });
  }

  const cookie = await createSessionCookie(env);
  return new Response(null, {
    status: 303,
    headers: { Location: "/", "Set-Cookie": cookie },
  });
}

function handleLogout() {
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/login",
      "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}

async function createSessionCookie(env) {
  const expiry = Date.now() + SESSION_DURATION_MS;
  const sig = await hmacSign(String(expiry), env.SESSION_SECRET);
  const token = `${expiry}.${sig}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`;
}

async function verifySession(token, secret) {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expiry = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!expiry || !sig) return false;

  const expiryNum = Number(expiry);
  if (!Number.isFinite(expiryNum) || Date.now() > expiryNum) return false;

  const expected = await hmacSign(expiry, secret);
  return timingSafeEqualStr(sig, expected);
}

async function hmacSign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bufferToBase64Url(sigBuf);
}

function bufferToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Constant-time-ish string compare — fine for our purposes (session
// signatures / passwords are short, fixed-ish length secrets, not a
// high-frequency oracle target), but avoids the obvious early-exit leak.
function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const parts = header.split(";");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/* =====================================================================
   Cloud sync — proxies JSONBin.io so the API key stays server-side
===================================================================== */

const MAX_SYNC_BODY_BYTES = 300 * 1024; // 300KB is far more than this sheet needs

async function handleSync(request, env) {
  if (!env.JSONBIN_BIN_ID || !env.JSONBIN_API_KEY) {
    return jsonResponse({ error: "Sync isn't configured on the server yet." }, 501);
  }

  if (request.method === "GET") {
    try {
      const upstream = await fetch(`${JSONBIN_BASE}/${env.JSONBIN_BIN_ID}/latest`, {
        headers: {
          "X-Master-Key": env.JSONBIN_API_KEY,
          "X-Bin-Meta": "false",
        },
      });
      if (!upstream.ok) {
        // Most commonly: bin has no data yet. Treat as "nothing to sync".
        return jsonResponse({}, 200);
      }
      const data = await upstream.json().catch(() => ({}));
      return jsonResponse(data, 200);
    } catch (e) {
      // Upstream unreachable — don't break the page over it, just report
      // "nothing to sync" so the client falls back to its local draft.
      return jsonResponse({}, 200);
    }
  }

  if (request.method === "PUT" || request.method === "POST") {
    const raw = await request.text();
    if (raw.length > MAX_SYNC_BODY_BYTES) {
      return jsonResponse({ error: "Payload too large" }, 413);
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return jsonResponse({ error: "Body must be valid JSON" }, 400);
    }

    try {
      const upstream = await fetch(`${JSONBIN_BASE}/${env.JSONBIN_BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": env.JSONBIN_API_KEY,
          "X-Bin-Versioning": "false",
        },
        body: JSON.stringify(parsed),
      });

      if (!upstream.ok) {
        return jsonResponse({ error: "Upstream sync store rejected the write" }, 502);
      }
      return jsonResponse({ ok: true }, 200);
    } catch (e) {
      return jsonResponse({ error: "Upstream sync store unreachable" }, 502);
    }
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* =====================================================================
   Login page — self-contained (no external CSS/JS) since it has to
   render before the person has a session to fetch anything else with.
===================================================================== */

const LOGO_DATA_URI = "data:image/png;base64,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";

function renderLogin({ status = 200, error = "" } = {}) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Evening Brewing Handover — Log in</title>
<style>
  :root{
    --mint:#47D7AC; --ink:#000000; --text:#14161A; --text-soft:#55585F;
    --line:rgba(0,0,0,0.12);
  }
  *{box-sizing:border-box;}
  body{
    margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#FFFFFF; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;
    color:var(--text); padding:24px;
  }
  .card{
    width:100%; max-width:360px; border:1px solid var(--line); border-radius:18px;
    padding:32px 28px; box-shadow:0 8px 24px -12px rgba(20,22,26,0.15);
  }
  .logo{ width:44px; height:44px; display:block; margin-bottom:16px; }
  h1{ font-size:20px; margin:0 0 4px; }
  p.sub{ margin:0 0 24px; color:var(--text-soft); font-size:13.5px; }
  label{ display:block; font-size:12.5px; font-weight:600; color:var(--text-soft); margin-bottom:6px; }
  input[type=password]{
    width:100%; padding:11px 12px; border:1.5px solid var(--line); border-radius:8px;
    font-size:15px; margin-bottom:16px;
  }
  input[type=password]:focus{ outline:none; border-color:var(--mint); box-shadow:0 0 0 3px rgba(71,215,172,0.25); }
  button{
    width:100%; padding:11px 12px; border:none; border-radius:999px;
    background:var(--ink); color:#fff; font-size:14.5px; font-weight:600; cursor:pointer;
  }
  button:hover{ background:#26282d; }
  .error{
    background:#FDEEDD; color:#8a4c14; font-size:13px; font-weight:600;
    border-radius:8px; padding:10px 12px; margin-bottom:16px;
  }
</style>
</head>
<body>
  <div class="card">
    <img class="logo" src="${LOGO_DATA_URI}" alt="Balter Brewing">
    <h1>Evening Brewing Handover</h1>
    <p class="sub">Balter Brewing — enter the shared password to continue.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST" action="/login">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" autofocus required>
      <button type="submit">Log in</button>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
