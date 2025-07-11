#!/bin/bash

echo "Monitoring authentication logs..."
echo "SST Lambda logs:"
echo "================="

# Find the latest lambda logs
LAMBDA_LOG_DIR=".sst/lambda"
if [ -d "$LAMBDA_LOG_DIR" ]; then
    find "$LAMBDA_LOG_DIR" -name "*.log" -type f -exec echo "=== {} ===" \; -exec tail -20 {} \; -exec echo "" \;
else
    echo "No lambda logs found"
fi

echo ""
echo "Web application logs:"
echo "===================="
tail -50 .sst/log/web.log

echo ""
echo "Auth function logs:"
echo "=================="
find .sst -name "*.log" -path "*auth*" -type f -exec echo "=== {} ===" \; -exec tail -20 {} \; -exec echo "" \;