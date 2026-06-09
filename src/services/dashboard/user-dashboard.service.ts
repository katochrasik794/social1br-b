import * as activitiesService from "../activities/user-activities.service.js";
import * as subsRepo from "../../db/copier-subscriptions.repository.js";
import * as pammRepo from "../../db/pamm.repository.js";
import * as mamRepo from "../../db/mam.repository.js";

function relativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export async function listDashboardActivity(userId: string, limit = 8) {
  const [base, subs, pamm, mam] = await Promise.all([
    activitiesService.listRecentUserActivities(userId, limit),
    subsRepo.listSubscriptionsByUser(userId),
    pammRepo.listUserInvestments(userId),
    mamRepo.listUserLinks(userId),
  ]);

  const items: Array<{ id: string; type: string; message: string; time: string; sort: number }> = [];

  for (const a of base) {
    items.push({
      id: a.id,
      type: a.type === "deposit" ? "account" : a.type === "withdrawal" ? "account" : "account",
      message: a.message,
      time: relativeTime(new Date(a.createdAt)),
      sort: new Date(a.createdAt).getTime(),
    });
  }

  for (const s of subs) {
    const masterName = s.masterName ?? "a master";
    const verb = s.status === "active" ? "Started copying" : s.status === "paused" ? "Paused copy on" : "Stopped copying";
    items.push({
      id: `copy-${s.id}`,
      type: "copy",
      message: `${verb} ${masterName}`,
      time: relativeTime(new Date(s.createdAt)),
      sort: new Date(s.createdAt).getTime(),
    });
  }

  for (const inv of pamm) {
    items.push({
      id: `pamm-${inv.id}`,
      type: "pamm",
      message: `Invested in ${inv.poolName}`,
      time: relativeTime(new Date(inv.investedAt)),
      sort: new Date(inv.investedAt).getTime(),
    });
  }

  for (const link of mam) {
    items.push({
      id: `mam-${link.id}`,
      type: "mam",
      message: `Linked account to ${link.managerName}`,
      time: relativeTime(new Date(link.linkedAt)),
      sort: new Date(link.linkedAt).getTime(),
    });
  }

  return items
    .sort((a, b) => b.sort - a.sort)
    .slice(0, limit)
    .map(({ id, type, message, time }) => ({ id, type, message, time }));
}
