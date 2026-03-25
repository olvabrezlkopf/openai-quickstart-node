import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Models() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    alias: "",
    real_model: "",
    provider: "anthropic",
    fallback: "",
    cost_per_1k_input: "0",
    cost_per_1k_output: "0",
  });

  const { data: models } = useQuery({ queryKey: ["models"], queryFn: api.getModels });

  const createModel = useMutation({
    mutationFn: () =>
      api.createModel({
        ...form,
        fallback: form.fallback || null,
        cost_per_1k_input: parseFloat(form.cost_per_1k_input),
        cost_per_1k_output: parseFloat(form.cost_per_1k_output),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setShowCreate(false);
      setForm({ alias: "", real_model: "", provider: "anthropic", fallback: "", cost_per_1k_input: "0", cost_per_1k_output: "0" });
    },
  });

  const deleteModel = useMutation({
    mutationFn: (id: number) => api.deleteModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Model Configuration</h2>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" /> New Model
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => { e.preventDefault(); createModel.mutate(); }}
              className="grid gap-4 md:grid-cols-3"
            >
              <Input placeholder="Alias (e.g. ra-smart)" value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} required />
              <Input placeholder="Real model" value={form.real_model} onChange={(e) => setForm({ ...form, real_model: e.target.value })} required />
              <Input placeholder="Provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} required />
              <Input placeholder="Fallback alias" value={form.fallback} onChange={(e) => setForm({ ...form, fallback: e.target.value })} />
              <Input placeholder="Cost/1k input" type="number" step="0.0001" value={form.cost_per_1k_input} onChange={(e) => setForm({ ...form, cost_per_1k_input: e.target.value })} />
              <Input placeholder="Cost/1k output" type="number" step="0.0001" value={form.cost_per_1k_output} onChange={(e) => setForm({ ...form, cost_per_1k_output: e.target.value })} />
              <Button type="submit" disabled={createModel.isPending} className="md:col-span-3">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Routing Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium">Alias</th>
                  <th className="pb-2 text-left font-medium">Real Model</th>
                  <th className="pb-2 text-left font-medium">Provider</th>
                  <th className="pb-2 text-left font-medium">Fallback</th>
                  <th className="pb-2 text-left font-medium">Cost/1k (in/out)</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(models || []).map((model: any) => (
                  <tr key={model.id} className="border-b last:border-0">
                    <td className="py-2 font-mono">{model.alias}</td>
                    <td className="py-2">{model.real_model}</td>
                    <td className="py-2"><Badge variant="secondary">{model.provider}</Badge></td>
                    <td className="py-2">{model.fallback || "-"}</td>
                    <td className="py-2">${model.cost_per_1k_input} / ${model.cost_per_1k_output}</td>
                    <td className="py-2">
                      <Badge variant={model.is_active ? "success" : "destructive"}>
                        {model.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <Button variant="ghost" size="icon" onClick={() => deleteModel.mutate(model.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!models || models.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No DB-managed models. Models are loaded from config/model_routing.yaml by default.
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
