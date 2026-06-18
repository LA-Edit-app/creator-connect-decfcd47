import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const XeroCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [tenantName, setTenantName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const agencyId = params.get("state");
    const redirectUri = `${window.location.origin}/xero/callback`;

    if (!code || !agencyId) {
      setErrorMessage("Missing authorisation code or state parameter.");
      setStatus("error");
      return;
    }

    const exchange = async () => {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        tenantName: string;
        error?: string;
      }>("xero-oauth-exchange", { body: { code, redirectUri, agencyId } });
      if (error || data?.error) {
        setErrorMessage(error?.message ?? data?.error ?? "Connection failed");
        setStatus("error");
        return;
      }
      setTenantName(data?.tenantName ?? "");
      setStatus("success");
    };

    void exchange();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Connecting to Xero...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <XCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-semibold">Connection failed</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <Button onClick={() => navigate("/agency-settings")}>Back to settings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h1 className="text-xl font-semibold">Connected to Xero</h1>
        <p className="text-muted-foreground">
          Successfully connected to <strong>{tenantName}</strong>. Invoice statuses will now
          sync automatically.
        </p>
        <Button onClick={() => navigate("/agency-settings")}>Go to settings</Button>
      </div>
    </div>
  );
};

export default XeroCallback;
