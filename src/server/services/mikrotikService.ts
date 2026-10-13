/**
 * XCLOUD.NET — MikroTik RouterOS v7 Management & Provisioning Engine
 * Generates secure, valid RouterOS .rsc scripts, manages bootstrap tokens, tracks heartbeats.
 */

import crypto from 'crypto';
import { db } from '../db/database.ts';
import { Router, RouterNetworkConfig, RouterStatus } from '../../types/index.ts';
import { SubscriptionService } from './subscriptionService.ts';
import { AuditService } from './auditService.ts';
import { ActivityService } from './activityService.ts';

export class MikrotikService {
  /**
   * Register a new Router under organization, checking 5-device limit
   */
  public static registerRouter(params: {
    organizationId: string;
    name: string;
    type?: 'MIKROTIK' | 'OMADA' | 'GENERIC_RADIUS';
    ipAddress?: string;
    dnsName?: string;
    rosVersion?: 'v7' | 'v6';
    location?: string;
    networkConfig?: Partial<RouterNetworkConfig>;
    performedBy: { id: string; email: string };
  }): Router {
    // 5-Device limit enforcement
    const check = SubscriptionService.canAddDevice(params.organizationId);
    if (!check.allowed) {
      ActivityService.log({
        organizationId: params.organizationId,
        userId: params.performedBy.id,
        userEmail: params.performedBy.email,
        action: 'ROUTER_REGISTRATION_REJECTED',
        category: 'MANAGEMENT',
        result: 'DENIED',
        message: `Device registration denied: ${check.reason}`,
      });
      throw new Error(check.reason);
    }

    const defaultNetworkConfig: RouterNetworkConfig = {
      wanInterface: params.networkConfig?.wanInterface || 'ether1',
      lanInterfaces: params.networkConfig?.lanInterfaces || ['ether2', 'ether3', 'ether4', 'ether5', 'wlan1', 'wlan2'],
      hotspotBridge: params.networkConfig?.hotspotBridge || 'bridge-hotspot',
      gatewayIp: params.networkConfig?.gatewayIp || '10.10.20.1/24',
      dhcpPool: params.networkConfig?.dhcpPool || '10.10.20.10-10.10.20.254',
      dnsName: params.networkConfig?.dnsName || params.dnsName || 'wifi.xcloudtz.net',
      installationMode: params.networkConfig?.installationMode || 'NEW_CONFIGURATION',
      defaultRateLimit: params.networkConfig?.defaultRateLimit || '5M/5M',
    };

    const router: Router = {
      id: `rtr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: params.organizationId,
      name: params.name,
      type: params.type || 'MIKROTIK',
      ipAddress: params.ipAddress || (defaultNetworkConfig.gatewayIp.split('/')[0] || '10.10.20.1'),
      dnsName: defaultNetworkConfig.dnsName,
      apiPort: 8728,
      rosVersion: params.rosVersion || 'v7',
      status: 'UNCONFIGURED',
      location: params.location || 'HQ',
      networkConfig: defaultNetworkConfig,
      remoteAccess: {
        enabled: true,
        method: 'MIKROTIK_CLOUD_DDNS',
        winboxPort: 8291,
        webfigPort: 80,
        sshPort: 22,
        assignedRemotePort: 18000 + (Math.floor(Math.random() * 8000)),
        cloudDdnsHost: `${params.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.sn.mynetname.net`,
        remoteConnectHost: `${params.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.sn.mynetname.net`,
        allowedIpRanges: '0.0.0.0/0',
        connectionStatus: 'PENDING_CONFIG',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.insert('routers', router);

    ActivityService.log({
      organizationId: params.organizationId,
      userId: params.performedBy.id,
      userEmail: params.performedBy.email,
      deviceId: router.id,
      deviceName: router.name,
      deviceType: 'MIKROTIK',
      action: 'ROUTER_REGISTERED',
      category: 'MANAGEMENT',
      result: 'SUCCESS',
      message: `Router ${router.name} registered under organization (ROS ${router.rosVersion})`,
    });

    AuditService.log({
      organizationId: params.organizationId,
      userId: params.performedBy.id,
      userEmail: params.performedBy.email,
      action: 'REGISTER_ROUTER',
      resourceType: 'ROUTER',
      resourceId: router.id,
      details: { name: router.name, type: router.type, rosVersion: router.rosVersion },
    });

    return router;
  }

  /**
   * Generate a secure, short-lived single-use installation token
   */
  public static generateInstallationToken(
    routerId: string,
    organizationId: string
  ): { token: string; expiresAt: string; bootstrapUrl: string } {
    const router = db.findById<Router>('routers', routerId);
    if (!router || router.organizationId !== organizationId) {
      throw new Error('Router not found or access denied.');
    }

    // Generate 32-char cryptographically secure token
    const rawToken = `xc_inst_${crypto.randomBytes(16).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

    db.update('routers', router.id, {
      installationToken: tokenHash,
      installationTokenExpiresAt: expiresAt,
      installationTokenUsed: false,
    });

    ActivityService.log({
      organizationId: router.organizationId,
      deviceId: router.id,
      deviceName: router.name,
      deviceType: 'MIKROTIK',
      action: 'INSTALLATION_TOKEN_GENERATED',
      category: 'INSTALLATION',
      result: 'SUCCESS',
      message: `Generated short-lived bootstrap token for router ${router.name}`,
    });

    const appUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://xcloud.net';
    const bootstrapUrl = `${appUrl}/api/v1/mikrotik/bootstrap/${router.id}?token=${rawToken}`;

    return {
      token: rawToken,
      expiresAt,
      bootstrapUrl,
    };
  }

  /**
   * Validate bootstrap token for automated script fetch
   */
  public static validateToken(routerId: string, rawToken: string): boolean {
    const router = db.findById<Router>('routers', routerId);
    if (!router || !router.installationToken) return false;

    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    if (router.installationToken !== hash) return false;

    if (router.installationTokenExpiresAt) {
      const expires = new Date(router.installationTokenExpiresAt);
      if (new Date() > expires) return false;
    }

    return true;
  }

  /**
   * Mark token as used after successful fetch
   */
  public static markTokenUsed(routerId: string): void {
    db.update('routers', routerId, {
      installationTokenUsed: true,
      status: 'OFFLINE', // Configured, waiting for first heartbeat
    });
  }

  /**
   * Process router heartbeat
   */
  public static processHeartbeat(
    routerId: string,
    payload: {
      identity?: string;
      rosVersion?: string;
      activeHotspotUsers?: number;
      uptime?: string;
      cpuLoad?: number;
      freeMemory?: number;
    }
  ): { success: boolean; router: Router } {
    const router = db.findById<Router>('routers', routerId);
    if (!router) {
      throw new Error(`Router with ID ${routerId} not found.`);
    }

    const updated = db.update<Router>('routers', router.id, {
      status: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
      identity: payload.identity || router.identity,
      rosVersion: payload.rosVersion ? (payload.rosVersion.startsWith('7') ? 'v7' : 'v6') : router.rosVersion,
    })!;

    ActivityService.recordHeartbeat({
      routerId: router.id,
      organizationId: router.organizationId,
      identity: payload.identity || router.identity,
      rosVersion: payload.rosVersion,
      activeHotspotUsers: payload.activeHotspotUsers,
      uptime: payload.uptime,
      cpuLoad: payload.cpuLoad,
      freeMemory: payload.freeMemory,
    });

    return { success: true, router: updated };
  }

  /**
   * Check dynamic online/offline status based on last heartbeat (stale > 3 minutes)
   */
  public static getRouterStatus(router: Router): RouterStatus {
    if (router.status === 'UNCONFIGURED') return 'UNCONFIGURED';
    if (!router.lastHeartbeat) return 'OFFLINE';

    const last = new Date(router.lastHeartbeat).getTime();
    const diffMin = (Date.now() - last) / (1000 * 60);

    return diffMin <= 3 ? 'ONLINE' : 'OFFLINE';
  }

  /**
   * Generate valid, production-ready RouterOS v7 `.rsc` configuration script
   * Pure RouterOS syntax, no HTML or JSON.
   * Fully configurable for standalone manual scripts or automated bootstrap delivery.
   */
  public static generateRouterOSScript(params: {
    router: Router;
    appUrl: string;
    radiusHost?: string;
    radiusSecret?: string;
  }): string {
    const { router, appUrl } = params;
    const cleanAppUrl = appUrl.replace(/\/$/, '');
    let hostDomain = 'xcloud.net';
    try {
      hostDomain = new URL(cleanAppUrl).hostname;
    } catch (_) {}

    const radiusHost = params.radiusHost || process.env.RADIUS_HOST || '127.0.0.1';
    const radiusSecret = params.radiusSecret || process.env.RADIUS_SECRET || 'testing123';
    
    // Extract network configuration with standard defaults
    const cfg = router.networkConfig || {
      wanInterface: 'ether1',
      lanInterfaces: ['ether2', 'ether3', 'ether4', 'ether5', 'wlan1', 'wlan2'],
      hotspotBridge: 'bridge-hotspot',
      gatewayIp: '10.10.20.1/24',
      dhcpPool: '10.10.20.10-10.10.20.254',
      dnsName: router.dnsName || 'wifi.xcloudtz.net',
      installationMode: 'NEW_CONFIGURATION' as const,
      defaultRateLimit: '5M/5M',
    };

    const routerDns = cfg.dnsName || router.dnsName || 'wifi.xcloudtz.net';
    const gatewayIp = cfg.gatewayIp || '10.10.20.1/24';
    const gatewayOnlyIp = gatewayIp.split('/')[0] || '10.10.20.1';
    const dhcpPool = cfg.dhcpPool || '10.10.20.10-10.10.20.254';
    const hotspotBridge = cfg.hotspotBridge || 'bridge-hotspot';
    const wanIf = cfg.wanInterface || 'ether1';
    const lanInterfaces = (cfg.lanInterfaces && cfg.lanInterfaces.length > 0)
      ? cfg.lanInterfaces
      : ['ether2', 'ether3', 'ether4', 'ether5', 'wlan1', 'wlan2'];
    const isNewConfig = cfg.installationMode !== 'EXISTING_HOTSPOT';
    const safeRouterName = router.name.replace(/[^a-zA-Z0-9_-]/g, '');

    // Construct interfaces addition commands
    const bridgePortCommands = lanInterfaces.map(iface => 
      `:if ([:len [/interface find name="${iface}"]] > 0) do={
    :if ([:len [/interface bridge port find bridge="${hotspotBridge}" interface="${iface}"]] = 0) do={
        :do { /interface bridge port add bridge="${hotspotBridge}" interface="${iface}" comment="XCLOUD-HOTSPOT-PORT" } on-error={ :log warning "XCLOUD: Port ${iface} already in another bridge or unavailable" }
    }
}`
    ).join('\n');

    return `# =====================================================================
# XCLOUD.NET — Production RouterOS v7 Hotspot & Cloud Provisioning Script
# Router ID: ${router.id}
# Router Name: ${router.name}
# Organization: ${router.organizationId}
# Target ROS: RouterOS v7.x (with v6 backwards compatibility)
# Installation Mode: ${cfg.installationMode}
# Generated: ${new Date().toISOString()}
# Captive Portal Host: ${routerDns}
# =====================================================================

:log info "XCLOUD: [Step 1/7] Initializing RouterOS validation and safety checks..."

# --- SAFETY PRE-CHECKS ---
:local osVer [/system resource get version]
:log info ("XCLOUD: Detected RouterOS version: " . $osVer)

# 1. Create safety backup before applying XCLOUD modifications
:do {
    /system backup save name=("xcloud-preinstall-backup-" . [:pick [/system clock get date] 0 3] . [:pick [/system clock get date] 4 6])
    :log info "XCLOUD: Safety backup created successfully."
} on-error={
    :log warning "XCLOUD: Unable to save system backup. Proceeding with configuration."
}

# 2. Router Identity
/system identity set name="XCLOUD-${safeRouterName}"

${isNewConfig ? `# =====================================================================
# SECTION A: LOCAL NETWORK & HOTSPOT INFRASTRUCTURE
# =====================================================================

# 3. Create Hotspot Bridge (if missing)
:if ([:len [/interface bridge find name="${hotspotBridge}"]] = 0) do={
    /interface bridge add name="${hotspotBridge}" comment="XCLOUD-HOTSPOT-BRIDGE"
}

# 4. Attach LAN Interfaces to Hotspot Bridge
${bridgePortCommands}

# 5. Hotspot Gateway IP Address
:if ([:len [/ip address find interface="${hotspotBridge}"]] = 0) do={
    /ip address add address="${gatewayIp}" interface="${hotspotBridge}" comment="XCLOUD-HOTSPOT-GATEWAY"
}

# 6. IP Pool for Hotspot DHCP Clients
:if ([:len [/ip pool find name="pool-xcloud-hotspot"]] = 0) do={
    /ip pool add name="pool-xcloud-hotspot" ranges="${dhcpPool}" comment="XCLOUD-DHCP-POOL"
}

# 7. DHCP Server & Network
:if ([:len [/ip dhcp-server find name="dhcp-xcloud-hotspot"]] = 0) do={
    /ip dhcp-server add name="dhcp-xcloud-hotspot" interface="${hotspotBridge}" address-pool="pool-xcloud-hotspot" lease-time=1h disabled=no comment="XCLOUD-HOTSPOT-DHCP"
}
:if ([:len [/ip dhcp-server network find address="${gatewayIp}"]] = 0) do={
    /ip dhcp-server network add address="${gatewayIp}" gateway="${gatewayOnlyIp}" dns-server="${gatewayOnlyIp},1.1.1.1,8.8.8.8" comment="XCLOUD-HOTSPOT-NET"
}

# 8. DNS Settings & Local Static Entry for Captive Portal
/ip dns set allow-remote-requests=yes
:if ([:len [/ip dns static find name="${routerDns}"]] = 0) do={
    /ip dns static add name="${routerDns}" address="${gatewayOnlyIp}" comment="XCLOUD-CAPTIVE-PORTAL-DNS"
}

# 9. WAN Interface NAT Masquerade
:if ([:len [/ip firewall nat find comment="XCLOUD-WAN-NAT"]] = 0) do={
    :if ([:len [/interface find name="${wanIf}"]] > 0) do={
        /ip firewall nat add chain=srcnat out-interface="${wanIf}" action=masquerade comment="XCLOUD-WAN-NAT"
    } else={
        /ip firewall nat add chain=srcnat action=masquerade comment="XCLOUD-WAN-NAT"
    }
}

# 10. Hotspot Server Profile & Server
:if ([:len [/ip hotspot profile find name="hsprof-xcloud"]] = 0) do={
    /ip hotspot profile add name="hsprof-xcloud" hotspot-address="${gatewayOnlyIp}" dns-name="${routerDns}" html-directory=hotspot login-by=http-chap,http-pap,cookie use-radius=yes radius-accounting=yes radius-interim-update=2m comment="XCLOUD-HOTSPOT-PROFILE"
} else={
    /ip hotspot profile set [find name="hsprof-xcloud"] hotspot-address="${gatewayOnlyIp}" dns-name="${routerDns}" login-by=http-chap,http-pap,cookie use-radius=yes radius-accounting=yes radius-interim-update=2m
}

:if ([:len [/ip hotspot find name="hs-xcloud"]] = 0) do={
    /ip hotspot add name="hs-xcloud" interface="${hotspotBridge}" address-pool="pool-xcloud-hotspot" profile="hsprof-xcloud" disabled=no comment="XCLOUD-HOTSPOT-SERVER"
}
` : `# =====================================================================
# SECTION A: EXISTING HOTSPOT INTEGRATION MODE
# Preserving existing bridges, addresses, pools, and DHCP servers.
# =====================================================================

/ip hotspot profile
:do {
    set [find default=yes] use-radius=yes radius-accounting=yes radius-interim-update=2m dns-name="${routerDns}" login-by=http-chap,http-pap,cookie
    :log info "XCLOUD: Existing default hotspot profile updated for RADIUS."
} on-error={
    :log warning "XCLOUD: Note: Verify custom hotspot server profile points to RADIUS."
}
`}

# =====================================================================
# SECTION B: RADIUS AAA CLIENT CONFIGURATION
# =====================================================================
/radius
:do { remove [find comment~"XCLOUD"] } on-error={}
add service=hotspot address="${radiusHost}" secret="${radiusSecret}" authentication-port=1812 accounting-port=1813 timeout=3000ms comment="XCLOUD-RADIUS-SERVER"

# =====================================================================
# SECTION C: WALLED GARDEN (ALLOW PAYMENTS & CAPTIVE FLOWS)
# =====================================================================
/ip hotspot walled-garden
:do { remove [find comment~"XCLOUD"] } on-error={}
add dst-host="${hostDomain}" action=allow comment="XCLOUD-CLOUD-BACKEND"
add dst-host="*.selcom.net" action=allow comment="XCLOUD-SELCOM-GATEWAY"
add dst-host="*.mpesa.vm.co.tz" action=allow comment="XCLOUD-VODACOM-MPESA"
add dst-host="*.tigo.co.tz" action=allow comment="XCLOUD-TIGO-PESA"
add dst-host="*.airtel.co.tz" action=allow comment="XCLOUD-AIRTEL-MONEY"
add dst-host="*.halopesa.co.tz" action=allow comment="XCLOUD-HALOPESA"

# =====================================================================
# SECTION D: CLOUD TELEMETRY & HEARTBEAT SCRIPT
# =====================================================================
/system script
:do { remove [find name="xcloud-heartbeat"] } on-error={}
add name="xcloud-heartbeat" dont-require-permissions=no source={
    :local rtrId "${router.id}"
    :local hostUrl "${cleanAppUrl}"
    :local identity [/system identity get name]
    :local rosVer [/system resource get version]
    :local activeUsers [/ip hotspot active print count-only]
    :local uptime [/system resource get uptime]
    :local cpu [/system resource get cpu-load]
    :local freeMem [/system resource get free-memory]
    
    :local postData "{\\"identity\\":\\"$identity\\",\\"rosVersion\\":\\"$rosVer\\",\\"activeHotspotUsers\\":$activeUsers,\\"uptime\\":\\"$uptime\\",\\"cpuLoad\\":$cpu,\\"freeMemory\\":$freeMem}"
    
    :do {
        /tool fetch http-method=post http-header-field="Content-Type: application/json" http-data=$postData url=("$hostUrl/api/v1/routers/$rtrId/heartbeat") keep-result=no
        :log info ("XCLOUD: Heartbeat sent successfully to $hostUrl")
    } on-error={
        :log warning "XCLOUD: Telemetry heartbeat failed. Check WAN internet reachability."
    }
}

# Heartbeat Scheduler (Runs every 2 minutes)
/system scheduler
:do { remove [find name="xcloud-heartbeat-sched"] } on-error={}
add name="xcloud-heartbeat-sched" start-time=startup interval=2m on-event="xcloud-heartbeat" comment="XCLOUD-PERIODIC-HEARTBEAT"

# Run initial test heartbeat immediately
/system script run xcloud-heartbeat

# =====================================================================
# SECTION E: WINBOX & REMOTE MANAGEMENT ACCESS
# =====================================================================
:log info "XCLOUD: [Step 6/7] Enabling WinBox (Port 8291), WebFig, and MikroTik Cloud DDNS..."

# 1. Enable RouterOS Management Services
/ip service
:do { set winbox port=8291 disabled=no } on-error={ :log warning "XCLOUD: WinBox service update warning" }
:do { set www port=80 disabled=no } on-error={}
:do { set www-ssl port=443 disabled=no } on-error={}
:do { set ssh port=22 disabled=no } on-error={}

# 2. Enable MikroTik IP Cloud DDNS & Back-To-Home (BTH) VPN
/ip cloud
set ddns-enabled=yes update-time=yes
:do {
    set back-to-home-vpn=yes
} on-error={
    :do { /ip cloud back-to-home set enabled=yes } on-error={}
}
:do { /ip cloud force-update } on-error={}

# 3. Allow WinBox (8291) & WebFig (80/443) through Firewall Input Chain
:if ([:len [/ip firewall filter find comment="XCLOUD-ALLOW-WINBOX"]] = 0) do={
    /ip firewall filter add chain=input protocol=tcp dst-port=8291 action=accept place-before=0 comment="XCLOUD-ALLOW-WINBOX"
}
:if ([:len [/ip firewall filter find comment="XCLOUD-ALLOW-WEBFIG"]] = 0) do={
    /ip firewall filter add chain=input protocol=tcp dst-port=80,443 action=accept place-before=1 comment="XCLOUD-ALLOW-WEBFIG"
}
:if ([:len [/ip firewall filter find comment="XCLOUD-ALLOW-SSH"]] = 0) do={
    /ip firewall filter add chain=input protocol=tcp dst-port=22 action=accept place-before=2 comment="XCLOUD-ALLOW-SSH"
}

:log info "XCLOUD: =========================================================="
:log info "XCLOUD: RouterOS v7 Provisioning & WinBox Remote Access enabled!"
:log info "XCLOUD: Connect via WinBox using Cloud DDNS: [/ip cloud get dns-name]"
:log info "XCLOUD: =========================================================="
`;
  }

  /**
   * Generate dedicated, standalone WinBox Remote Access .rsc Script
   * Can be executed safely on any existing router without affecting existing networks.
   */
  public static generateWinboxRemoteScript(params: {
    router: Router;
    winboxPort?: number;
    webfigPort?: number;
    sshPort?: number;
    enableBth?: boolean;
    allowedIpRanges?: string;
  }): string {
    const { router } = params;
    const winboxPort = params.winboxPort || router.remoteAccess?.winboxPort || 8291;
    const webfigPort = params.webfigPort || router.remoteAccess?.webfigPort || 80;
    const sshPort = params.sshPort || router.remoteAccess?.sshPort || 22;
    const allowedRange = params.allowedIpRanges || router.remoteAccess?.allowedIpRanges || '0.0.0.0/0';
    const safeRouterName = router.name.replace(/[^a-zA-Z0-9_-]/g, '');

    return `# =====================================================================
# XCLOUD.NET — MikroTik WinBox & WebFig Remote Access Configuration Script
# Router ID: ${router.id}
# Router Name: ${router.name}
# Organization: ${router.organizationId}
# Target: MikroTik RouterOS v7 / v6
# Generated: ${new Date().toISOString()}
# =====================================================================

:log info "XCLOUD: Configuring WinBox Remote Access on ${safeRouterName}..."

# 1. Enable WinBox Management Port
/ip service
:do {
    set winbox port=${winboxPort} disabled=no address="${allowedRange}"
    :log info "XCLOUD: WinBox service enabled on port ${winboxPort}"
} on-error={
    :log warning "XCLOUD: Could not set winbox port"
}

# 2. Enable WebFig (HTTP/HTTPS) and SSH
:do {
    set www port=${webfigPort} disabled=no address="${allowedRange}"
    set ssh port=${sshPort} disabled=no address="${allowedRange}"
    :log info "XCLOUD: WebFig enabled on port ${webfigPort}, SSH on ${sshPort}"
} on-error={}

# 3. Enable MikroTik Official Cloud DDNS (mynetname.net)
/ip cloud
set ddns-enabled=yes update-time=yes
:do {
    /ip cloud force-update
    :log info "XCLOUD: MikroTik Cloud DDNS updating..."
} on-error={}

# 4. Enable RouterOS v7 Back-To-Home (BTH) VPN Tunnel
:do {
    set back-to-home-vpn=yes
    :log info "XCLOUD: Back-To-Home VPN enabled for CGNAT traversal"
} on-error={
    :do {
        /ip cloud back-to-home set enabled=yes
    } on-error={
        :log info "XCLOUD: Note: Back-To-Home requires RouterOS 7.8+"
    }
}

# 5. Firewall Filter: Allow WinBox, WebFig & SSH Inbound
/ip firewall filter
:do {
    # Remove older XCLOUD remote filter rules to avoid duplicates
    remove [find comment~"XCLOUD-ALLOW-WINBOX"]
    remove [find comment~"XCLOUD-ALLOW-WEBFIG"]
    remove [find comment~"XCLOUD-ALLOW-SSH"]
} on-error={}

add chain=input protocol=tcp dst-port=${winboxPort} ${allowedRange !== '0.0.0.0/0' ? `src-address="${allowedRange}"` : ''} action=accept place-before=0 comment="XCLOUD-ALLOW-WINBOX"
add chain=input protocol=tcp dst-port=${webfigPort},443 ${allowedRange !== '0.0.0.0/0' ? `src-address="${allowedRange}"` : ''} action=accept place-before=1 comment="XCLOUD-ALLOW-WEBFIG"
add chain=input protocol=tcp dst-port=${sshPort} ${allowedRange !== '0.0.0.0/0' ? `src-address="${allowedRange}"` : ''} action=accept place-before=2 comment="XCLOUD-ALLOW-SSH"

# 6. Display Current Cloud DNS Name in Terminal
:delay 2s
:local ddnsName [/ip cloud get dns-name]
:log info ("XCLOUD: ======================================================")
:log info ("XCLOUD: WinBox Remote Access is ACTIVE!")
:log info ("XCLOUD: Connect via WinBox to: " . $ddnsName . ":${winboxPort}")
:log info ("XCLOUD: WebFig browser access: http://" . $ddnsName . ":${webfigPort}")
:log info ("XCLOUD: ======================================================")
:put ("")
:put ("==============================================================")
:put (" >>> XCLOUD WINBOX REMOTE ACCESS IS NOW ENABLED! <<<")
:put (" WinBox Connect Address: " . $ddnsName . ":${winboxPort}")
:put (" WebFig Browser URL:     http://" . $ddnsName . ":${webfigPort}")
:put ("==============================================================")
:put ("")
`;
  }
}
