use std::env;
use tracing::info;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub server_host: String,
    pub server_port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        dotenv::dotenv().ok();

        // Build DATABASE_URL from individual components
        let postgres_host =
            env::var("POSTGRES_HOST").unwrap_or_else(|_| "host.docker.internal".to_string());
        let postgres_port = env::var("POSTGRES_PORT").unwrap_or_else(|_| "5433".to_string());
        let postgres_database =
            env::var("POSTGRES_DATABASE").expect("POSTGRES_DATABASE must be set");
        let postgres_user = env::var("POSTGRES_USER").expect("POSTGRES_USER must be set");
        let postgres_password =
            env::var("POSTGRES_PASSWORD").expect("POSTGRES_PASSWORD must be set");

        let database_url = format!(
            "postgresql://{}:{}@{}:{}/{}",
            postgres_user, postgres_password, postgres_host, postgres_port, postgres_database
        );

        // Log the database connection info (masking password)
        info!(
            "Database URL constructed: postgresql://{}:****@{}:{}/{}",
            postgres_user, postgres_host, postgres_port, postgres_database
        );

        Self {
            database_url,
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("SERVER_PORT must be a valid u16"),
        }
    }
}
