/**
 * OAuth Error Page
 *
 * Displayed when OAuth authorization fails.
 * Shows error details and provides retry option.
 */

import React, { useEffect } from "react";
import { useRouter } from "../routing/router";
import { Button } from "../components/Button";

export function OAuthError(): JSX.Element {
  const navigate = useRouter((state) => state.navigate);
  const [error, setError] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setError(params.get("error") || "unknown_error");
    setDescription(
      params.get("description") || "An unknown error occurred during OAuth authorization."
    );
  }, []);

  const getErrorIcon = (err: string): string => {
    const errorIcons: Record<string, string> = {
      access_denied: "🚫",
      invalid_scope: "⚠️",
      server_error: "⚡",
      temporarily_unavailable: "⏱️",
      state_expired: "⏰",
      no_code: "❌",
      token_exchange_failed: "🔗",
      invalid_state: "🔐",
    };
    return errorIcons[err] || "❌";
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse opacity-20"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse opacity-20 delay-1000"></div>
      </div>

      <div className="w-full max-w-md space-y-8 text-center">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center animate-pulse">
            <span className="text-5xl">{getErrorIcon(error)}</span>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Authorization Failed
          </h1>
          <p className="text-lg text-slate-300">
            We couldn't connect your account at this time.
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-slate-900/50 border border-red-500/20 rounded-lg p-6 space-y-3 text-left">
          <div>
            <p className="text-xs text-slate-400 font-semibold mb-1 uppercase">Error Code</p>
            <p className="font-mono text-sm text-red-300 bg-slate-950 px-3 py-2 rounded break-all">
              {error}
            </p>
          </div>

          <div className="pt-3 border-t border-red-500/20">
            <p className="text-xs text-slate-400 font-semibold mb-1 uppercase">Details</p>
            <p className="text-sm text-slate-300">
              {decodeURIComponent(description)}
            </p>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-amber-600/10 border border-amber-500/20 rounded-lg p-4 text-left">
          <p className="text-sm font-semibold text-amber-300 mb-2">Troubleshooting</p>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• Check that your Google account is active</li>
            <li>• Ensure you have authorized the requested permissions</li>
            <li>• Clear your browser cookies and try again</li>
            <li>• Make sure this app is configured in Google Cloud Console</li>
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

        {/* Additional Help */}
        <p className="text-xs text-slate-500 pt-4">
          If problems persist, contact support or check our documentation.
        </p>
      </div>
    </div>
  );
}
