import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "https://deno.land/x/lambda/mod.ts";
import { config } from "../lib/config.ts";
import { automate } from "../lib/automate.ts";

export type NowHeader =
  | "x-vercel-deployment-url"
  | "x-now-deployment-url"
  | "x-forwarded-proto";

export interface RequestBody {
  method: string;
  headers: Record<string, string> & Record<NowHeader, string>;
  path: string;
  host: string;
  body: unknown;
  encoding: string;
}

let cronLaunched = false;

// number of resources in the load balancer
const resourcesQty = 2;

/**
 * Base handler for load balancer resources.
 *
 * Can be called directly to arm the load balancing.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
  sourceResourceId = 0,
): Promise<APIGatewayProxyResult> {
  context.callbackWaitsForEmptyEventLoop = false;

  const req: RequestBody = JSON.parse(event.body ?? "{}");
  const deploymentUrl = req.headers["x-vercel-deployment-url"] ??
    req.headers["x-now-deployment-url"];

  // prepare load balancing
  loadBalance(
    sourceResourceId,
    context.getRemainingTimeInMillis(),
    `${req.headers["x-forwarded-proto"]}://${deploymentUrl}`,
  );

  if (cronLaunched) {
    return {
      body: `<pre style="color: red">!! Cron already launched. !!`,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
      statusCode: 501,
    };
  }

  console.log("Init.");
  automate();
  cronLaunched = true;

  return {
    body: `Webhook automated (${config.length}).`,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
    statusCode: 200,
  };
}

/**
 * Use `context.getRemainingTimeInMillis()`
 *
 * Load balance to another resource when this lambda is about to end.
 *
 * Pass the logs in POST body data.
 */
function loadBalance(sourceId: number, remainingTime: number, baseUrl: string) {
  const getNextResourceId = (): number => {
    const next = Math.floor(Math.random() * resourcesQty) + 1;
    return next !== sourceId ? next : getNextResourceId();
  };

  if (remainingTime < 0) {
    remainingTime = 10 * 1000;
  }

  const nextResourceId = getNextResourceId();
  console.info(
    `LoadBalancing setuped. Next resource will be ${nextResourceId} in ${remainingTime} ms`,
  );

  setTimeout(async () => {
    const url = `${baseUrl}/api/load-balancer/${nextResourceId}`;
    console.info(`SWITCH to ${url}`);
    try {
      const resp = await fetch(url);
      console.info(
        `Done. ${sourceId} is leaving, bye. (resp=${await resp.text()})`,
      );
      Deno.exit();
    } catch (e) {
      console.error(`Switch failed ${e}`);
    }
  }, remainingTime - 200);
}
