def serviceDir = '.'
def defaultImageRepo = 'ghcr.io/salma-louhichi/alzcare-frontend'
def artifactStashName = 'frontend-dist'
def builtImageForDeploy = ''

properties([
  parameters([
    booleanParam(
      name: 'SKIP_DOCKER_BUILD_PUSH',
      defaultValue: false,
      description: 'Skip Docker build/push and use IMAGE_OVERRIDE for deploy'
    ),
    booleanParam(
      name: 'SKIP_DEPLOY',
      defaultValue: false,
      description: 'Skip k3s deployment'
    ),
    string(
      name: 'IMAGE_OVERRIDE',
      defaultValue: '',
      description: 'Existing image to deploy when Docker build/push is skipped'
    ),
    string(
      name: 'DOCKER_CREDENTIALS_ID',
      defaultValue: 'ghcr-creds',
      description: 'Jenkins credentials ID for the container registry'
    ),
    string(
      name: 'KUBECONFIG_CREDENTIAL_ID',
      defaultValue: 'k3s-kubeconfig',
      description: 'Jenkins file credential ID for kubeconfig'
    ),
    string(
      name: 'IMAGE_REPO',
      defaultValue: defaultImageRepo,
      description: 'Full registry/repository name without tag'
    ),
    string(
      name: 'DOCKER_NODE_LABEL',
      defaultValue: '',
      description: 'Optional Jenkins node label for Docker build/push and deploy stages'
    ),
    booleanParam(
      name: 'PUSH_LATEST_TAG',
      defaultValue: false,
      description: 'Also push the latest tag in addition to the commit tag'
    )
  ])
])

def runDockerStages = { Closure body ->
  def dockerNodeLabel = (params.DOCKER_NODE_LABEL ?: '').trim()
  if (dockerNodeLabel) {
    node(dockerNodeLabel) {
      timestamps {
        body()
      }
    }
  } else {
    node {
      timestamps {
        body()
      }
    }
  }
}

node {
  timestamps {
    stage('Checkout') {
      checkout scm
    }

    stage('Build') {
      dir(serviceDir) {
        sh '''
          set -e
          
          # Check Node.js version
          node --version
          npm --version
          
          # Install dependencies
          npm ci --legacy-peer-deps
          
          # Build production bundle
          npm run build -- --configuration=production
        '''.stripIndent().trim()
      }

      stash name: artifactStashName, includes: "${serviceDir}/dist/**/*", allowEmpty: false
    }
  }
}

runDockerStages {
  stage('Checkout (Docker Node)') {
    checkout scm
  }

  stage('Docker Build & Push') {
    if (params.SKIP_DOCKER_BUILD_PUSH) {
      echo 'Skipping Docker build/push (SKIP_DOCKER_BUILD_PUSH=true)'
      return
    }

    if ((params.IMAGE_OVERRIDE ?: '').trim()) {
      echo 'Skipping Docker build/push (IMAGE_OVERRIDE provided)'
      return
    }

    unstash artifactStashName

    def imageTag = env.GIT_COMMIT?.take(12)
    if (!imageTag) {
      try {
        imageTag = sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()
      } catch (ignored) {
        imageTag = env.BUILD_NUMBER
      }
    }

    def imageRepo = (params.IMAGE_REPO ?: defaultImageRepo).trim()

    withCredentials([
      usernamePassword(
        credentialsId: params.DOCKER_CREDENTIALS_ID,
        usernameVariable: 'REGISTRY_USER',
        passwordVariable: 'REGISTRY_PASS'
      )
    ]) {
      withEnv([
        "IMAGE_REPO=${imageRepo}",
        "IMAGE_TAG=${imageTag}",
        "PUSH_LATEST=${params.PUSH_LATEST_TAG}"
      ]) {
        dir(serviceDir) {
          sh '''
            set -e
            set +x

            export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

            command -v docker >/dev/null 2>&1 || {
              echo "ERROR: docker CLI not found on this agent"
              exit 2
            }

            REGISTRY_HOST="$(printf '%s' "$IMAGE_REPO" | cut -d/ -f1)"
            IMAGE="${IMAGE_REPO}:${IMAGE_TAG}"

            echo "$REGISTRY_PASS" | docker login "$REGISTRY_HOST" -u "$REGISTRY_USER" --password-stdin

            ls -la dist/alzheimer-care-app/index.html >/dev/null 2>&1 || {
              echo "ERROR: dist/alzheimer-care-app/index.html not found. Build stage may have failed."
              exit 2
            }

            docker build -t "$IMAGE" .
            docker push "$IMAGE"

            if [ "$PUSH_LATEST" = "true" ]; then
              LATEST_IMAGE="${IMAGE_REPO}:latest"
              docker tag "$IMAGE" "$LATEST_IMAGE"
              docker push "$LATEST_IMAGE"
            fi

            echo "$IMAGE" > image.txt
          '''.stripIndent().trim()

          builtImageForDeploy = readFile('image.txt').trim()
          echo "Built image: ${builtImageForDeploy}"
        }
      }
    }
  }

  stage('Deploy To k3s') {
    if (params.SKIP_DEPLOY) {
      echo 'Skipping deploy (SKIP_DEPLOY=true)'
      return
    }

    def imageOverride = (params.IMAGE_OVERRIDE ?: '').trim()
    def imageToDeploy = imageOverride ?: builtImageForDeploy

    if (!imageToDeploy) {
      error 'IMAGE_OVERRIDE is required when Docker build/push is skipped.'
    }

    dir(serviceDir) {
      withCredentials([
        file(
          credentialsId: params.KUBECONFIG_CREDENTIAL_ID,
          variable: 'KUBECONFIG_FILE'
        )
      ]) {
        withEnv([
          "KUBECONFIG=${KUBECONFIG_FILE}",
          "IMAGE_TO_DEPLOY=${imageToDeploy}"
        ]) {
          sh '''
            set -e

            export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

            command -v kubectl >/dev/null 2>&1 || {
              echo "ERROR: kubectl not found on this agent"
              exit 2
            }

            echo "Ensuring namespace exists..."
            kubectl create namespace alzcare --dry-run=client -o yaml | kubectl apply -f -

            echo "Rendering frontend deployment with image: $IMAGE_TO_DEPLOY"
            sed "s|IMAGE_PLACEHOLDER|$IMAGE_TO_DEPLOY|g" frontend-deployment.yaml > frontend-deployment.rendered.yaml

            echo "Applying deployment..."
            kubectl apply -n alzcare -f frontend-deployment.rendered.yaml

            echo "Waiting for rollout..."
            kubectl rollout status deployment/alzcare-frontend -n alzcare --timeout=300s

            echo "Active image:"
            kubectl get deployment alzcare-frontend -n alzcare -o jsonpath='{.spec.template.spec.containers[0].image}'
            echo
          '''.stripIndent().trim()
        }
      }
    }
  }
}
