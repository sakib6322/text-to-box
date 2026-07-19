import { useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { isAuthenticated, getDefaultLandingPath, login, register, getAuthHeaders } from "@/lib/auth";
import { apiUrl } from "@/lib/apiBase";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("mode") === "admin" ? "admin" : "user";
  const from = (location.state as { from?: string; enrollCourseId?: string } | null)?.from ?? "/";
  const enrollCourseId = (location.state as { enrollCourseId?: string } | null)?.enrollCourseId;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState(defaultTab);

  if (isAuthenticated()) {
    if (from && from !== "/login") return <Navigate to={from} replace />;
    return <Navigate to={getDefaultLandingPath()} replace />;
  }

  const afterAuthNavigate = async (mode: "admin" | "user", role: string) => {
    if (enrollCourseId && role === "user") {
      try {
        await fetch(apiUrl(`/api/courses/${enrollCourseId}/enroll`), {
          method: "POST",
          headers: getAuthHeaders(),
        });
        navigate(`/my-courses/${enrollCourseId}`, { replace: true });
        return;
      } catch {
        /* fall through */
      }
    }
    const dest =
      from && from !== "/login"
        ? from
        : mode === "admin" || role === "admin" || role === "staff"
          ? getDefaultLandingPath()
          : "/my-courses";
    navigate(dest, { replace: true });
  };

  const handleLogin = async (mode: "admin" | "user") => {
    setSubmitting(true);
    try {
      const session = await login(email, password, mode);
      toast.success(`Welcome, ${session.email}!`);
      await afterAuthNavigate(mode, session.role);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const session = await register(email, password);
      toast.success(`Account created — welcome, ${session.email}!`);
      await afterAuthNavigate("user", session.role);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen app-mesh-bg flex items-center justify-center p-4">
      <Card className="glass-card w-full max-w-md p-8 space-y-6 animate-fade-up">
        <div className="text-center space-y-1">
          <h1 className="page-title text-3xl">PG Diary</h1>
          <p className="text-sm text-muted-foreground">Sign in or create an account</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="user">User login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="mt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleLogin("user");
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Password</Label>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                User sign in
              </Button>
            </form>
            <p className="text-center text-[11px] text-muted-foreground mt-3">
              New here? Switch to Register tab to create an account.
            </p>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={3}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Create user account
              </Button>
            </form>
            <p className="text-center text-[11px] text-muted-foreground mt-3">
              Admin accounts cannot be registered — use Admin tab to sign in.
            </p>
          </TabsContent>

          <TabsContent value="admin" className="mt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleLogin("admin");
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Admin sign in
              </Button>
            </form>
            <p className="text-center text-[11px] text-muted-foreground mt-3">
              Administrators can only log in — registration is not available for admin accounts.
            </p>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
