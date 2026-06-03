# compiler_api/gunicorn.conf.py
import multiprocessing

# Gunicorn configuration file for production
bind = "0.0.0.0:5001"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gthread"  # Use gthread worker for better concurrency handling
threads = 4               # 4 threads per worker
timeout = 60              # Worker timeout in seconds
keepalive = 2             # Keep-alive timeout

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = "info"
