from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from .views import upload_media

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('', views.index, name='index'),
    # Updated login view with the correct template path in registration directory
    path('login/', auth_views.LoginView.as_view(
        template_name='registration/login.html',  # Point to the correct template location
        redirect_authenticated_user=True
    ), name='login'),
    path('logout/', auth_views.LogoutView.as_view(
        template_name='registration/logged_out.html'  # Also update logout template
    ), name='logout'),
    path('chat/<str:room_name>/', views.room, name='room'),
    path('delete-room/<str:room_name>/', views.delete_room, name='delete_room'),
    path('load-more-rooms/', views.load_more_rooms, name='load_more_rooms'),
    path('upload/', views.upload_media, name='upload_media'),
]
