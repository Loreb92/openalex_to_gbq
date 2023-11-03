# Install node image
FROM node

# Copy files from local to the container
COPY proj/package.json .
COPY proj /proj/

# WORKDIR is equivalent to cd in the image

# It installs packages from package.json
RUN npm install

# To run the application
CMD ["node", "/proj/run_works.js"]