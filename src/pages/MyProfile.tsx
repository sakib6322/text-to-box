import { useEffect, useMemo, useState } from "react";
import { Loader2, Shield, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  fetchCurrentUser,
  getSession,
  isAdmin,
  isStaff,
  updateProfile,
  type AuthSession,
} from "@/lib/auth";
import { PERMISSION_GROUPS } from "@/lib/permissions";

function roleLabel(role: AuthSession["role"]) {
  if (role === "admin") return "Administrator";
  if (role === "staff") return "Staff";
  return "Student";
}

export default function MyProfile() {
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const user = await fetchCurrentUser();
        if (user) {
          setSession(user);
          setDisplayName(user.displayName ?? "");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const permissionLabels = useMemo(() => {
    if (!session || session.role === "admin") return [];
    const labelByKey = new Map(
      PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => [p.key, p.label] as const)),
    );
    return session.permissions
      .filter((k) => !k.startsWith("user."))
      .map((k) => labelByKey.get(k) ?? k)
      .sort((a, b) => a.localeCompare(b));
  }, [session]);

  const saveDisplayName = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ displayName: displayName.trim() });
      setSession(updated);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!newPassword.trim()) return toast.error("Enter a new password");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setSavingPassword(true);
    try {
      const updated = await updateProfile({
        currentPassword,
        newPassword: newPassword.trim(),
      });
      setSession(updated);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Password change failed");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading profile…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Card className="p-8 text-center text-muted-foreground">Not signed in.</Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight page-title">My profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Account details, display name, and password.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold truncate">{session.displayName?.trim() || session.email}</p>
              <Badge variant={isAdmin() ? "default" : isStaff() ? "secondary" : "outline"}>
                {roleLabel(session.role)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground break-all">{session.email}</p>
            {session.expiresAt ? (
              <p className="text-xs text-muted-foreground">
                Session expires: {new Date(session.expiresAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Display name</h2>
        <div className="space-y-2">
          <Label htmlFor="display-name">Name shown in the app</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name (optional)"
          />
        </div>
        <Button type="button" onClick={() => void saveDisplayName()} disabled={savingProfile}>
          {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save display name
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={() => void savePassword()} disabled={savingPassword}>
          {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update password
        </Button>
      </Card>

      {session.role === "admin" ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium">Full administrator access</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">All pages and actions are available.</p>
        </Card>
      ) : isStaff() ? (
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Assigned permissions ({permissionLabels.length})</h2>
          </div>
          {permissionLabels.length ? (
            <ul className="flex flex-wrap gap-2">
              {permissionLabels.map((label) => (
                <li key={label}>
                  <Badge variant="outline">{label}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No permissions assigned yet.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
