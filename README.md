# Evening Brewing Handover — Balter Brewing

A password-protected, multi-device Cloudflare Worker that replaces the old
Cellar Handover spreadsheet. Fill in the sheet, hit **Build handover email**,
and copy the formatted result straight into Outlook/Gmail. Everyone on shift
sees the same shared draft, kept in sync across devices.

## Architecture

```
wrangler.jsonc     Worker + static-assets config (deploy settings)
package.json       wrangler as the only dependency
src/worker.js      the entire server: auth gate → sync proxy → static files
public/            the site itself (unchanged from before)
  index.html
  style.css
  app.js
  assets/
.dev.vars.example  template for local secrets — copy to .dev.vars (gitignored)
```

One Worker, `src/worker.js`, handles every request in this order:

1. **Auth gate.** Every route — HTML, CSS, JS, images, `/api/*` — is checked
   for a valid signed session cookie before anything is served. No cookie,
   or an invalid/expired one, and you get the login page (or a `401` for
   API calls) instead. Sessions are `HttpOnly; Secure; SameSite=Lax` and
   signed with HMAC-SHA256, so nothing about them can be forged or read by
   JavaScript in the browser.
2. **Sync proxy.** `/api/sync` (`GET` to read, `PUT` to write) proxies to a
   private JSONBin.io bin. The real JSONBin API key lives only as a Worker
   secret — it's never sent to the browser, never appears in page source.
3. **Static files.** Anything else falls through to the site in `public/`.

The one non-obvious setting: `wrangler.jsonc` has `"run_worker_first": true`
on the assets config. Without it, Cloudflare serves matching static files
*before* the Worker ever runs, which would let anyone load the page straight
past the login check. `run_worker_first` forces every request through the
auth gate first, static files included.

### How sync works

- Every field change is saved to the browser's `localStorage` immediately
  (so a refresh never loses work) and pushed to `/api/sync` a second or so
  later.
- On load, and every ~20 seconds afterwards (plus whenever the tab regains
  focus), the page pulls the latest version from the server. Whichever
  copy — local or remote — has the newer timestamp wins.
- If someone's mid-keystroke, or has the "Build handover email" preview
  open, incoming updates are held back so they don't get overwritten or
  interrupted.
- If the network's down, edits keep saving locally and retry the push once
  you're back online — nothing is lost, it just doesn't sync until then.
- **Clear sheet** clears the shared copy too, for everyone, so use it once
  a shift's handover has actually been sent.

This is deliberately simple last-write-wins sync, not real-time
collaborative editing — it's built for "one shift lead fills this in,"
same as the spreadsheet, just reachable from any device without emailing
a file around.

## One-time setup

### 1. Create the JSONBin.io bin

1. Sign up at [jsonbin.io](https://jsonbin.io) (free tier is plenty for this).
2. Go to **API Keys** and copy your **X-Master-Key** — this is
   `JSONBIN_API_KEY`.
3. Create a new bin. JSONBin's editor won't accept a truly empty `{}` (it
   errors with "Bin cannot be blank"), so give it a small placeholder
   instead, e.g. `{"note": "handover sync bin"}` — the app will overwrite
   this the first time anyone saves the sheet, so its contents don't
   matter. Copy the bin's **Bin ID** from
   the bin's page — this is `JSONBIN_BIN_ID`.

### 2. Generate a session secret

`SESSION_SECRET` just needs to be a long, random, unguessable string — it's
never typed by a person, only used by the Worker to sign cookies. Generate
one with:

```
openssl rand -base64 48
```

(or any other password generator — 40+ random characters is plenty).

### 3. Push this repo to GitHub

Create a new GitHub repo and push everything in this folder to it —
`wrangler.jsonc`, `package.json`, `src/`, `public/`, `.gitignore`, this
README. Don't create or commit a real `.dev.vars` file; it's gitignored on
purpose since it would contain real secrets.

### 4. Connect it to Cloudflare via Workers Builds (Git integration)

Drag-and-drop deploys **won't work** here since they can't run a Worker
script — this has to go through Cloudflare's Git integration:

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Workers** →
   **Import a repository** (this is "Workers Builds").
2. Connect your GitHub account and pick the repo.
3. Build settings: no build command needed — leave it as the default/blank,
   since this is a plain JS Worker with no bundling step. Root directory is
   the repo root (where `wrangler.jsonc` lives).
4. Deploy. Cloudflare will build and deploy automatically on every push to
   your main branch from now on.

### 5. Set the four secrets

In the Cloudflare dashboard, on this Worker: **Settings → Variables and
Secrets → Add**. Add all four as type **Secret** (not Text, so they're
encrypted and never shown again in the dashboard):

| Name              | Value                                          |
|-------------------|-------------------------------------------------|
| `SITE_PASSWORD`   | the password your team will type in to log in  |
| `SESSION_SECRET`  | the random string from step 2                   |
| `JSONBIN_BIN_ID`  | from step 1                                     |
| `JSONBIN_API_KEY` | your JSONBin X-Master-Key, from step 1          |

After adding/changing secrets, redeploy (or it'll pick them up on the next
deploy) for them to take effect.

### 6. Try it

Visit your `*.workers.dev` URL (or custom domain, once attached under
**Settings → Domains & Routes**). You should land on the login page. Log in
with `SITE_PASSWORD`, fill in a few fields, open the same URL on your phone
— it should show the same draft within a few seconds.

## Local development

```
npm install
cp .dev.vars.example .dev.vars   # then fill in real values
npm run dev
```

`wrangler dev` runs the whole thing locally, including the auth gate and
the JSONBin proxy, at `http://localhost:8787`. `.dev.vars` is gitignored —
it's your local stand-in for the dashboard secrets.

```
npm run deploy
```

deploys straight from your machine if you ever need to push outside the
Git integration (the Git integration will otherwise redeploy automatically
on every push).

## Customising later

- **Colours / fonts**: `public/style.css`, top of file under `:root`.
- **Add or rename a field**: `public/app.js` — the `buildMiniGrid(...)`
  calls define the Yeast and Utilities fields; add a `["key", "Label"]`
  entry to add one.
- **Logo**: `public/assets/logo.png` / `.svg`, and the matching base64
  copy embedded in `src/worker.js` (used on the login page, which can't
  fetch external files before you're logged in) and in `public/app.js`
  (used in the generated email).
- **Session length**: `SESSION_DURATION_MS` near the top of
  `src/worker.js` (currently 30 days).
- **Sync poll interval**: the `20000` (ms) passed to `setInterval` in
  `public/app.js`'s startup block.
