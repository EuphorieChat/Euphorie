from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve as static_serve
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),  # Login/logout/password routes
    path('', include('chat.urls')),                          # Your main chat app
]

# Serve static and media files in development (needed for Daphne)
if settings.DEBUG:
    from django.conf.urls.static import static

    # Static files (served from STATICFILES_DIRS)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
