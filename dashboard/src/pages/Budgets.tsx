import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export function Budgets() {
  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: api.getBudgets,
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Budgets & Costs</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(budgets || []).map((budget: any) => {
          const pct = budget.usage_pct;
          const barColor =
            pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";

          return (
            <Card key={budget.team_id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{budget.team_name}</CardTitle>
                  <Badge variant={pct >= 90 ? "destructive" : pct >= 70 ? "warning" : "success"}>
                    {pct.toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <span className="font-medium">{formatCurrency(budget.spent_eur)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium">{formatCurrency(budget.budget_eur)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!budgets || budgets.length === 0) && (
          <div className="col-span-full text-center text-muted-foreground py-8">
            No teams with budgets configured
          </div>
        )}
      </div>
    </div>
  );
}
