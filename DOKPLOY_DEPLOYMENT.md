# Dokploy Deployment Notes

## Current Issue
Getting "404 page not found" when accessing arctic.buybackboyz.com

## Fixes Applied
1. Changed `expose: ["3000"]` to `ports: ["3000:3000"]` in docker-compose.yml
2. Added `/health` endpoint to frontend for debugging

## Debugging Steps

### 1. Check if containers are running
```bash
docker ps | grep arctic
```

### 2. Check frontend container logs
```bash
docker logs arcticdb-frontend
```

### 3. Test frontend directly
```bash
curl http://localhost:3000/health
```

### 4. Test from inside Dokploy network
```bash
docker exec -it arcticdb-frontend curl http://localhost:3000/health
```

## Common Dokploy Issues

### Port Mapping
- Dokploy needs the container to expose ports properly
- Use `ports` not just `expose` in docker-compose

### Traefik Labels (if using Traefik)
You might need to add labels to your frontend service:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.arctic-frontend.rule=Host(`arctic.buybackboyz.com`)"
  - "traefik.http.services.arctic-frontend.loadbalancer.server.port=3000"
```

### Network Mode
If Dokploy uses its own network, you might need:
```yaml
network_mode: "dokploy"
```

## Alternative: Use Dokploy's Native Service Creation
Instead of docker-compose, create two separate services in Dokploy:
1. Backend service (port 8000)
2. Frontend service (port 3000) with domain arctic.buybackboyz.com
