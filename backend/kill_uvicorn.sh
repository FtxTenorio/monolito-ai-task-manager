#!/bin/bash

# Find all uvicorn processes and kill them
echo "Searching for uvicorn processes..."
uvicorn_pids=$(pgrep -f uvicorn)

if [ -z "$uvicorn_pids" ]; then
    echo "No uvicorn processes found."
else
    echo "Found uvicorn processes with PIDs: $uvicorn_pids"
    echo "Killing uvicorn processes..."
    kill -9 $uvicorn_pids
    echo "Uvicorn processes killed successfully."
fi 