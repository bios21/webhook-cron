import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "https://deno.land/x/lambda/mod.ts";
import { Cron } from "https://deno.land/x/cron/cron.ts";
import { config } from "../lib/config.ts";

export type NowHeader = "x-vercel-deployment-url";

export interface RequestBody {
  method: string;
  headers: Record<string, string> & Record<NowHeader, string>;
  path: string;
  host: string;
}

let cronLaunched = false;
const cron = new Cron();
let intervalIds: number[] = [];
let timeoutIds: number[] = [];

let logs: string[] = [];

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
  req: RequestBody = JSON.parse(event.body ?? "{}"),
): Promise<APIGatewayProxyResult> {
  const params = new URLSearchParams(req.path.split("?")[1]);
  const restart = params.has("restart");

  if (cronLaunched && !restart) {
    return {
      body:
        `<pre style="color: red">!! Cron already launched. !!</pre><br><pre>Logs:\n=====\n${
          logs.join("\n")
        }</pre>`,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
      statusCode: 501,
    };
  }

  if (!cronLaunched) {
    if (restart) {
      console.log("Restarting.");
    } else {
      console.log("Init.");
    }
  }
  init();
  cronLaunched = true;

  return {
    body: `Webhook automated (${config.length}).`,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
    statusCode: 200,
  };
}

function init() {
  cron.cronJobs = [];
  intervalIds.forEach(clearInterval);
  intervalIds = [];
  timeoutIds.forEach(clearTimeout);
  timeoutIds = [];

  for (const c of config) {
    const body = c.method === "GET" ? new URLSearchParams() : new FormData();
    Object.entries(c.data ?? {}).forEach(([key, value]) =>
      body.set(key, value)
    );
    const fn = async () => {
      const method = c.method ?? "GET";
      try {
        const res = await fetch(c.url, { body, method });
        pushLogs(
          `${method}::${c.url} from "${c.value}" ${c.type} resulted with "${await res
            .text()}"`,
        );
      } catch (e) {
        pushLogs(
          `ERROR: ${method}::${c.url} from "${c.value}" ${c.type} resulted with "${e}"`,
        );
      }
    };

    pushLogs(
      `INITED: ${c.method ??
        "GET"}::${c.url} from "${c.value}" ${c.type}`,
    );
    if (c.type === "cron") {
      cron.add(c.value, fn);
    } else if (c.type === "interval") {
      intervalIds.push(setInterval(fn, c.value));
    } else if (c.type === "timeout") {
      timeoutIds.push(setTimeout(fn, c.value));
    } else {
      throw new Error(
        "Automated Webhook type unknown. Should be: cron, interval, timeout",
      );
    }
  }
}

function pushLogs(s: string) {
  logs.push(s);
  if (logs.length > 15) {
    logs = logs.slice(logs.length - 15);
  }
}
