use crate::models::{Room, User};
use std::collections::HashMap;

pub struct RoomManager {
    rooms: HashMap<String, Room>,
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: HashMap::new(),
        }
    }

    pub fn create_room(&mut self, room: Room) {
        self.rooms.insert(room.id.clone(), room);
    }

    pub fn list_rooms(&self) -> Vec<&Room> {
        self.rooms.values().collect()
    }

    pub fn get_room(&self, room_id: &str) -> Option<&Room> {
        self.rooms.get(room_id)
    }

    pub fn add_user_to_room(&mut self, room_id: &str, user: User) -> Result<(), String> {
        if let Some(room) = self.rooms.get_mut(room_id) {
            if room.users.len() >= room.max_users as usize {
                return Err("Room is full".to_string());
            }
            room.users.insert(user.id.clone(), user);
            Ok(())
        } else {
            Err("Room not found".to_string())
        }
    }

    pub fn remove_user_from_room(&mut self, room_id: &str, user_id: &str) -> Result<(), String> {
        if let Some(room) = self.rooms.get_mut(room_id) {
            room.users.remove(user_id);
            Ok(())
        } else {
            Err("Room not found".to_string())
        }
    }

    pub fn get_room_users(&self, room_id: &str) -> Result<Vec<User>, String> {
        if let Some(room) = self.rooms.get(room_id) {
            Ok(room.users.values().cloned().collect())
        } else {
            Err("Room not found".to_string())
        }
    }

    pub fn update_user_position(
        &mut self,
        room_id: &str,
        user_id: &str,
        position: (f32, f32, f32),
        rotation: (f32, f32, f32),
    ) -> Result<(), String> {
        if let Some(room) = self.rooms.get_mut(room_id) {
            if let Some(user) = room.users.get_mut(user_id) {
                user.position = position;
                user.rotation = rotation;
                Ok(())
            } else {
                Err("User not found in room".to_string())
            }
        } else {
            Err("Room not found".to_string())
        }
    }
}
