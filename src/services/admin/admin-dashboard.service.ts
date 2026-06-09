import * as dashboardRepo from "../../db/admin-dashboard.repository.js";

export async function getAdminDashboardOverview() {
  const [stats, recentDeposits, recentWithdrawals, recentAccounts, activityLogs] = await Promise.all([
    dashboardRepo.getPlatformOverviewStats(),
    dashboardRepo.listRecentDeposits(5),
    dashboardRepo.listRecentWithdrawals(5),
    dashboardRepo.listRecentAccountsOpened(5),
    dashboardRepo.listActivityLogs({ page: 1, limit: 10 }),
  ]);

  return {
    stats,
    recent: {
      deposits: recentDeposits,
      withdrawals: recentWithdrawals,
      accountsOpened: recentAccounts,
    },
    activityLogs: activityLogs.items,
    activityPagination: {
      total: activityLogs.total,
      page: activityLogs.page,
      limit: activityLogs.limit,
      totalPages: activityLogs.totalPages,
    },
  };
}

export async function getAdminActivityLogs(params: { search?: string; page?: number; limit?: number }) {
  return dashboardRepo.listActivityLogs(params);
}
