import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SettingsPage() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: api.getHealth,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
          <CardDescription>Current system status and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={health?.status === "ok" ? "success" : "destructive"}>
                {health?.status || "Unknown"}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium">Version</span>
              <span className="text-sm text-muted-foreground">{health?.version || "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Provider Configuration</CardTitle>
          <CardDescription>
            Provider API keys are configured via environment variables in the .env file.
            Changes require a service restart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OLLAMA_BASE_URL"].map((key) => (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                <code className="text-sm">{key}</code>
                <Badge variant="secondary">Configured via .env</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Model Routing</CardTitle>
          <CardDescription>
            Default routing is configured in config/model_routing.yaml.
            DB-managed overrides can be configured on the Models page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>ra-smart → claude-sonnet-4-5 (Anthropic)</p>
            <p>ra-fast → claude-haiku-4-5 (Anthropic)</p>
            <p>ra-pro → claude-opus-4-5 (Anthropic)</p>
            <p>ra-gpt → gpt-4o (OpenAI)</p>
            <p>ra-local → llama3.2:8b (Ollama)</p>
            <p>ra-local-fast → llama3.2:3b (Ollama)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
