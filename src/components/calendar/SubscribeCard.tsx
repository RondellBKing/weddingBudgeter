import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { CopyField } from "./CopyField";

/** The private .ics link, with steps for iPhone and Google Calendar. */
export function SubscribeCard({ feedUrl }: { feedUrl: string }) {
  const noAmounts = `${feedUrl}?amounts=0`;
  const webcal = feedUrl.replace(/^https?:\/\//, "webcal://");
  return (
    <Card as="section" aria-labelledby="subscribe-h" className="grid gap-7 p-6 sm:p-8">
      <div className="grid gap-2">
        <p className="label-caps flex items-center gap-2 text-rose-ink">
          <Icon name="calendar" size={15} />
          Calendar feed
        </p>
        <h2 id="subscribe-h" className="text-[28px] leading-tight sm:text-[32px]">
          Subscribe from your <em className="italic">phone</em>
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-cocoa">
          Every payment, milestone, task and appointment, in the calendar you already use. It keeps itself up to date (phones check
          every few hours).
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <CopyField id="feed-url" label="Private link" value={feedUrl} />
        <CopyField id="feed-url-private" label="Without dollar amounts" value={noAmounts} />
      </div>

      <div className="grid gap-6 border-t border-rule pt-6 sm:grid-cols-2 sm:gap-10">
        <div className="grid content-start gap-3">
          <h3 className="font-display text-[22px] leading-none">
            On an <em className="italic">iPhone</em>
          </h3>
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-cocoa marker:text-muted">
            <li>
              Tap <strong className="font-medium text-chocolate">Add to iPhone calendar</strong> below, then Subscribe.
            </li>
            <li>Or: Settings → Apps → Calendar → Calendar Accounts → Add Account → Other → Add Subscribed Calendar, and paste the link.</li>
          </ol>
          <a href={webcal} className={buttonClass("secondary", "sm", "mt-1 w-fit")}>
            Add to iPhone calendar
          </a>
        </div>
        <div className="grid content-start gap-3">
          <h3 className="font-display text-[22px] leading-none">
            In Google <em className="italic">Calendar</em>
          </h3>
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-cocoa marker:text-muted">
            <li>On a computer, open Google Calendar.</li>
            <li>Next to Other calendars, click + then From URL.</li>
            <li>Paste the link and click Add calendar. It shows up on Android phones too.</li>
          </ol>
        </div>
      </div>

      <p className="flex gap-3 rounded-[3px] bg-linen/60 px-4 py-3 text-[13px] leading-relaxed text-cocoa">
        <Icon name="lock" size={17} className="mt-0.5 shrink-0 text-muted" />
        <span>
          Anyone with a link can read this calendar. Keep the main link to yourselves; if a planner or family member needs it, share
          the one without amounts.{" "}
          <Link href="/settings" className="text-rose-ink underline decoration-rule-strong underline-offset-4 hover:text-chocolate">
            Log out everywhere
          </Link>{" "}
          in Settings changes the link; subscribe again afterwards.
        </span>
      </p>
    </Card>
  );
}
