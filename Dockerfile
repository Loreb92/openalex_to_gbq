# Install node image
FROM node

# Create directories as in the repo
RUN mkdir openalex_to_gbq

# Copy files from local to the container
# by writing "/proj/", you ask the container to create the proj/ directory if it does not exists.
COPY proj /openalex_to_gbq/proj/
COPY run_all.sh /openalex_to_gbq/

# WORKDIR is equivalent to cd in the image
WORKDIR openalex_to_gbq

# Create the folders for the data
RUN mkdir openalex-original
RUN mkdir openalex-processed

# For debugging purposes
#RUN pwd
#RUN ls

# It installs packages from package.json
RUN mv proj/package.json .
RUN npm install

# To run the application
# Note: if the "docker run ..." command ends with "sh", the following commands are overridden and it is needed to run manually them inside the container
CMD ["/bin/bash", "run_all.sh"]

