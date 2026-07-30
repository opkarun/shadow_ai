/**
 * OAuth Success Page
 *
 * Displayed after successful OAuth authorization.
 * Shows confirmation and redirects back to settings.
 */

import React, { useEffect } from "react";
import { useRouter } from "../routing/router";
import { Button } from "../components/Button";

export function OAuthSuccess(): JSX.Element {
  const navigate = useRouter((state) => state.navigate);
  const [provider, setProvider] = React.useState<string>("");
  const [userId, setUserId] = React.useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProvider(params.get("provider") || "");
    setUserId(params.get("user_id") || "");
  }, []);

  const getProviderInfo = (
    p: string
  ): { icon: string; name: string; color: string } => {
    const providers: Record<string, { icon: string; name: string; color: string }> = {
      gmail: {
        icon: "📧",
        name: "Gmail",
        color: "text-red-400",
      },
      github: {
        icon: "🐙",
        name: "GitHub",
        color: "text-slate-400",
      },
      google_calendar: {
        icon: "📅",
        name: "Google Calendar",
        color: "text-blue-400",
      },
    };
    return (
      providers[p] || { icon: "🔗", name: "Integration", color: "text-indigo-400" }
    );
  };

  const providerInfo = getProviderInfo(provider);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse opacity-20"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse opacity-20 delay-1000"></div>
      </div>

      <div className="w-full max-w-md space-y-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center animate-scale-in">
            <span className="text-5xl">✓</span>
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Connected Successfully!
          </h1>
          <p className="text-lg text-slate-300">
            Your <span className={providerInfo.color}>{providerInfo.name}</span>{" "}
            account is now connected to Shadow.
          </p>
        </div>

        {/* Provider Info */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl">{providerInfo.icon}</span>
            <div className="text-left">
              <p className="text-sm text-slate-400">Connected Account</p>
              <p className="text-lg font-semibold text-slate-100">
                {providerInfo.name}
              </p>
            </div>
          </div>

          {userId && (
            <div className="pt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 mb-2">User ID</p>
              <p className="font-mono text-xs text-slate-300 break-all bg-slate-950 p-2 rounded">
                {userId}
              </p>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-lg p-4 text-left">
          <p className="text-sm font-semibold text-indigo-300 mb-2">What's next?</p>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>✓ Your emails will be scanned for commitments</li>
            <li>✓ Evidence will be automatically verified</li>
            <li>✓ Drafts will be generated when needed</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate("settings")}
          >
            Back to Settings
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate("dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
