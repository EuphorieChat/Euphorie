"""
ML-based ranking for personalized recommendations
"""
import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from django.utils import timezone
import lightgbm as lgb
import pickle
import os
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class RoomRanker:
    """Ranks rooms based on various signals using LightGBM"""
    
    def __init__(self):
        self.model = None
        self.model_path = os.path.join(
            settings.BASE_DIR, 'chat', 'recs', 'models', 'ranker.pkl'
        )
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
    
    def extract_features(self, user, room, context=None):
        """Extract features for ranking"""
        from chat.models import Message, UserActivity, Friendship
        
        features = {}
        
        # Room features
        features['room_message_count'] = room.message_count or 0
        features['room_active_users'] = room.active_users_count or 0
        features['room_is_public'] = 1 if room.is_public else 0
        features['room_age_days'] = (timezone.now() - room.created_at).days
        
        # Calculate room activity score (messages per day)
        if features['room_age_days'] > 0:
            features['room_activity_rate'] = features['room_message_count'] / features['room_age_days']
        else:
            features['room_activity_rate'] = features['room_message_count']
        
        # User-room interaction features
        if user and user.is_authenticated:
            # Has user been in this room?
            user_messages = Message.objects.filter(
                user=user, 
                room=room
            ).count()
            features['user_messages_in_room'] = user_messages
            features['user_has_visited'] = 1 if user_messages > 0 else 0
            
            # Is the user friends with the room creator?
            is_friend = 0
            if room.creator:
                is_friend = Friendship.objects.filter(
                    user=user,
                    friend=room.creator,
                    status='accepted'
                ).exists()
            features['creator_is_friend'] = 1 if is_friend else 0
            
            # How many friends are in this room?
            friends_in_room = 0
            if hasattr(Friendship, 'objects'):
                friend_ids = Friendship.objects.filter(
                    user=user,
                    status='accepted'
                ).values_list('friend_id', flat=True)
                
                friends_in_room = Message.objects.filter(
                    room=room,
                    user_id__in=friend_ids
                ).values('user').distinct().count()
            
            features['friends_in_room'] = friends_in_room
        else:
            features['user_messages_in_room'] = 0
            features['user_has_visited'] = 0
            features['creator_is_friend'] = 0
            features['friends_in_room'] = 0
        
        # Time-based features
        now = timezone.now()
        last_activity = room.last_activity or room.created_at
        hours_since_activity = (now - last_activity).total_seconds() / 3600
        features['hours_since_activity'] = hours_since_activity
        
        # Recency scores
        if hours_since_activity < 1:
            features['recency_score'] = 1.0
        elif hours_since_activity < 24:
            features['recency_score'] = 0.8
        elif hours_since_activity < 24 * 7:
            features['recency_score'] = 0.5
        else:
            features['recency_score'] = 0.2
        
        # Category features (one-hot encoding simplified)
        if room.category:
            features['has_category'] = 1
            # You could add specific category features here
        else:
            features['has_category'] = 0
        
        # Context features (e.g., time of day, day of week)
        if context:
            features.update(context)
        
        return features
    
    def prepare_training_data(self, interactions):
        """Prepare training data from user interactions"""
        X = []
        y = []
        
        for interaction in interactions:
            features = self.extract_features(
                interaction['user'],
                interaction['room'],
                interaction.get('context')
            )
            X.append(list(features.values()))
            
            # Label: 1 if user engaged (sent message), 0 otherwise
            y.append(interaction['engaged'])
        
        return np.array(X), np.array(y)
    
    def train_model(self, interactions):
        """Train the ranking model"""
        X, y = self.prepare_training_data(interactions)
        
        # Split into train/validation
        split_idx = int(0.8 * len(X))
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        
        # Train LightGBM
        train_data = lgb.Dataset(X_train, label=y_train)
        val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)
        
        params = {
            'objective': 'binary',
            'metric': 'auc',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'verbose': -1
        }
        
        self.model = lgb.train(
            params,
            train_data,
            valid_sets=[val_data],
            num_boost_round=100,
            callbacks=[lgb.early_stopping(10), lgb.log_evaluation(0)]
        )
        
        # Save model
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
        
        logger.info("Ranking model trained and saved")
    
    def load_model(self):
        """Load trained model from disk"""
        if os.path.exists(self.model_path):
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            return True
        return False
    
    def rank_rooms(
        self, 
        user, 
        candidate_rooms: List, 
        context: Optional[Dict] = None
    ) -> List[Tuple[object, float]]:
        """Rank candidate rooms for a user"""
        if self.model is None:
            if not self.load_model():
                # Fallback to heuristic ranking
                return self.heuristic_rank(user, candidate_rooms)
        
        # Extract features for all candidates
        room_scores = []
        for room in candidate_rooms:
            features = self.extract_features(user, room, context)
            X = np.array([list(features.values())])
            
            try:
                score = self.model.predict(X)[0]
            except:
                score = 0.5  # Default score on error
            
            room_scores.append((room, score))
        
        # Sort by score (descending)
        room_scores.sort(key=lambda x: x[1], reverse=True)
        return room_scores
    
    def heuristic_rank(self, user, candidate_rooms):
        """Fallback heuristic ranking when model isn't available"""
        room_scores = []
        
        for room in candidate_rooms:
            score = 0.0
            
            # Activity score
            score += min(room.message_count / 100.0, 1.0) * 0.3
            
            # Recency score
            if room.last_activity:
                hours_old = (timezone.now() - room.last_activity).total_seconds() / 3600
                if hours_old < 24:
                    score += 0.3
                elif hours_old < 24 * 7:
                    score += 0.2
                else:
                    score += 0.1
            
            # Public room bonus
            if room.is_public:
                score += 0.2
            
            # Active users bonus
            score += min(room.active_users_count / 10.0, 1.0) * 0.2
            
            room_scores.append((room, score))
        
        room_scores.sort(key=lambda x: x[1], reverse=True)
        return room_scores
