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
import {
  IconNotification,
  IconAlertTriangle,
  IconShield,
  IconUser,
  IconCheck,
} from "../components/Icons";

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
    { id: "notifications", label: "Notifications", icon: <IconNotification className="w-4 h-4" /> },
    { id: "risk", label: "Risk Engine", icon: <IconAlertTriangle className="w-4 h-4" /> },
    { id: "integrations", label: "Integrations", icon: <IconShield className="w-4 h-4" /> },
    { id: "profile", label: "Profile", icon: <IconUser className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 animate-fade-in w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">
            System Settings
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure risk thresholds, notifications, connected accounts, and system behavior.
          </p>
        </div>
      </div>

      {/* Modern Pill Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id as "notifications" | "risk" | "integrations" | "profile"
                )
              }
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer outline-none select-none
                ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Notifications Settings */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <Card header={<h2 className="font-bold text-slate-100 text-base">Notification Preferences</h2>}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div>
                    <p className="font-bold text-slate-200 text-sm">
                      New Commitment Detections
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Send alerts when new commitments are extracted from messages
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div>
                    <p className="font-bold text-slate-200 text-sm">At-Risk Alerts</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Notify immediately when a commitment crosses risk threshold
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div>
                    <p className="font-bold text-slate-200 text-sm">
                      AI Draft Ready
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Notify when communication drafts are queued for approval
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="primary" size="sm" disabled title="Coming soon">
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Risk Settings */}
        {activeTab === "risk" && (
          <div className="space-y-4">
            <Card header={<h2 className="font-bold text-slate-100 text-base">Autonomous Risk Engine Settings</h2>}>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-200">
                      Risk Window (% of commitment deadline duration)
                    </label>
                    <span className="text-indigo-400 font-bold text-sm">25%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    defaultValue="25"
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    How early to trigger risk warnings prior to target deadline.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-200">
                      Minimum At-Risk Score Threshold
                    </label>
                    <span className="text-amber-400 font-bold text-sm">0.65</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.9"
                    step="0.05"
                    defaultValue="0.65"
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="primary" size="sm" disabled title="Coming soon">
                Save Risk Thresholds
              </Button>
            </div>
          </div>
        )}

        {/* Integrations */}
        {activeTab === "integrations" && (
          <div className="space-y-4">
            <Card header={<h2 className="font-bold text-slate-100 text-base">Active Integrations</h2>}>
              <div className="space-y-3">
                {[
                  {
                    name: "Gmail API",
                    status: "Connected",
                    desc: "Scanning inbox for incoming requests and commitments",
                  },
                  {
                    name: "GitHub Webhooks",
                    status: "Connected",
                    desc: "Auto-matching commits and pull requests as evidence",
                  },
                  {
                    name: "Google Calendar",
                    status: "Connected",
                    desc: "Syncing meeting deadlines and action items",
                  },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{integration.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{integration.desc}</p>
                    </div>

                    <Badge variant="success" icon={<IconCheck className="w-3.5 h-3.5" />}>
                      {integration.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {gmailError && (
              <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm">
                <p className="font-semibold">Connection Error</p>
                <p className="mt-1">{gmailError}</p>
              </div>
            )}

            <Card header={<h2 className="font-bold text-slate-100 text-base">Add New Connection</h2>}>
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  className="w-full"
                  isLoading={isConnectingGmail}
                  onClick={handleConnectGmail}
                >
                  {isConnectingGmail ? "Connecting Gmail..." : "+ Re-Authorize Gmail OAuth"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <Card header={<h2 className="font-bold text-slate-100 text-base">Account Credentials</h2>}>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                    Executive Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Ayaan Arora"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                    Primary Work Email
                  </label>
                  <input
                    type="email"
                    defaultValue="ayaan@example.com"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  />
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="primary" size="sm" disabled title="Coming soon">
                Save Profile
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
