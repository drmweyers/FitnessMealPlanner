## Running the Project with Docker

This project provides Dockerfiles for both the server and client applications, as well as a Docker Compose configuration for orchestrated local development or deployment.

### Project-Specific Docker Requirements
- **Node.js Version:** Both server and client Dockerfiles require Node.js version `22.13.1-slim` (set via `ARG NODE_VERSION=22.13.1`).
- **Non-root User:** Both images create and run as a non-root user for improved security.
- **Build Process:**
  - The server Dockerfile builds both the server and client (if configured via Vite) and installs only production dependencies in the final image.
  - The client Dockerfile builds the client app and installs only production dependencies in the final image.

### Environment Variables
- The Docker Compose file includes commented-out `env_file` lines for both services. If your project requires environment variables, create a `.env` file in the root, `./server`, or `./client` directories as needed, and uncomment the relevant lines in `docker-compose.yml`.

### Build and Run Instructions
1. **Ensure Docker and Docker Compose are installed.**
2. **Build and start the services:**
   ```sh
   docker compose up --build
   ```
   This will build and start both the server and client containers.

### Service Ports
- **Server (`ts-server`):** Exposes port **5000** (mapped to host `5000:5000`).
- **Client (`ts-client`):** Exposes port **3000** (mapped to host `3000:3000`).

### Special Configuration
- **Network:** Both services are attached to a custom Docker network `appnet` (bridge driver).
- **Dependencies:** The server service depends on the client service (`depends_on: ts-client`).
- **Static Assets:** The server Dockerfile is set up to copy static assets from the build if needed.
- **Production Builds:** Only production dependencies are included in the final images for both services.

### Notes
- If you need to pass environment variables, ensure your `.env` files are present and uncomment the `env_file` lines in the compose file.
- If you add external services (e.g., a database), update the `docker-compose.yml` accordingly.

Refer to the `DEPLOYMENT_GUIDE.md` for more advanced deployment scenarios or customizations.