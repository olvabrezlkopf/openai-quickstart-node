import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Logs() {
  const [modelFilter, setModelFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: logs, isLoading } = useQuery({
    queryKey: ["logs", modelFilter, page],
    queryFn: () =>
      api.getLogs({
        model_alias: modelFilter || undefined,
        limit,
        offset: page * limit,
      }),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Request Logs</h2>

      <div className="flex gap-4">
        <Input
          placeholder="Filter by model alias..."
          value={modelFilter}
          onChange={(e) => { setModelFilter(e.target.value); setPage(0); }}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Requests</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium">Time</th>
                  <th className="pb-2 text-left font-medium">Model</th>
                  <th className="pb-2 text-left font-medium">Real Model</th>
                  <th className="pb-2 text-left font-medium">Tokens In</th>
                  <th className="pb-2 text-left font-medium">Tokens Out</th>
                  <th className="pb-2 text-left font-medium">Cost</th>
                  <th className="pb-2 text-left font-medium">Duration</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(logs || []).map((log: any) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("de-DE")}
                    </td>
                    <td className="py-2"><Badge variant="secondary">{log.model_alias}</Badge></td>
                    <td className="py-2 text-muted-foreground">{log.real_model}</td>
                    <td className="py-2">{log.tokens_in}</td>
                    <td className="py-2">{log.tokens_out}</td>
                    <td className="py-2">${parseFloat(log.cost_usd).toFixed(4)}</td>
                    <td className="py-2">{log.duration_ms}ms</td>
                    <td className="py-2">
                      <Badge variant={log.status_code === 200 ? "success" : "destructive"}>
                        {log.status_code}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {isLoading && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                )}
                {!isLoading && (!logs || logs.length === 0) && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button
              variant="outline"
              disabled={!logs || logs.length < limit}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
