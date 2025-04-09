from django.urls import path
from . import views
from .views import upload_media

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('', views.index, name='index'),
    path('chat/<str:room_name>/', views.room, name='room'),
    path('delete-room/<str:room_name>/', views.delete_room, name='delete_room'),
    path('load-more-rooms/', views.load_more_rooms, name='load_more_rooms'),
    path('upload-media/', views.upload_media, name='upload_media'),
]
