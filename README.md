# OpenAlex data to Google Bigquery

OpenAlex data require some modifications before it can be uploaded as columnar data to BQ. Namely, all hyphens in tag names need to be removed and missing arrays should be added. 

This repo provides dockerized node.js scripts and instructions to convert and upload the data.

## Instructions

1. Download the data from `AWS`. Follow isntructions on https://docs.openalex.org/download-snapshot/download-to-your-machine

```
aws s3 sync 's3://openalex' 'openalex-snapshot' --no-sign-request
```

2. Build Docker image and run the scripts into the container.

Modify the first line of the scripts `proj/run_<entity>.js`. This sets the variable `UV_THREADPOOL_SIZE`, which is the number of threads that node.js can use. The default value is 3. Increase this number if you have more cores. 

```
docker build -t node . --no-cache --progress=plain
docker run -d --name node -v /$PWD/openalex-original:/openalex_to_gbq/openalex-original -v /$PWD/openalex-processed:/openalex_to_gbq/openalex-processed --rm -ti node
```

For the larger parts of the data this process takes several hours.

To run each command manually from the container, just remove the `-d` flag and add `sh` at the end of the `docker run` command. Then run each script manually for the container. For example:

```
node run_works
```

Note: the other concepts except `works`, `institutions`, and `concepts` do not require convertion and can be uploaded as is. 

After that, to check if all data have been copied:

```
find openalex-processed/data/<entity>/ -type f -name "*.gz" | xargs zcat | wc -l
find openalex-original/data/<entity>/ -type f -name "*.gz" | xargs zcat | wc -l
```
This script will count the total number of lines for each entity file. Note that with `works` this takes some time.

A quicker check consists in comparing the total size of the folders.

What may go wrong?

- The container may freeze, namely, the container is up but all its processes are frozen. It is not clear why it happens. One possibility is that it starts to consume too much RAM. In this case do the following:
    - Print the logs of the container `docker logs -t node` and identify the file that was being processed when the container froze.
    - Stop the container `docker stop node`.
    - Delete the file that was being processed `rm openalex-processed/data/<entity>/<folder>/<filename>.gz`.
    - Restart the container with `docker run ...`. The script will skip the files that were already processed and will continue with the next file.


3. Copy files to google cloud storage

```
gsutil -m cp -r openalex-processed/data/*  gs://my-bucket/dest/
gsutil -m cp -r openalex-original/data/authors gs://my-bucket/dest/
gsutil -m cp -r openalex-original/data/funders gs://my-bucket/dest/
gsutil -m cp -r openalex-original/data/merged_ids gs://my-bucket/dest/
gsutil -m cp -r openalex-original/data/publishers gs://my-bucket/dest/
gsutil -m cp -r openalex-original/data/sources gs://my-bucket/dest/
```


4. Create JSON schema files

The JSON schema files are needed to specify the structure of the database. Given the fact that the OpenAlex original data may change the database structure from one version to the other, this step may take some time to adapt the structure.

The starting point has been the schema tables provided at https://academic-observatory-workflows.readthedocs.io/en/latest/telescopes/openalex.html. The schema is in a tabular form and can be transformed to JSON using the `convert_tsv_to_json_schema.py` script:

```
python convert_tsv_into_json_schema.py proj/schemas_tsv proj/schemas_json
```

This script converts all the `.tsv` files in the folder `proj/schemas_tsv` into JSON schema file that are saved in the folder `proj/schemas_json`. 


5. Create the bigquery table

To upload each table, run the following command:
```
bq load --source_format=NEWLINE_DELIMITED_JSON -project_id=<PROJID> --replace=true openalex.<TABLE> gs://my-bucket/dest* <LOCAL SCHEMA>
```
where `<LOCAL SCHEMA>` is the JSON schema file for the table `<TABLE>` created in the previous step.

Note.

Steps 4. and 5. may be repeated several times until the correct schema files are provided. Indeed, the command run at step 5. may fail if the schema file is not correct. In this case, the error message will provide information about the error. The schema file can be corrected in the `.tsv` file and transformed again into JSON. Then, step 5. can be repeated.


## Notes
- Inverted Abstracts are converted to strings.
- Concepts.international is dropped because it was a headache to deal with.
- Fields `concepts.updated` and `concepts.updated_date` are read as STRING in the schema because they are reported sometimes as DATE and sometimes as DATETIME. Same for `publishers` and `sources`.

## TODO
- Manage `manifest` files: those should be out of the directory containing the subfolders with data, otherwise the command to upload files to BigQuery does not recognize them. At the moment, I've moved them manually into `gs://my-bucket/../data/`.


Enjoy!
