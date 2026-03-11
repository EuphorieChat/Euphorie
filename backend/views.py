"""
Euphorie v3 — API Views
"""
import json
import logging
import time
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import CreditPack, UserCredits, Interaction, CreditPurchase
from .gemini_service import gemini_service

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


def get_or_create_credits(user):
    credits, created = UserCredits.objects.get_or_create(user=user)
    return credits


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'service': 'euphorie-v3',
        'ai_ready': gemini_service.is_ready,
        'timestamp': int(time.time()),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def interact(request):
    user = request.user
    credits = get_or_create_credits(user)

    if credits.balance <= 0:
        return Response({
            'error': 'no_credits',
            'message': 'You have no credits remaining. Please purchase more to continue.',
            'credits_remaining': 0,
        }, status=status.HTTP_402_PAYMENT_REQUIRED)

    text = request.data.get('text', '').strip()
    image_b64 = request.data.get('image')

    if not text and not image_b64:
        return Response(
            {'error': 'No input provided. Please speak or show something to the camera.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = gemini_service.analyze(text=text or 'What do you see?', image_b64=image_b64)

    if result.get('error'):
        return Response({
            'response': result['text'],
            'credits_remaining': credits.balance,
            'processing_time_ms': result['time_ms'],
            'error': True,
        })

    if not credits.deduct():
        return Response({
            'error': 'no_credits', 'message': 'Credit deduction failed.',
            'credits_remaining': 0,
        }, status=status.HTTP_402_PAYMENT_REQUIRED)

    Interaction.objects.create(
        user=user, user_text=text, image_sent=bool(image_b64),
        ai_response=result['text'], ai_model=result['model'],
        tokens_used=result['tokens'], processing_time_ms=result['time_ms'],
    )

    return Response({
        'response': result['text'],
        'credits_remaining': credits.balance,
        'processing_time_ms': result['time_ms'],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_credits(request):
    credits = get_or_create_credits(request.user)
    packs = CreditPack.objects.filter(is_active=True).values(
        'id', 'name', 'credits', 'price_cents',
    )
    return Response({
        'balance': credits.balance,
        'total_purchased': credits.total_purchased,
        'total_used': credits.total_used,
        'packs': list(packs),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout(request):
    pack_id = request.data.get('pack_id')
    if not pack_id:
        return Response({'error': 'pack_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        pack = CreditPack.objects.get(id=pack_id, is_active=True)
    except CreditPack.DoesNotExist:
        return Response({'error': 'Invalid pack'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    credits = get_or_create_credits(user)

    try:
        if not credits.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email, metadata={'user_id': user.id},
            )
            credits.stripe_customer_id = customer.id
            credits.save(update_fields=['stripe_customer_id'])

        session = stripe.checkout.Session.create(
            customer=credits.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'Euphorie AI - {pack.name}',
                        'description': f'{pack.credits} AI interactions',
                    },
                    'unit_amount': pack.price_cents,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'https://euphorie.com/?purchase=success&credits={pack.credits}',
            cancel_url='https://euphorie.com/?purchase=cancelled',
            metadata={
                'user_id': str(user.id),
                'pack_id': str(pack.id),
                'credits': str(pack.credits),
            },
        )

        CreditPurchase.objects.create(
            user=user, pack=pack, stripe_session_id=session.id,
            amount_cents=pack.price_cents, credits_added=pack.credits, status='pending',
        )

        return Response({'checkout_url': session.url, 'session_id': session.id})

    except Exception as e:
        logger.error(f"Stripe error: {e}")
        return Response(
            {'error': 'Payment service error. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            logger.error(f"Webhook verification failed: {e}")
            return HttpResponse(status=400)
    else:
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            return HttpResponse(status=400)

    if event.get('type') == 'checkout.session.completed':
        session_data = event['data']['object']
        metadata = session_data.get('metadata', {})
        user_id = metadata.get('user_id')
        credits_to_add = int(metadata.get('credits', 0))

        if user_id and credits_to_add:
            try:
                from django.contrib.auth.models import User
                user = User.objects.get(id=user_id)
                user_credits = get_or_create_credits(user)
                user_credits.add(credits_to_add)
                CreditPurchase.objects.filter(
                    stripe_session_id=session_data.get('id'),
                ).update(
                    status='succeeded',
                    stripe_payment_intent_id=session_data.get('payment_intent', ''),
                )
                logger.info(f"Added {credits_to_add} credits to user {user.email}")
            except Exception as e:
                logger.error(f"Webhook processing error: {e}")

    return HttpResponse(status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def interaction_history(request):
    limit = min(int(request.query_params.get('limit', 20)), 100)
    interactions = Interaction.objects.filter(user=request.user).values(
        'id', 'user_text', 'image_sent', 'ai_response',
        'ai_model', 'processing_time_ms', 'created_at',
    )[:limit]
    return Response({'interactions': list(interactions), 'count': len(interactions)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deduct_credit(request):
    credits = get_or_create_credits(request.user)
    if credits.balance <= 0:
        return Response({'error': 'no_credits'}, status=status.HTTP_402_PAYMENT_REQUIRED)
    credits.deduct()
    return Response({'balance': credits.balance})
