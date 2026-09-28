# Wedding HQ

Private planning app for Rondell & Capri's wedding on Thursday, April 13, 2028. It tracks
money, vendors, deadlines, the wedding party and seating. One shared login, no public pages.

Project rules, wedding facts and design tokens are in [CLAUDE.md](CLAUDE.md).

## Run it on your computer

You need Node 22+ and Postgres 16+.

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | What to put there |
|---|---|
| `DATABASE_URL` | e.g. `postgresql://wedding:wedding@localhost:5432/wedding_hq` |
| `APP_PASSWORD_HASH` | output of `npm run hash-password` (see below) |
| `SESSION_SECRET` | output of `openssl rand -base64 48` |
| `RESTORE_DATABASE_URL` | a second, throwaway database, only for `npm run restore -- <file> --verify` |

Then:

```bash
npm run db:migrate     # create the tables
npm run seed           # load the real wedding data
npm run dev            # http://localhost:3000
```

Optional sample data for trying things out locally: `npm run seed:demo`. Remove it with
`npm run demo:wipe`. Pages show a "Demo data" banner while any sample rows exist.

### Setting the passphrase

```bash
npm run hash-password
```

Type a long passphrase twice (four or five random words works well). The script prints
`APP_PASSWORD_HASH=...`. Put that value in `.env` locally and in Vercel for production. The
hash is base64-encoded on purpose: raw argon2 hashes contain `$`, which `.env` files mangle.

To change the passphrase later, run the script again, replace the value in Vercel, redeploy,
then use **Settings → Log out everywhere**.

## Put it online (Vercel + Neon)

1. In Vercel, import this GitHub repository as a new project (framework: Next.js).
2. In the project, open **Storage → Marketplace → Neon** and create a free database. This adds
   `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` to the project.
3. Add environment variables in **Settings → Environment Variables** (Production only):
   `APP_PASSWORD_HASH` and `SESSION_SECRET`.
4. Create the tables and load the data once, from your computer, using the **unpooled** URL:
   ```bash
   DATABASE_URL="<DATABASE_URL_UNPOOLED from Vercel>" npx prisma migrate deploy
   DATABASE_URL="<DATABASE_URL_UNPOOLED from Vercel>" npm run seed
   ```
5. Deploy. Sign in with your passphrase.

Future schema changes: take a backup, then run `npx prisma migrate deploy` against production
the same way before deploying the new code.

Preview deployments should use a Neon **branch**, never the production database.

## Backups

**Take one now:** `npm run backup` writes `backups/wedding-hq-<timestamp>.json` (every table
except login attempts, read in one consistent snapshot). The `backups/` folder is ignored by
git. Point `DATABASE_URL` at production to back up production.

**Nightly, automatically:** `.github/workflows/backup.yml` dumps production every night,
encrypts it, and pushes it to a separate private repository. To turn it on:

1. Create a private GitHub repository, e.g. `wedding-hq-backups`.
2. Make an encryption key on your computer: `age-keygen -o wedding-hq-backup.key`
   (install `age` with `brew install age`). Store the file somewhere safe that isn't this
   computer alone, like your password manager. **Without it the backups can't be opened.**
   The line starting `# public key: age1...` is the public key.
3. Create a fine-grained GitHub token with **Contents: read and write** on the backups
   repository only.
4. In this repository: **Settings → Secrets and variables → Actions**
   - secret `PROD_DATABASE_URL`: the unpooled Neon URL
   - secret `BACKUP_AGE_RECIPIENT`: the `age1...` public key
   - secret `BACKUP_REPO_TOKEN`: the token
   - variable `BACKUP_REPO`: e.g. `rondellbking/wedding-hq-backups`
5. Run the workflow once by hand (**Actions → Nightly backup → Run workflow**) and check a file
   appears in the backups repository. GitHub emails you if a nightly run fails.

**Restoring:**

```bash
# decrypt a nightly backup
age -d -i wedding-hq-backup.key -o restore.json 2027/03/wedding-hq-2027-03-01T071700Z.json.age

# 1. check it restores cleanly into a throwaway database (wipes RESTORE_DATABASE_URL)
npm run restore -- restore.json --verify

# 2. restore for real into a new, empty database (e.g. a new Neon branch)
DATABASE_URL="<new empty database>" npx prisma migrate deploy
npm run restore -- restore.json --url "<new empty database>"
```

Restore refuses to write into a database that already has data. Point the app at the restored
database by changing `DATABASE_URL` in Vercel.

## Security

This is deliberately light security for a private tool used by two people.

**What it does:** one shared passphrase (argon2id hash), an httpOnly, Secure, SameSite=Lax
signed session cookie that lasts 90 days and renews itself while in use, a login limit
(5 wrong tries per 15 minutes per network, 30 per hour overall), same-origin checks on every
form post, `noindex` headers, and **Settings → Log out everywhere**.

**It protects against:** strangers who find the URL, search engines, password guessing,
scripts stealing the cookie, forged form posts from other sites, and a lost phone.

**It does not protect against:** anyone who learns the passphrase (full access until you
change it), someone holding your unlocked phone (up to 90 days), or anyone who gets into your
Vercel, Neon or GitHub accounts, which can reach the data directly. Turn on two-factor
authentication for all three. There's also no record of which of you changed something,
because you share one login.

## Checks

```bash
npm run lint
npm run typecheck
npm test          # runs in New York, UTC and UTC+14 time zones
npm run build
```

CI runs all of these, plus a double seed and a backup → restore → compare round trip.
