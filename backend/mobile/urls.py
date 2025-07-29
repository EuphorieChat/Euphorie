from django.urls import path
from . import views

urlpatterns = [
    path('', views.mobile_app_view, name='mobile_app'),
]