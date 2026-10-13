/**
 * XCLOUD.NET — MikroTik RouterOS v7 Captive Portal Template Generator
 * Generates production-ready, mobile-responsive HTML/JS templates for MikroTik Hotspot
 */

import { CaptivePortalConfig, HotspotPackage } from '../../types/index.ts';

export interface TemplateOptions {
  config: CaptivePortalConfig;
  packages: HotspotPackage[];
  apiBaseUrl: string;
}

export class CaptivePortalTemplateService {
  /**
   * Generates login.html for MikroTik RouterOS v7
   */
  public static generateLoginHtml(options: TemplateOptions): string {
    const { config, packages, apiBaseUrl } = options;
    const accent = config.themeColor || '#4f46e5';

    const packagesJson = JSON.stringify(
      packages.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        durationMinutes: p.durationMinutes,
        dataLimitMb: p.dataLimitMb,
        speed: `${Math.round(p.downloadSpeedKbps / 1024)} Mbps`,
      }))
    );

    return `<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="pragma" content="no-cache">
  <meta http-equiv="expires" content="-1">
  <title>${config.ssidName} — ${config.portalTitle}</title>
  <style>
    :root {
      --primary: ${accent};
      --primary-hover: #4338ca;
      --bg: #090d16;
      --card-bg: rgba(17, 24, 39, 0.95);
      --border: rgba(255, 255, 255, 0.1);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent-green: #10b981;
      --accent-amber: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body {
      background: var(--bg);
      background-image: radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.18), transparent 60%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .container {
      width: 100%;
      max-width: 440px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      backdrop-filter: blur(16px);
    }
    .header {
      padding: 24px 20px 16px;
      text-align: center;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
    }
    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: rgba(79, 70, 229, 0.2);
      border: 1px solid rgba(79, 70, 229, 0.4);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #a5b4fc;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    .title { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.5px; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: var(--text-muted); }
    .tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid var(--border);
      padding: 4px;
      gap: 4px;
    }
    .tab-btn {
      flex: 1;
      padding: 10px 4px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .content-area { padding: 20px; }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }
    .form-group { margin-bottom: 16px; }
    .label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 6px; }
    .input-field {
      width: 100%;
      background: #030712;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 15px;
      color: #fff;
      outline: none;
      transition: border-color 0.2s;
    }
    .input-field:focus { border-color: var(--primary); }
    .voucher-input {
      text-align: center;
      letter-spacing: 2px;
      font-family: monospace;
      font-weight: 700;
      font-size: 17px;
      text-transform: uppercase;
    }
    .btn {
      width: 100%;
      padding: 14px;
      background: var(--primary);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s;
      box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
    }
    .btn:active { transform: scale(0.98); }
    .btn-emerald { background: var(--accent-green); box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4); }
    .package-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      max-height: 280px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .package-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.2s;
    }
    .package-card:hover {
      border-color: var(--primary);
      background: rgba(79, 70, 229, 0.1);
    }
    .package-title { font-size: 13px; font-weight: 700; color: #fff; }
    .package-desc { font-size: 11px; color: var(--text-muted); }
    .package-price { font-size: 14px; font-weight: 800; color: #38bdf8; }
    .error-box {
      margin-bottom: 16px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      font-size: 12px;
      color: #fca5a5;
      text-align: center;
    }
    .footer {
      padding: 14px 20px;
      background: rgba(0, 0, 0, 0.3);
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
    }
    .footer a { color: #a5b4fc; text-decoration: none; }
    .help-phone { font-weight: 600; color: #fff; }
    /* Mobile Modal for Online Payment */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      z-index: 100;
      padding: 16px;
      align-items: center;
      justify-content: center;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: #111827;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 20px;
      width: 100%;
      max-width: 380px;
    }
  </style>
  <script src="md5.js"></script>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-badge">
        <span>⚡</span> ${config.ssidName}
      </div>
      <h1 class="title">${config.portalTitle}</h1>
      <p class="subtitle">${config.portalSubtitle}</p>
    </div>

    <!-- MikroTik Error Output -->
    $(if error)
    <div style="padding: 12px 20px 0;">
      <div class="error-box">
        $(error)
      </div>
    </div>
    $(endif)

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('voucher')">🎟️ Vocha</button>
      <button class="tab-btn" onclick="switchTab('packages')">💳 Nunua Mtandaoni</button>
      $(if trial == 'yes')
      <button class="tab-btn" onclick="switchTab('trial')">🎁 Bure</button>
      $(endif)
      <button class="tab-btn" onclick="switchTab('member')">👤 Mwanachama</button>
    </div>

    <div class="content-area">
      <!-- 1. VOUCHER LOGIN PANEL -->
      <div id="tab-voucher" class="tab-panel active">
        <form name="login" action="$(link-login-only)" method="post" onSubmit="return doLogin()">
          <input type="hidden" name="dst" value="$(link-orig)" />
          <input type="hidden" name="popup" value="true" />

          <div class="form-group">
            <label class="label">Namba ya Vocha (Voucher Code)</label>
            <input
              type="text"
              id="voucher_code"
              name="username"
              class="input-field voucher-input"
              placeholder="XC-XXXX-XXXX"
              required
              autocomplete="off"
              autocorrect="off"
              autocapitalize="characters"
              oninput="this.value = this.value.toUpperCase()"
            />
          </div>
          <input type="hidden" name="password" id="voucher_password" value="" />

          <button type="submit" class="btn">
            Unganisha Mtandao (Connect)
          </button>
        </form>

        <p style="text-align: center; margin-top: 14px; font-size: 11px; color: var(--text-muted);">
          Je, hauna vocha? Bonyeza kichupo cha <b>Nunua Mtandaoni</b> hapo juu.
        </p>
      </div>

      <!-- 2. PACKAGES & ONLINE BUY PANEL -->
      <div id="tab-packages" class="tab-panel">
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; text-align: center;">
          Chagua kifurushi, lipia kupitia M-Pesa, Tigo Pesa, au Airtel Money:
        </p>
        <div class="package-grid" id="packagesList">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- 3. FREE TRIAL PANEL -->
      $(if trial == 'yes')
      <div id="tab-trial" class="tab-panel">
        <div style="text-align: center; padding: 10px 0;">
          <div style="font-size: 40px; margin-bottom: 8px;">🎁</div>
          <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 4px;">Dakika ${config.freeTrialMinutes || 15} za Bure</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
            Jaribu mtandao wetu wa kasi ya juu bila malipo kwa matumizi ya kwanza.
          </p>
          <a href="$(link-login-only)?dst=$(link-orig-esc)&amp;username=T-$(mac-esc)" class="btn btn-emerald" style="display: block; text-decoration: none;">
            Anza Majaribio ya Bure Sasa
          </a>
        </div>
      </div>
      $(endif)

      <!-- 4. MEMBER / USERNAME & PASSWORD PANEL -->
      <div id="tab-member" class="tab-panel">
        <form name="member_login" action="$(link-login-only)" method="post" onSubmit="return doMemberLogin()">
          <input type="hidden" name="dst" value="$(link-orig)" />
          <input type="hidden" name="popup" value="true" />

          <div class="form-group">
            <label class="label">Jina la Mtumiaji (Username)</label>
            <input type="text" id="member_user" name="username" class="input-field" placeholder="username" required />
          </div>

          <div class="form-group">
            <label class="label">Nenosiri (Password)</label>
            <input type="password" id="member_pass" name="password" class="input-field" placeholder="••••••••" required />
          </div>

          <button type="submit" class="btn">
            Ingia Kama Mwanachama
          </button>
        </form>
      </div>
    </div>

    <div class="footer">
      Msaada & Huduma kwa Wateja: <a href="tel:${config.supportPhone}" class="help-phone">${config.supportPhone}</a><br>
      Mtandao unalindwa na <b>XCLOUD.NET ISP Hotspot</b>
    </div>
  </div>

  <!-- Mobile Money Purchase Modal -->
  <div id="buyModal" class="modal">
    <div class="modal-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 id="modalPkgName" style="color: #fff; font-size: 16px; font-weight: 700;">Nunua Kifurushi</h3>
        <button onclick="closeModal()" style="background: none; border: none; color: #9ca3af; font-size: 20px; cursor: pointer;">&times;</button>
      </div>
      <p id="modalPkgPrice" style="color: #38bdf8; font-weight: 800; font-size: 18px; margin-bottom: 12px;">TSh 0</p>

      <div class="form-group">
        <label class="label">Namba ya Simu (M-Pesa / Tigo / Airtel)</label>
        <input type="tel" id="clientPhone" class="input-field" placeholder="07XXXXXXXX au 06XXXXXXXX" />
      </div>

      <div class="form-group">
        <label class="label">Mtandao wa Malipo</label>
        <select id="paymentProvider" class="input-field">
          <option value="MPESA">Vodacom M-Pesa</option>
          <option value="TIGO_PESA">Tigo Pesa</option>
          <option value="AIRTEL_MONEY">Airtel Money</option>
          <option value="HALOPESA">HaloPesa</option>
        </select>
      </div>

      <button id="payBtn" onclick="initiatePayment()" class="btn btn-emerald">
        Lipia Sasa (Leta Ombi la Malipo)
      </button>
      <div id="paymentStatus" style="display: none; margin-top: 12px; font-size: 12px; text-align: center; color: #a5b4fc;"></div>
    </div>
  </div>

  <script>
    var packages = ${packagesJson};
    var selectedPackage = null;
    var apiBase = "${apiBaseUrl}";
    var orgId = "${config.organizationId}";

    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
      var target = document.getElementById('tab-' + tab);
      if (target) {
        target.classList.add('active');
        event.target.classList.add('active');
      }
    }

    function renderPackages() {
      var container = document.getElementById('packagesList');
      if (!packages || packages.length === 0) {
        container.innerHTML = '<p style="color: #9ca3af; text-align: center; font-size: 12px;">Hakuna vifurushi vilivyowekwa kwa sasa.</p>';
        return;
      }
      var html = '';
      packages.forEach(function(pkg) {
        html += '<div class="package-card" onclick="openBuyModal(\\'' + pkg.id + '\\')">';
        html += '  <div>';
        html += '    <div class="package-title">' + pkg.name + '</div>';
        html += '    <div class="package-desc">' + pkg.speed + (pkg.dataLimitMb > 0 ? ' • ' + (pkg.dataLimitMb/1024).toFixed(1) + 'GB' : ' • Unlimited Data') + '</div>';
        html += '  </div>';
        html += '  <div class="package-price">TSh ' + Number(pkg.price).toLocaleString() + '</div>';
        html += '</div>';
      });
      container.innerHTML = html;
    }

    function openBuyModal(pkgId) {
      selectedPackage = packages.find(function(p) { return p.id === pkgId; });
      if (!selectedPackage) return;
      document.getElementById('modalPkgName').innerText = selectedPackage.name;
      document.getElementById('modalPkgPrice').innerText = 'TSh ' + Number(selectedPackage.price).toLocaleString();
      document.getElementById('buyModal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('buyModal').classList.remove('active');
    }

    function initiatePayment() {
      var phone = document.getElementById('clientPhone').value.trim();
      var provider = document.getElementById('paymentProvider').value;
      if (!phone || phone.length < 10) {
        alert('Tafadhali weka namba sahihi ya simu ya Tanzania (mfano: 0754123456)');
        return;
      }
      var btn = document.getElementById('payBtn');
      var statusDiv = document.getElementById('paymentStatus');
      btn.disabled = true;
      btn.innerText = 'Inatuma ombi la malipo...';
      statusDiv.style.display = 'block';
      statusDiv.innerText = 'Tafadhali thibitisha kwenye simu yako kwa kuweka PIN...';

      fetch(apiBase + '/api/v1/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          packageId: selectedPackage.id,
          amount: selectedPackage.price,
          customerPhone: phone,
          paymentMethod: provider,
          paymentType: 'HOTSPOT_PACKAGE'
        })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.error) {
          statusDiv.innerText = 'Hitilafu: ' + data.error;
          btn.disabled = false;
          btn.innerText = 'Jaribu Tena';
        } else {
          statusDiv.innerHTML = 'Ombi limetumwa! Ukimaliza kulipa, vocha yako itatolewa hapa mara moja.';
        }
      })
      .catch(function(err) {
        statusDiv.innerText = 'Hitilafu ya mtandao: ' + err.message;
        btn.disabled = false;
        btn.innerText = 'Jaribu Tena';
      });
    }

    // MikroTik CHAP login calculation
    function doLogin() {
      var code = document.getElementById('voucher_code').value.trim().toUpperCase();
      document.getElementById('voucher_code').value = code;
      // In MikroTik Hotspot, standard voucher uses username = code, password = code (or empty)
      document.getElementById('voucher_password').value = code;

      $(if chap-id)
      document.login.password.value = hexMD5('$(chap-id)' + code + '$(chap-challenge)');
      $(endif)
      return true;
    }

    function doMemberLogin() {
      var pass = document.getElementById('member_pass').value;
      $(if chap-id)
      document.member_login.password.value = hexMD5('$(chap-id)' + pass + '$(chap-challenge)');
      $(endif)
      return true;
    }

    renderPackages();
  </script>
</body>
</html>`;
  }

  /**
   * Generates status.html for MikroTik RouterOS v7
   */
  public static generateStatusHtml(options: TemplateOptions): string {
    const { config } = options;
    const accent = config.themeColor || '#4f46e5';

    return `<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="refresh" content="60">
  <title>${config.ssidName} — Hali ya Mtandao (Status)</title>
  <style>
    :root {
      --primary: ${accent};
      --bg: #090d16;
      --card: rgba(17, 24, 39, 0.95);
      --border: rgba(255, 255, 255, 0.1);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --green: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .container {
      width: 100%;
      max-width: 420px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      text-align: center;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      color: var(--green);
      margin-bottom: 16px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--green);
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }
    .title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 20px; }
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
      text-align: left;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px;
    }
    .stat-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 4px; }
    .stat-val { font-size: 14px; font-weight: 700; color: #fff; font-family: monospace; }
    .btn-logout {
      width: 100%;
      padding: 12px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      border-radius: 12px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-logout:hover { background: rgba(239, 68, 68, 0.3); color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-badge">
      <span class="pulse-dot"></span> Umeunganishwa kwenye Mtandao
    </div>
    <h1 class="title">${config.ssidName}</h1>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Muda Uliotumika</div>
        <div class="stat-val">$(uptime)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Muda Uliobaki</div>
        <div class="stat-val">$(session-time-left)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Data Iliyopakuliwa (Down)</div>
        <div class="stat-val">$(bytes-out-nice)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Data Iliyotumwa (Up)</div>
        <div class="stat-val">$(bytes-in-nice)</div>
      </div>
      <div class="stat-card" style="grid-column: span 2;">
        <div class="stat-label">Anwani ya IP / MAC</div>
        <div class="stat-val">$(ip) • $(mac)</div>
      </div>
    </div>

    <form action="$(link-logout)" name="logout" method="post">
      <button type="submit" class="btn-logout">
        Ondoka Kwenye Mtandao (Log Out)
      </button>
    </form>
  </div>
</body>
</html>`;
  }

  /**
   * Generates logout.html for MikroTik RouterOS v7
   */
  public static generateLogoutHtml(options: TemplateOptions): string {
    const { config } = options;
    return `<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${config.ssidName} — Umetoka kwenye Mtandao</title>
  <style>
    body {
      background: #090d16;
      color: #f3f4f6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 16px;
    }
    .card {
      background: rgba(17, 24, 39, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 32px 24px;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    h2 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    p { font-size: 13px; color: #9ca3af; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px;
      background: ${config.themeColor || '#4f46e5'};
      color: #fff;
      font-weight: 700;
      text-decoration: none;
      border-radius: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 40px; margin-bottom: 12px;">👋</div>
    <h2>Umetoka kwenye Mtandao</h2>
    <p>Kipindi chako kimefungwa kwa usalama. Unaweza kuunganisha tena muda wowote.</p>
    <a href="$(link-login)" class="btn">Ingia Tena Mtandaoni</a>
  </div>
</body>
</html>`;
  }

  /**
   * Generates alogin.html for MikroTik RouterOS v7
   */
  public static generateAloginHtml(options: TemplateOptions): string {
    const { config } = options;
    return `<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="2; url=$(link-redirect)">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.ssidName} — Umeunganishwa</title>
  <style>
    body {
      background: #090d16;
      color: #fff;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: ${config.themeColor || '#4f46e5'};
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2 style="font-size: 18px; font-weight: 700;">Umefanikiwa Kuunganishwa!</h2>
  <p style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Inakuelekeza kwenye mtandao...</p>
  <script>
    setTimeout(function() {
      location.href = '$(link-redirect)';
    }, 1500);
  </script>
</body>
</html>`;
  }

  /**
   * Official RFC-1321 compliant MD5 JavaScript library for MikroTik CHAP
   */
  public static getMd5Js(): string {
    return `/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 */
var hexcase = 0;
var b64pad  = "";
var chrsz   = 8;

function hexMD5(s){ return binl2hex(core_md5(str2binl(s), s.length * chrsz)); }
function b64MD5(s){ return binl2b64(core_md5(str2binl(s), s.length * chrsz)); }
function strMD5(s){ return binl2str(core_md5(str2binl(s), s.length * chrsz)); }
function hex_hmac_md5(key, data) { return binl2hex(core_hmac_md5(key, data)); }
function b64_hmac_md5(key, data) { return binl2b64(core_hmac_md5(key, data)); }
function str_hmac_md5(key, data) { return binl2str(core_hmac_md5(key, data)); }

function core_md5(x, len) {
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16) {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);
}

function md5_cmn(q, a, b, x, s, t) {
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t) {
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t) {
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t) {
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t) {
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function safe_add(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

function bit_rol(num, cnt) {
  return (num << cnt) | (num >>> (32 - cnt));
}

function str2binl(str) {
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (i%32);
  return bin;
}

function binl2hex(binarray) {
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++) {
    str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
  }
  return str;
}
`;
  }

  /**
   * Generates errors.txt for MikroTik RouterOS Hotspot
   */
  public static getErrorsTxt(): string {
    return `# MikroTik RouterOS v7 Hotspot Error Messages (Bilingual: Swahili & English)
internal-error = Hitilafu ya mfumo imetokea. Tafadhali jaribu tena. (Internal error occurred.)
config-error = Hitilafu ya mipangilio ya mtandao. (Configuration error.)
not-logged-in = Hauruhusiwi kuingia mtandaoni kwa sasa. (You are not logged in.)
already-logged-in = Vocha au akaunti hii inatumika kwenye kifaa kingine. (Already logged in on another device.)
ip-not-found = Anwani yako ya IP haijatambuliwa. (IP address not found.)
cannot-logout = Imeshindikana kutoka kwenye mtandao. (Cannot log out.)
login-in-progress = Ombi lako la kuingia linashughulikiwa. (Login in progress.)
radius-timeout = Seva ya uthibitisho haipatikani. Tafadhali subiri kidogo. (Authentication server timed out.)
invalid-username = Namba ya vocha si sahihi au imemalizika. (Invalid voucher code or credentials.)
invalid-password = Nenosiri si sahihi. (Invalid password.)
uptime-limit = Muda wa vocha yako umekwisha. (Time limit reached. Please recharge.)
traffic-limit = Kiasi cha data kimeisha. (Data limit reached. Please purchase a new package.)
`;
  }
}
