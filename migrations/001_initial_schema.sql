-- XCLOUD.NET PostgreSQL Schema Migration 001
-- Production Hotspot Billing and ISP Management Platform

CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(64),
    slug VARCHAR(128) UNIQUE NOT NULL,
    phone VARCHAR(32),
    currency VARCHAR(8) DEFAULT 'TZS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'STAFF', -- SUPER_ADMIN, ORG_ADMIN, STAFF, AGENT
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    phone VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 7000.00,
    currency VARCHAR(8) DEFAULT 'TZS',
    duration_days INTEGER NOT NULL DEFAULT 30,
    device_limit INTEGER NOT NULL DEFAULT 5,
    grace_period_days INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS org_subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, ACTIVE, PAST_DUE, GRACE_PERIOD, EXPIRED, SUSPENDED, CANCELLED
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    grace_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    device_limit INTEGER NOT NULL DEFAULT 5,
    auto_renew BOOLEAN DEFAULT FALSE,
    last_payment_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(8) DEFAULT 'TZS',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, VOID, OVERDUE
    type VARCHAR(64) NOT NULL, -- PLATFORM_SUBSCRIPTION, HOTSPOT_PACKAGE, AGENT_FLOAT_TOPUP
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE SET NULL,
    reference VARCHAR(128) UNIQUE NOT NULL,
    provider_reference VARCHAR(128),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(8) DEFAULT 'TZS',
    payment_method VARCHAR(32) NOT NULL, -- SELCOM, MPESA, TIGO_PESA, AIRTEL_MONEY, HALOPESA, CASH, BANK_TRANSFER, AGENT_WALLET
    payment_type VARCHAR(64) NOT NULL, -- PLATFORM_SUBSCRIPTION, HOTSPOT_PACKAGE, AGENT_FLOAT_TOPUP
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, PENDING_VERIFICATION, COMPLETED, FAILED, REJECTED, REFUNDED
    customer_phone VARCHAR(32),
    customer_name VARCHAR(255),
    metadata JSONB,
    verified_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id VARCHAR(64) PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    event_id VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, event_id)
);

CREATE TABLE IF NOT EXISTS routers (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'MIKROTIK', -- MIKROTIK, OMADA, GENERIC_RADIUS
    ip_address VARCHAR(64),
    dns_name VARCHAR(255),
    api_port INTEGER DEFAULT 8728,
    ros_version VARCHAR(16) DEFAULT 'v7',
    status VARCHAR(32) DEFAULT 'OFFLINE', -- ONLINE, OFFLINE, UNCONFIGURED
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    identity VARCHAR(255),
    serial_number VARCHAR(128),
    location VARCHAR(255),
    installation_token_hash VARCHAR(255),
    installation_token_expires_at TIMESTAMP WITH TIME ZONE,
    installation_token_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotspot_packages (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    data_limit_mb INTEGER DEFAULT 0, -- 0 = unlimited
    upload_speed_kbps INTEGER DEFAULT 2048,
    download_speed_kbps INTEGER DEFAULT 4096,
    simultaneous_devices INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    package_id VARCHAR(64) NOT NULL REFERENCES hotspot_packages(id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    batch_id VARCHAR(64),
    status VARCHAR(32) DEFAULT 'ACTIVE', -- ACTIVE, USED, EXPIRED, REVOKED
    price NUMERIC(12, 2) NOT NULL,
    customer_phone VARCHAR(32),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    used_by_mac VARCHAR(64),
    used_by_ip VARCHAR(64),
    sold_by_agent_id VARCHAR(64),
    transaction_id VARCHAR(64) REFERENCES payment_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS hotspot_sessions (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    router_id VARCHAR(64) REFERENCES routers(id) ON DELETE CASCADE,
    voucher_code VARCHAR(64) NOT NULL,
    username VARCHAR(128) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    mac_address VARCHAR(64) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accounting_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    session_time_seconds INTEGER DEFAULT 0,
    terminate_cause VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    commission_rate_percent NUMERIC(5, 2) DEFAULT 10.00,
    wallet_balance NUMERIC(12, 2) DEFAULT 0.00,
    total_commission_earned NUMERIC(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) REFERENCES agents(id) ON DELETE SET NULL,
    type VARCHAR(32) NOT NULL, -- FLOAT_CREDIT, FLOAT_DEBIT, COMMISSION_CREDIT, VOUCHER_SALE, PAYOUT
    amount NUMERIC(12, 2) NOT NULL,
    balance_before NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference VARCHAR(128) NOT NULL,
    description TEXT,
    performed_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS omada_controllers (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    controller_url VARCHAR(255) NOT NULL,
    site_id VARCHAR(128) NOT NULL,
    operator_username VARCHAR(128) NOT NULL,
    operator_password_encrypted TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'DISCONNECTED', -- CONNECTED, DISCONNECTED, ERROR
    last_checked_at TIMESTAMP WITH TIME ZONE,
    last_error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64),
    details JSONB,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEXES FOR FAST QUERYING AND TENANT ISOLATION
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_routers_org ON routers(organization_id);
CREATE INDEX IF NOT EXISTS idx_routers_status ON routers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_org_code ON vouchers(organization_id, code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_transactions_org ON payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ref ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_sessions_org ON hotspot_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON hotspot_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_ledger_org ON ledger_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_ledger_agent ON ledger_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
