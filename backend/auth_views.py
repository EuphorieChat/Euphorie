"""
Authentication Views for Euphorie AI
Handles all auth: Email/Password, Apple, Google, Microsoft
Updated to match Flutter app expectations
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
    """Generate JWT tokens for user - matches Flutter expectations"""
    refresh = RefreshToken.for_user(user)
    return {
        'access_token': str(refresh.access_token),  # ✅ Flutter expects 'access_token'
        'refresh_token': str(refresh),              # ✅ Flutter expects 'refresh_token'
        'user_id': user.id,                         # ✅ Added for Flutter
        'email': user.email,                        # ✅ Added for Flutter
        'display_name': user.get_full_name() or user.email.split('@')[0],  # ✅ Added for Flutter
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register new user with email/password"""
    try:
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password')
        display_name = request.data.get('display_name', '')  # ✅ Flutter sends 'display_name'
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ✅ Password validation
        if len(password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user exists
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'An account with this email already exists'},  # ✅ More user-friendly
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse display_name if provided (instead of first/last separately)
        if display_name and not first_name:
            name_parts = display_name.split()
            first_name = name_parts[0] if name_parts else ''
            last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
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
        
        return Response({
            'message': 'Registration successful',
            **tokens
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f'❌ Registration error: {str(e)}')
        return Response(
            {'error': 'Registration failed. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login with email/password"""
    try:
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=email, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid email or password'},  # ✅ More specific
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        tokens = get_tokens_for_user(user)
        logger.info(f'✅ User logged in: {email}')
        
        return Response({
            'message': 'Login successful',
            **tokens
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Login error: {str(e)}')
        return Response(
            {'error': 'Login failed. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def apple_sign_in(request):
    """Handle Apple Sign In"""
    try:
        # ✅ Flutter sends both identityToken and user data
        id_token = request.data.get('identityToken') or request.data.get('id_token')
        email = request.data.get('email')
        display_name = request.data.get('displayName', '')
        
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
                audience='com.euphorie.app',  # ✅ Your bundle ID
                issuer='https://appleid.apple.com'
            )
            
            # Email might be in token or request data (first time only)
            token_email = decoded_token.get('email')
            email = email or token_email
            apple_user_id = decoded_token.get('sub')
            
            if not email:
                # ✅ Use apple_user_id as fallback
                email = f'{apple_user_id}@appleid.privaterelay.com'
            
        except Exception as e:
            logger.error(f'❌ Apple token verification failed: {str(e)}')
            return Response(
                {'error': 'Invalid Apple ID token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Parse display name
        name_parts = display_name.split() if display_name else []
        first_name = name_parts[0] if name_parts else ''
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': first_name,
                'last_name': last_name,
            }
        )
        
        tokens = get_tokens_for_user(user)
        logger.info(f'✅ Apple Sign In: {email} (created: {created})')
        
        return Response({
            'message': 'Apple sign-in successful',
            'created': created,
            **tokens
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Apple Sign In error: {str(e)}')
        return Response(
            {'error': 'Apple Sign In failed. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_sign_in(request):
    """Handle Google Sign In"""
    try:
        # ✅ Flutter sends both accessToken and idToken
        access_token = request.data.get('accessToken') or request.data.get('access_token')
        id_token = request.data.get('idToken') or request.data.get('id_token')
        email = request.data.get('email')
        display_name = request.data.get('displayName', '')
        
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
            email = email or user_info.get('email')
            
        except Exception as e:
            logger.error(f'❌ Google token verification failed: {str(e)}')
            return Response(
                {'error': 'Invalid Google token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Parse display name
        if not display_name:
            display_name = user_info.get('name', '')
        
        name_parts = display_name.split() if display_name else []
        first_name = name_parts[0] if name_parts else user_info.get('given_name', '')
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else user_info.get('family_name', '')
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': first_name,
                'last_name': last_name,
            }
        )
        
        tokens = get_tokens_for_user(user)
        logger.info(f'✅ Google Sign In: {email} (created: {created})')
        
        return Response({
            'message': 'Google sign-in successful',
            'created': created,
            **tokens
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Google Sign In error: {str(e)}')
        return Response(
            {'error': 'Google Sign In failed. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def microsoft_sign_in(request):
    """Handle Microsoft Sign In"""
    try:
        # ✅ Flutter sends accessToken
        access_token = request.data.get('accessToken') or request.data.get('access_token')
        email = request.data.get('email')
        display_name = request.data.get('displayName', '')
        
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
            email = email or user_info.get('mail') or user_info.get('userPrincipalName')
            
        except Exception as e:
            logger.error(f'❌ Microsoft token verification failed: {str(e)}')
            return Response(
                {'error': 'Invalid Microsoft token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Parse display name
        if not display_name:
            display_name = user_info.get('displayName', '')
        
        name_parts = display_name.split() if display_name else []
        first_name = name_parts[0] if name_parts else user_info.get('givenName', '')
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else user_info.get('surname', '')
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': first_name,
                'last_name': last_name,
            }
        )
        
        tokens = get_tokens_for_user(user)
        logger.info(f'✅ Microsoft Sign In: {email} (created: {created})')
        
        return Response({
            'message': 'Microsoft sign-in successful',
            'created': created,
            **tokens
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Microsoft Sign In error: {str(e)}')
        return Response(
            {'error': 'Microsoft Sign In failed. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh access token"""
    try:
        # ✅ Accept both 'refresh' and 'refresh_token'
        refresh_token_str = request.data.get('refresh_token') or request.data.get('refresh')
        
        if not refresh_token_str:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        refresh = RefreshToken(refresh_token_str)
        
        return Response({
            'access_token': str(refresh.access_token),  # ✅ Flutter expects 'access_token'
            'refresh_token': str(refresh),              # ✅ Return new refresh token if rotation enabled
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Token refresh error: {str(e)}')
        return Response(
            {'error': 'Invalid or expired refresh token'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get or update current user profile"""
    user = request.user
    
    if request.method == 'GET':
        return Response({
            'user_id': user.id,
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'display_name': user.get_full_name() or user.email.split('@')[0],
            'first_name': user.first_name,
            'last_name': user.last_name,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        # ✅ Allow profile updates
        display_name = request.data.get('display_name')
        email = request.data.get('email')
        
        if display_name:
            name_parts = display_name.split()
            user.first_name = name_parts[0] if name_parts else ''
            user.last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        if email and email != user.email:
            if User.objects.filter(email=email).exclude(id=user.id).exists():
                return Response(
                    {'error': 'Email already in use'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.email = email
            user.username = email
        
        user.save()
        logger.info(f'✅ Profile updated: {user.email}')
        
        return Response({
            'message': 'Profile updated successfully',
            'user_id': user.id,
            'email': user.email,
            'display_name': user.get_full_name() or user.email.split('@')[0],
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout - blacklist refresh token"""
    try:
        # ✅ Accept both 'refresh' and 'refresh_token'
        refresh_token_str = request.data.get('refresh_token') or request.data.get('refresh')
        
        if refresh_token_str:
            token = RefreshToken(refresh_token_str)
            token.blacklist()
            logger.info(f'✅ User logged out: {request.user.email}')
        else:
            logger.info(f'✅ User logged out (no token): {request.user.email}')
        
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'❌ Logout error: {str(e)}')
        # ✅ Still return success even if blacklist fails
        return Response({
            'message': 'Logout completed'
        }, status=status.HTTP_200_OK)