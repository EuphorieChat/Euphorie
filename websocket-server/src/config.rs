#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub max_connections: usize,
    pub max_rooms: usize,
    pub max_users_per_room: usize,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 9001,
            max_connections: 10000,
            max_rooms: 50,
            max_users_per_room: 100,
        }
    }
}
