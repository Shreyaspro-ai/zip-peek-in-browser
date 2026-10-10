// AquaCity backend: sign-in (email + Google), profiles, activity and quiz history.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";
import { createLovableAuth } from "https://esm.sh/@lovable.dev/cloud-auth-js@1.1.2";

const SUPABASE_URL = "https://wxhlscepbimrboprhozv.supabase.co";
const SUPABASE_KEY = "sb_publishable_0rHZgwqQQiDS0gRLCwnljQ_jYJuVpOy";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
window.AquaBackend = sb;

const isWelcome = /welcome\.html$/.test(location.pathname);
const DASHBOARD = "index.html#command";
const say = (msg, isError) => {
  const s = document.querySelector(".status");
  if (!s) return;
  s.textContent = msg;
  s.style.color = isError ? "#c0392b" : "";
};
const friendly = (e) => {
  const m = (e && e.message) || String(e);
  if (/invalid login/i.test(m)) return "Incorrect email or password.";
  if (/already registered/i.test(m)) return "This email already has an account. Please log in.";
  if (/email not confirmed/i.test(m)) return "Please confirm your email first — check your inbox.";
  if (/password/i.test(m) && /6/.test(m)) return "Password must be at least 6 characters.";
  return m;
};

const { data: { session } } = await sb.auth.getSession();

if (isWelcome) {
  // Password-reset link lands here with type=recovery
  if (location.hash.includes("type=recovery")) {
    const pw = prompt("Enter your new password (min 6 characters):");
    if (pw) {
      const { error } = await sb.auth.updateUser({ password: pw });
      alert(error ? friendly(error) : "Password updated. Welcome back!");
      if (!error) location.replace(DASHBOARD);
    }
  } else if (session) {
    location.replace(DASHBOARD);
  }

  document.addEventListener("aquacity:auth", async (e) => {
    const { action, email, password } = e.detail || {};
    try {
      if (action === "google") {
        say("Opening Google…");
        const auth = createLovableAuth();
        const r = await auth.signInWithOAuth("google", {
          redirect_uri: location.origin + location.pathname,
        });
        if (r.error) throw r.error;
        if (r.redirected) return;
        const { error } = await sb.auth.setSession(r.tokens);
        if (error) throw error;
        location.replace(DASHBOARD);
      } else if (action === "login") {
        say("Logging in…");
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.replace(DASHBOARD);
      } else if (action === "signup") {
        say("Creating your account…");
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { emailRedirectTo: location.origin + location.pathname },
        });
        if (error) throw error;
        if (data.session) location.replace(DASHBOARD);
        else say("Almost there! Check your email to confirm your account.");
      } else if (action === "reset-password") {
        say("Sending reset link…");
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + location.pathname,
        });
        if (error) throw error;
        say("Password reset link sent — check your email.");
      }
    } catch (err) {
      say(friendly(err), true);
    }
  });
} else {
  // Dashboard: signed-in users only
  if (!session) {
    location.replace("welcome.html");
  } else {
    const user = session.user;
    const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const avatar = document.querySelector(".sdgs .avatar");
    if (avatar) {
      if (profile?.avatar_url) avatar.src = profile.avatar_url;
      avatar.alt = profile?.display_name || user.email;
      avatar.title = `${profile?.display_name || user.email} · ${profile?.points ?? 0} points — click to sign out`;
      avatar.style.cursor = "pointer";
      avatar.addEventListener("click", async () => {
        if (!confirm("Sign out of AquaCity?")) return;
        await sb.auth.signOut();
        location.replace("welcome.html");
      });
    }

    const log = (page, action, details = {}) =>
      sb.from("activity_log").insert({ user_id: user.id, page, action, details }).then(() => {});

    // Backend hook buttons emitted by the site
    document.addEventListener("aquacity:action", (e) => {
      const { page, action, ...details } = e.detail || {};
      log(page || "unknown", action || "unknown", details);
    });

    // Record meaningful interactions and quiz answers
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const page = document.getElementById("page")?.dataset.page || "unknown";
      const act = el.dataset.action;
      if (act === "check-answer") {
        const picked = document.querySelector('#page input[name="quiz"]:checked');
        const lesson = document.querySelector("#page h2")?.textContent || "lesson";
        if (picked) sb.from("quiz_attempts").insert({ user_id: user.id, lesson, answer: picked.value, correct: picked.value === "0" }).then(() => {});
      }
      if (!el.dataset.backend && !/^close-/.test(act)) {
        log(page, act, { ...el.dataset });
      }
    }, true);

    sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") location.replace("welcome.html");
    });
  }
}
