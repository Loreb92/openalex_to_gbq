import random
import subprocess
from pathlib import Path

VERSION = "25062026"   # pick this the same as in the .env file
BUCKET = "s3://openalex" 
ROOT = "data/jsonl" 
OUTPUT = Path(f"data/raw/{VERSION}") 
N_FILES = 5

# fix seed
random.seed(42)

# Main OpenAlex entity folders
entities = [
    "authors",
    "awards",
    "concepts",
    "continents",
    "countries",
    "domains",
    "fields",
    "funders",
    "institution-types",
    "institutions",
    "keywords",
    "languages",
    "licenses",
    "publishers",
    "sdgs",
    "source-types",
    "sources",
    "subfields",
    "topics",
    "work-types",
    "works",
]

for entity in entities:
    print(f"\n=== {entity} ===")

    # List all files recursively inside this entity
    cmd = [
        "aws", "s3", "ls",
        f"{BUCKET}/{ROOT}/{entity}/",
        "--recursive",
        "--no-sign-request"
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        check=True
    )

    files = []
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 4:
            key = parts[3]

            # We only want compressed JSONL data files
            if key.endswith(".gz"):
                files.append(key)

    if not files:
        print("No .gz files found.")
        continue

    n = min(N_FILES, len(files))
    selected = random.sample(files, n)

    print(f"Found {len(files)} files; downloading {n} random files.")

    output_dir = OUTPUT / entity
    output_dir.mkdir(parents=True, exist_ok=True)

    for key in selected:
        print(f"  {key}")

        source = f"{BUCKET}/{key}"

        # Remove "data/jsonl/" from the beginning. 
        # This gives: 
        # authors/updated_date=2016-08-23/part_0.gz 
        relative_path = Path(key).relative_to(ROOT)

        # Local destination: 
        # openalex_sample/authors/updated_date=2016-08-23/part_0.gz 
        destination = OUTPUT / relative_path

        print(f" {source}") 
        print(f" -> {destination}")

        subprocess.run([
            "aws", "s3", "cp",
            source,
            str(destination),
            "--no-sign-request"
        ], check=True)


print("Done!")
