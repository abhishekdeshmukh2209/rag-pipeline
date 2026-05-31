@echo off
title Angular - rag-pipeline
cd /d "%~dp0..\frontend"
if not exist node_modules npm install
echo Angular -^> http://127.0.0.1:4200
echo Start Spring in the other window first; /api proxies to :8080
npm start -- --host 127.0.0.1 --port 4200
pause
