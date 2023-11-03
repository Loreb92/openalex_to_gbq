FROM node

# Set the working directory to /proj
WORKDIR /proj

# Install global npm packages
RUN npm install -g chalk ndjson JSON zlib util lodash stream

# Tell node where to find dependencies
ENV NODE_PATH /usr/local/bin

# Copy the JavaScript script to the container
# COPY run_works.js .

# Set the entry point to run the script
ENTRYPOINT ["node", "/proj/run_works.js"]