# backend/euphorie_project/settings.py
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import environ
from django.core.exceptions import ImproperlyConfigured

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Grok API Configuration
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')  # Store in environment variable
GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

# Load environment variables
load_dotenv()

# Security
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-your-secret-key-change-in-production')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
ALLOWED_HOSTS = ['*']  # Allow all hosts - safe when behind reverse proxy

# ==================== STRIPE CONFIGURATION ====================

# Stripe Configuration - Added for payment system
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')

# Validate Stripe configuration in production
if not DEBUG:
    if not STRIPE_PUBLISHABLE_KEY or not STRIPE_SECRET_KEY:
        raise ImproperlyConfigured("Please set STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY environment variables")

# Payment Settings
PAYMENT_SETTINGS = {
    'ENABLE_PAYMENTS': True,
    'REQUIRE_PAYMENT_FOR_LARGE_ROOMS': True,
    'FREE_TIER_MAX_USERS': 10,
    'PREMIUM_TIER_MAX_USERS': 50,
    'ENTERPRISE_TIER_MAX_USERS': 200,
    'PAYMENT_SUCCESS_REDIRECT': '/payment/success/',
    'PAYMENT_CANCEL_REDIRECT': '/pricing/',
    'SUBSCRIPTION_TRIAL_DAYS': 0,  # No trial period
    'ALLOW_SUBSCRIPTION_DOWNGRADES': True,
    'WEBHOOK_TOLERANCE': 300,  # 5 minutes
}

# Applications
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'django.contrib.humanize', 
    'chat',
    'mobile',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.microsoft',
    'allauth.socialaccount.providers.apple',
    'widget_tweaks'
]

# Optional GIS support for enhanced nationality detection
try:
    import django.contrib.gis
    INSTALLED_APPS.append('django.contrib.gis')
    GIS_ENABLED = True
except ImportError:
    GIS_ENABLED = False

SITE_ID = 1

# Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'chat.middleware.FaviconMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'csp.middleware.CSPMiddleware',  
    'chat.middleware.NationalityMiddleware',  # Moved after authentication middleware
]

ROOT_URLCONF = 'euphorie_project.urls'

# Templates
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR.parent / 'frontend' / 'templates',
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'chat.context_processors.favicon_context',
                'chat.context_processors.global_context',
                'chat.context_processors.nationality_context',  # Added nationality context
            ],
        },
    },
]

WSGI_APPLICATION = 'euphorie_project.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

CSRF_TRUSTED_ORIGINS = [
    'https://euphorie.com',
    'https://www.euphorie.com',
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR.parent / 'frontend' / 'static',
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]

# WhiteNoise configuration
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True if DEBUG else False
WHITENOISE_SKIP_COMPRESS_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'zip', 'gz', 'tgz', 'bz2', 'tbz', 'xz', 'br']

# FAVICON CONFIGURATION
FAVICON_CONFIG = {
    'favicon.ico': 'css/favicon.ico',
    'favicon-16x16.png': 'css/favicon-16x16.png', 
    'favicon-32x32.png': 'css/favicon-32x32.png',
    'apple-touch-icon.png': 'css/apple-touch-icon-180x180.png',
}

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==================== NATIONALITY & GEOLOCATION CONFIGURATION ====================

# GeoIP2 Configuration for nationality detection (optional)
GEOIP_PATH = BASE_DIR / 'geoip2'

# Only enable GeoIP2 if both GIS and geoip2 are available
try:
    import geoip2
    if GIS_ENABLED:
        GEOIP_ENABLED = True
    else:
        GEOIP_ENABLED = False
        import warnings
        warnings.warn("GeoIP2 library found but django.contrib.gis not available. Using fallback APIs.")
except ImportError:
    GEOIP_ENABLED = False

# Nationality System Settings
NATIONALITY_SETTINGS = {
    'ENABLE_AUTO_DETECTION': True,
    'ENABLE_MANUAL_SELECTION': True,
    'ENABLE_FLAG_DISPLAY': True,
    'DEFAULT_COUNTRY': 'UN',  # Unknown country fallback
    'CACHE_TIMEOUT': 86400,  # 24 hours
    'API_TIMEOUT': 5,  # 5 seconds
    'ENABLE_STATISTICS': True,
    'UPDATE_STATS_INTERVAL': 3600,  # 1 hour
    'FALLBACK_APIS': [
        'https://ipapi.co/{ip}/country_code/',
        'http://ip-api.com/json/{ip}?fields=countryCode',
    ],
    'ENABLE_FRIEND_SUGGESTIONS': True,
    'ENABLE_ROOM_DEMOGRAPHICS': True,
    'FLAG_CDN_URL': 'https://flagcdn.com/w{size}/{country}.png',
    'SUPPORTED_FLAG_SIZES': [16, 20, 24, 32, 40, 48, 64],
}

# IP Geolocation APIs Configuration
GEOLOCATION_APIS = {
    'primary': {
        'name': 'ipapi.co',
        'url': 'https://ipapi.co/{ip}/country_code/',
        'timeout': 5,
        'enabled': True,
    },
    'secondary': {
        'name': 'ip-api.com',
        'url': 'http://ip-api.com/json/{ip}?fields=countryCode',
        'timeout': 5,
        'enabled': True,
    },
    'fallback': {
        'name': 'browser_locale',
        'enabled': True,
    }
}

# Country choices for forms and validation
COUNTRY_CHOICES = [
    ('US', 'United States'), ('CA', 'Canada'), ('GB', 'United Kingdom'),
    ('DE', 'Germany'), ('FR', 'France'), ('JP', 'Japan'), ('AU', 'Australia'),
    ('BR', 'Brazil'), ('IN', 'India'), ('CN', 'China'), ('KR', 'South Korea'),
    ('RU', 'Russia'), ('MX', 'Mexico'), ('IT', 'Italy'), ('ES', 'Spain'),
    ('NL', 'Netherlands'), ('SE', 'Sweden'), ('NO', 'Norway'), ('FI', 'Finland'),
    ('DK', 'Denmark'), ('BE', 'Belgium'), ('CH', 'Switzerland'), ('AT', 'Austria'),
    ('PL', 'Poland'), ('TR', 'Turkey'), ('GR', 'Greece'), ('PT', 'Portugal'),
    ('IE', 'Ireland'), ('CZ', 'Czech Republic'), ('HU', 'Hungary'), ('RO', 'Romania'),
    ('BG', 'Bulgaria'), ('HR', 'Croatia'), ('SK', 'Slovakia'), ('SI', 'Slovenia'),
    ('LT', 'Lithuania'), ('LV', 'Latvia'), ('EE', 'Estonia'), ('AR', 'Argentina'),
    ('CL', 'Chile'), ('PE', 'Peru'), ('CO', 'Colombia'), ('VE', 'Venezuela'),
    ('UY', 'Uruguay'), ('PY', 'Paraguay'), ('BO', 'Bolivia'), ('EC', 'Ecuador'),
    ('ZA', 'South Africa'), ('EG', 'Egypt'), ('MA', 'Morocco'), ('NG', 'Nigeria'),
    ('KE', 'Kenya'), ('GH', 'Ghana'), ('TH', 'Thailand'), ('VN', 'Vietnam'),
    ('PH', 'Philippines'), ('ID', 'Indonesia'), ('MY', 'Malaysia'), ('SG', 'Singapore'),
    ('UN', 'Unknown'),
]

# ==================== AUTHENTICATION CONFIGURATION ====================

# Authentication backends
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

# Django Auth URLs - Point to allauth
LOGIN_URL = '/accounts/login/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

# Allauth settings for seamless authentication
ACCOUNT_LOGIN_METHODS = {'username', 'email'}  # Replaces ACCOUNT_AUTHENTICATION_METHOD
ACCOUNT_SIGNUP_FIELDS = ['email*', 'username*', 'password1*', 'password2*']  # Replaces EMAIL_REQUIRED and USERNAME_REQUIRED
ACCOUNT_EMAIL_VERIFICATION = 'none'  # Skip email verification for faster onboarding
ACCOUNT_USER_MODEL_USERNAME_FIELD = 'username'
ACCOUNT_USER_MODEL_EMAIL_FIELD = 'email'
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_SIGNUP_REDIRECT_URL = '/'
ACCOUNT_LOGIN_REDIRECT_URL = '/'
ACCOUNT_LOGOUT_REDIRECT_URL = '/'

# Customize allauth forms and templates
ACCOUNT_FORMS = {
    'login': 'allauth.account.forms.LoginForm',
    'signup': 'allauth.account.forms.SignupForm',
}

# Session configuration
SESSION_COOKIE_AGE = 1209600  # 2 weeks
SESSION_SAVE_EVERY_REQUEST = False 
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# Social account providers configuration
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'secret': os.getenv('GOOGLE_CLIENT_SECRET'),  
            'key': ''
        },
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'VERIFIED_EMAIL': True,
    },
    'microsoft': {
        'APP': {
            'client_id': os.getenv('MICROSOFT_CLIENT_ID'),
            'secret': os.getenv('MICROSOFT_CLIENT_SECRET'),
        },
        'SCOPE': [
            'User.Read',
        ],
        'VERIFIED_EMAIL': True,
    },
    'apple': {
        'APPS': [{
            'client_id': 'com.euphorie.webauth',
            'secret': 'LSGQ36SNK2',  # Key ID
            'key': 'YBASLHXF5R',    # Team ID
            'settings': {
                'certificate_key': """-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgrjihdOXAoiSDWNrO
LDC4MEIwOTuJLTghBVWNWwIsC8CgCgYIKoZIzj0DAQehRANCAAR+uQc7VKarQbUm
Knwlhx6XyEn8JHHwY4rvLQip/HPECEzq7GrU5jxYVp/2ajKWxEKZCspiZxH7YuQ9
yIR4XyYD
-----END PRIVATE KEY-----"""
            }
        }]
    }
}

# To force HTTPS for allauth
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'

# Social account settings for better UX
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_EMAIL_REQUIRED = True
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_QUERY_EMAIL = True
SOCIALACCOUNT_STORE_TOKENS = False

SOCIALACCOUNT_ADAPTER = 'allauth.socialaccount.adapter.DefaultSocialAccountAdapter'

# ==================== EUPHORIE SPECIFIC SETTINGS ====================

# Custom settings for the Euphorie platform - Updated for payment system
EUPHORIE_SETTINGS = {
    'VERSION': '1.3.0',  # Updated version for payment system
    'COMPANY_NAME': 'Euphorie, Inc.',
    'SUPPORT_EMAIL': 'euphorieinc@gmail.com',
    'MAX_ROOMS_PER_USER': 50,  # Increased for premium users
    'MAX_MESSAGE_LENGTH': 1000,
    'ROOM_INACTIVITY_TIMEOUT': 7200,  # 2 hours in seconds
    'ENABLE_3D_ROOMS': True,
    'ENABLE_FRIEND_SYSTEM': True,
    'ENABLE_MODERATION': True,
    'ENABLE_NATIONALITY_SYSTEM': True,  # Added nationality system
    'ENABLE_PAYMENT_SYSTEM': True,  # Added payment system
    'DEFAULT_ROOM_CATEGORY': 'general',
    'FEATURED_ROOMS_COUNT': 6,
    'RECENT_ROOMS_COUNT': 12,
    'MAX_FRIEND_REQUESTS': 50,
    'MESSAGE_RATE_LIMIT': 30,  # messages per minute
    'NATIONALITY_DISPLAY_DEFAULT': True,  # Show nationality flags by default
    'ENABLE_NATIONALITY_SUGGESTIONS': True,  # Enable nationality-based friend suggestions
    'ENABLE_ROOM_DEMOGRAPHICS': True,  # Enable room nationality demographics
    'DEFAULT_ROOM_MAX_USERS': 10,  # Free tier limit
    'ENABLE_PREMIUM_FEATURES': True,  # Enable premium features
    'SUBSCRIPTION_TRIAL_DAYS': 0,  # No trial period
}

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
FILE_UPLOAD_PERMISSIONS = 0o644

# Cache configuration (for production use Redis)
if DEBUG:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        },
        'nationality': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'nationality-cache',
            'TIMEOUT': 86400,  # 24 hours
        },
        'payment': {  # Added payment cache
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'payment-cache',
            'TIMEOUT': 3600,  # 1 hour
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        },
        'nationality': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/2'),
            'TIMEOUT': 86400,  # 24 hours
        },
        'payment': {  # Added payment cache
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/3'),
            'TIMEOUT': 3600,  # 1 hour
        }
    }

# Email configuration - Updated for payment notifications
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
    DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@euphorie.com')

# Additional email settings for payment notifications
EMAIL_SUBJECT_PREFIX = '[Euphorie] '
SERVER_EMAIL = DEFAULT_FROM_EMAIL if not DEBUG else 'root@localhost'

# Security settings for production
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_REDIRECT_EXEMPT = []
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Logging configuration - Updated for payment system
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'euphorie.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'nationality_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'nationality.log',
            'formatter': 'verbose',
        },
        'payment_file': {  # Added payment logging
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'payments.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',  # Changed from WARNING to INFO for better debugging
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG' if DEBUG else 'INFO',  # More verbose in debug mode
            'propagate': False,
        },
        'allauth': {
            'handlers': ['console'],
            'level': 'DEBUG',  # Always debug for OAuth troubleshooting
            'propagate': False,
        },
        'allauth.socialaccount.providers.apple': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'allauth.socialaccount.providers.apple.client': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'chat': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'chat.middleware': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'chat.nationality': {
            'handlers': ['nationality_file', 'console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'chat.payments': {  # Added payment logging
            'handlers': ['payment_file', 'console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'stripe': {  # Added Stripe logging
            'handlers': ['payment_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Performance optimizations
if not DEBUG:
    CONN_MAX_AGE = 60
    DATABASES['default']['CONN_MAX_AGE'] = CONN_MAX_AGE

# Message framework
MESSAGE_TAGS = {
    50: 'critical',  # CRITICAL
    40: 'error',     # ERROR
    30: 'warning',   # WARNING
    25: 'success',   # SUCCESS
    20: 'info',      # INFO
    10: 'debug',     # DEBUG
}

# Create directories
os.makedirs(STATIC_ROOT, exist_ok=True)
os.makedirs(MEDIA_ROOT, exist_ok=True)
os.makedirs(BASE_DIR / 'logs', exist_ok=True)
os.makedirs(GEOIP_PATH, exist_ok=True)  # Create GeoIP2 directory

# WebSocket settings (for future real-time features)
ASGI_APPLICATION = 'euphorie_project.asgi.application'

# Admin interface customization
ADMIN_SITE_HEADER = "Euphorie Administration"
ADMIN_SITE_TITLE = "Euphorie Admin Portal"
ADMIN_INDEX_TITLE = "Welcome to Euphorie Administration"

# Internationalization settings
USE_L10N = True
LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

# Custom user model (for future use)
# AUTH_USER_MODEL = 'chat.User'  # Uncomment if you create a custom user model

# ==================== NATIONALITY SYSTEM TASKS ====================

# Celery configuration for background tasks (optional)
if os.getenv('CELERY_BROKER_URL'):
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', CELERY_BROKER_URL)
    CELERY_ACCEPT_CONTENT = ['json']
    CELERY_TASK_SERIALIZER = 'json'
    CELERY_RESULT_SERIALIZER = 'json'
    CELERY_TIMEZONE = TIME_ZONE
    CELERY_ENABLE_UTC = True
    
    # Scheduled tasks for nationality and payment system
    CELERY_BEAT_SCHEDULE = {
        'update-nationality-stats': {
            'task': 'chat.tasks.update_nationality_stats',
            'schedule': 3600.0,  # Every hour
        },
        'cleanup-old-geolocation-cache': {
            'task': 'chat.tasks.cleanup_geolocation_cache',
            'schedule': 86400.0,  # Every day
        },
        'update-payment-stats': {  # Added payment stats task
            'task': 'chat.tasks.update_payment_stats',
            'schedule': 3600.0,  # Every hour
        },
        'check-subscription-expiry': {  # Added subscription expiry check
            'task': 'chat.tasks.check_subscription_expiry',
            'schedule': 86400.0,  # Every day
        },
    }

# ==================== RATE LIMITING ====================

# Rate limiting for nationality and payment API endpoints
RATELIMIT_SETTINGS = {
    'NATIONALITY_API': {
        'rate': '100/h',  # 100 requests per hour per IP
        'block': True,
    },
    'GEOLOCATION_API': {
        'rate': '50/h',  # 50 requests per hour per IP
        'block': True,
    },
    'PAYMENT_API': {  # Added payment rate limiting
        'rate': '20/h',  # 20 payment attempts per hour per IP
        'block': True,
    },
    'WEBHOOK_API': {  # Added webhook rate limiting
        'rate': '1000/h',  # 1000 webhook calls per hour
        'block': False,  # Don't block webhooks, just log
    },
}

# ==================== SECURITY HEADERS ====================

# Additional security headers for nationality and payment system
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
SECURE_REFERRER_POLICY = 'same-origin'

# Content Security Policy (CSP) for flag images and Stripe
CSP_DEFAULT_SRC = ["'self'"]
CSP_IMG_SRC = ["'self'", 'https://flagcdn.com', 'data:']
CSP_SCRIPT_SRC = ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com']  # Added Stripe
CSP_STYLE_SRC = ["'self'", "'unsafe-inline'"]
CSP_CONNECT_SRC = ["'self'", 'https://api.stripe.com']  # Added Stripe API
CSP_FRAME_SRC = ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com']  # Added Stripe frames

# ==================== DEVELOPMENT SETTINGS ====================

# Development-specific settings
if DEBUG:
    # Add development middleware
    try:
        import debug_toolbar
        INSTALLED_APPS.append('debug_toolbar')
        MIDDLEWARE.insert(1, 'debug_toolbar.middleware.DebugToolbarMiddleware')
        INTERNAL_IPS = ['127.0.0.1', 'localhost']
        DEBUG_TOOLBAR_CONFIG = {
            'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
        }
        
        # Debug toolbar panels
        DEBUG_TOOLBAR_PANELS = [
            'debug_toolbar.panels.history.HistoryPanel',
            'debug_toolbar.panels.versions.VersionsPanel',
            'debug_toolbar.panels.timer.TimerPanel',
            'debug_toolbar.panels.settings.SettingsPanel',
            'debug_toolbar.panels.headers.HeadersPanel',
            'debug_toolbar.panels.request.RequestPanel',
            'debug_toolbar.panels.sql.SQLPanel',
            'debug_toolbar.panels.staticfiles.StaticFilesPanel',
            'debug_toolbar.panels.templates.TemplatesPanel',
            'debug_toolbar.panels.cache.CachePanel',
            'debug_toolbar.panels.signals.SignalsPanel',
            'debug_toolbar.panels.logging.LoggingPanel',
            'debug_toolbar.panels.redirects.RedirectsPanel',
            'debug_toolbar.panels.profiling.ProfilingPanel',
        ]
    except ImportError:
        pass
    
    # Disable cache in development
    CACHES['default']['OPTIONS'] = {
        'MAX_ENTRIES': 100,
    }
    
    # Development nationality settings
    NATIONALITY_SETTINGS.update({
        'ENABLE_DEBUG_LOGGING': True,
        'CACHE_TIMEOUT': 300,  # 5 minutes for development
        'API_TIMEOUT': 10,  # Longer timeout for development
    })
    
    # Development payment settings
    PAYMENT_SETTINGS.update({
        'ENABLE_DEBUG_LOGGING': True,
        'WEBHOOK_TOLERANCE': 600,  # 10 minutes for development
    })

# ==================== TESTING SETTINGS ====================

# Test settings
if 'test' in sys.argv:
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:'
    }
    PASSWORD_HASHERS = [
        'django.contrib.auth.hashers.MD5PasswordHasher',
    ]
    
    # Disable nationality detection in tests
    NATIONALITY_SETTINGS.update({
        'ENABLE_AUTO_DETECTION': False,
        'ENABLE_STATISTICS': False,
    })
    
    # Disable payments in tests
    PAYMENT_SETTINGS.update({
        'ENABLE_PAYMENTS': False,
    })
    
    # Use dummy cache for tests
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        },
        'nationality': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        },
        'payment': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

# ==================== OPTIONAL PACKAGES ====================

# Optional packages for enhanced functionality
OPTIONAL_APPS = []

# Stripe for payments
try:
    import stripe
    OPTIONAL_APPS.append('stripe')
    STRIPE_ENABLED = True
except ImportError:
    STRIPE_ENABLED = False
    if PAYMENT_SETTINGS.get('ENABLE_PAYMENTS'):
        import warnings
        warnings.warn("Payment system enabled but stripe package not installed")

# GeoIP2 for better nationality detection (requires GDAL)
try:
    import geoip2
    if GIS_ENABLED:
        OPTIONAL_APPS.append('geoip2')
        GEOIP_ENABLED = True
    else:
        GEOIP_ENABLED = False
except ImportError:
    GEOIP_ENABLED = False

# Redis for production caching
try:
    import redis
    OPTIONAL_APPS.append('redis')
    REDIS_ENABLED = True
except ImportError:
    REDIS_ENABLED = False

# Requests for API calls
try:
    import requests
    OPTIONAL_APPS.append('requests')
    REQUESTS_ENABLED = True
except ImportError:
    REQUESTS_ENABLED = False

# ==================== FEATURE FLAGS ====================

# Feature flags for gradual rollout
FEATURE_FLAGS = {
    'NATIONALITY_SYSTEM': True,
    'NATIONALITY_AUTO_DETECTION': True,
    'NATIONALITY_FRIEND_SUGGESTIONS': True,
    'NATIONALITY_ROOM_DEMOGRAPHICS': True,
    'NATIONALITY_ADMIN_STATS': True,
    'NATIONALITY_API_ENDPOINTS': True,
    'NATIONALITY_MIDDLEWARE': True,
    'NATIONALITY_CONTEXT_PROCESSOR': True,
    'PAYMENT_SYSTEM': True,  # Added payment system flag
    'PAYMENT_STRIPE_INTEGRATION': True,  # Added Stripe integration flag
    'PAYMENT_SUBSCRIPTION_MANAGEMENT': True,  # Added subscription management flag
    'PAYMENT_ROOM_ACCESS_CONTROL': True,  # Added room access control flag
    'PAYMENT_ADMIN_INTERFACE': True,  # Added payment admin interface flag
}

# Environment-specific feature flags
if DEBUG:
    FEATURE_FLAGS.update({
        'NATIONALITY_DEBUG_LOGGING': True,
        'NATIONALITY_VERBOSE_ERRORS': True,
        'PAYMENT_DEBUG_LOGGING': True,  # Added payment debug logging
        'PAYMENT_VERBOSE_ERRORS': True,  # Added payment verbose errors
    })

# ==================== IMPORT LOCAL SETTINGS ====================

# Import local settings if they exist
try:
    from .local_settings import *
except ImportError:
    pass

# ==================== SETTINGS VALIDATION ====================

# Validate essential settings
if not SECRET_KEY or SECRET_KEY == 'django-insecure-your-secret-key-change-in-production':
    if not DEBUG:
        raise ValueError("SECRET_KEY must be set in production")

# Validate nationality settings
if NATIONALITY_SETTINGS.get('ENABLE_AUTO_DETECTION') and not REQUESTS_ENABLED:
    import warnings
    warnings.warn("Nationality auto-detection enabled but requests package not installed")

# Validate payment settings
if PAYMENT_SETTINGS.get('ENABLE_PAYMENTS'):
    if not STRIPE_ENABLED:
        import warnings
        warnings.warn("Payment system enabled but stripe package not installed")
    
    if not DEBUG and (not STRIPE_PUBLISHABLE_KEY or not STRIPE_SECRET_KEY):
        import warnings
        warnings.warn("Payment system enabled but Stripe keys not configured for production")

# Validate GeoIP2 settings
if GEOIP_ENABLED and not GEOIP_PATH.exists():
    import warnings
    warnings.warn(f"GeoIP2 enabled but path {GEOIP_PATH} does not exist")
elif not GIS_ENABLED and NATIONALITY_SETTINGS.get('ENABLE_AUTO_DETECTION'):
    import warnings
    warnings.warn("GeoIP2 not available (requires GDAL). Using fallback APIs for nationality detection.")

# Print system status in debug mode
if DEBUG:
    print(f"🌍 Nationality System Status:")
    print(f"  - Auto-detection: {'✅' if NATIONALITY_SETTINGS['ENABLE_AUTO_DETECTION'] else '❌'}")
    print(f"  - Manual selection: {'✅' if NATIONALITY_SETTINGS['ENABLE_MANUAL_SELECTION'] else '❌'}")
    print(f"  - Flag display: {'✅' if NATIONALITY_SETTINGS['ENABLE_FLAG_DISPLAY'] else '❌'}")
    print(f"  - Statistics: {'✅' if NATIONALITY_SETTINGS['ENABLE_STATISTICS'] else '❌'}")
    print(f"  - GeoIP2: {'✅' if GEOIP_ENABLED else '❌'}")
    print(f"  - Redis: {'✅' if REDIS_ENABLED else '❌'}")
    print(f"  - Requests: {'✅' if REQUESTS_ENABLED else '❌'}")
    
    print(f"💳 Payment System Status:")
    print(f"  - Payments enabled: {'✅' if PAYMENT_SETTINGS['ENABLE_PAYMENTS'] else '❌'}")
    print(f"  - Stripe integration: {'✅' if STRIPE_ENABLED else '❌'}")
    print(f"  - Stripe keys configured: {'✅' if STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY else '❌'}")
    print(f"  - Webhook configured: {'✅' if STRIPE_WEBHOOK_SECRET else '❌'}")
    print(f"  - Room access control: {'✅' if PAYMENT_SETTINGS['REQUIRE_PAYMENT_FOR_LARGE_ROOMS'] else '❌'}")
    
    # Show Stripe key status (first few characters for security)
    if STRIPE_PUBLISHABLE_KEY:
        print(f"  - Publishable key: {STRIPE_PUBLISHABLE_KEY[:10]}...")
    if STRIPE_SECRET_KEY:
        print(f"  - Secret key: {STRIPE_SECRET_KEY[:10]}...")