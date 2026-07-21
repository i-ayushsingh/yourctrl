import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { WindowControls } from "./WindowControls";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SuggestView() {
  const back = useAppStore((s) => s.backToDashboard);
  
  // Tabs selection
  const activeTab = useAppStore((s) => s.suggestTab);
  const setActiveTab = useAppStore((s) => s.setSuggestTab);
  const suggestPrefill = useAppStore((s) => s.suggestPrefill);

  // Suggest App state
  const [appName, setAppName] = useState("");
  const [processName, setProcessName] = useState("");
  const [website, setWebsite] = useState("");

  // Report Issue state
  const [brokenAppName, setBrokenAppName] = useState("");
  const [issueType, setIssueType] = useState("wrong_shortcut");
  const [issueDescription, setIssueDescription] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // React to prefill data
  useState(() => {
    if (suggestPrefill) {
      if (activeTab === "suggest") {
        setAppName(suggestPrefill.appName);
        setProcessName(suggestPrefill.processName);
      } else {
        setBrokenAppName(suggestPrefill.appName);
      }
    }
  });

  // Submission/Success/Error states
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmitSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateCheck = checkRateLimit("suggest_app", 30);
    if (!rateCheck.allowed) {
      setError(`Please wait ${rateCheck.waitSeconds} seconds before submitting another suggestion.`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "369b82a5-c2e9-4b23-b2e6-7f5521df375c",
          subject: `New App Suggestion: ${appName}`,
          app_name: appName,
          process_name: processName,
          website: website,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        setError(json.message || "Something went wrong.");
      }
    } catch (err) {
      setError("Failed to send suggestion. Please check your network.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBroken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "369b82a5-c2e9-4b23-b2e6-7f5521df375c",
          subject: `Broken App/Shortcuts Report: ${brokenAppName}`,
          app_name: brokenAppName,
          issue_type: issueType,
          description: issueDescription,
          email: userEmail,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        setError(json.message || "Something went wrong.");
      }
    } catch (err) {
      setError("Failed to send report. Please check your network.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormState = () => {
    setSuccess(false);
    setError("");
    setAppName("");
    setProcessName("");
    setWebsite("");
    setBrokenAppName("");
    setIssueType("wrong_shortcut");
    setIssueDescription("");
    setUserEmail("");
  };

  return (
    <div className="flex h-screen flex-1 flex-col">
      <header
        className="flex items-center gap-3 border-b border-border bg-background/70 py-2 pl-3 pr-1 backdrop-blur-xl"
        data-tauri-drag-region
      >
        <Button variant="ghost" size="icon" onClick={back} aria-label="Back" data-no-drag>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-sm font-semibold">
          {activeTab === "suggest" ? "Suggest an app" : "Report an issue"}
        </h1>
        <div className="flex-1" />
        <WindowControls />
      </header>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-start">
        {/* Tabs Selection Selector */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            onClick={() => {
              setActiveTab("suggest");
              resetFormState();
            }}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium transition-all cursor-pointer",
              activeTab === "suggest"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Suggest App
          </button>
          <button
            onClick={() => {
              setActiveTab("broken");
              resetFormState();
            }}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium transition-all cursor-pointer",
              activeTab === "broken"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Report Issue
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center py-8">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-7" />
            </div>
            <h2 className="text-lg font-semibold">
              {activeTab === "suggest" ? "Suggestion Submitted!" : "Report Submitted!"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {activeTab === "suggest"
                ? `Thank you! We've received your request for ${appName}. We'll verify the shortcuts and add support for it soon.`
                : `Thank you! We've received your report regarding ${brokenAppName}. We'll look into it as soon as possible.`}
            </p>
            <Button className="mt-4" onClick={resetFormState}>
              Submit Another
            </Button>
          </div>
        ) : activeTab === "suggest" ? (
          <form onSubmit={handleSubmitSuggest} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="suggest-app-name" className="text-xs font-medium text-muted-foreground">
                App Name
              </label>
              <Input
                id="suggest-app-name"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. Spotify"
                className="h-10 bg-muted/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="suggest-process-name" className="text-xs font-medium text-muted-foreground">
                Process Name (Optional)
              </label>
              <Input
                id="suggest-process-name"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                placeholder="e.g. spotify.exe"
                className="h-10 bg-muted/30"
              />
              <p className="text-[10px] text-muted-foreground/75 px-1">
                Executable name from Windows Task Manager. Helps us auto-detect the app window.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="suggest-website" className="text-xs font-medium text-muted-foreground">
                Website or Shortcuts Link (Optional)
              </label>
              <Input
                id="suggest-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. https://support.spotify.com/article/keyboard-shortcuts"
                className="h-10 bg-muted/30"
              />
            </div>

            {error && <div className="text-xs text-destructive font-medium">{error}</div>}

            <Button type="submit" disabled={submitting} className="w-full h-10 mt-4">
              {submitting ? "Submitting..." : "Submit Suggestion"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmitBroken} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="broken-app-name" className="text-xs font-medium text-muted-foreground">
                App Name
              </label>
              <Input
                id="broken-app-name"
                required
                value={brokenAppName}
                onChange={(e) => setBrokenAppName(e.target.value)}
                placeholder="e.g. Google Chrome"
                className="h-10 bg-muted/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Issue Type
              </span>
              <Select value={issueType} onValueChange={(val) => setIssueType(val)}>
                <SelectTrigger className="h-10 w-full bg-muted/30 border-input text-foreground text-left focus:ring-1 focus:ring-ring focus:border-ring">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] bg-popover text-popover-foreground border border-border">
                  <SelectItem value="wrong_shortcut">Wrong shortcut(s)</SelectItem>
                  <SelectItem value="missing_shortcuts">Missing shortcut(s)</SelectItem>
                  <SelectItem value="app_detection">App detection is broken</SelectItem>
                  <SelectItem value="broken_feature">Broken app feature</SelectItem>
                  <SelectItem value="other">Other issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="suggest-description" className="text-xs font-medium text-muted-foreground">
                Description / Details
              </label>
              <textarea
                id="suggest-description"
                required
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Please describe the issue (e.g. Ctrl+T opens history instead of a new tab)"
                className="min-h-[100px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="broken-user-email" className="text-xs font-medium text-muted-foreground">
                Your Email (Optional)
              </label>
              <Input
                id="broken-user-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="e.g. you@example.com"
                className="h-10 bg-muted/30"
              />
            </div>

            {error && <div className="text-xs text-destructive font-medium">{error}</div>}

            <Button type="submit" disabled={submitting} className="w-full h-10 mt-4">
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
