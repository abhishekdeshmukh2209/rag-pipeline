@echo off
title Spring Boot - rag-pipeline
cd /d "%~dp0..\spring-backend"
echo Spring Boot -^> http://127.0.0.1:8080
echo Health: http://127.0.0.1:8080/health
mvn spring-boot:run
pause
