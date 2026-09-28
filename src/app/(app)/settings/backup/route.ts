import { requireSession } from "@/lib/auth/require-session";
import { connect, dumpDatabase } from "@/lib/backup";
import { todayIn } from "@/lib/dates";

/** "Download a backup" from Settings: the same full JSON dump as `npm run backup`. */
export async function GET() {
  await requireSession();
  const url = process.env.DATABASE_URL;
  if (!url) return new Response("No database configured.", { status: 500 });
  const client = await connect(url);
  try {
    const backup = await dumpDatabase(client);
    return new Response(JSON.stringify(backup, null, 1) + "\n", {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="wedding-hq-backup-${todayIn()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await client.end();
  }
}
