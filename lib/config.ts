interface Request {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: Record<string, string>;
}

interface Cron extends Request {
  value: string;
  type: "cron";
}
interface Interval extends Request {
  value: number;
  type: "interval";
}
interface Timeout extends Request {
  value: number;
  type: "timeout";
}

export type CronWebhook = Cron | Interval | Timeout;
export const config: CronWebhook[] = [
  {
    url:
      "https://deno-bot.lsagetlethias.now.sh/api/webhook/like_share?type=interval",
    type: "interval",
    value: 15 * 1000,
  },
  {
    url:
      "https://deno-bot.lsagetlethias.now.sh/api/webhook/like_share?type=cron",
    type: "cron",
    value: "0 */15 * ? * *",
  },
];
