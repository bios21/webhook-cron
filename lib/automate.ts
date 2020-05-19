import { Cron } from "https://deno.land/x/cron/cron.ts";
import { config, CronWebhook } from "./config.ts";

const cron = new Cron();
let logs: string[] = [];
let iteration = 0;

export function automate() {
  cron.cronJobs = [];

  for (const cronWebhook of config) {
    cronWebhook.method = cronWebhook.method ?? "GET";

    pushLogs(
      `[${iteration++}][${getDate()}] INITED: ${cronWebhook.method}::${cronWebhook.url} from cron "${cronWebhook.cron}"`,
    );

    cron.add(
      cronWebhook.cron,
      ((c: CronWebhook) => {
        // localconfig
        const lc = { ...c };
        return async () => {
          const dfn = getDate();
          const body = lc.method !== "GET"
            ? new FormData()
            : new URLSearchParams();
          Object.entries(lc.data ?? {}).forEach(([key, value]) =>
            body.set(key, value)
          );
          try {
            const res = await fetch(lc.url, { body, method: lc.method });
            pushLogs(
              `[${dfn}] ${lc.method}::${lc.url} from cron "${lc.cron}" resulted with "${await res
                .text()}"`,
            );
          } catch (e) {
            pushLogs(
              `[${dfn}] ERROR: ${lc.method}::${lc.url} from cron "${lc.cron}" resulted with "${e}"`,
            );
          }
        };
      })(cronWebhook),
    );
  }
}

export function pushLogs(s: string) {
  logs.push(s);
  if (logs.length > 15) {
    logs = logs.slice(logs.length - 15);
  }
}

export function getLogs() {
  return [...logs];
}

export function getDate() {
  return new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
    timeZone: "Europe/Paris",
  });
}
