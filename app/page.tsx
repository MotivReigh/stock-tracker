import { Shell } from "@/components/layout/shell";
import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/dashboard/data";

// Quote/news fetches are dynamic; force fresh data on each request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <Shell>
      <Dashboard data={data} />
    </Shell>
  );
}
