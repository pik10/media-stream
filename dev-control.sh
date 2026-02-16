#!/bin/bash

# Local Development Server Control Script

case "$1" in
  start)
    echo "Starting local development servers..."
    echo ""

    echo "Starting backend on port 3000..."
    cd backend && npm start > /tmp/media-stream-backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"

    echo "Starting frontend on port 5173..."
    cd frontend && npm run dev > /tmp/media-stream-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"

    echo ""
    echo "✓ Servers started!"
    echo "  Backend:  http://localhost:3000"
    echo "  Frontend: http://localhost:5173"
    echo ""
    echo "Logs:"
    echo "  Backend:  tail -f /tmp/media-stream-backend.log"
    echo "  Frontend: tail -f /tmp/media-stream-frontend.log"
    ;;

  stop)
    echo "Stopping local development servers..."

    # Stop backend
    pkill -f "node src/server.js"
    echo "✓ Backend stopped"

    # Stop frontend
    pkill -f "vite"
    echo "✓ Frontend stopped"

    # Clean up log files
    rm -f /tmp/media-stream-backend.log
    rm -f /tmp/media-stream-frontend.log

    echo "✓ All servers stopped"
    ;;

  restart)
    echo "Restarting local development servers..."
    $0 stop
    sleep 2
    $0 start
    ;;

  status)
    echo "Checking local development server status..."
    echo ""

    # Check backend
    if pgrep -f "node src/server.js" > /dev/null; then
      echo "✓ Backend: Running"
      BACKEND_PID=$(pgrep -f "node src/server.js")
      echo "  PID: $BACKEND_PID"
      echo "  Port: 3000"
    else
      echo "✗ Backend: Not running"
    fi

    echo ""

    # Check frontend
    if pgrep -f "vite" > /dev/null; then
      echo "✓ Frontend: Running"
      FRONTEND_PID=$(pgrep -f "vite")
      echo "  PID: $FRONTEND_PID"
      echo "  Port: 5173"
    else
      echo "✗ Frontend: Not running"
    fi
    ;;

  logs)
    if [ -f /tmp/media-stream-backend.log ] || [ -f /tmp/media-stream-frontend.log ]; then
      echo "Showing logs (Ctrl+C to exit)..."
      echo ""
      tail -f /tmp/media-stream-backend.log /tmp/media-stream-frontend.log 2>/dev/null
    else
      echo "No log files found. Servers may not be running."
      echo ""
      echo "Start servers with: $0 start"
    fi
    ;;

  *)
    echo "Local Development Server Control"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start backend and frontend dev servers"
    echo "  stop    - Stop all dev servers"
    echo "  restart - Restart all dev servers"
    echo "  status  - Check if servers are running"
    echo "  logs    - View server logs"
    echo ""
    echo "Examples:"
    echo "  $0 start     # Start servers"
    echo "  $0 status    # Check status"
    echo "  $0 logs      # View logs"
    echo "  $0 stop      # Stop servers"
    exit 1
    ;;
esac
