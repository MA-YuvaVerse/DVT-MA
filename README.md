# DroneView Ops

A web app for DroneView's proposal → vendor quote → project workflow. It replaces the five tracking worksheets with one app. Version values are never double-counted, vendor quotes are unlimited, and reports don't break when columns change.

Built with Next.js 15, TypeScript, Postgres (Prisma) and Tailwind.

## How the worksheets map to the app

| Worksheet | In the app |
|---|---|
| Proposals | **Proposals**: one record per opportunity, numbered automatically (`YYYY#####`). Each proposal has **versions** `.1`, `.2`, `.3`… for revisions, alternative areas and bundles. |
| Data Acquisition Quotes | **Acquisition quotes** on each version: any number of vendors (no more Vendor 1/2/3), each with sensor, cost, frames and status. Tick *Selected* for the vendor used in costing. |
| Mapping Quotes | **Mapping quotes** on each version: any number of mapping vendors, with cost, days and $/acre. |
| Jobs + Projects | **Projects**: created from the won version with one click. Number format `YYMM18##P/D/M`, where `18` is the standard placeholder; add-ons get `-1`, `-2`. Holds the economics (PO, invoice, costs, margin), status, milestone dates and throughput. |
| Lookup tabs | **Companies** (one list, typed Client / Prospect / Acquisition vendor / Mapping vendor), **Contacts**, vendor **Sensors** and admin-editable **dropdown lists**. |
| QUERY / pivot tabs | **Reports**: open by $, by date, by client, high probability, follow-ups, pricing needed, hit rate, project throughput and vendor quote history. All export to CSV. |

### The everyday flow
1. **New proposal request:** log the inquiry with client, project name, dates and what's being asked for.
2. **Stages:** move each version along the stage bar with one click: New Request → Qualifying → Preparing Proposal → Proposal Sent → High Probability. **Close as…** sets Client Lost, Client Won/DVT Lost, On Hold, Abandoned or Cancelled.
3. **Versions and vendor quotes:** *Compare versions* shows every version side by side with all its acquisition and mapping quotes. **Make final** marks the chosen vendor (one per version).
4. **Client accepted — award:** marks the version won and creates the project.
5. **Project:** status and key dates. Location, all 19 milestone dates and economics are under *More details*.

Optional fields that come from the old spreadsheets (lat/long, GSD, PPSM, frames and so on) are kept, under collapsed **More details** sections. **Reports and Costing & margin** stay built but are hidden until an admin turns on *Admin → Settings → Show Reports and Costing*.

### Key rules
- **Single opportunity status:** Preparing Proposal, Open, Open/HIGH, DVT Won, Client Lost, Client Won/DVT Lost, On Hold, Abandoned, Cancelled. It replaces the old Odds + Won/Lost pair.
- **Pipeline is held at the proposal level.** Each proposal has a **current version** (marked CURRENT). Its value is the *Current Proposal Value* and drives pipeline while it is open. Version values are never added together. A new version becomes current automatically, the awarded version becomes current on award, and any version can be made current. Other rules (highest, average, etc.) remain available in *Admin → Settings*.
- **Weighted pipeline** = value × probability: Open 40%, Open/HIGH 75%, and Open older than 45 days 15%. All of these are editable.
- **Margin** = proposal value − selected acquisition quotes − selected mapping quotes − DVT internal/mob costs. The proposal value is entered by the user, never forced to cost-plus.
- **Award** marks the version *DVT Won* and creates the project. It copies client, scope, selected vendors and costs, and can close the other open versions.
- **Add-on work** is a new proposal linked to the parent project. Its project is numbered `parent-n`.
- **Only admins can delete.** Users mark records inactive instead.

### Documents
Files upload into one of the 12 standard proposal subfolders (a. Proposal, b. Work Order - Project Specs, c. Project Limits, d. Ground Control, e. Image Acquisition, f. Processing, g. QA - QC, h. Client Deliveries, i. Contracts, j. Invoices, k. FAA and Airspace, l. Client Data) on each proposal or project, or a Google Drive link can be pasted instead. Files are stored on the server's disk (`UPLOAD_DIR`). Storage sits behind one interface (`src/lib/storage.ts`), so a Google Drive provider can be added later without changing the screens.

## Run on your own computer (no cloud needed)

Install **Docker Desktop** (Windows or Mac), start it, then in a terminal:

```bash
git clone <this repo> && cd <repo folder>
git checkout Sub_branch
cp .env.example .env                                   # Windows PowerShell: copy .env.example .env
docker compose up -d --build                           # first build takes a few minutes
docker compose run --rm tools npm run db:seed          # first time only: admin user + dropdown lists
```

Open **http://localhost:3000** and sign in with `admin@example.com` / `ChangeMe123!`. Change the password under **Account**.

To load the tracking workbook, put the .xlsx in the `data` folder, then:

```bash
docker compose run --rm tools npm run import:workbook -- data/<file>.xlsx --reset
```

- Stop: `docker compose down`. Your data is kept.
- Start again later: `docker compose up -d`.
- After pulling new code: `docker compose up -d --build`.
- Others on the same office network can open `http://<your-computer-ip>:3000`.
- Before real use, set `AUTH_SECRET` in `.env` to a long random string.

## Run on your own computer without Docker

1. Install **Node.js 22 LTS** (nodejs.org) and **PostgreSQL 16**: the postgresql.org installer on Windows, or Postgres.app on Mac. Remember the password you set for the `postgres` user.
2. In **pgAdmin** (installed with PostgreSQL), create a database named `dvt_app`.
3. In the project folder, copy `.env.example` to `.env` and change `DATABASE_URL` to
   `postgresql://postgres:<your-postgres-password>@localhost:5432/dvt_app?schema=public`
4. Then run:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run build
npm start
```

Open http://localhost:3000. Next time, only `npm start` is needed. Re-run `npm install`, `npx prisma migrate deploy` and `npm run build` after pulling new code.

## Run for development (without Docker for the app)

Requirements: Node 22 and Postgres 16. Docker can provide Postgres: `docker compose up -d db`.

```bash
cp .env.example .env              # then set AUTH_SECRET to a long random string
npm install
npx prisma migrate deploy         # create tables
npm run db:seed                   # admin user, dropdown lists; SEED_DEMO_DATA=true adds fictional demo records
npm run dev                       # http://localhost:3000
```

Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`, then change the password under **Account**.

## Import the tracking workbook

```bash
mkdir -p data && cp "/path/to/DroneView workbook.xlsx" data/
npm run import:workbook -- data/<file>.xlsx --dry-run    # parse and count only
npm run import:workbook -- data/<file>.xlsx --reset      # clear business data, then import
```

- Reads the **Proposals**, **Data Acquisition Quotes**, **Jobs** and **Projects** sheets.
- Proposal IDs like `2600361.0` / `2600361.1` become proposal `2600361` with versions `.1` / `.2`. The original ID is kept and remains searchable.
- Odds + Won/Lost become the single status. Vendor 1/2/3 columns become quote rows, with the "likely" vendor marked Selected. Jobs and Projects rows are merged by project number. The section headings in the Projects sheet (In production, Awarded…) set each project's status.
- DVT PM initials become users with placeholder emails. Set their real names, emails and passwords in **Admin → Users**.
- Duplicate company spellings can be combined from a company page: **Merge this company into another** (admin only).
- `data/`, `*.xlsx` and `*.csv` are git-ignored. **Never commit client workbooks.**

## Tests

```bash
npm test          # pipeline, probability, costing and import-parsing rules
npm run typecheck
```

## Deploy

The app needs a Node server, a Postgres database and a persistent disk for uploads.

**Docker (any VPS or container host):**
```bash
docker build -t droneview-ops .
docker run -p 3000:3000 --env-file .env -v dvt_uploads:/app/storage/uploads droneview-ops
```
The container applies database migrations on start. For the first deploy, run `npm run db:seed` once against the production `DATABASE_URL`.

**Render / Railway:** create a Postgres database and a web service from this repo using the Dockerfile, attach a persistent disk at `/app/storage/uploads`, and set `DATABASE_URL`, `AUTH_SECRET` and `UPLOAD_DIR=/app/storage/uploads`.

Serverless hosts such as Vercel don't keep uploaded files on disk. Use them only after switching document storage to Google Drive.

Serve the app over HTTPS: in production, session cookies are marked `Secure`.

## Project layout

```
prisma/schema.prisma        data model
prisma/seed.ts              admin, dropdown lists, optional fictional demo data
scripts/import-workbook.ts  workbook importer
src/lib/calc.ts             pipeline / probability / costing rules (unit tested)
src/lib/numbering.ts        proposal, version, project and company numbering
src/app/(app)/…             screens: proposals, projects, companies, contacts, reports, admin
```
