#!/usr/bin/env bash
# Build the root Dockerfile locally and push (default: Docker Hub, private repo).
#
# Docker Hub (private):
#   1) hub.docker.com → Repositories → Create → name it → Visibility: Private
#   2) Account Settings → Security → New Access Token (Read & Write)
#   3) docker login -u YOUR_DOCKERHUB_USERNAME
#      (paste the token as the password)
#   4) DOCKER_IMAGE=YOUR_DOCKERHUB_USERNAME/skillcorner-frontend:main ./scripts/docker-build-push.sh
#
# Railway: deploy from this image URL. For a private image, add Docker Hub credentials
# in the service (Registry / Docker credentials) so Railway can pull.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE="${DOCKER_IMAGE:-}"
TAG="${TAG:-latest}"
PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

if [[ -z "$IMAGE" ]]; then
  echo "Usage: DOCKER_IMAGE=user/repo:tag $0"
  echo "Docker Hub (private): DOCKER_IMAGE=mydockerhubuser/skillcorner-frontend:main $0"
  exit 1
fi

# Allow IMAGE without tag when TAG is set separately
if [[ "$IMAGE" != *:* ]]; then
  IMAGE="${IMAGE}:${TAG}"
fi

export DOCKER_BUILDKIT=1

echo "Building ${IMAGE} (platform=${PLATFORM})..."
docker buildx build \
  --platform "${PLATFORM}" \
  -f Dockerfile \
  -t "${IMAGE}" \
  --load \
  .

echo "Pushing ${IMAGE}..."
docker push "${IMAGE}"

echo "Done. Deploy this image URL in Railway (or your host)."
