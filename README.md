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

No command line needed. Everything happens in the browser.

1. **Make this GitHub repository private** (GitHub → the repository → Settings → General →
   Danger Zone → Change visibility). The code holds your names, date, venue and budget figures.
2. **Create the Vercel project.** Sign in at vercel.com with GitHub (the free Hobby plan is
   enough), choose **Add New → Project**, import this repository and click **Deploy**. The
   first deploy finishes without a database; that's expected.
3. **Open the new site.** It shows a one-time setup checklist and walks you through the rest:
   - **Connect the database:** in the Vercel project, **Storage → Neon** (free) → create and
     connect it, then **Deployments → Redeploy**. The redeploy creates the tables and loads the
     wedding details (only when the database is empty).
   - **Choose your passphrase:** the setup page turns it into two values. Add both in
     **Settings → Environment Variables** (Production), then **Redeploy** once more.
   - **Sign in** with the passphrase.

After that, every push to the repository's default branch redeploys automatically, and schema
changes are applied during the deploy (`npm run vercel-build` runs `scripts/prepare-db.ts`).
Preview deployments never touch the production database.

To change the passphrase later: in Vercel, delete `APP_PASSWORD_HASH` and `SESSION_SECRET` and
redeploy. The setup page comes back and makes new values; add them and redeploy. The new
session secret also signs out every device. (From a computer, `npm run hash-password` makes a
new hash too.)

## Backups

**Easiest:** in the app, **Settings → Download a backup**. Save the file somewhere safe (Google
Drive, iCloud). Do it every few weeks and before big changes.

**From a computer:** `npm run backup` writes `backups/wedding-hq-<timestamp>.json` (every table
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
