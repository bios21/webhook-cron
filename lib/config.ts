export interface CronWebhook {
  cron: string;
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: Record<string, string>;
}

export const config: CronWebhook[] = [
  {
    cron: "*/1 * * * *",
    url:
      "https://deno-bot.lsagetlethias.now.sh/api/webhook/like_share?type=cron",
  },
];
