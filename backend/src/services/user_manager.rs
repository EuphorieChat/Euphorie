use crate::models::User;
use std::collections::HashMap;

pub struct UserManager {
    users: HashMap<String, User>,
}

impl UserManager {
    pub fn new() -> Self {
        Self {
            users: HashMap::new(),
        }
    }

    pub fn add_user(&mut self, user: User) {
        self.users.insert(user.id.clone(), user);
    }

    pub fn remove_user(&mut self, user_id: &str) {
        self.users.remove(user_id);
    }

    pub fn get_user(&self, user_id: &str) -> Option<&User> {
        self.users.get(user_id)
    }

    pub fn update_user(&mut self, user: User) {
        self.users.insert(user.id.clone(), user);
    }
}
