import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExchangeResult = {
  refresh_token?: string;
  access_token?: string;
  expires_in?: number;
  tenants?: Array<{ tenantId?: string; tenantName?: string; id?: string; name?: string }>;
  error?: string;
};

const buildSecretsCommand = (result: ExchangeResult) => {
  const tenant = result.tenants?.[0];
  const tenantId = tenant?.tenantId || tenant?.id || "<tenant_id>";
  const refreshToken = result.refresh_token || "<refresh_token>";

  return [
    `supabase secrets set XERO_REFRESH_TOKEN=\"${refreshToken}\"`,
    `supabase secrets set XERO_TENANT_ID=\"${tenantId}\"`,
    "supabase functions deploy xero-oauth-exchange xero-sync-campaigns",
  ].join("\n");
};

const XeroCallback = () => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ExchangeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const code = useMemo(() => new URLSearchParams(window.location.search).get("code"), []);
  const redirectUri = `${window.location.origin}/xero/callback`;

  useEffect(() => {
    const exchange = async () => {
      if (!code) {
        setError("Missing authorization code in callback URL.");
        setLoading(false);
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke<ExchangeResult>("xero-oauth-exchange", {
        body: { code, redirectUri },
      });

      if (invokeError || data?.error) {
        setError(invokeError?.message || data?.error || "Failed to exchange code");
        setLoading(false);
        return;
      }

      setResult(data ?? null);
      setLoading(false);
    };

    void exchange();
  }, [code, redirectUri]);

  const commandText = result ? buildSecretsCommand(result) : "";

  return (
    <main className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Xero OAuth Callback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Exchanging authorization code with Xero...</p>}

            {!loading && error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && result && (
              <>
                <p className="text-sm text-muted-foreground">
                  Success. Use these commands to complete secrets setup for invoice/payment sync.
                </p>

                <pre className="rounded-md border bg-muted/30 p-3 text-xs overflow-x-auto">{commandText}</pre>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={async () => {
                      await navigator.clipboard.writeText(commandText);
                    }}
                  >
                    Copy Commands
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default XeroCallback;
