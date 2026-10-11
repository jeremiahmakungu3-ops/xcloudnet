/**
 * XCLOUD.NET — Global Activity & Device Monitoring Service
 * Central audit engine for MikroTik RouterOS and TP-Link Omada SDN events.
 * Strips sensitive data, enforces Super Admin access, and tracks device status history.
 */

import crypto from 'crypto';
import { db } from '../db/database.ts';
import {
  ActivityEvent,
  DeviceStatusHistory,
  RouterHeartbeat,
  OmadaDevice,
  Router as RouterModel,
  OmadaControllerConfig,
  EventCategory,
  EventResult,
  DeviceType,
  RouterStatus,
  User,
  Organization,
} from '../../types/index.ts';

export interface ActivityFilterOptions {
  organizationId?: string;
  userId?: string;
  deviceId?: string;
  deviceType?: DeviceType;
  category?: EventCategory;
  result?: EventResult;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class ActivityService {
  /**
   * Sanitize arbitrary metadata and error messages to ensure no credentials,
   * tokens, passwords, or secrets are ever recorded.
   */
  public static sanitizeData(obj: any): any {
    if (!obj) return obj;
    if (typeof obj === 'string') {
      return obj
        .replace(/(password|token|secret|key|pin|cvv)=([^& \n]+)/gi, '$1=[REDACTED]')
        .replace(/Bearer [a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
        .replace(/xc_inst_[a-f0-9]+/gi, 'xc_inst_[REDACTED]');
    }
    if (typeof obj === 'object') {
      const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {};
      const sensitiveKeys = [
        'password',
        'passwordhash',
        'secret',
        'key',
        'token',
        'installationtoken',
        'radiussecret',
        'apisecret',
        'operatorpassword',
        'operatorpasswordencrypted',
      ];

      for (const [k, v] of Object.entries(obj)) {
        if (sensitiveKeys.includes(k.toLowerCase())) {
          sanitized[k] = '[REDACTED]';
        } else if (typeof v === 'object' && v !== null) {
          sanitized[k] = this.sanitizeData(v);
        } else if (typeof v === 'string') {
          sanitized[k] = this.sanitizeData(v);
        } else {
          sanitized[k] = v;
        }
      }
      return sanitized;
    }
    return obj;
  }

  /**
   * Log an activity event with correlation ID and tenant context
   */
  public static log(params: {
    organizationId: string;
    organizationName?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    deviceId?: string;
    deviceName?: string;
    deviceType?: DeviceType;
    action: string;
    category: EventCategory;
    result: EventResult;
    sourceIp?: string;
    targetResource?: string;
    message?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  }): ActivityEvent {
    let orgName = params.organizationName;
    if (!orgName && params.organizationId) {
      const org = db.findById<Organization>('organizations', params.organizationId);
      if (org) orgName = org.name;
    }

    let userName = params.userName;
    let userEmail = params.userEmail;
    let userRole = params.userRole;

    if (params.userId && (!userName || !userEmail)) {
      const u = db.findById<User>('users', params.userId);
      if (u) {
        userName = userName || u.name;
        userEmail = userEmail || u.email;
        userRole = userRole || u.role;
      }
    }

    const event: ActivityEvent = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: params.organizationId,
      organizationName: orgName || 'Default Organization',
      userId: params.userId,
      userName: userName,
      userEmail: userEmail,
      userRole: userRole,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      deviceType: params.deviceType || 'SYSTEM',
      action: params.action,
      category: params.category,
      result: params.result,
      sourceIp: params.sourceIp || '127.0.0.1',
      targetResource: params.targetResource,
      message: this.sanitizeData(params.message),
      correlationId:
        params.correlationId || `req-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      metadata: this.sanitizeData(params.metadata),
      createdAt: new Date().toISOString(),
    };

    db.insert('activity_events', event);
    return event;
  }

  /**
   * Record Router Heartbeat & status update
   */
  public static recordHeartbeat(params: {
    routerId: string;
    organizationId: string;
    ipAddress?: string;
    identity?: string;
    rosVersion?: string;
    activeHotspotUsers?: number;
    uptime?: string;
    cpuLoad?: number;
    freeMemory?: number;
    sourceIp?: string;
  }): RouterHeartbeat {
    const hb: RouterHeartbeat = {
      id: `hb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      routerId: params.routerId,
      organizationId: params.organizationId,
      ipAddress: params.ipAddress,
      identity: params.identity,
      rosVersion: params.rosVersion,
      activeHotspotUsers: params.activeHotspotUsers || 0,
      uptime: params.uptime,
      cpuLoad: params.cpuLoad || 0,
      freeMemory: params.freeMemory || 0,
      createdAt: new Date().toISOString(),
    };

    db.insert('router_heartbeats', hb);

    // Also record status transition in device_status_history
    const router = db.findById<RouterModel>('routers', params.routerId);
    const prevStatus = router?.status;

    if (prevStatus !== 'ONLINE') {
      this.recordDeviceStatusChange({
        organizationId: params.organizationId,
        deviceId: params.routerId,
        deviceType: 'MIKROTIK',
        status: 'ONLINE',
        reason: `Heartbeat received from ${params.identity || 'MikroTik'} (ROS ${params.rosVersion || 'v7'})`,
      });
    }

    return hb;
  }

  /**
   * Track device status transition
   */
  public static recordDeviceStatusChange(params: {
    organizationId: string;
    deviceId: string;
    deviceType: DeviceType;
    status: RouterStatus;
    reason?: string;
  }): DeviceStatusHistory {
    const record: DeviceStatusHistory = {
      id: `dsh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: params.organizationId,
      deviceId: params.deviceId,
      deviceType: params.deviceType,
      status: params.status,
      reason: params.reason,
      createdAt: new Date().toISOString(),
    };

    db.insert('device_status_history', record);

    this.log({
      organizationId: params.organizationId,
      deviceId: params.deviceId,
      deviceType: params.deviceType,
      action: 'DEVICE_STATUS_CHANGED',
      category: 'ROUTER_CONNECTION',
      result: 'SUCCESS',
      message: `Status transitioned to ${params.status}: ${params.reason || 'Telemetry update'}`,
    });

    return record;
  }

  /**
   * Global Monitoring Summary for Super Admin
   */
  public static getGlobalMonitoringSummary(): {
    totalOrganizations: number;
    totalUsers: number;
    totalRouters: number;
    totalOmadaControllers: number;
    totalOmadaDevices: number;
    routerStatuses: {
      online: number;
      offline: number;
      unconfigured: number;
      unknown: number;
    };
    omadaDeviceStatuses: {
      online: number;
      offline: number;
      unknown: number;
    };
    operationsSummary: {
      successfulOperations: number;
      failedOperations: number;
      deniedOperations: number;
      pendingOperations: number;
    };
    recentActivityCount: number;
    latestHeartbeats: {
      routerId: string;
      routerName: string;
      organizationName: string;
      lastHeartbeat: string;
      rosVersion?: string;
    }[];
  } {
    const orgs = db.getCollection<Organization>('organizations');
    const users = db.getCollection<User>('users');
    const routers = db.getCollection<RouterModel>('routers');
    const controllers = db.getCollection<OmadaControllerConfig>('omada_controllers');
    const omadaDevices = db.getCollection<OmadaDevice>('omada_devices');
    const events = db.getCollection<ActivityEvent>('activity_events');

    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

    // Accurate router status calculation
    let onlineRouters = 0;
    let offlineRouters = 0;
    let unconfiguredRouters = 0;
    let unknownRouters = 0;

    const now = Date.now();
    for (const r of routers) {
      if (r.status === 'UNCONFIGURED') {
        unconfiguredRouters++;
      } else if (!r.lastHeartbeat) {
        unknownRouters++;
      } else {
        const diffMin = (now - new Date(r.lastHeartbeat).getTime()) / (1000 * 60);
        if (diffMin <= 3) onlineRouters++;
        else offlineRouters++;
      }
    }

    // Omada devices status
    let omadaOnline = 0;
    let omadaOffline = 0;
    let omadaUnknown = 0;

    for (const d of omadaDevices) {
      if (d.status === 'ONLINE') omadaOnline++;
      else if (d.status === 'OFFLINE') omadaOffline++;
      else omadaUnknown++;
    }

    // Operations result counters
    let successfulOperations = 0;
    let failedOperations = 0;
    let deniedOperations = 0;
    let pendingOperations = 0;

    for (const ev of events) {
      if (ev.result === 'SUCCESS') successfulOperations++;
      else if (ev.result === 'FAILED') failedOperations++;
      else if (ev.result === 'DENIED') deniedOperations++;
      else if (ev.result === 'PENDING') pendingOperations++;
    }

    // Latest router heartbeats
    const latestHeartbeats = routers
      .filter((r) => !!r.lastHeartbeat)
      .sort((a, b) => new Date(b.lastHeartbeat!).getTime() - new Date(a.lastHeartbeat!).getTime())
      .slice(0, 10)
      .map((r) => ({
        routerId: r.id,
        routerName: r.name,
        organizationName: orgMap.get(r.organizationId) || 'Unknown Org',
        lastHeartbeat: r.lastHeartbeat!,
        rosVersion: r.rosVersion,
      }));

    return {
      totalOrganizations: orgs.length,
      totalUsers: users.length,
      totalRouters: routers.length,
      totalOmadaControllers: controllers.length,
      totalOmadaDevices: omadaDevices.length,
      routerStatuses: {
        online: onlineRouters,
        offline: offlineRouters,
        unconfigured: unconfiguredRouters,
        unknown: unknownRouters,
      },
      omadaDeviceStatuses: {
        online: omadaOnline,
        offline: omadaOffline,
        unknown: omadaUnknown,
      },
      operationsSummary: {
        successfulOperations,
        failedOperations,
        deniedOperations,
        pendingOperations,
      },
      recentActivityCount: events.length,
      latestHeartbeats,
    };
  }

  /**
   * Filter and paginate activity events
   */
  public static getActivityEvents(filters: ActivityFilterOptions): {
    events: ActivityEvent[];
    total: number;
    limit: number;
    offset: number;
  } {
    let allEvents = db.getCollection<ActivityEvent>('activity_events');

    if (filters.organizationId) {
      allEvents = allEvents.filter((e) => e.organizationId === filters.organizationId);
    }
    if (filters.userId) {
      allEvents = allEvents.filter((e) => e.userId === filters.userId);
    }
    if (filters.deviceId) {
      allEvents = allEvents.filter((e) => e.deviceId === filters.deviceId);
    }
    if (filters.deviceType) {
      allEvents = allEvents.filter((e) => e.deviceType === filters.deviceType);
    }
    if (filters.category) {
      allEvents = allEvents.filter((e) => e.category === filters.category);
    }
    if (filters.result) {
      allEvents = allEvents.filter((e) => e.result === filters.result);
    }
    if (filters.startDate) {
      const s = new Date(filters.startDate).getTime();
      allEvents = allEvents.filter((e) => new Date(e.createdAt).getTime() >= s);
    }
    if (filters.endDate) {
      const en = new Date(filters.endDate).getTime();
      allEvents = allEvents.filter((e) => new Date(e.createdAt).getTime() <= en);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      allEvents = allEvents.filter(
        (e) =>
          e.action.toLowerCase().includes(term) ||
          e.organizationName?.toLowerCase().includes(term) ||
          e.userEmail?.toLowerCase().includes(term) ||
          e.deviceName?.toLowerCase().includes(term) ||
          e.message?.toLowerCase().includes(term) ||
          e.correlationId?.toLowerCase().includes(term)
      );
    }

    const sorted = allEvents.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = sorted.length;
    const limit = Math.min(filters.limit || 50, 500);
    const offset = filters.offset || 0;
    const paged = sorted.slice(offset, offset + limit);

    return {
      events: paged,
      total,
      limit,
      offset,
    };
  }

  /**
   * Export activity events to CSV format with safe row limits
   */
  public static exportActivityCsv(filters: ActivityFilterOptions): string {
    const { events } = this.getActivityEvents({
      ...filters,
      limit: 2000, // Safe rate and size limit
      offset: 0,
    });

    const headers = [
      'Timestamp',
      'CorrelationID',
      'OrganizationID',
      'OrganizationName',
      'UserEmail',
      'UserRole',
      'DeviceType',
      'DeviceID',
      'DeviceName',
      'Category',
      'Action',
      'Result',
      'SourceIP',
      'Message',
    ];

    const rows = events.map((e) => [
      `"${e.createdAt}"`,
      `"${e.correlationId}"`,
      `"${e.organizationId}"`,
      `"${(e.organizationName || '').replace(/"/g, '""')}"`,
      `"${e.userEmail || ''}"`,
      `"${e.userRole || ''}"`,
      `"${e.deviceType}"`,
      `"${e.deviceId || ''}"`,
      `"${(e.deviceName || '').replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.action}"`,
      `"${e.result}"`,
      `"${e.sourceIp || ''}"`,
      `"${(e.message || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Get device-specific activity events and status history
   */
  public static getDeviceDetails(deviceId: string): {
    router?: RouterModel;
    controller?: OmadaControllerConfig;
    activityEvents: ActivityEvent[];
    statusHistory: DeviceStatusHistory[];
    recentHeartbeats: RouterHeartbeat[];
  } {
    const router = db.findById<RouterModel>('routers', deviceId);
    const controller = db.findById<OmadaControllerConfig>('omada_controllers', deviceId);

    const activityEvents = db
      .find<ActivityEvent>('activity_events', (e) => e.deviceId === deviceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    const statusHistory = db
      .find<DeviceStatusHistory>('device_status_history', (s) => s.deviceId === deviceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);

    const recentHeartbeats = db
      .find<RouterHeartbeat>('router_heartbeats', (h) => h.routerId === deviceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return {
      router,
      controller,
      activityEvents,
      statusHistory,
      recentHeartbeats,
    };
  }
}
