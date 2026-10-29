CREATE TABLE app_metadata (
    config_key VARCHAR(64) PRIMARY KEY,
    config_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO app_metadata(config_key, config_value) VALUES ('application', 'material-studio');
