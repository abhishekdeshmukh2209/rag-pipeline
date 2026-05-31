# Run frontend and backend in two consoles

## Install JDK + Maven (Windows, no admin)

If `java` / `mvn` are missing, run once in **PowerShell** (no Administrator needed; installs under `%LOCALAPPDATA%\Programs`):

```powershell
cd <path-to-repo>
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\scripts\install-jdk-maven-user.ps1
```

Then **close and reopen** your terminal so `PATH` and `JAVA_HOME` refresh.

Optional: Microsoft OpenJDK via winget (may prompt for admin):

```powershell
winget install Microsoft.OpenJDK.17 --accept-package-agreements --accept-source-agreements
```

---

Use **two separate** terminal windows (or tabs). Start **Spring first**, then **Angular**, so `/api` can proxy to port 8080.

## PowerShell

**Console 1 — Spring Boot**

```powershell
cd <path-to-repo>
.\scripts\start-spring.ps1
```

**Console 2 — Angular**

```powershell
cd <path-to-repo>
.\scripts\start-frontend.ps1
```

## Command Prompt (cmd.exe)

**Console 1:** double-click `start-spring.cmd` or run:

```bat
cd <path-to-repo>\scripts
start-spring.cmd
```

**Console 2:**

```bat
cd <path-to-repo>\scripts
start-frontend.cmd
```

## Manual commands (same idea)

**Console 1**

```bat
cd spring-backend
mvn spring-boot:run
```

**Console 2**

```bat
cd frontend
npm install
npm start
```

## Prerequisites

| App | Needs |
|-----|--------|
| Spring | JDK 17+, Maven (`java`, `mvn` on PATH) |
| Angular | Node.js 18+, npm |

Then open **http://127.0.0.1:4200** in the browser.
