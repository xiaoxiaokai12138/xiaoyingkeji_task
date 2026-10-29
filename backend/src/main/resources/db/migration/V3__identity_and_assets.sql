CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    demo_key VARCHAR(40) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO users(id, demo_key, display_name) VALUES ('demo-alice', 'alice', 'Alice'), ('demo-bob', 'bob', 'Bob');
CREATE TABLE sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE assets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    purpose VARCHAR(10) NOT NULL,
    storage_path VARCHAR(255) NOT NULL,
    mime_type VARCHAR(40) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_assets_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
