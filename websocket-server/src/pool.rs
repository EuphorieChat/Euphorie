// src/pool.rs (Object pooling for memory optimization)
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct ObjectPool<T> {
    objects: Arc<Mutex<Vec<T>>>,
    factory: Box<dyn Fn() -> T + Send + Sync>,
}

impl<T> ObjectPool<T> {
    pub fn new<F>(factory: F) -> Self 
    where
        F: Fn() -> T + Send + Sync + 'static,
    {
        Self {
            objects: Arc::new(Mutex::new(Vec::new())),
            factory: Box::new(factory),
        }
    }
    
    pub async fn get(&self) -> T {
        let mut objects = self.objects.lock().await;
        objects.pop().unwrap_or_else(|| (self.factory)())
    }
    
    pub async fn return_object(&self, object: T) {
        let mut objects = self.objects.lock().await;
        if objects.len() < 1000 { // Limit pool size
            objects.push(object);
        }
    }
}