"""
Task status API views for Celery task monitoring.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from celery.result import AsyncResult
from config.celery import app as celery_app


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_status(request, task_id):
    """
    Get the status and result of a Celery task by ID.
    
    Args:
        request: HTTP request
        task_id: UUID of the Celery task
        
    Returns:
        JSON response with task status, result, and metadata
    """
    try:
        # Get task result using AsyncResult
        task_result = AsyncResult(task_id, app=celery_app)
        
        response_data = {
            'task_id': task_id,
            'status': task_result.state,
            'ready': task_result.ready(),
            'successful': task_result.successful() if task_result.ready() else None,
            'failed': task_result.failed() if task_result.ready() else None,
        }
        
        # Add result if task is complete
        if task_result.ready():
            if task_result.successful():
                response_data['result'] = task_result.result
            elif task_result.failed():
                # Handle exception info
                try:
                    response_data['error'] = str(task_result.result)
                    response_data['traceback'] = task_result.traceback
                except Exception:
                    response_data['error'] = 'Task failed with unknown error'
        
        # Add task metadata if available
        if task_result.info:
            if isinstance(task_result.info, dict):
                # For pending tasks, info might contain progress data
                response_data['info'] = task_result.info
            else:
                # For failed tasks, info contains the exception
                response_data['exception'] = str(task_result.info)
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {
                'error': f'Failed to retrieve task status: {str(e)}',
                'task_id': task_id
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_active_tasks(request):
    """
    List all currently active Celery tasks.
    
    Returns:
        JSON response with list of active tasks
    """
    try:
        # Get active tasks from all workers
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        
        if not active_tasks:
            return Response({
                'active_tasks': [],
                'workers': 0,
                'total_tasks': 0
            })
        
        # Format response
        all_tasks = []
        for worker, tasks in active_tasks.items():
            for task in tasks:
                all_tasks.append({
                    'task_id': task.get('id'),
                    'name': task.get('name'),
                    'worker': worker,
                    'args': task.get('args'),
                    'kwargs': task.get('kwargs'),
                    'time_start': task.get('time_start'),
                })
        
        return Response({
            'active_tasks': all_tasks,
            'workers': len(active_tasks),
            'total_tasks': len(all_tasks)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to retrieve active tasks: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def celery_worker_status(request):
    """
    Check if Celery workers are running and responsive.
    
    Returns:
        JSON response with worker status information
    """
    try:
        inspect = celery_app.control.inspect()
        
        # Ping all workers
        ping_result = inspect.ping()
        
        if not ping_result:
            return Response({
                'status': 'no_workers',
                'workers': [],
                'healthy': False
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Get registered tasks
        registered_tasks = inspect.registered()
        
        # Get stats
        stats = inspect.stats()
        
        workers_info = []
        for worker_name in ping_result.keys():
            worker_info = {
                'name': worker_name,
                'alive': True,
                'registered_tasks': len(registered_tasks.get(worker_name, [])) if registered_tasks else 0,
            }
            
            if stats and worker_name in stats:
                worker_info['stats'] = stats[worker_name]
            
            workers_info.append(worker_info)
        
        return Response({
            'status': 'healthy',
            'workers': workers_info,
            'total_workers': len(workers_info),
            'healthy': True
        })
        
    except Exception as e:
        return Response({
            'status': 'error',
            'error': str(e),
            'healthy': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
