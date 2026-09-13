#!/bin/bash
# Start backend in background
cd /workspace/storefront/backend && npm start &

# Start frontend (exposed preview port)
cd /workspace/storefront/frontend && npm run dev
