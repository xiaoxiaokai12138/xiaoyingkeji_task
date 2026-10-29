CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(64) NOT NULL,
    template_title VARCHAR(100) NOT NULL,
    client_request_id VARCHAR(36) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL,
    stage VARCHAR(20),
    simulation_json JSON NOT NULL,
    result_asset_id VARCHAR(36),
    failed_stage VARCHAR(20),
    error_code VARCHAR(50),
    error_message VARCHAR(500),
    created_at DATETIME(6) NOT NULL,
    started_at DATETIME(6),
    finished_at DATETIME(6),
    version BIGINT NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (result_asset_id) REFERENCES assets(id),
    UNIQUE KEY uk_task_request (user_id, client_request_id),
    INDEX idx_tasks_user_created (user_id, created_at, id),
    INDEX idx_tasks_queue (status, created_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE task_assets (
    task_id VARCHAR(36) NOT NULL,
    asset_id VARCHAR(36) NOT NULL,
    slot_index INT NOT NULL,
    PRIMARY KEY(task_id, asset_id),
    UNIQUE KEY uk_task_slot (task_id, slot_index),
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(asset_id) REFERENCES assets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE task_steps (
    task_id VARCHAR(36) NOT NULL,
    stage VARCHAR(20) NOT NULL,
    status VARCHAR(16) NOT NULL,
    started_at DATETIME(6) NOT NULL,
    finished_at DATETIME(6),
    error_message VARCHAR(500),
    PRIMARY KEY(task_id, stage),
    FOREIGN KEY(task_id) REFERENCES tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
