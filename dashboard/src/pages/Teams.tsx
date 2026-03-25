import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Key, Trash2, Copy } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export function Teams() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("0");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: api.getTeams });

  const { data: keys } = useQuery({
    queryKey: ["keys", selectedTeam],
    queryFn: () => api.getKeys(selectedTeam!),
    enabled: !!selectedTeam,
  });

  const createTeam = useMutation({
    mutationFn: () => api.createTeam({ name: newName, budget_eur: parseFloat(newBudget) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setShowCreate(false);
      setNewName("");
      setNewBudget("0");
    },
  });

  const deleteTeam = useMutation({
    mutationFn: (id: string) => api.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setSelectedTeam(null);
    },
  });

  const createKey = useMutation({
    mutationFn: () => api.createKey(selectedTeam!, { label: newKeyLabel }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["keys", selectedTeam] });
      setCreatedKey(data.key);
      setNewKeyLabel("");
    },
  });

  const revokeKey = useMutation({
    mutationFn: (keyId: string) => api.revokeKey(selectedTeam!, keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keys", selectedTeam] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Teams</h2>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" /> New Team
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => { e.preventDefault(); createTeam.mutate(); }}
              className="flex gap-4"
            >
              <Input placeholder="Team name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <Input
                type="number"
                placeholder="Budget EUR"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="w-40"
              />
              <Button type="submit" disabled={createTeam.isPending}>Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Teams</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(teams || []).map((team: any) => (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className={`flex items-center justify-between rounded-md border p-3 cursor-pointer transition-colors ${
                    selectedTeam === team.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <div>
                    <div className="font-medium">{team.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Budget: {formatCurrency(team.budget_eur)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={team.is_active ? "success" : "destructive"}>
                      {team.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); deleteTeam.mutate(team.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!teams || teams.length === 0) && (
                <p className="text-center text-muted-foreground py-4">No teams yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedTeam && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" /> API Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {createdKey && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-800 mb-1">New key created (copy now, shown only once):</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-green-100 px-2 py-1 rounded flex-1 break-all">{createdKey}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { navigator.clipboard.writeText(createdKey); }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); createKey.mutate(); }}
                className="flex gap-2"
              >
                <Input placeholder="Key label" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} />
                <Button type="submit" size="sm" disabled={createKey.isPending}>Generate</Button>
              </form>

              <div className="space-y-2">
                {(keys || []).map((key: any) => (
                  <div key={key.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <code className="text-xs">{key.key_prefix}...</code>
                      <span className="ml-2 text-sm text-muted-foreground">{key.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={key.is_active ? "success" : "destructive"}>
                        {key.is_active ? "Active" : "Revoked"}
                      </Badge>
                      {key.is_active && (
                        <Button variant="ghost" size="icon" onClick={() => revokeKey.mutate(key.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
