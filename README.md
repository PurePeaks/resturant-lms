# Himalayan Reserves — Restaurant Training Portal

Video training, quizzes and verifiable certificates for restaurant staff, plus
salt slab equipment tracking. Next.js 16 (App Router), NextAuth v5, Prisma 7 on
PostgreSQL (Neon), Cloudflare R2 for video.

Three roles:

- **Super admin** — venues, people, curriculum and quizzes, kit inquiries, activity log.
- **Manager** — their venue's staff, progress, compliance export, equipment, activity log.
- **Staff** — watch modules in order, pass quizzes, view certificates.

## Local setup

```bash
npm install
cp .env.example .env        # fill in the values
npm run db:migrate          # apply migrations
npm run seed
npm run dev
```

Without `SEED_PASSWORD` the demo accounts get `admin123`, `manager123` and
`staff123`, which the login page's development buttons fill in. Those buttons
(and the passwords) only exist in development builds. Don't seed a database
that is reachable online; the seed refuses when `NODE_ENV=production`.

To work without touching a shared database, `npx prisma dev` starts a local
Postgres; point `DATABASE_URL` at the URL it prints.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` / `npm test` | Checks run by CI |
| `npm run db:migrate` | Apply pending migrations (`prisma migrate deploy`) |
| `npm run seed` | Development data. Refuses to run with `NODE_ENV=production` unless `ALLOW_SEED=true` |
| `npm run seed:restaurant`, `npm run seed:equipment` | Extra demo venue and equipment |

## Database migrations

Schema changes go through `prisma/migrations`. Change `prisma/schema.prisma`, then
`npx prisma migrate dev --name what-changed` against a development database.
Never run `migrate dev` against production: use `npm run db:migrate`.

CI fails if the migrations folder and the schema disagree.

### Upgrading an existing production database (one time)

The production database was created before migrations were tracked, so it needs
a baseline first:

1. Back up the database (in Neon: create a branch).
2. Check production matches the baseline. This should print "No difference detected":
   ```bash
   npx prisma migrate diff --from-config-datasource --to-migrations prisma/migrations --exit-code
   ```
   (run with `DATABASE_URL` set to production and `SHADOW_DATABASE_URL` set to an
   empty scratch database). Differences other than the second migration's
   changes mean production drifted; resolve those before continuing.
3. Mark the baseline as already applied: `npx prisma migrate resolve --applied 0_init`
4. Apply the upgrade: `npm run db:migrate`
5. Set `CRON_SECRET` in the hosting environment.
6. Sign in as super admin and open **Curriculums & Quizzes** once. Each module's
   video length is recorded the first time its preview loads; staff can't
   complete a module until that has happened.

The upgrade migration keeps existing modules published, carries over watch
progress, gives existing certificates a verification code, and lowercases emails.

## Security model

- Every API route and dashboard page loads the user from the database on each
  request (`src/lib/session.ts`). Deactivating someone, changing their role or
  venue, or resetting their password signs them out everywhere immediately.
- Sessions last 12 hours.
- Sign-in is rate limited per network and locked for 15 minutes after 5 failed
  attempts per email (counters live in Postgres, `RateLimit` table).
- Passwords are at least 12 characters. New accounts and manager resets get a
  random temporary password that must be changed at first sign-in.
- Watch progress can never advance faster than 1.5× real time, measured on the
  server against the module's stored video length (`src/lib/training.ts`).
- Quizzes allow 3 attempts per module per 24 hours and don't reveal which
  answers were wrong.
- Certificates are looked up publicly only by exact verification code; they
  show valid, expired or revoked.
- Request bodies are validated with zod (`src/lib/validation.ts`); unexpected
  errors return a generic message (`src/lib/api.ts`).

## Records and retention

- Offboarding deactivates an account; training records and certificates are kept.
- Resetting someone's training revokes their certificates rather than deleting them.
- Venues and modules with history are archived, not deleted.
- Every account, password, training and curriculum change is in the activity log.
- Three years after deactivation, a daily job (`/api/cron/maintenance`, see
  `vercel.json`) erases the person's name and email; their training records stay,
  attributed to "Former staff member". Super admins can erase earlier on request.
- Certificates expire after the module's validity period (12 months by default).

## Email (Gmail)

Email turns on when `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set (see
`.env.example`). It uses Gmail with an App Password, not the account password:
turn on 2-Step Verification, then create one at
https://myaccount.google.com/apppasswords. Set the same variables in the hosting
environment (Vercel → Settings → Environment Variables).

With email on:

- **Forgot password** emails a one-time reset link (valid 1 hour).
- **New accounts** get a welcome email with a link to set their own password
  (valid 3 days). The temporary password is still shown to whoever created the
  account, so a wrong or unused address never locks anyone out.
- **New kit inquiries** are emailed to `INQUIRY_NOTIFY_EMAIL` if set.

Manager and super admin password resets always give a temporary password to
hand over, because staff addresses aren't always real inboxes.

Without email, forgot password tells people to ask their manager; everything
else works the same.
