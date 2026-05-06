# Frontend DevOps Runbook

Date: 2026-05-04  
Author: Salma Louhichi  
Project: `ESPRIT-FRONTEND-4SAE1-4EME-ALZCARE` (Alzheimer Care Angular App)

This file guides you through setting up Jenkins CI/CD, Docker containerization, and Kubernetes deployment for the Angular frontend.

---

## Table of Contents

1. [Current Status](#1-current-status)
2. [What You Need to Do](#2-what-you-need-to-do)
3. [Files Created](#3-files-created)
4. [Jenkins Setup](#4-jenkins-setup)
5. [Building & Testing Locally](#5-building--testing-locally)
6. [Running the Pipeline](#6-running-the-pipeline)
7. [Accessing the Deployed Frontend](#7-accessing-the-deployed-frontend)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Current Status

| Deliverable | Status | Notes |
|---|---|---|
| Source Code | ✅ Ready | Angular 18 app |
| Dockerfile | ✅ Created | Multi-stage: Node build + nginx serve |
| Jenkinsfile | ✅ Created | Build → Docker → Deploy to k3s |
| K8s Deployment | ✅ Created | `frontend-deployment.yaml` |
| nginx Config | ✅ Created | SPA routing + health checks |
| Jenkins Job | ⏭️ Not created | You need to create this manually |
| First Build | ⏭️ Not run | Run after Jenkins job is set up |

---

## 2. What You Need to Do

### Manual Steps (I cannot do these for you):

1. **Commit and push** the new files I created
2. **Create a Jenkins job** for the frontend repo
3. **Run the pipeline** and verify deployment
4. **Access the frontend** via NodePort or port-forward

---

## 3. Files Created

I created these files in your frontend project:

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage Docker build (Node → nginx) |
| `nginx.conf` | nginx config for Angular SPA routing + health endpoint |
| `Jenkinsfile` | Jenkins pipeline: Build → Docker Push → k3s Deploy |
| `frontend-deployment.yaml` | Kubernetes Deployment + Service + NodePort |
| `FRONTEND_DEVOPS_RUNBOOK.md` | This file |

---

## 4. Jenkins Setup

### Step 4.1 — Commit and push the new files

**Run these in your Mac Terminal:**

```bash
cd /Users/wafalouhichi/Desktop/pi/ESPRIT-FRONTEND-4SAE1-4EME-ALZCARE

git add Dockerfile nginx.conf Jenkinsfile frontend-deployment.yaml FRONTEND_DEVOPS_RUNBOOK.md

git commit -m "feat: add Jenkins CI/CD + Docker + k8s deployment

- Add Dockerfile (multi-stage Node + nginx build)
- Add nginx.conf (SPA routing + health checks)
- Add Jenkinsfile (Build → Docker Push → k3s Deploy)
- Add frontend-deployment.yaml (K8s manifest)
- Add FRONTEND_DEVOPS_RUNBOOK.md"

git push origin devops-salma
```

### Step 4.2 — Create the Jenkins job

1. Open Jenkins: `http://127.0.0.1:8080`
2. Click **New Item** (top left)
3. Enter name: `alzcare-frontend`
4. Select **Pipeline**
5. Click **OK**

**Configure the job:**

| Section | Setting | Value |
|---------|---------|-------|
| **Pipeline** | Definition | Pipeline script from SCM |
| **SCM** | Git | |
| **Repository URL** | | `https://github.com/arijjuili/ESPRIT-FRONTEND-4SAE1-4EME-ALZCARE.git` |
| **Credentials** | | Select `ghcr-creds` (or add a new one for this repo) |
| **Branches to build** | Branch Specifier | `*/devops-salma` |
| **Script Path** | | `Jenkinsfile` |

6. Click **Save**

### Step 4.3 — Verify Jenkins has the required credentials

Your existing credentials from the backend should work:

| Credential ID | Type | Purpose |
|---------------|------|---------|
| `ghcr-creds` | Username with password | Push Docker image to GHCR |
| `k3s-kubeconfig` | Secret file | Deploy to k3s cluster |

If `ghcr-creds` uses a GitHub PAT that has access to push to `ghcr.io/salma-louhichi/*`, it will work for the frontend image too.

If you need a new credential for the frontend GitHub repo:
1. Jenkins → **Manage Jenkins** → **Credentials**
2. Add a **Username with password** credential
3. Use a GitHub PAT with `repo` scope

---

## 5. Building & Testing Locally

If you want to test the Docker build locally before running Jenkins:

```bash
cd /Users/wafalouhichi/Desktop/pi/ESPRIT-FRONTEND-4SAE1-4EME-ALZCARE

# Build the Docker image
docker build -t alzcare-frontend:test .

# Run it locally
docker run -p 8081:80 alzcare-frontend:test

# Open http://localhost:8081 in your browser
```

To stop:
```bash
# Find the container
docker ps

# Stop it
docker stop <CONTAINER_ID>
```

---

## 6. Running the Pipeline

### Step 6.1 — Build with Parameters

1. In Jenkins, go to the `alzcare-frontend` job
2. Click **Build with Parameters**
3. Leave everything at defaults (all checkboxes unchecked)
4. Click **Build**

### Step 6.2 — What the pipeline does

```
Checkout → npm ci → ng build --prod → Docker build → Push to GHCR → Deploy to k3s
```

**Stages:**
1. **Checkout** — Pulls code from GitHub
2. **Build** — Runs `npm ci` and `npm run build -- --configuration=production`
3. **Docker Build & Push** — Builds nginx image and pushes to GHCR
4. **Deploy To k3s** — Applies `frontend-deployment.yaml` to the `alzcare` namespace

### Step 6.3 — Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `SKIP_DOCKER_BUILD_PUSH` | `false` | Skip Docker build (use existing image) |
| `SKIP_DEPLOY` | `false` | Skip k8s deployment |
| `IMAGE_OVERRIDE` | (empty) | Use a specific existing image tag |
| `IMAGE_REPO` | `ghcr.io/salma-louhichi/alzcare-frontend` | Docker image repository |
| `DOCKER_CREDENTIALS_ID` | `ghcr-creds` | Jenkins credential for GHCR |
| `KUBECONFIG_CREDENTIAL_ID` | `k3s-kubeconfig` | Jenkins credential for kubeconfig |
| `PUSH_LATEST_TAG` | `false` | Also push `:latest` tag |

---

## 7. Accessing the Deployed Frontend

After the pipeline succeeds, your frontend is running in k3s.

### Option A: NodePort (easiest for demo)

The deployment includes a NodePort service on port `30080`.

```bash
# Get the VM IP
kubectl get nodes -o wide
```

Open in browser:
```
http://<VM_IP>:30080
```

Example:
```
http://192.168.64.4:30080
```

### Option B: Port-forward

```bash
kubectl port-forward svc/alzcare-frontend 8081:80 -n alzcare
```

Then open `http://localhost:8081`

### Option C: kubectl proxy

```bash
kubectl proxy
```

Then access via Kubernetes API proxy.

---

## 8. Troubleshooting

### Docker build fails with "npm ci" error

- Make sure `package.json` and `package-lock.json` are in the repo
- The Dockerfile uses `--legacy-peer-deps` flag to handle peer dependency conflicts

### ImagePushBackOff in k3s

- The `ghcr-secret` in the `alzcare` namespace might not exist
- Create it:
  ```bash
  kubectl create secret docker-registry ghcr-secret \
    --docker-server=ghcr.io \
    --docker-username=salma-louhichi \
    --docker-password=<YOUR_GITHUB_TOKEN> \
    --namespace=alzcare
  ```

### Frontend shows blank page

- Check browser console for errors
- The nginx config handles Angular routing (SPA), but if assets fail to load, check the `base href` in `index.html`

### Jenkins cannot find `docker` or `kubectl`

- Same fix as the backend pipeline:
  - The Jenkinsfile already has `export PATH` for both tools
  - Make sure Docker Desktop is running
  - Make sure kubectl is installed: `brew install kubectl`

### Rollout fails or pod crashes

- Check pod logs:
  ```bash
  kubectl logs -n alzcare deployment/alzcare-frontend
  ```
- Check pod status:
  ```bash
  kubectl get pods -n alzcare
  ```

---

## Summary Checklist

- [x] Dockerfile created
- [x] nginx.conf created
- [x] Jenkinsfile created
- [x] frontend-deployment.yaml created
- [ ] Commit and push all files to `devops-salma` branch
- [ ] Create Jenkins job `alzcare-frontend`
- [ ] Configure Jenkins job with Git repo and branch
- [ ] Verify credentials (`ghcr-creds`, `k3s-kubeconfig`)
- [ ] Run first build
- [ ] Verify pod is Running in k3s
- [ ] Access frontend via NodePort (`http://<VM_IP>:30080`)

When all boxes are checked, your frontend DevOps pipeline is complete! 🎉
testing webhooks