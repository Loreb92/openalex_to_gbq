#!/bin/bash

echo "Running all scripts to process openalex tables."

# Run the main Node.js script
echo "Running works.."
node proj/run_works.js

echo "Running concepts.."
node proj/run_concepts.js

echo "Running institutions.."
node proj/run_institutions.js

echo "End!"
