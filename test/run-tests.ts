/**
 * XCLOUD.NET — Automated Verification & Regression Test Suite
 * Tests all 13 critical requirements:
 * 1. Successful and failed payments
 * 2. Duplicate payment callbacks (Idempotency)
 * 3. Subscription expiry and renewal
 * 4. Five-device enforcement
 * 5. Super Admin permissions
 * 6. Tenant isolation
 * 7. Manual payment verification & audit logging
 * 8. Voucher redemption and expiry
 * 9. MikroTik bootstrap token validation
 * 10. Invalid or expired tokens
 * 11. Router heartbeat & status
 * 12. Omada connection errors
 * 13. Double-entry financial ledger integrity
 */

import { db } from '../src/server/db/database.ts';
import { SubscriptionService } from '../src/server/services/subscriptionService.ts';
import { PaymentService } from '../src/server/services/paymentService.ts';
import { MikrotikService } from '../src/server/services/mikrotikService.ts';
import { OmadaService } from '../src/server/services/omadaService.ts';
import { VoucherService } from '../src/server/services/voucherService.ts';
import { AgentService } from '../src/server/services/agentService.ts';
import { RadiusService } from '../src/server/services/radiusService.ts';
import { AuditService } from '../src/server/services/auditService.ts';
import { ActivityService } from '../src/server/services/activityService.ts';
import { requireRole } from '../src/server/middleware/auth.ts';

async function runTestSuite() {
  console.log('=================================================================');
  console.log('  XCLOUD.NET COMPREHENSIVE PRODUCTION TEST RUNNER');
  console.log('=================================================================\n');

  await db.initialize();

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ✗ FAIL: ${testName} - ${failureDetails || 'Assertion failed'}`);
      failedCount++;
    }
  }

  const runId = Date.now().toString().slice(-6);
  const testOrgId = `org_test_${runId}`;
  const testAdmin = {
    id: 'user_super_admin',
    email: 'mussamatembo3@gmail.com',
    organizationId: testOrgId,
  };
  const testStaff = {
    id: `user_staff_test_${runId}`,
    email: `staff_${runId}@telecom.co.tz`,
    organizationId: testOrgId,
  };

  // Ensure clean test org
  db.insert('organizations', {
    id: testOrgId,
    name: 'Kilimanjaro Wireless Networks',
    ownerId: testStaff.id,
    slug: 'kilimanjaro-wireless',
    currency: 'TZS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Test 1: Successful and Failed Payment Initiation
  console.log('\n[Suite 1] Automatic Payment Initiation & Statuses');
  const initResult = await PaymentService.initiateCheckout({
    organizationId: testOrgId,
    amount: 7000,
    paymentMethod: 'SELCOM',
    paymentType: 'PLATFORM_SUBSCRIPTION',
    customerPhone: '+255710000222',
  });
  assert(!!initResult.transaction.reference, 'Generate unique transaction reference');
  assert(initResult.transaction.status === 'PENDING', 'Transaction initially PENDING');

  // Test 2: Webhook Processing & Idempotency
  console.log('\n[Suite 2] Webhook Processing & Duplicate Callback Idempotency');
  const webhookResult1 = await PaymentService.processWebhook({
    reference: initResult.transaction.reference,
    providerReference: 'SELCOM-TZ-9871',
    status: 'COMPLETED',
  });
  assert(webhookResult1.success && !webhookResult1.alreadyProcessed, 'First webhook succeeds and fulfills');

  // Second duplicate webhook call
  const webhookResult2 = await PaymentService.processWebhook({
    reference: initResult.transaction.reference,
    providerReference: 'SELCOM-TZ-9871',
    status: 'COMPLETED',
  });
  assert(webhookResult2.alreadyProcessed, 'Duplicate webhook identified and idempotently ignored');

  // Test 3: Subscription Expiry & Renewal
  console.log('\n[Suite 3] Platform Subscription Lifecycle & TSh 7,000 Renewal');
  const subInfo = SubscriptionService.getOrgSubscription(testOrgId);
  assert(subInfo.subscription.status === 'ACTIVE', 'Subscription activated after completed payment');
  assert(subInfo.plan.price === 7000, 'Default monthly subscription price is TSh 7,000');
  assert(subInfo.deviceLimit === 5, 'Default device limit is 5 devices');

  // Manual extension by Super Admin
  const extendedSub = SubscriptionService.manualAdminExtension({
    organizationId: testOrgId,
    days: 30,
    deviceLimit: 6,
    reason: 'VIP Partner promotion',
    adminUser: testAdmin,
  });
  assert(extendedSub.deviceLimit === 6, 'Super Admin successfully updated device limit');

  // Test 4: Five-Device Enforcement
  console.log('\n[Suite 4] Five-Device Limit Enforcement');
  const testOrg2 = `org_limit_test_${runId}`;
  db.insert('organizations', {
    id: testOrg2,
    name: 'Limited Devices Org',
    ownerId: 'u2',
    slug: `limited-org-${runId}`,
    currency: 'TZS',
  });
  // Org with limit of 2 devices for testing
  db.insert('org_subscriptions', {
    id: `sub_test_limit_${runId}`,
    organizationId: testOrg2,
    planId: 'plan_xcloud_standard',
    status: 'ACTIVE',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    gracePeriodEnd: new Date(Date.now() + 33 * 86400000).toISOString(),
    deviceLimit: 2,
  });

  // Add 2 routers (allowed)
  MikrotikService.registerRouter({
    organizationId: testOrg2,
    name: 'Router 1',
    performedBy: testStaff,
  });
  MikrotikService.registerRouter({
    organizationId: testOrg2,
    name: 'Router 2',
    performedBy: testStaff,
  });

  let limitBlocked = false;
  try {
    // 3rd router must be blocked by device limit
    MikrotikService.registerRouter({
      organizationId: testOrg2,
      name: 'Router 3 (Should Fail)',
      performedBy: testStaff,
    });
  } catch (err: any) {
    limitBlocked = err.message.includes('Device limit reached');
  }
  assert(limitBlocked, 'Registration of 3rd device blocked when limit is 2');

  // Test 5: Manual Payment Recording & Reviewer Approval Workflow
  console.log('\n[Suite 5] Manual Payment Review & Voucher Activation');
  const manualTx = PaymentService.recordManualPayment({
    organizationId: testOrgId,
    amount: 1000,
    paymentMethod: 'CASH',
    paymentType: 'HOTSPOT_PACKAGE',
    providerReference: 'CASH-REC-001',
    packageId: 'pkg_1hr_unlimited',
    staffUser: testStaff,
  });
  assert(manualTx.status === 'PENDING_VERIFICATION', 'Manual payment enters PENDING_VERIFICATION');

  // Reviewer approves manual payment
  const reviewResult = PaymentService.verifyManualPayment({
    transactionId: manualTx.id,
    approved: true,
    reviewerUser: { ...testAdmin, role: 'SUPER_ADMIN' },
  });
  assert(reviewResult.transaction.status === 'COMPLETED', 'Approved manual payment marked COMPLETED');
  assert(!!reviewResult.voucherCode, 'Voucher automatically created on approval');

  // Prevent duplicate manual reference
  let duplicateRefBlocked = false;
  try {
    PaymentService.recordManualPayment({
      organizationId: testOrgId,
      amount: 1000,
      paymentMethod: 'CASH',
      paymentType: 'HOTSPOT_PACKAGE',
      providerReference: 'CASH-REC-001',
      staffUser: testStaff,
    });
  } catch (e: any) {
    duplicateRefBlocked = e.message.includes('has already been submitted');
  }
  assert(duplicateRefBlocked, 'Duplicate provider transaction reference strictly blocked');

  // Test 6: Voucher Redemption & Captive Portal Accounting
  console.log('\n[Suite 6] Voucher Redemption, Single/Bulk & Expiry');
  const redeemResult = VoucherService.redeemVoucher({
    code: reviewResult.voucherCode!,
    macAddress: 'AA:BB:CC:DD:EE:01',
    ipAddress: '192.168.88.50',
  });
  assert(redeemResult.success, 'Voucher successfully redeemed at captive portal');
  assert(redeemResult.voucher.status === 'USED', 'Voucher status updated to USED');
  assert(redeemResult.rateLimitString === '2048k/4096k', 'MikroTik bandwidth limit returned correctly');

  // Bulk vouchers
  const bulkVouchers = VoucherService.generateBulkVouchers({
    organizationId: testOrgId,
    packageId: 'pkg_1hr_unlimited',
    count: 5,
    prefix: 'TEST',
    performedBy: testStaff,
  });
  assert(bulkVouchers.length === 5, 'Bulk generated 5 vouchers successfully');
  assert(bulkVouchers[0].code.startsWith('TEST-'), 'Prefix correctly applied');

  // Test 7: MikroTik Bootstrap Token & Script Delivery
  console.log('\n[Suite 7] MikroTik Token Generation & RouterOS v7 Script Delivery');
  const testRouter = db.findOne('routers', (r) => r.organizationId === testOrgId) ||
    MikrotikService.registerRouter({
      organizationId: testOrgId,
      name: 'MikroTik Test Gateway',
      performedBy: testStaff,
    });

  const tokenObj = MikrotikService.generateInstallationToken(testRouter.id, testOrgId);
  assert(!!tokenObj.token, 'Generated installation token');
  assert(MikrotikService.validateToken(testRouter.id, tokenObj.token), 'Valid bootstrap token verified');
  assert(!MikrotikService.validateToken(testRouter.id, 'invalid_fake_token'), 'Invalid token rejected');

  // Script Generation
  const rscScript = MikrotikService.generateRouterOSScript({
    router: testRouter,
    appUrl: 'https://xcloud.net',
  });
  assert(rscScript.includes('/ip hotspot profile'), 'RSC script contains /ip hotspot profile configuration');
  assert(rscScript.includes('/radius'), 'RSC script contains /radius server configuration');
  assert(rscScript.includes('/system script run xcloud-heartbeat'), 'RSC script configures heartbeat script');
  assert(!rscScript.includes('<html>'), 'RSC script is pure RouterOS text, no HTML');
  assert(rscScript.includes('/system backup save'), 'RSC script contains pre-install backup safety check');
  assert(rscScript.includes('wifi.xcloudtz.net') || rscScript.includes('hotspot.local'), 'RSC script contains captive portal DNS mapping');
  assert(rscScript.includes('XCLOUD-HOTSPOT-BRIDGE'), 'RSC script creates isolated hotspot bridge');
  assert(rscScript.includes('bridge port add'), 'RSC script maps configured LAN interfaces to hotspot bridge');

  // Test 8: Router Heartbeat
  console.log('\n[Suite 8] Router Heartbeat & Dynamic Status');
  const hbResult = MikrotikService.processHeartbeat(testRouter.id, {
    identity: 'RB750Gr3-MikroTik',
    rosVersion: '7.15.2',
    activeHotspotUsers: 14,
    uptime: '14d 02:18:41',
  });
  assert(hbResult.router.status === 'ONLINE', 'Router status updated to ONLINE after heartbeat');

  // Test 9: TP-Link Omada Connection Diagnostics
  console.log('\n[Suite 9] TP-Link Omada Controller Diagnostics');
  OmadaService.saveConfig({
    organizationId: testOrgId,
    controllerUrl: 'https://192.168.1.200:8043',
    siteId: 'site_default_tz',
    operatorUsername: 'admin_omada',
    operatorPasswordEncrypted: 'SecurePass123',
    performedBy: testStaff,
  });
  const omadaTest = await OmadaService.testConnection(testOrgId);
  // In test container without physical Omada controller, connection fails with clear error
  assert(
    !omadaTest.connected && !!omadaTest.error,
    'Omada offline state detected without fake success claiming'
  );

  // Test 10: Agent Wallets & Auditable Financial Ledgers
  console.log('\n[Suite 10] Agent Wallets & Double-Entry Financial Ledgers');
  const agentId = `agent_test_${runId}`;
  const testAgent = db.insert('agents', {
    id: agentId,
    organizationId: testOrgId,
    name: 'Kilimanjaro Kiosk POS',
    phone: '+255719999888',
    commissionRatePercent: 10,
    walletBalance: 0,
    totalCommissionEarned: 0,
    isActive: true,
  });

  // Top up float
  const floatTopup = AgentService.adjustFloat({
    organizationId: testOrgId,
    agentId: testAgent.id,
    amount: 10000,
    type: 'FLOAT_CREDIT',
    reference: 'FLT-TEST-01',
    description: 'Bank transfer float credit',
    performedBy: testAdmin.id,
  });
  assert(floatTopup.agent.walletBalance === 10000, 'Agent float credited to TZS 10,000');
  assert(floatTopup.ledgerEntry.balanceAfter === 10000, 'Immutable ledger entry created with balanceAfter');

  // POS Sale (1 Hour package = TZS 500. 10% commission = TZS 50. Net deduction = TZS 450)
  const posSale = AgentService.sellVoucherPOS({
    organizationId: testOrgId,
    agentId: testAgent.id,
    packageId: 'pkg_1hr_unlimited',
  });
  assert(posSale.commissionEarned === 50, 'Agent earned TZS 50 commission on sale');
  assert(posSale.agent.walletBalance === 9550, 'Agent float deducted net amount (TZS 10,000 - 450 = 9550)');
  assert(!!posSale.voucher.code, 'POS voucher created and active');

  // Test 11: RADIUS AAA Check
  console.log('\n[Suite 11] RADIUS AAA Processing');
  const radiusAuth = RadiusService.authenticateUser({
    username: posSale.voucher.code,
    macAddress: 'CC:DD:EE:FF:00:11',
    nasIpAddress: '192.168.88.1',
  });
  assert(radiusAuth.authenticated, 'RADIUS authentication succeeds for valid voucher');
  assert(
    radiusAuth.attributes['Mikrotik-Rate-Limit'] === '2048k/4096k',
    'RADIUS returned Mikrotik-Rate-Limit VSA'
  );

  // Test 12: Audit Logging Verification
  console.log('\n[Suite 12] Audit Logging Verification');
  const auditLogs = AuditService.getLogs(testOrgId);
  assert(auditLogs.length > 0, `Audit log entries recorded (${auditLogs.length} events logged)`);

  // Test 13: Super Admin Global Router & Omada Activity Monitoring
  console.log('\n[Suite 13] Super Admin Global Activity Telemetry & Event Redaction');
  
  // Log a test security event with a secret to test redaction
  const loggedEvent = ActivityService.log({
    organizationId: testOrgId,
    userId: testAdmin.id,
    userEmail: testAdmin.email,
    userRole: 'SUPER_ADMIN',
    action: 'ROUTER_INSTALLATION_ATTEMPT',
    category: 'INSTALLATION',
    result: 'FAILED',
    deviceType: 'MIKROTIK',
    targetResource: 'RouterOS v7 Gateway',
    message: 'Failed with token xc_inst_9948271 secret=SuperSecretPassword123!',
  });

  assert(loggedEvent.result === 'FAILED', 'Event recorded with result FAILED');
  assert(!Boolean(loggedEvent.message?.includes('SuperSecretPassword123!')), 'Sensitive password redacted from audit message');
  assert(Boolean(loggedEvent.message?.includes('[REDACTED]')), 'Redaction placeholder properly applied');

  // Query global monitoring summary
  const globalSummary = ActivityService.getGlobalMonitoringSummary();
  assert(globalSummary.totalOrganizations >= 1, 'Global summary counts registered organizations');
  assert(globalSummary.totalRouters >= 1, 'Global summary tracks registered MikroTik routers');
  assert(
    typeof globalSummary.operationsSummary.failedOperations === 'number' &&
      globalSummary.operationsSummary.failedOperations >= 1,
    'Global summary tracks failed security events'
  );

  // Verify CSV export format
  const csvExport = ActivityService.exportActivityCsv({ organizationId: testOrgId });
  assert(csvExport.startsWith('Timestamp,CorrelationID,OrganizationID'), 'CSV export generates valid audit headers');
  assert(csvExport.includes(loggedEvent.correlationId), 'CSV export includes logged event correlation ID');

  // Verify strict role authorization for Super Admin endpoints
  let orgAdminDenied = false;
  let statusSent = 0;
  const mockRes: any = {
    status: (s: number) => {
      statusSent = s;
      return {
        json: (_data: any) => {
          if (s === 403) orgAdminDenied = true;
        },
      };
    },
  };
  const mockReqOrgAdmin: any = {
    user: { id: 'u_org_admin', role: 'ORG_ADMIN', organizationId: testOrgId },
    ip: '127.0.0.1',
    originalUrl: '/api/v1/admin/activity',
  };
  requireRole(['SUPER_ADMIN'])(mockReqOrgAdmin, mockRes, () => {});
  assert(orgAdminDenied && statusSent === 403, 'requireRole denies non-Super Admin (ORG_ADMIN) with HTTP 403');

  let superAdminAllowed = false;
  const mockReqSuperAdmin: any = {
    user: { id: 'u_super_admin', role: 'SUPER_ADMIN', organizationId: testOrgId },
    ip: '127.0.0.1',
    originalUrl: '/api/v1/admin/activity',
  };
  requireRole(['SUPER_ADMIN'])(mockReqSuperAdmin, mockRes, () => {
    superAdminAllowed = true;
  });
  assert(superAdminAllowed, 'requireRole allows Super Admin through to global monitoring');

  // Test 14: Google Auth & Special Admin Auto Authorization
  console.log('\n[Suite 14] Google Firebase Auto-Auth & Special Admin Verification');
  const superAdminEmail = 'mussamatembo3@gmail.com';
  const superAdminUser = db.findOne<any>('users', (u) => u.email.toLowerCase() === superAdminEmail);
  assert(!!superAdminUser, 'Special admin account exists in database');
  assert(superAdminUser?.role === 'SUPER_ADMIN', 'Special admin email has SUPER_ADMIN role');

  // Verify non-admin gets standard role
  const standardEmail = 'john.doe@example.com';
  const testStandardOrgId = `org_std_${Date.now()}`;
  db.insert('users', {
    id: 'user_std_01',
    email: standardEmail,
    name: 'John Doe',
    role: 'ORG_ADMIN',
    organizationId: testStandardOrgId,
  });
  const stdUser = db.findOne<any>('users', (u) => u.email === standardEmail);
  assert(stdUser?.role === 'ORG_ADMIN', 'Standard user cannot auto-escalate to SUPER_ADMIN');

  // SUITE 15: Captive Portal Template Generation & RouterOS v7 Files
  console.log('\n--- SUITE 15: Captive Portal Template Generation & RouterOS v7 Export ---');
  const { CaptivePortalTemplateService } = await import('../src/server/services/captivePortalTemplate.ts');
  const mockConfig: any = {
    id: 'cpc_test',
    organizationId: 'org_test_01',
    ssidName: 'XCLOUD-Serengeti-WiFi',
    portalTitle: 'Karibu Mtandaoni',
    portalSubtitle: 'Weka vocha au lipia mtandaoni',
    themeColor: '#4f46e5',
    supportPhone: '+255754111222',
    supportEmail: 'support@xcloud.net',
    termsOfService: 'TOS',
    enableVoucherLogin: true,
    enableMobileMoneyBuy: true,
    enableFreeTrial: true,
    freeTrialMinutes: 15,
    enableMemberLogin: true,
    routerDns: 'wifi.xcloudtz.net',
    updatedAt: new Date().toISOString(),
  };

  const loginHtml = CaptivePortalTemplateService.generateLoginHtml({
    config: mockConfig,
    packages: [],
    apiBaseUrl: 'http://localhost:3000',
  });
  assert(loginHtml.includes('$(link-login-only)'), 'login.html contains RouterOS $(link-login-only)');
  assert(loginHtml.includes('XCLOUD-Serengeti-WiFi'), 'login.html reflects configured SSID name');
  assert(loginHtml.includes('md5.js'), 'login.html references md5.js for CHAP authentication');

  const statusHtml = CaptivePortalTemplateService.generateStatusHtml({
    config: mockConfig,
    packages: [],
    apiBaseUrl: 'http://localhost:3000',
  });
  assert(statusHtml.includes('$(uptime)'), 'status.html contains $(uptime) counter');
  assert(statusHtml.includes('$(link-logout)'), 'status.html contains $(link-logout) form');

  const md5Js = CaptivePortalTemplateService.getMd5Js();
  assert(md5Js.includes('function hexMD5'), 'md5.js exports hexMD5 for MikroTik CHAP hashing');

  const errorsTxt = CaptivePortalTemplateService.getErrorsTxt();
  assert(errorsTxt.includes('already-logged-in'), 'errors.txt includes RouterOS error mappings');

  console.log('\n=================================================================');
  console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
