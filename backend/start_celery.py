#!/usr/bin/env python
"""
Script to start Celery workers with proper configuration for the P2P system.
"""

import os
import sys
import subprocess
from pathlib import Path

# Add src directory to Python path
src_dir = Path(__file__).parent / 'src'
sys.path.insert(0, str(src_dir))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

def start_worker(queue='default', concurrency=2, loglevel='info'):
    """Start a Celery worker for the specified queue."""
    cmd = [
        'celery', '-A', 'config', 'worker',
        '--loglevel', loglevel,
        '--concurrency', str(concurrency),
        '--queues', queue,
        '--hostname', f'{queue}@%h'
    ]
    
    print(f"Starting Celery worker for queue '{queue}' with concurrency {concurrency}")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, cwd=src_dir, check=True)
    except KeyboardInterrupt:
        print(f"\nStopping worker for queue '{queue}'")
    except subprocess.CalledProcessError as e:
        print(f"Error starting worker: {e}")

def start_beat(loglevel='info'):
    """Start Celery beat scheduler."""
    cmd = [
        'celery', '-A', 'config', 'beat',
        '--loglevel', loglevel,
        '--scheduler', 'django_celery_beat.schedulers:DatabaseScheduler'
    ]
    
    print("Starting Celery beat scheduler")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, cwd=src_dir, check=True)
    except KeyboardInterrupt:
        print("\nStopping beat scheduler")
    except subprocess.CalledProcessError as e:
        print(f"Error starting beat: {e}")

def main():
    """Main function to handle command line arguments."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Start Celery workers for P2P system')
    parser.add_argument('--queue', default='default', help='Queue name (default: default)')
    parser.add_argument('--concurrency', type=int, default=2, help='Worker concurrency (default: 2)')
    parser.add_argument('--loglevel', default='info', help='Log level (default: info)')
    parser.add_argument('--beat', action='store_true', help='Start beat scheduler instead of worker')
    parser.add_argument('--all', action='store_true', help='Start workers for all queues')
    
    args = parser.parse_args()
    
    if args.beat:
        start_beat(args.loglevel)
    elif args.all:
        # Start workers for all defined queues
        queues = ['default', 'documents', 'purchases', 'validation', 'notifications']
        print("Starting workers for all queues...")
        print("Note: This will start workers sequentially. For production, use a process manager.")
        
        for queue in queues:
            print(f"\n--- Starting worker for {queue} queue ---")
            try:
                start_worker(queue, args.concurrency, args.loglevel)
            except KeyboardInterrupt:
                print(f"\nStopped worker for {queue}")
                break
    else:
        start_worker(args.queue, args.concurrency, args.loglevel)

if __name__ == '__main__':
    main()