import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const { user, loading, signInWithPassword, signUpWithPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("signin");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInLoading(true);
    try {
      await signInWithPassword(signInEmail.trim(), signInPassword);
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({
        variant: "destructive",
        title: "Sign-in failed",
        description: message,
      });
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (signUpPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Use at least 8 characters.",
      });
      return;
    }

    if (signUpPassword !== signUpConfirm) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Please re-enter your password.",
      });
      return;
    }

    setSignUpLoading(true);
    try {
      await signUpWithPassword(signUpEmail.trim(), signUpPassword, signUpName.trim() || undefined);
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({
        variant: "destructive",
        title: "Sign-up failed",
        description: message,
      });
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-hero p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-glow">
          <GraduationCap className="h-7 w-7 text-primary-foreground" />
        </div>
        <span className="text-3xl font-bold font-display text-foreground">Clivra</span>
      </div>

      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display">Welcome to Clivra</CardTitle>
          <CardDescription>
            Your intelligent study companion for exam success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(event) => setSignInEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(event) => setSignInPassword(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={signInLoading}>
                  {signInLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={signUpName}
                    onChange={(event) => setSignUpName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(event) => setSignUpEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={signUpPassword}
                    onChange={(event) => setSignUpPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={signUpConfirm}
                    onChange={(event) => setSignUpConfirm(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={signUpLoading}>
                  {signUpLoading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground text-center max-w-sm">
        Clivra helps you plan, track, and optimize your study sessions for exam success.
      </p>
    </div>
  );
}
