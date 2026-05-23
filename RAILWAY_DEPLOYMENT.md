# 🎭 Railway Deployment Guide - Theatre Canteen Backend

This guide outlines how to deploy the FastAPI backend of the **Theatre Canteen Management System** to **Railway**.

---

## 🛠️ What We Configured

### 1. Python Runtime Specification (`runtime.txt`)
We created `runtime.txt` files both at the root of the project and inside the `/backend` folder to enforce building the application with **Python 3.11.9**:
```
python-3.11.9
```

### 2. Procfile Configurations
We have set up two `Procfile` configurations to support different deployment architectures on Railway:

#### A. Root-Level Deployment (`/Procfile`)
If you deploy the entire repository root to Railway, Railway will run the app using:
```yaml
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend
```
* **How it works:** The `--app-dir backend` flag tells Uvicorn that the `app` package is inside the `/backend` folder.

#### B. Subdirectory Deployment (`/backend/Procfile`)
If you set the **Root Directory** setting in your Railway service settings to `/backend` (highly recommended for a clean monorepo setup), Railway will run the app using:
```yaml
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## ⚡ Deployment Steps on Railway

Follow these steps to host your backend on Railway:

### Step 1: Create a Railway Project & Add PostgreSQL
1. Go to the [Railway Dashboard](https://railway.app/) and create a new project.
2. Click **+ New** and select **Database** -> **Add PostgreSQL**.
3. Railway will provision a production-ready PostgreSQL instance for you.

### Step 2: Deploy the Backend Service
1. Click **+ New** -> **Github Repo** and select your `Thetre_Project` repository.
2. Once the service is added, go to **Settings** for the backend service:
   * **Root Directory:** Set this to `/backend` (if you want the backend to build only from the `/backend` folder).
   * **Custom Build Command:** Leave blank (Railway automatically detects the Python environment and installs dependencies via `requirements.txt`).
   * **Start Command:** Railway will automatically detect and run the commands in the `Procfile`.

### Step 3: Configure Environment Variables
Go to the **Variables** tab of your backend service and add the following required environment variables:

| Variable Name | Value / Description | Note |
| :--- | :--- | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Select **Reference Variable** to link directly to your Railway PostgreSQL service! |
| `SECRET_KEY` | *[Your-Secure-Random-String]* | Generate a secure key for JWT token hashing. |
| `ALGORITHM` | `HS256` | Token hashing algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `120` | Token expiration duration in minutes. |
| `CORS_ORIGINS` | *[Your-Frontend-Railway-URL]* | Point this to your deployed frontend domain once available (e.g. `https://your-frontend.up.railway.app`). |

> [!NOTE]
> **PostgreSQL Scheme Normalization:**
> SQLAlchemy 2.0+ strictly requires `postgresql://` as the schema. However, Railway's default database variable often yields a URL starting with `postgres://`. 
> We have successfully updated `backend/app/db.py` to automatically normalize `postgres://` to `postgresql://` at runtime, preventing database connection errors!

---

## 🚀 Verifying the Deployment
Once the deployment finishes building and starts running, you can verify it by visiting:
* **Health Check Endpoint:** `https://your-backend.up.railway.app/api/health` (should return `{"status": "ok"}`)
* **Interactive Docs:** `https://your-backend.up.railway.app/docs` (FastAPI Swagger UI)

---
