# Use an official Deno runtime as a parent image
# Using alpine for a smaller image size
FROM denoland/deno:alpine

RUN deno --version # Check the Deno version in the image
# Set the working directory in the container
WORKDIR /app

# Install system dependencies needed by the application
# poppler-utils is required for pdftotext (used in backend/parsers.ts)
RUN apk update && \
    apk add --no-cache poppler-utils && \
    rm -rf /var/cache/apk/*

# Allow Deno to read environment variables and access the network
# Allow read access for loading .env if needed inside the container (though usually passed via docker run -e)
# Allow net access for serving the application and potentially fetching external resources
ENV DENO_AUTH_TOKENS=""
ENV DENO_DIR=/deno-dir/
RUN chmod 777 /deno-dir/

# Copy the dependency manifest
COPY deno.json .

# Cache dependencies using the development entry point.
# This command will download and cache all static dependencies imported by the main
# entry points (dev.ts) and specific backend modules like parsers.ts.
RUN deno cache dev.ts backend/parsers.ts --config deno.json

# Bundle application source
COPY . .

# Define the port the app will run on
ENV PORT=3020

# Expose port to the outside world
EXPOSE $PORT

# Define the command to run the application using the start task
CMD ["task", "start"]
