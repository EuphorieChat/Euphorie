"""
Nexus API Views — Procurement Intelligence
"""
import asyncio
import json
import logging
import os
import sys

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .models import ProcurementRun, UserCredits

sys.path.insert(0, '/home/ubuntu/nexus')
from core.agent import NexusAgent, ProcurementRequest
from core.intelligence_store import IntelligenceStore
from core.nl_parser import parse_natural_language_request
from dataclasses import asdict

logger = logging.getLogger(__name__)

def _get_agent():
    key = os.environ.get('GEMINI_API_KEY', '')
    if not key:
        from django.conf import settings
        key = getattr(settings, 'GEMINI_API_KEY', '')
    return NexusAgent(api_key=key)

def _get_intel_store():
    return IntelligenceStore(store_path='/home/ubuntu/nexus/data/intelligence.jsonl')

def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def nexus_procure(request):
    """
    POST /api/nexus/procure/
    Body: {"query": "Find me a CRM for 20 people under 15k"}
    Or structured: {"category": "CRM", "budget_max": 15000, ...}
    """
    user = request.user

    # Check credits
    try:
        user_credits = UserCredits.objects.get(user=user)
    except UserCredits.DoesNotExist:
        return JsonResponse({'error': 'No credits found. Purchase credits first.'}, status=402)

    if user_credits.balance <= 0:
        return JsonResponse({'error': 'Insufficient credits. Purchase more to continue.'}, status=402)

    body = request.data
    query = body.get('query', '')
    agent = _get_agent()
    intel_store = _get_intel_store()

    # Parse natural language if needed
    if query and 'category' not in body:
        parsed = parse_natural_language_request(query, agent.model)
        body = {**body, **parsed}

    # Build request
    proc_req = ProcurementRequest(
        category=body.get('category', ''),
        description=body.get('description', query),
        budget_max=body.get('budget_max'),
        seats=body.get('seats'),
        must_have_features=body.get('must_have_features', []),
        nice_to_have_features=body.get('nice_to_have_features', []),
        compliance_requirements=body.get('compliance_requirements', []),
        current_vendor=body.get('current_vendor'),
        current_spend=body.get('current_spend'),
        timeline=body.get('timeline', 'flexible'),
    )

    # Create DB record
    run = ProcurementRun.objects.create(
        user=user,
        query=query or body.get('description', ''),
        category=proc_req.category,
        budget_max=proc_req.budget_max,
        seats=proc_req.seats,
        must_have_features=proc_req.must_have_features,
        compliance_requirements=proc_req.compliance_requirements,
        current_vendor=proc_req.current_vendor or '',
        current_spend=proc_req.current_spend,
        status='running',
    )

    try:
        # Load historical intelligence
        agent.intelligence_store = intel_store.get_all()

        # Run the agent
        result = _run_async(agent.process_request(proc_req))

        # Store intelligence
        if result.intelligence_generated:
            intel_store.store(result.intelligence_generated)

        # Update DB record
        recs_data = [asdict(r) for r in result.recommendations]
        run.status = 'completed'
        run.clones_spawned = result.clones_spawned
        run.best_pick = result.best_pick
        run.estimated_savings = result.estimated_savings
        run.summary = result.summary
        run.recommendations = recs_data
        run.intelligence = result.intelligence_generated
        run.processing_time_seconds = result.analysis_duration_seconds
        run.save()

        # Deduct credit
        user_credits.deduct()

        return JsonResponse({
            'status': 'completed',
            'run_id': run.id,
            'best_pick': result.best_pick,
            'estimated_savings': result.estimated_savings,
            'summary': result.summary,
            'clones_spawned': result.clones_spawned,
            'processing_time': result.analysis_duration_seconds,
            'credits_remaining': user_credits.balance,
            'recommendations': recs_data,
        })

    except Exception as e:
        logger.error(f"Nexus run failed: {e}")
        run.status = 'failed'
        run.summary = str(e)
        run.save()
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nexus_history(request):
    """GET /api/nexus/history/ — user's procurement runs"""
    runs = ProcurementRun.objects.filter(user=request.user)[:20]
    data = []
    for run in runs:
        data.append({
            'id': run.id,
            'query': run.query,
            'category': run.category,
            'status': run.status,
            'best_pick': run.best_pick,
            'estimated_savings': run.estimated_savings,
            'clones_spawned': run.clones_spawned,
            'processing_time': run.processing_time_seconds,
            'created_at': run.created_at.isoformat(),
        })
    return JsonResponse({'runs': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nexus_run_detail(request, run_id):
    """GET /api/nexus/runs/<id>/ — full detail for a run"""
    try:
        run = ProcurementRun.objects.get(id=run_id, user=request.user)
    except ProcurementRun.DoesNotExist:
        return JsonResponse({'error': 'Run not found'}, status=404)

    return JsonResponse({
        'id': run.id,
        'query': run.query,
        'category': run.category,
        'budget_max': run.budget_max,
        'seats': run.seats,
        'must_have_features': run.must_have_features,
        'compliance_requirements': run.compliance_requirements,
        'current_vendor': run.current_vendor,
        'current_spend': run.current_spend,
        'status': run.status,
        'best_pick': run.best_pick,
        'estimated_savings': run.estimated_savings,
        'summary': run.summary,
        'recommendations': run.recommendations,
        'clones_spawned': run.clones_spawned,
        'processing_time': run.processing_time_seconds,
        'created_at': run.created_at.isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nexus_intelligence_stats(request):
    """GET /api/nexus/intelligence/ — intelligence store stats"""
    intel_store = _get_intel_store()
    stats = intel_store.get_stats()
    return JsonResponse(stats)
