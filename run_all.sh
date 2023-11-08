#!/bin/bash

echo "Running all scripts to process openalex tables."

# Run the main Node.js script
echo "Running works.."
node /proj/run_works

echo "Running concepts.."
node /proj/run_concepts

echo "Running institutions.."
node /proj/run_institutions

echo "End!"