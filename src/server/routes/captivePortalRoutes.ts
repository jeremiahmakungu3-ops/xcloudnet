/**
 * XCLOUD.NET — Captive Portal Management & Template Delivery Routes
 */

import { Router, Request, Response } from 'express';
import JSZip from 'jszip';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { db } from '../db/database.ts';
import { CaptivePortalConfig, HotspotPackage, Router as RouterModel } from '../../types/index.ts';
import { CaptivePortalTemplateService } from '../services/captivePortalTemplate.ts';
import { VoucherService } from '../services/voucherService.ts';

const router = Router();

// Helper to get or create default config
function getOrCreateConfig(orgId: string): CaptivePortalConfig {
  let config = db.findOne<CaptivePortalConfig>('captive_portal_configs', (c) => c.organizationId === orgId);
  if (!config) {
    config = {
      id: `cpc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: orgId,
      ssidName: 'XCLOUD-Free-WiFi',
      portalTitle: 'Karibu kwenye Mtandao wa Kasi',
      portalSubtitle: 'Unganisha kifaa chako kwa kuweka vocha au kulipia mtandaoni',
      themeColor: '#4f46e5',
      supportPhone: '+255 754 000 000',
      supportEmail: 'support@xcloud.net',
      termsOfService: 'Kwa kutumia mtandao huu, unakubali masharti na vigezo vya huduma ya XCLOUD.NET.',
      enableVoucherLogin: true,
      enableMobileMoneyBuy: true,
      enableFreeTrial: true,
      freeTrialMinutes: 15,
      enableMemberLogin: true,
      routerDns: 'wifi.xcloudtz.net',
      updatedAt: new Date().toISOString(),
    };
    db.insert('captive_portal_configs', config);
  }
  return config;
}

// 1. Get Captive Portal Configuration (Authenticated or Public by orgId/routerId)
router.get('/config', (req: Request, res: Response) => {
  const orgId = (req as any).organizationId || (req.query.organizationId as string) || 'org_default_01';
  const config = getOrCreateConfig(orgId);
  res.json(config);
});

// 2. Update Captive Portal Configuration (Authenticated)
router.post('/config', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const current = getOrCreateConfig(orgId);

  const updated: CaptivePortalConfig = {
    ...current,
    ...req.body,
    id: current.id,
    organizationId: orgId,
    updatedAt: new Date().toISOString(),
  };

  db.update('captive_portal_configs', current.id, updated);
  res.json(updated);
});

// 3. Get Generated Templates (Text format for viewing/copying)
router.get('/templates', (req: Request, res: Response) => {
  const orgId = (req as any).organizationId || (req.query.organizationId as string) || 'org_default_01';
  const config = getOrCreateConfig(orgId);

  const packages = db.find<HotspotPackage>('hotspot_packages', (p) => p.organizationId === orgId && p.isActive);
  const apiBaseUrl = `${req.protocol}://${req.get('host')}`;

  const templateOptions = {
    config,
    packages,
    apiBaseUrl,
  };

  const loginHtml = CaptivePortalTemplateService.generateLoginHtml(templateOptions);
  const statusHtml = CaptivePortalTemplateService.generateStatusHtml(templateOptions);
  const logoutHtml = CaptivePortalTemplateService.generateLogoutHtml(templateOptions);
  const aloginHtml = CaptivePortalTemplateService.generateAloginHtml(templateOptions);
  const md5Js = CaptivePortalTemplateService.getMd5Js();
  const errorsTxt = CaptivePortalTemplateService.getErrorsTxt();

  res.json({
    'login.html': loginHtml,
    'status.html': statusHtml,
    'logout.html': logoutHtml,
    'alogin.html': aloginHtml,
    'md5.js': md5Js,
    'errors.txt': errorsTxt,
    summary: {
      ssidName: config.ssidName,
      portalTitle: config.portalTitle,
      activePackagesCount: packages.length,
      routerDns: config.routerDns,
    },
  });
});

// 4. Download Single File (e.g. login.html)
router.get('/download/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const orgId = (req as any).organizationId || (req.query.organizationId as string) || 'org_default_01';
  const config = getOrCreateConfig(orgId);
  const packages = db.find<HotspotPackage>('hotspot_packages', (p) => p.organizationId === orgId && p.isActive);
  const apiBaseUrl = `${req.protocol}://${req.get('host')}`;

  const templateOptions = { config, packages, apiBaseUrl };

  let content = '';
  let contentType = 'text/html; charset=utf-8';

  if (filename === 'login.html') {
    content = CaptivePortalTemplateService.generateLoginHtml(templateOptions);
  } else if (filename === 'status.html') {
    content = CaptivePortalTemplateService.generateStatusHtml(templateOptions);
  } else if (filename === 'logout.html') {
    content = CaptivePortalTemplateService.generateLogoutHtml(templateOptions);
  } else if (filename === 'alogin.html') {
    content = CaptivePortalTemplateService.generateAloginHtml(templateOptions);
  } else if (filename === 'md5.js') {
    content = CaptivePortalTemplateService.getMd5Js();
    contentType = 'application/javascript; charset=utf-8';
  } else if (filename === 'errors.txt') {
    content = CaptivePortalTemplateService.getErrorsTxt();
    contentType = 'text/plain; charset=utf-8';
  } else {
    return res.status(404).send('Template file not found');
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
});

// 5. Download All MikroTik Hotspot Templates as a .ZIP archive
router.get('/download-zip', async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).organizationId || (req.query.organizationId as string) || 'org_default_01';
    const config = getOrCreateConfig(orgId);
    const packages = db.find<HotspotPackage>('hotspot_packages', (p) => p.organizationId === orgId && p.isActive);
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;

    const templateOptions = { config, packages, apiBaseUrl };

    const zip = new JSZip();
    const hotspotFolder = zip.folder('hotspot') || zip;

    hotspotFolder.file('login.html', CaptivePortalTemplateService.generateLoginHtml(templateOptions));
    hotspotFolder.file('status.html', CaptivePortalTemplateService.generateStatusHtml(templateOptions));
    hotspotFolder.file('logout.html', CaptivePortalTemplateService.generateLogoutHtml(templateOptions));
    hotspotFolder.file('alogin.html', CaptivePortalTemplateService.generateAloginHtml(templateOptions));
    hotspotFolder.file('md5.js', CaptivePortalTemplateService.getMd5Js());
    hotspotFolder.file('errors.txt', CaptivePortalTemplateService.getErrorsTxt());

    const readmeContent = `# XCLOUD.NET MikroTik RouterOS v7 Captive Portal Package
SSID: ${config.ssidName}
DNS Host: ${config.routerDns}

HOW TO INSTALL IN WINBOX:
1. Extract this ZIP file.
2. In WinBox, open "Files" from the left menu.
3. Drag and drop the "hotspot" folder into the Files window (or upload via FTP).
4. In WinBox Terminal, run:
   /ip hotspot profile set [find] html-directory=hotspot dns-name="${config.routerDns}"
5. Test by connecting a phone to the Wi-Fi.
`;
    zip.file('README.txt', readmeContent);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    res.setHeader('Content-Type', 'application/zip');
    const safeSsid = config.ssidName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename="xcloud-hotspot-${safeSsid}.zip"`);
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to generate zip: ${err.message}` });
  }
});

// 6. Free Trial Access Activation (Public endpoint used by captive portal)
router.post('/trial', (req: Request, res: Response) => {
  const { macAddress, ipAddress, routerId } = req.body;
  if (!macAddress) {
    return res.status(400).json({ error: 'MAC address is required for trial access.' });
  }

  // Find or create complimentary package
  let trialPkg = db.findOne<HotspotPackage>('hotspot_packages', (p) => p.price === 0 || p.name.includes('Trial'));
  const orgId = trialPkg?.organizationId || 'org_default_01';

  if (!trialPkg) {
    trialPkg = {
      id: `pkg_trial_${Date.now()}`,
      organizationId: orgId,
      name: 'Free 15-Minute Trial',
      description: 'Complimentary trial internet access',
      price: 0,
      durationMinutes: 15,
      dataLimitMb: 100,
      uploadSpeedKbps: 2048,
      downloadSpeedKbps: 4096,
      simultaneousDevices: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.insert('hotspot_packages', trialPkg);
  }

  // Create single trial voucher
  const voucher = VoucherService.createSingleVoucher({
    organizationId: orgId,
    packageId: trialPkg.id,
  });

  // Automatically redeem for this MAC
  const redemption = VoucherService.redeemVoucher({
    code: voucher.code,
    macAddress: macAddress.toUpperCase(),
    ipAddress: ipAddress || '127.0.0.1',
    routerId,
  });

  res.json({
    status: 'TRIAL_ACTIVATED',
    code: voucher.code,
    sessionTimeoutSeconds: redemption.sessionTimeoutSeconds,
    rateLimitString: redemption.rateLimitString,
    message: 'Free trial access granted. You are now connected.',
  });
});

// 7. Live Hosted Captive Portal Page
router.get('/live', (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org_default_01';
  const config = getOrCreateConfig(orgId);
  const packages = db.find<HotspotPackage>('hotspot_packages', (p) => p.organizationId === orgId && p.isActive);
  const apiBaseUrl = `${req.protocol}://${req.get('host')}`;

  const html = CaptivePortalTemplateService.generateLoginHtml({
    config,
    packages,
    apiBaseUrl,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

export default router;
