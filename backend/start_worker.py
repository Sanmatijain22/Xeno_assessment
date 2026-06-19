#!/usr/bin/env python3
"""
Railway worker entry point - starts RQ worker for background task processing
"""
import os
import sys
import time
from redis import Redis
from rq import Worker, Queue
from app.config.settings import settings

def main():
    """Start RQ worker to process background tasks"""
    redis_conn = Redis.from_url(
        settings.REDIS_URL,
        socket_keepalive=True,
        socket_keepalive_options={},
        socket_timeout=None,
        socket_connect_timeout=10,
        health_check_interval=30
    )
    queue = Queue("default", connection=redis_conn)
    
    worker = Worker([queue], connection=redis_conn)
    
    print(f"Starting RQ worker for queue: default")
    print(f"Redis URL: {settings.REDIS_URL}")
    
    worker.work(with_scheduler=True)

def run_with_restart():
    """Run worker with automatic restart on exit"""
    while True:
        try:
            main()
        except Exception as e:
            print(f"Worker exited with error: {e}")
            print("Restarting in 5 seconds...")
            time.sleep(5)

if __name__ == "__main__":
    # Check if auto-restart is enabled (default for production)
    if os.getenv("AUTO_RESTART_WORKER", "true").lower() == "true":
        run_with_restart()
    else:
        main()
