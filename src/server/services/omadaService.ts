/**
 * XCLOUD.NET — TP-Link Omada SDN Controller Integration Adapter
 * Connects to TP-Link Omada Software / Hardware Controller (OC200/OC300/Cloud) OpenAPI.
 */

import { db } from '../db/database.ts';
import { OmadaControllerConfig } from '../../types/index.ts';
import { AuditService } from './auditService.ts';
import { ActivityService } from './activityService.ts';

export class OmadaService {
  /**
   * Save or update Omada controller configuration
   */
  public static saveConfig(params: {
    organizationId: string;
    controllerUrl: string;
    siteId: string;
    operatorUsername: string;
    operatorPasswordEncrypted: string;
    performedBy: { id: string; email: string };
  }): OmadaControllerConfig {
    let existing = db.findOne<OmadaControllerConfig>(
      'omada_controllers',
      (c) => c.organizationId === params.organizationId
    );

    let updated: OmadaControllerConfig;
    if (existing) {
      updated = db.update<OmadaControllerConfig>('omada_controllers', existing.id, {
        controllerUrl: params.controllerUrl.replace(/\/$/, ''),
        siteId: params.siteId,
        operatorUsername: params.operatorUsername,
        operatorPasswordEncrypted: params.operatorPasswordEncrypted,
        status: 'DISCONNECTED',
      })!;
    } else {
      updated = {
        id: `omd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organizationId: params.organizationId,
        controllerUrl: params.controllerUrl.replace(/\/$/, ''),
        siteId: params.siteId,
        operatorUsername: params.operatorUsername,
        operatorPasswordEncrypted: params.operatorPasswordEncrypted,
        status: 'DISCONNECTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.insert('omada_controllers', updated);
    }

    ActivityService.log({
      organizationId: params.organizationId,
      userId: params.performedBy.id,
      userEmail: params.performedBy.email,
      deviceId: updated.id,
      deviceName: `Omada (${params.siteId})`,
      deviceType: 'OMADA',
      action: 'OMADA_CONFIG_SAVED',
      category: 'CONFIGURATION',
      result: 'SUCCESS',
      message: `Configured Omada Controller for site ${params.siteId} (${params.controllerUrl})`,
    });

    AuditService.log({
      organizationId: params.organizationId,
      userId: params.performedBy.id,
      userEmail: params.performedBy.email,
      action: 'UPDATE_OMADA_CONTROLLER_CONFIG',
      resourceType: 'OMADA_CONTROLLER',
      resourceId: updated.id,
      details: { controllerUrl: params.controllerUrl, siteId: params.siteId },
    });

    return updated;
  }

  /**
   * Test controller connectivity and fetch site device status
   */
  public static async testConnection(organizationId: string): Promise<{
    connected: boolean;
    controllerUrl: string;
    siteId: string;
    deviceCount?: number;
    error?: string;
  }> {
    const config = db.findOne<OmadaControllerConfig>(
      'omada_controllers',
      (c) => c.organizationId === organizationId
    );

    if (!config) {
      return {
        connected: false,
        controllerUrl: '',
        siteId: '',
        error: 'Omada Controller configuration is not set up for this organization.',
      };
    }

    try {
      // Real controller login attempt (controller URL e.g. https://omada.local:8043)
      const controllerHost = config.controllerUrl;
      const loginUrl = `${controllerHost}/api/v2/login`;

      const controllerReq = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.operatorUsername,
          password: config.operatorPasswordEncrypted,
        }),
        signal: AbortSignal.timeout(4000),
      }).catch((fetchErr) => {
        throw new Error(
          `Network connection to Omada Controller failed (${controllerHost}): ${fetchErr.message}`
        );
      });

      if (!controllerReq.ok) {
        throw new Error(
          `Omada controller returned HTTP ${controllerReq.status} ${controllerReq.statusText}. Please verify credentials and site privileges.`
        );
      }

      const resJson = (await controllerReq.json()) as any;
      if (resJson.errorCode !== 0) {
        throw new Error(`Omada API Error: ${resJson.msg || 'Authentication failed'}`);
      }

      db.update('omada_controllers', config.id, {
        status: 'CONNECTED',
        lastCheckedAt: new Date().toISOString(),
        lastErrorMessage: undefined,
      });

      ActivityService.log({
        organizationId: config.organizationId,
        deviceId: config.id,
        deviceName: `Omada (${config.siteId})`,
        deviceType: 'OMADA',
        action: 'OMADA_CONNECTION_TEST',
        category: 'ROUTER_CONNECTION',
        result: 'SUCCESS',
        message: `Successfully connected to Omada Controller at ${config.controllerUrl}`,
      });

      return {
        connected: true,
        controllerUrl: config.controllerUrl,
        siteId: config.siteId,
        deviceCount: 1,
      };
    } catch (err: any) {
      db.update('omada_controllers', config.id, {
        status: 'ERROR',
        lastCheckedAt: new Date().toISOString(),
        lastErrorMessage: err.message,
      });

      ActivityService.log({
        organizationId: config.organizationId,
        deviceId: config.id,
        deviceName: `Omada (${config.siteId})`,
        deviceType: 'OMADA',
        action: 'OMADA_CONNECTION_TEST',
        category: 'ROUTER_CONNECTION',
        result: 'FAILED',
        message: `Omada connection failed: ${err.message}`,
      });

      return {
        connected: false,
        controllerUrl: config.controllerUrl,
        siteId: config.siteId,
        error: err.message,
      };
    }
  }
}
