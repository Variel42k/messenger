CREATE TABLE IF NOT EXISTS oidc_provider_configs (
    id BIGSERIAL PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL DEFAULT 'Enterprise SSO',
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    issuer_uri VARCHAR(500),
    authorization_uri VARCHAR(500),
    token_uri VARCHAR(500),
    user_info_uri VARCHAR(500),
    jwks_uri VARCHAR(500),
    client_id VARCHAR(255),
    client_secret VARCHAR(500),
    scopes VARCHAR(255) NOT NULL DEFAULT 'openid profile email',
    redirect_uri VARCHAR(500),
    auto_provision_users BOOLEAN NOT NULL DEFAULT TRUE,
    default_role VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oidc_provider_enabled ON oidc_provider_configs(enabled);

CREATE TABLE IF NOT EXISTS federation_clusters (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    api_base_url VARCHAR(500) NOT NULL UNIQUE,
    health_endpoint VARCHAR(255) NOT NULL DEFAULT '/actuator/health',
    status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    last_checked_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_federation_clusters_status ON federation_clusters(status);

CREATE TABLE IF NOT EXISTS cluster_federations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS federation_cluster_members (
    federation_id BIGINT NOT NULL REFERENCES cluster_federations(id) ON DELETE CASCADE,
    cluster_id BIGINT NOT NULL REFERENCES federation_clusters(id) ON DELETE CASCADE,
    PRIMARY KEY (federation_id, cluster_id)
);

CREATE INDEX IF NOT EXISTS idx_federation_cluster_members_cluster_id
    ON federation_cluster_members(cluster_id);
