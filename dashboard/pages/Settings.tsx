/**
 * Settings Page
 *
 * User settings and preferences for Shadow dashboard.
 * Includes notification preferences, risk settings, and integrations.
 */

import React, { useState } from "react";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { useDashboardStore } from "../store";

export function Settings(): JSX.Element {
  const [activeTab, setActiveTab] = useState<
    "notifications" | "risk" | "integrations" | "profile"
  >("notifications");
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    setGmailError(null);

    try {
      const response = await fetch("/api/integrations/auth/gmail");
      const data = await response.json();

      if (!response.ok || !data.authUrl) {
        throw new Error(
          data.message || "Failed to get authorization URL"
        );
      }

      window.location.href = data.authUrl;
    } catch (error) {
      setGmailError(
        error instanceof Error
          ? error.message
          : "Failed to connect Gmail"
      );
      setIsConnectingGmail(false);
    }
  };

  const tabs = [
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "risk", label: "Risk Settings", icon: "⚠️" },
    { id: "integrations", label: "Integrations", icon: "🔗" },
    { id: "profile", label: "Profile", icon: "👤" },
  ];

  return (
    <div className="space-y-8 animate-fade-in w-full">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-800/50 pb-6">
        <h1 className="text-2xl font-bold text-slate-50">
          Settings
        </h1>
        <p className="text-slate-400 text-sm">
          Manage your Shadow dashboard preferences and integrations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800/50 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() =>
              setActiveTab(
                tab.id as
                  | "notifications"
                  | "risk"
                  | "integrations"
                  | "profile"
              )
            }
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              ${
                activeTab === tab.id
                  ? "border-b-2 border-indigo-500 text-indigo-300"
                  : "text-slate-400 hover:text-slate-300 border-b-2 border-transparent"
              }
            `}
          >
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Notifications Settings */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <Card header={<h2 className="font-semibold">Notification Preferences</h2>}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">
                      New Commitments
                    </p>
                    <p className="text-sm text-slate-400">
                      Notify me when new commitments are detected
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">At-Risk Alerts</p>
                    <p className="text-sm text-slate-400">
                      Notify me when commitments become at-risk
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">
                      Draft Generated
                    </p>
                    <p className="text-sm text-slate-400">
                      Notify me when drafts are ready for approval
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded"
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="font-medium text-slate-100 mb-3">
                    Quiet Hours
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">
                        From
                      </label>
                      <input
                        type="time"
                        defaultValue="22:00"
                        className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">
                        To
                      </label>
                      <input
                        type="time"
                        defaultValue="08:00"
                        className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="primary">Save Changes</Button>
              <Button variant="secondary">Reset to Default</Button>
            </div>
          </div>
        )}

        {/* Risk Settings */}
        {activeTab === "risk" && (
          <div className="space-y-4">
            <Card header={<h2 className="font-semibold">Risk Detection</h2>}>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-slate-100">
                      Risk Window (% of commitment duration)
                    </label>
                    <span className="text-indigo-300 font-semibold">25%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    defaultValue="25"
                    className="w-full"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    How early to flag commitments as at-risk before the
                    deadline
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-slate-100">
                      At-Risk Threshold
                    </label>
                    <span className="text-amber-300 font-semibold">0.65</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.9"
                    step="0.05"
                    defaultValue="0.65"
                    className="w-full"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Risk score threshold for marking commitments as at-risk
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">
                      Auto-Queue Recovery Drafts
                    </p>
                    <p className="text-sm text-slate-400">
                      Automatically draft recovery messages for overdue
                      commitments
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded"
                  />
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="primary">Save Changes</Button>
              <Button variant="secondary">Reset to Default</Button>
            </div>
          </div>
        )}

        {/* Integrations */}
        {activeTab === "integrations" && (
          <div className="space-y-4">
            <Card header={<h2 className="font-semibold">Connected Accounts</h2>}>
              <div className="space-y-3">
                {[
                  {
                    name: "Gmail",
                    status: "connected",
                    icon: "📧",
                    lastSync: "2 min ago",
                  },
                  {
                    name: "GitHub",
                    status: "connected",
                    icon: "🐙",
                    lastSync: "5 min ago",
                  },
                  {
                    name: "Google Calendar",
                    status: "connected",
                    icon: "📅",
                    lastSync: "1 hour ago",
                  },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="p-4 bg-slate-900/50 rounded border border-slate-700/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <p className="font-medium text-slate-100">
                          {integration.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Last synced: {integration.lastSync}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Connected</Badge>
                      <button className="px-3 py-1 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                        Settings
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {gmailError && (
              <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                <p className="font-medium">Connection Error</p>
                <p className="mt-1">{gmailError}</p>
              </div>
            )}

            <Card header={<h2 className="font-semibold">Available Integrations</h2>}>
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  className="w-full"
                  isLoading={isConnectingGmail}
                  onClick={handleConnectGmail}
                  icon="📧"
                >
                  {isConnectingGmail
                    ? "Connecting..."
                    : "+ Connect Gmail"}
                </Button>
                <p className="text-xs text-slate-400 text-center">
                  Grant access to scan your emails for commitments
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <Card header={<h2 className="font-semibold">Account Information</h2>}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 block mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Ayaan Arora"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-400 block mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue="ayaan@example.com"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-400 block mb-2">
                    Timezone
                  </label>
                  <select className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-slate-100">
                    <option>America/New_York</option>
                    <option>America/Chicago</option>
                    <option>America/Denver</option>
                    <option>America/Los_Angeles</option>
                    <option>Europe/London</option>
                    <option>Europe/Paris</option>
                    <option>Asia/Tokyo</option>
                  </select>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="primary">Save Changes</Button>
              <Button variant="secondary">Reset to Default</Button>
            </div>

            <Card className="bg-red-500/10 border-red-500/20">
              <div>
                <p className="font-semibold text-red-300 mb-2">
                  Danger Zone
                </p>
                <p className="text-sm text-slate-300 mb-4">
                  These actions cannot be undone.
                </p>
                <Button variant="danger">
                  Delete Account
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
