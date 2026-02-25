import { useState } from "react";

const C = {
  bg: "#0b0f1a",
  surface: "#111827",
  surfaceAlt: "#1a2332",
  border: "#1e293b",
  blue: "#3b82f6",
  blueDim: "#1e3a5f",
  green: "#10b981",
  greenDim: "#064e3b",
  orange: "#f59e0b",
  orangeDim: "#78350f",
  purple: "#8b5cf6",
  purpleDim: "#4c1d95",
  red: "#ef4444",
  redDim: "#7f1d1d",
  cyan: "#06b6d4",
  cyanDim: "#164e63",
  text: "#e2e8f0",
  dim: "#94a3b8",
  muted: "#64748b",
};

const Badge = ({ color, children }) => {
  const colors = {
    blue: [C.blueDim, C.blue], green: [C.greenDim, C.green], orange: [C.orangeDim, C.orange],
    purple: [C.purpleDim, C.purple], red: [C.redDim, C.red], cyan: [C.cyanDim, C.cyan],
  };
  const [bg, fg] = colors[color] || colors.blue;
  return <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, background: bg, color: fg }}>{children}</span>;
};

const Box = ({ label, sub, color, w }) => (
  <div style={{ background: color + "18", border: `1.5px solid ${color}40`, borderRadius: 10, padding: "10px 14px", width: w || "auto", textAlign: "center" }}>
    <div style={{ fontWeight: 700, fontSize: 12, color }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

const Arrow = ({ label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0" }}>
    {label && <span style={{ fontSize: 9, color: C.muted, fontStyle: "italic" }}>{label}</span>}
    <span style={{ color: C.muted, fontSize: 14 }}>↓</span>
  </div>
);

const Card = ({ title, icon, color, children }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, borderTop: `3px solid ${color || C.blue}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{title}</h3>
    </div>
    <div style={{ fontSize: 12.5, lineHeight: 1.7, color: C.dim }}>{children}</div>
  </div>
);

const Check = ({ yes, children }) => (
  <div style={{ fontSize: 12, color: C.dim, paddingLeft: 20, position: "relative", marginBottom: 4 }}>
    <span style={{ position: "absolute", left: 0, color: yes ? C.green : C.red }}>{yes ? "✓" : "✗"}</span>
    {children}
  </div>
);

const Row = ({ cells, header }) => (
  <tr>{cells.map((c, i) => {
    const T = header ? "th" : "td";
    return <T key={i} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11.5, fontWeight: header ? 700 : 400, color: header ? C.text : C.dim, borderBottom: `1px solid ${C.border}`, background: header ? C.surfaceAlt : "transparent" }}>{c}</T>;
  })}</tr>
);

// ─── OPTION A: BROWSER ONLY ───

function OptionA() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 28 }}>🌐</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>Option A: Browser-Only Gate</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Extension blocks browsing until login. Desktop, apps, files — all work normally.</p>
        </div>
      </div>
    </div>

    {/* User Flow */}
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>User Experience Flow</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <Box label="1. Windows Boots" sub="Normal login → full desktop loads" color={C.blue} w={340} />
        <Arrow label="startup script" />
        <Box label="2. Chrome Auto-Launches" sub="Opens alongside normal desktop & taskbar" color={C.cyan} w={340} />
        <Arrow />
        <Box label="3. Extension Blocks ALL Browsing" sub="Every URL → redirected to login page" color={C.red} w={340} />
        <Arrow label="user enters email + password" />
        <Box label="4. Supabase Auth Validates" sub="Checks credentials, returns session token" color={C.green} w={340} />
        <Arrow />
        <div style={{ display: "flex", gap: 10 }}>
          <Box label="5a. Browsing Unlocked" sub="Only allowed URLs accessible" color={C.green} />
          <Box label="5b. Session Tracked" sub="Login time → Supabase" color={C.purple} />
        </div>
        <Arrow />
        <Box label="6. Continuous Monitoring" sub="Heartbeat every 5 min · .exe downloads blocked · URL filtering active" color={C.orange} w={340} />
      </div>
    </div>

    {/* Architecture */}
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>System Architecture</div>
      <div style={{ fontFamily: "monospace", fontSize: 11, background: C.bg, padding: 16, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.7, color: C.dim }}>
{`Windows (Normal Desktop — everything accessible)
  │
  │ Startup script auto-launches Chrome
  │
  ▼
┌──────────────────────────────────────────────┐
│  Chrome + Forced Extension                    │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  Auth Gate                              │  │
│  │  • Intercepts ALL web requests          │  │
│  │  • Not logged in? → Login page          │  │
│  │  • Logged in? → Check allowed URLs      │  │
│  ├─────────────────────────────────────────┤  │
│  │  URL Filter                             │  │
│  │  • Fetches allowed_urls from Supabase   │  │
│  │  • Allowed → let through                │  │
│  │  • Blocked → show "Access Denied"       │  │
│  ├─────────────────────────────────────────┤  │
│  │  Download Blocker                       │  │
│  │  • .exe .msi .bat .ps1 → cancelled      │  │
│  │  • .pdf .docx .xlsx → allowed           │  │
│  │  • Blocked attempts logged to Supabase  │  │
│  ├─────────────────────────────────────────┤  │
│  │  Session Tracker                        │  │
│  │  • login_at recorded on auth            │  │
│  │  • Heartbeat every 5 min               │  │
│  │  • logout_at on close/idle             │  │
│  └─────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────┘
                   │ HTTPS
┌──────────────────▼───────────────────────────┐
│              Supabase                         │
│  Auth · users · allowed_urls · sessions ·     │
│  leaves · download_logs · attendance          │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│         Admin Dashboard (Vercel)              │
│  User mgmt · URL rules · Live sessions ·      │
│  Leave approval · Compliance · Download logs  │
└──────────────────────────────────────────────┘`}
      </div>
    </div>

    {/* What's controlled */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card title="What's Blocked" icon="🔒" color={C.red}>
        <Check yes={true}>All browsing until extension login</Check>
        <Check yes={true}>Non-allowed URLs after login</Check>
        <Check yes={true}>.exe / .msi / .bat downloads</Check>
        <Check yes={true}>Incognito mode (extension spans it)</Check>
      </Card>
      <Card title="What's NOT Blocked" icon="🔓" color={C.green}>
        <Check yes={false}>Desktop access (always available)</Check>
        <Check yes={false}>File Explorer (always available)</Check>
        <Check yes={false}>Word, Excel, any app (always available)</Check>
        <Check yes={false}>Other browsers (need separate block)</Check>
      </Card>
    </div>

    {/* Setup */}
    <Card title="Setup Per Laptop" icon="⚙️" color={C.blue}>
      <div style={{ fontFamily: "monospace", fontSize: 11, background: C.bg, padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 6 }}>
{`# deploy-option-a.ps1 — ONE script, run once per laptop

# 1. Chrome opens on Windows login
$startup = "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
Set-Content "$startup\\launch-chrome.bat" "start chrome.exe"

# 2. Force-install extension (user can't remove)
$p = "HKLM:\\SOFTWARE\\Policies\\Google\\Chrome\\ExtensionInstallForcelist"
New-Item -Path $p -Force
Set-ItemProperty -Path $p -Name "1" \\
  -Value "EXTENSION_ID;https://your-update-url"

# 3. (Optional) Block other browsers
$d = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer\\DisallowRun"
New-Item -Path $d -Force
Set-ItemProperty -Path $d -Name "1" -Value "firefox.exe"
Set-ItemProperty -Path $d -Name "2" -Value "brave.exe"
Set-ItemProperty -Path "HKLM:\\SOFTWARE\\...\\Explorer" \\
  -Name "DisallowRun" -Value 1

# Done. That's it.`}
      </div>
    </Card>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
      <Card title="Components" icon="📦" color={C.blue}>
        <strong style={{ color: C.text }}>Chrome Extension</strong> (Manifest V3)<br />
        <strong style={{ color: C.text }}>Supabase</strong> (Auth + DB + Realtime)<br />
        <strong style={{ color: C.text }}>PowerShell script</strong> (one-time)<br />
        <strong style={{ color: C.text }}>Admin Dashboard</strong> (Next.js/Vercel)
      </Card>
      <Card title="Build Time" icon="⏱️" color={C.green}>
        Extension: 4-5 days<br />
        Supabase schema: 1 day<br />
        Setup script: half day<br />
        Dashboard: 1-2 weeks<br />
        <strong style={{ color: C.text }}>Total: ~2.5 weeks</strong>
      </Card>
      <Card title="Monthly Cost" icon="💰" color={C.orange}>
        Supabase Pro: $25/mo<br />
        Vercel Pro: $20/mo<br />
        Per-user fees: $0<br />
        Directory service: $0<br />
        <strong style={{ color: C.text }}>Total: ~$45/mo</strong>
      </Card>
    </div>
  </div>;
}

// ─── OPTION B: FULL DESKTOP GATE ───

function OptionB() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 28 }}>🛡️</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>Option B: Full Desktop Gate</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Chrome is the shell. No desktop, no apps, no files — until extension login. Then everything unlocks.</p>
        </div>
      </div>
    </div>

    {/* User Flow */}
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>User Experience Flow</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <Box label="1. Windows Boots" sub='Login to "Worker" account' color={C.blue} w={340} />
        <Arrow label="shell = Chrome (not Explorer)" />
        <Box label="2. Chrome Opens FULLSCREEN" sub="No desktop. No taskbar. No apps. Just Chrome." color={C.red} w={340} />
        <Arrow />
        <Box label="3. Extension Shows Login" sub="user@org.org + password" color={C.orange} w={340} />
        <Arrow label="Supabase Auth validates" />
        <Box label="4. Auth Success" sub="Extension sends signal to Native Helper" color={C.green} w={340} />
        <Arrow label="native messaging" />
        <Box label="5. Helper Launches Explorer.exe" sub="Desktop, taskbar, all apps APPEAR" color={C.green} w={340} />
        <Arrow />
        <div style={{ display: "flex", gap: 10 }}>
          <Box label="6a. Full Desktop" sub="Word, Excel, Files — all work" color={C.blue} />
          <Box label="6b. Chrome Filtered" sub="URLs + .exe still controlled" color={C.purple} />
          <Box label="6c. Session Tracked" sub="Duration → Supabase" color={C.cyan} />
        </div>
      </div>
    </div>

    {/* Architecture */}
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>System Architecture</div>
      <div style={{ fontFamily: "monospace", fontSize: 11, background: C.bg, padding: 16, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.7, color: C.dim }}>
{`Windows (Shell = Chrome, NOT Explorer)
  │
  │ No desktop, no taskbar, no apps visible
  │
  ▼
┌──────────────────────────────────────────────┐
│  Chrome (Fullscreen) + Forced Extension       │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  Auth Gate (same as Option A)           │  │
│  │  URL Filter (same as Option A)          │  │
│  │  Download Blocker (same as Option A)    │  │
│  │  Session Tracker (same as Option A)     │  │
│  ├─────────────────────────────────────────┤  │
│  │  🔑 NEW: Native Messaging Bridge        │  │
│  │  On auth success:                       │  │
│  │    → Sends "unlock" to Native Helper    │  │
│  │  On logout/idle:                        │  │
│  │    → Sends "lock" to Native Helper      │  │
│  └─────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐  ┌─────────────────────────┐
│ Native Helper  │  │      Supabase            │
│ (tiny .exe)    │  │  Auth · users · urls ·    │
│                │  │  sessions · leaves ·      │
│ unlock:        │  │  download_logs ·          │
│  → explorer.exe│  │  attendance              │
│ lock:          │  └────────────┬─────────────┘
│  → kill explorer│              │
└───────────────┘  ┌─────────────▼─────────────┐
                   │   Admin Dashboard (Vercel)  │
                   │   User mgmt · URL rules ·   │
                   │   Live sessions · Remote     │
                   │   logout · Leave approval    │
                   └─────────────────────────────┘`}
      </div>
    </div>

    {/* Lock / Unlock Cycle */}
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Lock / Unlock Lifecycle</div>
      <div style={{ fontFamily: "monospace", fontSize: 11, background: C.bg, padding: 16, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.7, color: C.dim }}>
{`BOOT ──→ Chrome only (LOCKED)
              │
              ▼
         User logs in
              │
              ▼
     Extension → "unlock" → Helper → explorer.exe
              │
              ▼
         FULL DESKTOP (UNLOCKED)
         Chrome still filtering URLs + blocking .exe
              │
              ├── Idle 30 min?
              ├── User closes Chrome?
              ├── Admin remote logout?
              │
              ▼
     Extension → "lock" → Helper → kills explorer.exe
              │
              ▼
         Chrome only (LOCKED again)
         Must re-authenticate`}
      </div>
    </div>

    {/* What's controlled */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card title="Before Auth — EVERYTHING Blocked" icon="🔒" color={C.red}>
        <Check yes={true}>No desktop</Check>
        <Check yes={true}>No taskbar</Check>
        <Check yes={true}>No File Explorer</Check>
        <Check yes={true}>No apps (Word, Excel, nothing)</Check>
        <Check yes={true}>No browsing</Check>
        <Check yes={true}>No Alt+Tab (nothing to switch to)</Check>
        <Check yes={true}>Task Manager disabled</Check>
      </Card>
      <Card title="After Auth — Everything Unlocked" icon="🔓" color={C.green}>
        <Check yes={true}>Full desktop + taskbar</Check>
        <Check yes={true}>All apps (Word, Excel, etc.)</Check>
        <Check yes={true}>File Explorer</Check>
        <Check yes={true}>Browsing (allowed URLs only)</Check>
        <Check yes={false}>.exe downloads (still blocked)</Check>
        <Check yes={false}>Non-allowed URLs (still blocked)</Check>
      </Card>
    </div>

    {/* Two Account Strategy */}
    <Card title="Two-Account Strategy" icon="👥" color={C.purple}>
      <div style={{ overflowX: "auto", marginTop: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><Row cells={["Account", "Password", "Shell", "Purpose"]} header /></thead>
          <tbody>
            <Row cells={[
              <span style={{ fontWeight: 700, color: C.orange }}>Admin</span>,
              "Only IT team knows",
              "Explorer.exe (normal desktop)",
              "Maintenance, debugging, updates"
            ]} />
            <Row cells={[
              <span style={{ fontWeight: 700, color: C.blue }}>Worker</span>,
              "Shared or auto-login",
              "Chrome.exe (locked shell)",
              "Daily use by employees"
            ]} />
          </tbody>
        </table>
      </div>
    </Card>

    {/* Setup */}
    <Card title="Setup Per Laptop" icon="⚙️" color={C.blue}>
      <div style={{ fontFamily: "monospace", fontSize: 11, background: C.bg, padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 6 }}>
{`# deploy-option-b.ps1 — run once per laptop

# 1. Set Worker account shell to Chrome (not Explorer)
$sid = (Get-WmiObject Win32_UserAccount \\
  -Filter "Name='Worker'").SID
$path = "Registry::HKEY_USERS\\$sid\\SOFTWARE\\Microsoft" +
        "\\Windows NT\\CurrentVersion\\Winlogon"
New-Item -Path $path -Force
Set-ItemProperty -Path $path -Name "Shell" -Value \\
  '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --start-fullscreen'

# 2. Force-install extension
$ext = "HKLM:\\SOFTWARE\\Policies\\Google\\Chrome\\ExtensionInstallForcelist"
New-Item -Path $ext -Force
Set-ItemProperty -Path $ext -Name "1" \\
  -Value "EXTENSION_ID;https://your-update-url"

# 3. Install Native Messaging Helper
$dir = "C:\\OrgDeviceManager"
New-Item -Path $dir -ItemType Directory -Force
# Copy helper.bat + manifest.json to $dir

$nmh = "HKLM:\\SOFTWARE\\Google\\Chrome" +
       "\\NativeMessagingHosts\\com.org.unlock"
New-Item -Path $nmh -Force
Set-ItemProperty -Path $nmh -Name "(Default)" \\
  -Value "C:\\OrgDeviceManager\\manifest.json"

# 4. Disable Task Manager for Worker
Set-ItemProperty -Path \\
  "HKLM:\\SOFTWARE\\...\\Policies\\System" \\
  -Name "DisableTaskMgr" -Value 1

# 5. Disable CMD / Run dialog
Set-ItemProperty -Path \\
  "HKLM:\\SOFTWARE\\Policies\\...\\System" \\
  -Name "DisableCMD" -Value 1

# 6. Block other browsers
# (same as Option A)`}
      </div>
    </Card>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
      <Card title="Components" icon="📦" color={C.blue}>
        <strong style={{ color: C.text }}>Chrome Extension</strong> (Manifest V3)<br />
        <strong style={{ color: C.text }}>Native Helper</strong> (10 lines, .bat)<br />
        <strong style={{ color: C.text }}>Supabase</strong> (Auth + DB + Realtime)<br />
        <strong style={{ color: C.text }}>PowerShell script</strong> (one-time)<br />
        <strong style={{ color: C.text }}>Admin Dashboard</strong> (Next.js/Vercel)
      </Card>
      <Card title="Build Time" icon="⏱️" color={C.green}>
        Extension: 4-5 days<br />
        Native Helper: half day<br />
        Supabase schema: 1 day<br />
        Setup script: 1 day<br />
        Dashboard: 1-2 weeks<br />
        <strong style={{ color: C.text }}>Total: ~3 weeks</strong>
      </Card>
      <Card title="Monthly Cost" icon="💰" color={C.orange}>
        Supabase Pro: $25/mo<br />
        Vercel Pro: $20/mo<br />
        Per-user fees: $0<br />
        Directory service: $0<br />
        <strong style={{ color: C.text }}>Total: ~$45/mo</strong>
      </Card>
    </div>
  </div>;
}

// ─── COMPARISON ───

function Comparison() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>Side-by-Side Comparison</h2>

    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><Row cells={["", "🌐 Option A: Browser Gate", "🛡️ Option B: Full Desktop Gate"]} header /></thead>
          <tbody>
            <Row cells={[<strong style={{ color: C.text }}>What's locked</strong>, "Only Chrome browsing", "Entire desktop + all apps"]} />
            <Row cells={[<strong style={{ color: C.text }}>Before login</strong>, "Desktop works, Chrome blocked", "Nothing works, only Chrome login screen"]} />
            <Row cells={[<strong style={{ color: C.text }}>After login</strong>, "Chrome unlocked (filtered)", "Desktop + apps + Chrome (filtered)"]} />
            <Row cells={[<strong style={{ color: C.text }}>URL filtering</strong>, <Badge color="green">Yes</Badge>, <Badge color="green">Yes</Badge>]} />
            <Row cells={[<strong style={{ color: C.text }}>.exe download block</strong>, <Badge color="green">Yes</Badge>, <Badge color="green">Yes</Badge>]} />
            <Row cells={[<strong style={{ color: C.text }}>Session tracking</strong>, <Badge color="green">Yes</Badge>, <Badge color="green">Yes</Badge>]} />
            <Row cells={[<strong style={{ color: C.text }}>Leave/attendance</strong>, <Badge color="green">Yes</Badge>, <Badge color="green">Yes</Badge>]} />
            <Row cells={[<strong style={{ color: C.text }}>Windows accounts</strong>, "1 (normal)", "2 (Admin + Worker)"]} />
            <Row cells={[<strong style={{ color: C.text }}>Native helper needed</strong>, <Badge color="green">No</Badge>, <Badge color="orange">Yes (10 lines)</Badge>]} />
            <Row cells={[<strong style={{ color: C.text }}>Can bypass via apps</strong>, <Badge color="orange">Yes (apps still open)</Badge>, <Badge color="green">No (nothing accessible)</Badge>]} />
            <Row cells={[<strong style={{ color: C.text }}>Setup complexity</strong>, <Badge color="green">Easy</Badge>, <Badge color="orange">Moderate</Badge>]} />
            <Row cells={[<strong style={{ color: C.text }}>User experience</strong>, "Normal — just Chrome gated", "Feels locked → then normal"]} />
            <Row cells={[<strong style={{ color: C.text }}>Build time</strong>, "~2.5 weeks", "~3 weeks"]} />
            <Row cells={[<strong style={{ color: C.text }}>Monthly cost</strong>, "~$45/mo", "~$45/mo"]} />
            <Row cells={[<strong style={{ color: C.text }}>Risk of workaround</strong>, <Badge color="orange">Medium</Badge>, <Badge color="green">Low</Badge>]} />
          </tbody>
        </table>
      </div>
    </div>

    {/* Recommendation */}
    <div style={{ background: C.greenDim + "40", border: `1.5px solid ${C.green}40`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.green }}>Recommendation</h3>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.8, color: C.dim }}>
        <strong style={{ color: C.text }}>Start with Option A</strong> (browser-only gate). It's simpler to build, deploy, and maintain across 7000 laptops. Users get a normal desktop experience. Chrome is the only thing gated. If later you find users are bypassing controls by using apps to access unauthorized content, <strong style={{ color: C.text }}>upgrade to Option B</strong> — the extension code is identical, you just add the native helper and change the Windows shell. The migration takes 1-2 days.
      </div>
    </div>

    {/* Shared Schema */}
    <Card title="Shared Supabase Schema (Both Options)" icon="🗄️" color={C.cyan}>
      <div style={{ fontFamily: "monospace", fontSize: 11, background: C.bg, padding: 14, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 6 }}>
{`-- Both options use the EXACT same database

users           (id, email, name, department, role, is_active)
allowed_urls    (id, user_id, department, url_pattern)
sessions        (id, user_id, device_id, login_at, logout_at,
                 last_heartbeat, duration_minutes)
devices         (id, user_id, hostname, os, browser, last_seen)
leave_requests  (id, user_id, type, start_date, end_date,
                 reason, status, approved_by)
attendance      (id, user_id, date, check_in, check_out,
                 total_hours, source)
download_logs   (id, user_id, filename, url, blocked_at, reason)
audit_logs      (id, actor_id, action, resource, detail, created_at)`}
      </div>
    </Card>
  </div>;
}

// ─── MAIN ───

const TABS = [
  { key: "a", label: "Option A: Browser Gate", icon: "🌐" },
  { key: "b", label: "Option B: Full Desktop Gate", icon: "🛡️" },
  { key: "compare", label: "Comparison", icon: "⚖️" },
];

export default function App() {
  const [tab, setTab] = useState("a");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ padding: "24px 28px 0", borderBottom: `1px solid ${C.border}`, background: `linear-gradient(180deg, ${C.surfaceAlt} 0%, ${C.bg} 100%)` }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>
          Device Management HLD — Two Approaches
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>
          7000 Windows Laptops · Supabase · Chrome Extension · Next.js Dashboard on Vercel
        </p>
        <div style={{ display: "flex", gap: 2, marginTop: 20 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "10px 18px", background: tab === t.key ? C.surface : "transparent",
              border: tab === t.key ? `1px solid ${C.border}` : "1px solid transparent",
              borderBottom: tab === t.key ? `1px solid ${C.surface}` : "1px solid transparent",
              borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 12.5,
              fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? C.text : C.muted,
              whiteSpace: "nowrap", marginBottom: -1,
            }}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: 28 }}>
        {tab === "a" && <OptionA />}
        {tab === "b" && <OptionB />}
        {tab === "compare" && <Comparison />}
      </div>

      <div style={{ textAlign: "center", padding: "28px", borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 11 }}>
        HLD v2.0 — Supabase + Chrome Extension + Vercel · No per-user licensing · No directory service
      </div>
    </div>
  );
}
