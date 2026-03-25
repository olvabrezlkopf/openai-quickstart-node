import { useQuery } from "@tanstack/react-query";
import { Activity, Coins, Hash, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "@/api/client";
import { useSSE } from "@/hooks/useSSE";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/utils";

const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"];

interface LiveStats {
  total_requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: string;
}

export function Dashboard() {
  const { data: liveStats } = useSSE<LiveStats>("/admin/usage/stream");

  const { data: usage } = useQuery({
    queryKey: ["usage", "today"],
    queryFn: () => api.getUsage({ days: 1 }),
    refetchInterval: 10000,
  });

  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => api.getBudgets(),
    refetchInterval: 30000,
  });

  const { data: logs } = useQuery({
    queryKey: ["logs", "recent"],
    queryFn: () => api.getLogs({ limit: 20 }),
    refetchInterval: 5000,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.getHealth(),
    refetchInterval: 30000,
  });

  const stats = liveStats || usage;
  const totalRequests = stats?.total_requests || 0;
  const totalTokens = (stats?.total_tokens_in || 0) + (stats?.total_tokens_out || 0);
  const totalCost = stats?.total_cost_usd || "0";

  // Team usage for bar chart
  const teamData = (budgets || []).map((b: any) => ({
    name: b.team_name,
    spent: parseFloat(b.spent_eur),
  }));

  // Model split for pie chart
  const modelCounts: Record<string, number> = {};
  (logs || []).forEach((log: any) => {
    modelCounts[log.model_alias] = (modelCounts[log.model_alias] || 0) + 1;
  });
  const modelData = Object.entries(modelCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Live Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Requests Today"
          value={formatNumber(totalRequests)}
          icon={Activity}
        />
        <StatsCard
          title="Tokens Today"
          value={formatNumber(totalTokens)}
          description={`In: ${formatNumber(stats?.total_tokens_in || 0)} / Out: ${formatNumber(stats?.total_tokens_out || 0)}`}
          icon={Hash}
        />
        <StatsCard
          title="Cost Today"
          value={formatCurrency(totalCost, "USD")}
          icon={Coins}
        />
        <StatsCard
          title="System Status"
          value={health?.status === "ok" ? "Healthy" : "Unknown"}
          description={health ? `v${health.version}` : ""}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={teamData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="spent" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Split</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {modelData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium">Time</th>
                  <th className="pb-2 text-left font-medium">Model</th>
                  <th className="pb-2 text-left font-medium">Tokens</th>
                  <th className="pb-2 text-left font-medium">Duration</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(logs || []).map((log: any) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2">{new Date(log.created_at).toLocaleTimeString("de-DE")}</td>
                    <td className="py-2">
                      <Badge variant="secondary">{log.model_alias}</Badge>
                    </td>
                    <td className="py-2">{log.tokens_in + log.tokens_out}</td>
                    <td className="py-2">{log.duration_ms}ms</td>
                    <td className="py-2">
                      <Badge variant={log.status_code === 200 ? "success" : "destructive"}>
                        {log.status_code}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No requests yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
