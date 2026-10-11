-- XCLOUD.NET PostgreSQL Schema Migration 002
-- Global Router & Omada Activity Monitoring & Audit Trails

CREATE TABLE IF NOT EXISTS activity_events (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    organization_name VARCHAR(255),
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    user_role VARCHAR(32),
    device_id VARCHAR(64),
    device_name VARCHAR(255),
    device_type VARCHAR(32) NOT NULL DEFAULT 'SYSTEM', -- MIKROTIK, OMADA, SYSTEM
    action VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL, -- ROUTER_CONNECTION, INSTALLATION, CONFIGURATION, SECURITY, AUTHENTICATION, MANAGEMENT, SYNC, HEARTBEAT
    result VARCHAR(32) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED, DENIED, PENDING
    source_ip VARCHAR(64),
    target_resource VARCHAR(255),
    message TEXT,
    correlation_id VARCHAR(128) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_status_history (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    device_type VARCHAR(32) NOT NULL, -- MIKROTIK, OMADA
    status VARCHAR(32) NOT NULL, -- ONLINE, OFFLINE, UNCONFIGURED, UNKNOWN
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS router_heartbeats (
    id VARCHAR(64) PRIMARY KEY,
    router_id VARCHAR(64) NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ip_address VARCHAR(64),
    identity VARCHAR(255),
    ros_version VARCHAR(32),
    active_hotspot_users INTEGER DEFAULT 0,
    uptime VARCHAR(64),
    cpu_load INTEGER DEFAULT 0,
    free_memory BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS omada_devices (
    id VARCHAR(64) PRIMARY KEY,
    controller_id VARCHAR(64) NOT NULL REFERENCES omada_controllers(id) ON DELETE CASCADE,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mac VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'AP', -- AP, GATEWAY, SWITCH
    ip_address VARCHAR(64),
    status VARCHAR(32) DEFAULT 'UNKNOWN', -- ONLINE, OFFLINE, UNKNOWN
    firmware_version VARCHAR(64),
    client_count INTEGER DEFAULT 0,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_device ON activity_events(device_id);
CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_events(category);
CREATE INDEX IF NOT EXISTS idx_activity_result ON activity_events(result);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_events(created_at);
CREATE INDEX IF NOT EXISTS idx_status_history_device ON device_status_history(device_id);
CREATE INDEX IF NOT EXISTS idx_heartbeats_router ON router_heartbeats(router_id);
CREATE INDEX IF NOT EXISTS idx_omada_devices_controller ON omada_devices(controller_id);
