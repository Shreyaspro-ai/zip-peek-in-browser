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
  if (/pwned|leaked|compromised|weak/i.test(m)) return "This password is too common or has been leaked. Please choose a stronger one.";
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
        const weak = [];
        if (!password || password.length < 8) weak.push("8+ characters");
        if (!/[A-Z]/.test(password)) weak.push("an uppercase letter");
        if (!/[a-z]/.test(password)) weak.push("a lowercase letter");
        if (!/\d/.test(password)) weak.push("a number");
        if (!/[^A-Za-z0-9]/.test(password)) weak.push("a symbol");
        if (weak.length) { say("Password is too weak. Add " + weak.join(", ") + ".", true); return; }
        say("Creating your account…");
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { emailRedirectTo: location.origin + location.pathname },
        });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          say("This email already has an account. Please log in.", true); return;
        }
        if (data.session) { location.replace(DASHBOARD); return; }
        const { error: e2 } = await sb.auth.signInWithPassword({ email, password });
        if (e2) throw e2;
        location.replace(DASHBOARD);
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

    // ---------- Personal city: unique, persisted stats per user ----------
    const { data: cityRow } = await sb.rpc("ensure_city_state");
    const city = { seed: cityRow?.seed ?? 1, deltas: cityRow?.deltas ?? {} };
    const hash = (str) => {
      let h = Math.imul(city.seed ^ 0x9e3779b9, 2654435761);
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
      return (h >>> 0) / 4294967296; // 0..1
    };
    const NUM = /^([+\-−]?[$₹€£]?)(\d[\d,]*(?:\.\d+)?)(\s?(?:%|[A-Za-z\/]{1,8}(?:\s[A-Za-z\/]{1,6})?))?$/;
    const originals = new WeakMap();
    const lastOut = new WeakMap();
    const keyOf = new WeakMap();
    const currentPage = () => document.getElementById("page")?.dataset.page || "unknown";

    function eligible(node) {
      const p = node.parentElement;
      if (p && p.closest("[id]") && document.querySelector(`input[data-output="${p.closest("[id]").id}"]`)) return false;
      if (p && p.closest(".box, div")?.querySelector("input[type=range]") && p.closest("output, [id], .value") && p.parentElement?.querySelector("input[type=range]")) return false;
      if (!p || p.closest("#sidebar, .page-number, svg, output, script, style, button, label, .tab, .chip, h1, h2")) return false;
      return true;
    }
    function format(n, raw, unit) {
      const dec = (raw.split(".")[1] || "").length;
      let s = n.toFixed(dec);
      if (raw.includes(",")) s = Number(s).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return s;
    }
    function transformPage() {
      const page = document.getElementById("page");
      if (!page) return;
      const seen = {};
      const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (!eligible(node)) continue;
        let orig = originals.get(node);
        if (orig === undefined || node.nodeValue !== lastOut.get(node)) { orig = node.nodeValue; }
        const t = orig.trim();
        const m = t.match(NUM);
        if (!m) continue;
        const [, sign, raw, unitRaw = ""] = m;
        const base = Number(raw.replace(/,/g, ""));
        if (!isFinite(base) || (base < 10 && !raw.includes("."))) continue;
        if (/^(19|20)\d\d$/.test(raw) && !unitRaw) continue;
        originals.set(node, orig);
        const pg = currentPage();
        seen[t] = (seen[t] || 0) + 1;
        const key = `${pg}:${t}:${seen[t]}`;
        keyOf.set(node, key);
        const variance = (hash(key) - 0.5) * 0.24; // ±12% unique per user
        const delta = Number(city.deltas[key] || 0) / 100;
        let v = base * (1 + variance + delta);
        const isPct = unitRaw.trim() === "%";
        if (isPct && !/[+\-−]/.test(sign)) v = Math.min(100, Math.max(0, v));
        if (!raw.includes(".")) v = Math.round(v);
        const out = format(v, raw, unitRaw);
        const nv = orig.replace(raw, out);
        lastOut.set(node, nv);
        if (node.nodeValue !== nv) node.nodeValue = nv;
      }
    }
    let pending = false;
    const schedule = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; observer.disconnect(); transformPage(); observe(); }); };
    const observer = new MutationObserver(schedule);
    const observe = () => { const p = document.getElementById("page"); if (p) observer.observe(p, { childList: true, subtree: true, characterData: true }); };
    transformPage(); observe();

    const toast = (msg, kind) => {
      let t = document.getElementById("aq-toast");
      if (!t) {
        t = document.createElement("div"); t.id = "aq-toast"; t.setAttribute("role", "status");
        t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;max-width:min(560px,90vw);padding:12px 20px;border-radius:12px;background:#061c3b;color:#fff;font:600 14px/1.4 Arial,sans-serif;box-shadow:0 10px 30px #0004;transition:opacity .3s;opacity:0;pointer-events:none";
        document.body.append(t);
      }
      t.style.borderLeft = kind === "constructive" ? "6px solid #2fbf71" : kind === "destructive" ? "6px solid #e5484d" : "6px solid transparent";
      t.textContent = msg; t.style.opacity = "1";
      clearTimeout(t._h); t._h = setTimeout(() => (t.style.opacity = "0"), kind ? 5000 : 2600);
    };

    const LABELS = {
      "apply-allocation": "Water allocation applied",
      "apply-reuse": "Reuse plan applied",
      "run-crisis": "Crisis scenario simulated",
      "activate-response": "Emergency response activated",
      "run-simulation": "Simulation complete",
      "apply-plan": "District plan applied",
      "repair": "Leak repaired",
    };
    let planningTool = "Housing";
    async function runAction(action, values = []) {
      const keys = [];
      const page = document.getElementById("page");
      const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) { const k = keyOf.get(walker.currentNode); if (k) keys.push(k); }
      const inputs = { values: values.map((v) => ({ name: String(v.name || ""), value: String(v.value ?? "") })), tool: planningTool };
      const { data, error } = await sb.rpc("evaluate_city_action", { _page: currentPage(), _action: action, _inputs: inputs, _keys: keys });
      if (error) { toast("Couldn't save — please try again."); return; }
      city.deltas = data.deltas || {};
      transformPage();
      const icon = { constructive: "✅ Constructive", destructive: "⚠️ Destructive", neutral: "➖ Neutral", ignored: "⏳ Ignored" }[data.verdict] || "Saved";
      const pts = data.points ? ` · ${data.points > 0 ? "+" : ""}${data.points} pts` : "";
      toast(`${icon} (${data.score > 0 ? "+" : ""}${data.score})${pts} — ${(data.reasons || []).join(" ")}`, data.verdict);
    }

    // Backend hook buttons emitted by the site (Apply, Run Scenario, Run Simulation, …)
    document.addEventListener("aquacity:action", (e) => {
      const { action, values, tool } = e.detail || {};
      if (action === "select-planning-tool") { planningTool = tool || planningTool; return; }
      if (!LABELS[action]) return;
      runAction(action, values || []);
    });

    // Record meaningful interactions and quiz answers
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const page = currentPage();
      const act = el.dataset.action;
      if (act === "check-answer") {
        const picked = document.querySelector('#page input[name="quiz"]:checked');
        const lesson = document.querySelector("#page h2")?.textContent || "lesson";
        if (picked) {
          const correct = picked.value === "0";
          sb.from("quiz_attempts").insert({ user_id: user.id, lesson, answer: picked.value, correct }).then(() => {
            if (correct) toast("Correct! +10 points");
          });
        }
        return;
      }
      if (act === "apply-plan" || act === "repair") { setTimeout(() => runAction(act), 0); return; }
      if (!el.dataset.backend && !/^close-/.test(act)) log(page, act, { ...el.dataset });
    }, true);

    sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") location.replace("welcome.html");
    });
  }
}
