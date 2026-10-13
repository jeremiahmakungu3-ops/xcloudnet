/**
 * XCLOUD.NET — Unified Database Management Engine
 * Dual-Mode: Direct PostgreSQL Connection Pool (Cloud SQL / Self-Hosted)
 * + Persistent File-backed JSON Database for standalone/local resilience.
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

export interface DBConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export class DatabaseEngine {
  private pgPool: pg.Pool | null = null;
  private isPostgresActive: boolean = false;
  private localDbPath: string;
  private memoryData: Record<string, any[]> = {};
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error('Could not create data dir:', err);
      }
    }
    this.localDbPath = path.resolve(dataDir, 'xcloud_db.json');
    this.loadLocalData();
  }

  public async initialize(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    const sqlHost = process.env.SQL_HOST;

    if (dbUrl || (sqlHost && process.env.SQL_DB_NAME)) {
      try {
        const poolConfig: pg.PoolConfig = dbUrl
          ? { connectionString: dbUrl, connectionTimeoutMillis: 3000 }
          : {
              host: sqlHost,
              port: parseInt(process.env.SQL_PORT || '5432', 10),
              user: process.env.SQL_USER,
              password: process.env.SQL_PASSWORD,
              database: process.env.SQL_DB_NAME,
              connectionTimeoutMillis: 3000,
            };

        this.pgPool = new Pool(poolConfig);
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();
        this.isPostgresActive = true;
        console.log('✓ Successfully connected to live PostgreSQL database.');
        await this.runPgMigrations();
      } catch (err) {
        console.warn(
          'PostgreSQL credentials provided but live server unreachable. Running with persistent disk engine:',
          (err as any)?.message || err
        );
        this.isPostgresActive = false;
      }
    } else {
      console.log('Running XCLOUD with persistent disk storage engine.');
    }

    // Seed initial system data if empty
    this.seedDefaultsIfEmpty();
  }

  private async runPgMigrations() {
    if (!this.pgPool) return;
    try {
      const mig1 = path.resolve(process.cwd(), 'migrations/001_initial_schema.sql');
      if (fs.existsSync(mig1)) {
        const sql = fs.readFileSync(mig1, 'utf8');
        await this.pgPool.query(sql);
      }
      const mig2 = path.resolve(process.cwd(), 'migrations/002_activity_monitoring.sql');
      if (fs.existsSync(mig2)) {
        const sql2 = fs.readFileSync(mig2, 'utf8');
        await this.pgPool.query(sql2);
      }
      console.log('✓ PostgreSQL schema migrations executed successfully.');
    } catch (e) {
      console.error('Failed to run PostgreSQL schema migration:', e);
    }
  }

  private loadLocalData() {
    if (fs.existsSync(this.localDbPath)) {
      try {
        const raw = fs.readFileSync(this.localDbPath, 'utf8');
        this.memoryData = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse local db JSON, resetting to empty:', e);
        this.memoryData = {};
      }
    } else {
      this.memoryData = {};
    }
  }

  public scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        fs.writeFileSync(this.localDbPath, JSON.stringify(this.memoryData, null, 2), 'utf8');
      } catch (e) {
        console.error('Failed writing local DB file:', e);
      }
    }, 100);
  }

  // Generic Query & Collection Methods
  public getCollection<T = any>(collectionName: string): T[] {
    if (!this.memoryData[collectionName]) {
      this.memoryData[collectionName] = [];
    }
    return this.memoryData[collectionName] as T[];
  }

  public insert<T extends { id?: string }>(collectionName: string, item: T): T {
    const col = this.getCollection(collectionName);
    col.push(item);
    this.scheduleSave();
    return item;
  }

  public findById<T extends { id: string }>(collectionName: string, id: string): T | undefined {
    const col = this.getCollection<T>(collectionName);
    return col.find((item) => item.id === id);
  }

  public findOne<T = any>(collectionName: string, predicate: (item: T) => boolean): T | undefined {
    const col = this.getCollection<T>(collectionName);
    return col.find(predicate);
  }

  public find<T = any>(collectionName: string, predicate?: (item: T) => boolean): T[] {
    const col = this.getCollection<T>(collectionName);
    return predicate ? col.filter(predicate) : [...col];
  }

  public update<T extends { id?: string } = any>(
    collectionName: string,
    id: string,
    updates: Partial<T> | Record<string, any>
  ): T | null {
    const col = this.getCollection<T>(collectionName);
    const index = col.findIndex((item) => (item as any).id === id);
    if (index === -1) return null;
    col[index] = { ...col[index], ...updates, updatedAt: new Date().toISOString() };
    this.scheduleSave();
    return col[index];
  }

  public delete(collectionName: string, id: string): boolean {
    const col = this.getCollection(collectionName);
    const initialLen = col.length;
    this.memoryData[collectionName] = col.filter((item) => item.id !== id);
    if (this.memoryData[collectionName].length !== initialLen) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public isPg(): boolean {
    return this.isPostgresActive;
  }

  public getPool(): pg.Pool | null {
    return this.pgPool;
  }

  // Pre-seed system default records
  private seedDefaultsIfEmpty() {
    const plans = this.getCollection('subscription_plans');
    if (plans.length === 0) {
      // 1. Default XCLOUD Platform Subscription Plan
      this.insert('subscription_plans', {
        id: 'plan_xcloud_standard',
        name: 'XCLOUD Business ISP',
        description: 'Monthly platform subscription for Hotspot & ISP business owners',
        price: 7000, // TZS 7,000 / month as specified
        currency: 'TZS',
        durationDays: 30,
        deviceLimit: 5, // 5 routers limit
        gracePeriodDays: 3,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const orgs = this.getCollection('organizations');
    let defaultOrgId = 'org_mussa_telecom';
    if (orgs.length === 0) {
      this.insert('organizations', {
        id: defaultOrgId,
        name: 'Mussa Telecom & Hotspot Services',
        ownerId: 'user_super_admin',
        slug: 'mussa-telecom',
        phone: '+255710000111',
        currency: 'TZS',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Default Active Org Subscription
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const graceEnd = new Date(nextMonth.getTime() + 3 * 24 * 60 * 60 * 1000);

      this.insert('org_subscriptions', {
        id: 'sub_default_001',
        organizationId: defaultOrgId,
        planId: 'plan_xcloud_standard',
        status: 'ACTIVE',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: nextMonth.toISOString(),
        gracePeriodEnd: graceEnd.toISOString(),
        deviceLimit: 5,
        autoRenew: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    const users = this.getCollection('users');
    // Ensure Super Admin account exists
    if (!users.some((u) => u.email.toLowerCase() === 'mussamatembo3@gmail.com')) {
      this.insert('users', {
        id: 'user_super_admin',
        email: 'mussamatembo3@gmail.com',
        passwordHash: '$2a$10$e8O0aKqT30zD7HwA6l6B..ZzQ2VfP4w68hWvX8X6wEa1G4724V5zK', // Password123!
        name: 'Mussa Matembo (Special Admin)',
        role: 'SUPER_ADMIN',
        organizationId: defaultOrgId,
        phone: '+255710000111',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Ensure Organization Admin (Standard Admin) exists for testing isolation
    if (!users.some((u) => u.email.toLowerCase() === 'admin@mussatelecom.tz')) {
      this.insert('users', {
        id: 'user_org_admin_01',
        email: 'admin@mussatelecom.tz',
        passwordHash: '$2a$10$e8O0aKqT30zD7HwA6l6B..ZzQ2VfP4w68hWvX8X6wEa1G4724V5zK', // Password123!
        name: 'Rashid Bakari (Organization Admin)',
        role: 'ORG_ADMIN',
        organizationId: defaultOrgId,
        phone: '+255714444555',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Ensure Regular Staff user exists
    if (!users.some((u) => u.email.toLowerCase() === 'support@xcloud.net')) {
      this.insert('users', {
        id: 'user_staff_01',
        email: 'support@xcloud.net',
        passwordHash: '$2a$10$e8O0aKqT30zD7HwA6l6B..ZzQ2VfP4w68hWvX8X6wEa1G4724V5zK', // Password123!
        name: 'Ali Juma (Hotspot Operations)',
        role: 'STAFF',
        organizationId: defaultOrgId,
        phone: '+255712222333',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Default Hotspot Packages
    const packages = this.getCollection('hotspot_packages');
    if (packages.length === 0) {
      const defaultPackages = [
        {
          id: 'pkg_1hr_unlimited',
          organizationId: defaultOrgId,
          name: '1 Hour Express',
          description: 'High-speed unlimited internet for 60 minutes',
          price: 500, // TZS 500
          durationMinutes: 60,
          dataLimitMb: 0,
          uploadSpeedKbps: 2048,
          downloadSpeedKbps: 4096,
          simultaneousDevices: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'pkg_3hr_unlimited',
          organizationId: defaultOrgId,
          name: '3 Hours Standard',
          description: 'Unlimited internet for 3 hours',
          price: 1000, // TZS 1,000
          durationMinutes: 180,
          dataLimitMb: 0,
          uploadSpeedKbps: 3072,
          downloadSpeedKbps: 6144,
          simultaneousDevices: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'pkg_24hr_pass',
          organizationId: defaultOrgId,
          name: '24 Hours Day Pass',
          description: 'Full day 24-hour hotspot access',
          price: 2000, // TZS 2,000
          durationMinutes: 1440,
          dataLimitMb: 0,
          uploadSpeedKbps: 4096,
          downloadSpeedKbps: 8192,
          simultaneousDevices: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'pkg_7days_pass',
          organizationId: defaultOrgId,
          name: '7 Days Weekly Pass',
          description: 'One full week of continuous internet access',
          price: 10000, // TZS 10,000
          durationMinutes: 10080,
          dataLimitMb: 0,
          uploadSpeedKbps: 5120,
          downloadSpeedKbps: 10240,
          simultaneousDevices: 2,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      for (const p of defaultPackages) {
        this.insert('hotspot_packages', p);
      }
    }

    // Default Router (MikroTik hEX / RB750Gr3)
    const routers = this.getCollection('routers');
    if (routers.length === 0) {
      this.insert('routers', {
        id: 'router_mikrotik_001',
        organizationId: defaultOrgId,
        name: 'MR WIFI',
        type: 'MIKROTIK',
        model: 'RouterBOARD hEX S',
        cpuLoad: 8,
        uptime: '2d 14h',
        hasCriticalUpdate: true,
        ipAddress: '192.168.88.1',
        dnsName: 'wifi.xcloudtz.net',
        apiPort: 8728,
        rosVersion: 'v7',
        status: 'ONLINE',
        lastHeartbeat: new Date().toISOString(),
        identity: 'MR-WIFI-GATEWAY',
        serialNumber: 'HE750-TZ-98421',
        location: 'Main Hotspot Site',
        installationToken: 'tok_active_installed_001',
        installationTokenUsed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Default Vouchers
    const vouchers = this.getCollection('vouchers');
    if (vouchers.length === 0) {
      const sampleCodes = ['XC-8492-7103', 'XC-9182-3849', 'XC-4819-2048', 'XC-6294-8172'];
      sampleCodes.forEach((code, idx) => {
        this.insert('vouchers', {
          id: `vch_seed_00${idx + 1}`,
          organizationId: defaultOrgId,
          packageId: 'pkg_1hr_unlimited',
          code: code,
          batchId: 'batch_seed_01',
          status: 'ACTIVE',
          price: 500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    }

    // Default Agent
    const agents = this.getCollection('agents');
    if (agents.length === 0) {
      this.insert('agents', {
        id: 'agent_pos_001',
        organizationId: defaultOrgId,
        userId: 'user_staff_01',
        name: 'Juma Kiosk & Stationery POS',
        phone: '+255714555666',
        commissionRatePercent: 10,
        walletBalance: 25000, // TZS 25,000 float
        totalCommissionEarned: 3500,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Initial Float Ledger Entry
      this.insert('ledger_entries', {
        id: 'ledg_init_001',
        organizationId: defaultOrgId,
        agentId: 'agent_pos_001',
        type: 'FLOAT_CREDIT',
        amount: 25000,
        balanceBefore: 0,
        balanceAfter: 25000,
        reference: 'FLOAT-INIT-001',
        description: 'Initial agent float top-up via Bank/M-Pesa cash deposit',
        performedBy: 'user_super_admin',
        createdAt: new Date().toISOString(),
      });
    }
  }
}

export const db = new DatabaseEngine();
