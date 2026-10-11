/**
 * XCLOUD.NET — Core Type Definitions
 * Shared types across Backend and Frontend
 */

export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'STAFF' | 'AGENT';

export type SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'SELCOM'
  | 'MPESA'
  | 'TIGO_PESA'
  | 'AIRTEL_MONEY'
  | 'HALOPESA'
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'AGENT_WALLET';

export type PaymentStatus =
  | 'PENDING'
  | 'PENDING_VERIFICATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'REFUNDED';

export type PaymentType = 'PLATFORM_SUBSCRIPTION' | 'HOTSPOT_PACKAGE' | 'AGENT_FLOAT_TOPUP';

export type RouterType = 'MIKROTIK' | 'OMADA' | 'GENERIC_RADIUS';
export type RouterStatus = 'ONLINE' | 'OFFLINE' | 'UNCONFIGURED' | 'UNKNOWN';

export type VoucherStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  role: Role;
  organizationId: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  slug: string;
  phone?: string;
  currency: string; // TZS
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // e.g. 7000
  currency: string; // TZS
  durationDays: number; // 30
  deviceLimit: number; // 5
  gracePeriodDays: number; // 3
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrgSubscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodEnd: string;
  deviceLimit: number;
  autoRenew: boolean;
  lastPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'VOID' | 'OVERDUE';
  type: PaymentType;
  description: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  organizationId: string;
  invoiceId?: string;
  reference: string; // Internal unique reference
  providerReference?: string; // Selcom or Telco trans ID
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  status: PaymentStatus;
  customerPhone?: string;
  customerName?: string;
  metadata?: Record<string, any>;
  verifiedBy?: string; // User ID for manual payments
  verifiedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RouterNetworkConfig {
  wanInterface: string; // default ether1
  lanInterfaces: string[]; // default ['ether2', 'ether3', 'ether4', 'ether5', 'wlan1', 'wlan2']
  hotspotBridge: string; // default bridge-hotspot
  gatewayIp: string; // default 10.10.20.1/24
  dhcpPool: string; // default 10.10.20.10-10.10.20.254
  dnsName: string; // default wifi.xcloudtz.net
  installationMode: 'NEW_CONFIGURATION' | 'EXISTING_HOTSPOT';
  defaultRateLimit?: string; // e.g. 5M/5M
}

export interface Router {
  id: string;
  organizationId: string;
  name: string;
  type: RouterType;
  ipAddress?: string;
  dnsName?: string;
  apiPort?: number;
  rosVersion?: 'v6' | 'v7';
  status: RouterStatus;
  lastHeartbeat?: string;
  identity?: string;
  serialNumber?: string;
  location?: string;
  installationToken?: string;
  installationTokenExpiresAt?: string;
  installationTokenUsed?: boolean;
  networkConfig?: RouterNetworkConfig;
  manualScriptGeneratedAt?: string;
  manualScriptDownloadedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotspotPackage {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  price: number; // TZS
  durationMinutes: number; // e.g. 60, 1440, 10080
  dataLimitMb?: number; // 0 or null for unlimited
  uploadSpeedKbps: number; // e.g. 2048 (2Mbps)
  downloadSpeedKbps: number; // e.g. 4096 (4Mbps)
  simultaneousDevices: number; // 1
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Voucher {
  id: string;
  organizationId: string;
  packageId: string;
  code: string;
  batchId?: string;
  status: VoucherStatus;
  price: number;
  customerPhone?: string;
  activatedAt?: string;
  expiresAt?: string;
  usedByMac?: string;
  usedByIp?: string;
  soldByAgentId?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotspotSession {
  id: string;
  organizationId: string;
  routerId: string;
  voucherCode: string;
  username: string;
  ipAddress: string;
  macAddress: string;
  startedAt: string;
  lastAccountingAt: string;
  endedAt?: string;
  bytesIn: number;
  bytesOut: number;
  sessionTimeSeconds: number;
  terminateCause?: string;
  isActive: boolean;
}

export interface Agent {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  phone: string;
  commissionRatePercent: number; // e.g. 10%
  walletBalance: number; // Float in TZS
  totalCommissionEarned: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  organizationId: string;
  agentId?: string;
  type: 'FLOAT_CREDIT' | 'FLOAT_DEBIT' | 'COMMISSION_CREDIT' | 'VOUCHER_SALE' | 'PAYOUT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  description: string;
  performedBy: string; // User ID
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface OmadaControllerConfig {
  id: string;
  organizationId: string;
  controllerUrl: string;
  siteId: string;
  operatorUsername: string;
  operatorPasswordEncrypted: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastCheckedAt?: string;
  lastErrorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EventCategory =
  | 'ROUTER_CONNECTION'
  | 'INSTALLATION'
  | 'CONFIGURATION'
  | 'SECURITY'
  | 'AUTHENTICATION'
  | 'MANAGEMENT'
  | 'SYNC'
  | 'HEARTBEAT';

export type EventResult = 'SUCCESS' | 'FAILED' | 'DENIED' | 'PENDING';

export type DeviceType = 'MIKROTIK' | 'OMADA' | 'SYSTEM';

export interface ActivityEvent {
  id: string;
  organizationId: string;
  organizationName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: Role | string;
  deviceId?: string;
  deviceName?: string;
  deviceType: DeviceType;
  action: string;
  category: EventCategory;
  result: EventResult;
  sourceIp?: string;
  targetResource?: string;
  message?: string;
  correlationId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface DeviceStatusHistory {
  id: string;
  organizationId: string;
  deviceId: string;
  deviceType: DeviceType;
  status: RouterStatus;
  reason?: string;
  createdAt: string;
}

export interface RouterHeartbeat {
  id: string;
  routerId: string;
  organizationId: string;
  ipAddress?: string;
  identity?: string;
  rosVersion?: string;
  activeHotspotUsers?: number;
  uptime?: string;
  cpuLoad?: number;
  freeMemory?: number;
  createdAt: string;
}

export interface OmadaDevice {
  id: string;
  controllerId: string;
  organizationId: string;
  name: string;
  mac: string;
  model: string;
  type: 'AP' | 'GATEWAY' | 'SWITCH';
  ipAddress?: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  firmwareVersion?: string;
  clientCount?: number;
  lastSeen?: string;
}
