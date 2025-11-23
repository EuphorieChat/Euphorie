"""
Authentication Views for Euphorie AI
Handles all auth: Email/Password, Apple, Google, Microsoft
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
import requests
import jwt
from jwt import PyJWKClient
import logging

logger = logging.getLogger('auth')


def get_tokens_for_user(user):
    """Generate JWT tokens for user"""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register new user with email/password"""
    try:
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user exists
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'User with this email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        tokens = get_tokens_for_user(user)
        logger.info(f'✅ User registered: {email}')
        
        return Response(tokens, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f'❌ Registration error: {str(e)}')
        return Response(
            {'error': 'Registration failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login with email/password"""
    try:
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=email, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        tokens = get_tokens_for_user(user)
        logger.info(f'✅ User logged in: {email}')
        
        return Response(tokens, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Login error: {str(e)}')
        return Response(
            {'error': 'Login failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def apple_sign_in(request):
    """Handle Apple Sign In"""
    try:
        id_token = request.data.get('id_token')
        
        if not id_token:
            return Response(
                {'error': 'ID token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify Apple ID token
        try:
            jwks_client = PyJWKClient('https://appleid.apple.com/auth/keys')
            signing_key = jwks_client.get_signing_key_from_jwt(id_token)
            
            decoded_token = jwt.decode(
                id_token,
                signing_key.key,
                algorithms=['RS256'],
                audience='com.euphorie.euphorieFlutter',  # Your bundle ID
                issuer='https://appleid.apple.com'
            )
            
            email = decoded_token.get('email')
            apple_user_id = decoded_token.get('sub')
            
        except Exception as e:
            logger.error(f'❌ Apple token verification failed: {str(e)}')
            return Response(
                {'error': 'Invalid Apple ID token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': request.data.get('first_name', ''),
                'last_name': request.data.get('last_name', ''),
            }
        )
        
        tokens = get_tokens_for_user(user)
        logger.info(f'✅ Apple Sign In: {email} (created: {created})')
        
        return Response(tokens, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Apple Sign In error: {str(e)}')
        return Response(
            {'error': 'Apple Sign In failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_sign_in(request):
    """Handle Google Sign In"""
    try:
        access_token = request.data.get('access_token')
        id_token = request.data.get('id_token')
        
        if not access_token and not id_token:
            return Response(
                {'error': 'Access token or ID token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify Google token
        try:
            if id_token:
                # Verify ID token
                response = requests.get(
                    f'https://oauth2.googleapis.com/tokeninfo?id_token={id_token}'
                )
            else:
                # Use access token
                response = requests.get(
                    'https://www.googleapis.com/oauth2/v1/userinfo',
                    headers={'Authorization': f'Bearer {access_token}'}
                )
            
            if response.status_code != 200:
                return Response(
                    {'error': 'Invalid Google token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            user_info = response.json()
            email = user_info.get('email')
            
        except Exception as e:
            logger.error(f'❌ Google token verification failed: {str(e)}')
            return Response(
                {'error': 'Invalid Google token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': user_info.get('given_name', ''),
                'last_name': user_info.get('family_name', ''),
            }
        )
        
        tokens = get_tokens_for_user(user)
        logger.info(f'✅ Google Sign In: {email} (created: {created})')
        
        return Response(tokens, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Google Sign In error: {str(e)}')
        return Response(
            {'error': 'Google Sign In failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def microsoft_sign_in(request):
    """Handle Microsoft Sign In"""
    try:
        access_token = request.data.get('access_token')
        
        if not access_token:
            return Response(
                {'error': 'Access token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify Microsoft token
        try:
            response = requests.get(
                'https://graph.microsoft.com/v1.0/me',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if response.status_code != 200:
                return Response(
                    {'error': 'Invalid Microsoft token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            user_info = response.json()
            email = user_info.get('mail') or user_info.get('userPrincipalName')
            
        except Exception as e:
            logger.error(f'❌ Microsoft token verification failed: {str(e)}')
            return Response(
                {'error': 'Invalid Microsoft token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': user_info.get('givenName', ''),
                'last_name': user_info.get('surname', ''),
            }
        )
        
        tokens = get_tokens_for_user(user)
        logger.info(f'✅ Microsoft Sign In: {email} (created: {created})')
        
        return Response(tokens, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Microsoft Sign In error: {str(e)}')
        return Response(
            {'error': 'Microsoft Sign In failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh access token"""
    try:
        refresh_token_str = request.data.get('refresh')
        
        if not refresh_token_str:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        refresh = RefreshToken(refresh_token_str)
        
        return Response({
            'access': str(refresh.access_token)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Token refresh error: {str(e)}')
        return Response(
            {'error': 'Token refresh failed'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    user = request.user
    return Response({
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout - blacklist refresh token"""
    try:
        refresh_token_str = request.data.get('refresh')
        
        if refresh_token_str:
            token = RefreshToken(refresh_token_str)
            token.blacklist()
        
        logger.info(f'✅ User logged out: {request.user.email}')
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Logout error: {str(e)}')
        return Response(
            {'error': 'Logout failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )