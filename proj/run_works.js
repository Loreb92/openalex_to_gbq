import chalk from "chalk";
import fileSystem from "fs";
import ndjson from "ndjson";
import zlib from "zlib";
import JSON from "JSON";
import util from "util";
import stream from "stream";



// fix stuff
// ----------

// empty objects

const empty_institution = {
	id: null,
	display_name: null,
	ror: null,
	country_code: null,
	type: null
}

const empty_counts_by_year = {
	year:  null,
	cited_by_count: null
}

const empty_mesh = {
	is_major_topic: null,
	descriptor_ui: null,
	descriptor_name: null,
	qualifier_ui: null,
	qualifier_name: null
}

const empty_alternate_host_venue = {
	id: null,
	display_name: null,
	type: null,
	url: null,
	is_oa: null,
	version: null,
	license: null
}

const empty_concept = {
	id: null,
	wikidata: null,
	display_name: null,
	level: null,
	score: null
}

// functions for fixing stuff

function fix_authorships(authorships) {

	var authorships = authorships.map(author => {	
		if (author.institutions.length === 0) { 
			author.institutions.push(empty_institution)
		 }
		return(author)
	})

	return(authorships)
}

function fix_host_venue(host_venue) {
	if (host_venue==null) {
			return(null)
	}
	if (!host_venue.issn) {
		host_venue.issn = [];		
	}
	return(host_venue)
};

function fix_counts_by_year(counts_by_year) {
	if (counts_by_year.length === 0) {
		counts_by_year.push(empty_counts_by_year)
	}
	
	return(counts_by_year)
}

function fix_mesh(mesh){
	if (mesh.length===0){
		mesh.push(empty_mesh)
	}
	return(mesh)
}

function fix_alternate_host_venues(alternate_host_venues) {

	if (alternate_host_venues.length===0) {
		alternate_host_venues.push(empty_alternate_host_venue)
	}

	return(alternate_host_venues)

}

function fix_concepts(concepts) {
	if (concepts.length===0) {
		concepts.push(empty_concept)
	}

	return(concepts)

}

// #################################################

function fixRecord(data) {

}

//async function fixFile(inPath, outPath, file) {
function fixFile(inPath, outPath, file) {
	console.log(inPath+file)

	var pipeline = util.promisify(stream.pipeline);
    var inputStream = fileSystem.createReadStream( inPath+file );
    var outputStream = fileSystem.createWriteStream( outPath + file );

    var transformOutStream = ndjson.stringify();
    
    var gunzip = zlib.createGunzip();
    var gzip = zlib.createGzip();

    let count = 0;

    var transformInStream = ndjson.parse()
			
			.on(
				"data",

				function handleRecord( data ) {

                    ++count % 100000 || console.log(count);

					data.authorships = fix_authorships(data.authorships);
					data.primary_location = fix_host_venue(data.primary_location);
					data.counts_by_year = fix_counts_by_year(data.counts_by_year);
					data.mesh = fix_mesh(data.mesh);
					data.locations = fix_alternate_host_venues(data.locations);
					data.concepts = fix_concepts(data.concepts);

					data.abstract_inverted_index = JSON.stringify(data.abstract_inverted_index);
					
				}
			)
			.on(
				"end",
				function handleEnd() {

					console.log( chalk.green( "ndjson parsing complete!" ) );
		

				}
			)
		;

    //await pipeline(
	pipeline(
        inputStream,
        gunzip,
        transformInStream,
        transformOutStream,
        gzip,
        outputStream
    );
}


//async function start(inPath, outPath, files) {
function start(inPath, outPath, files) {
	for(let i=0; i< files.length; i++){
		// if the output file does not already exist, run the fix
		if (!fileSystem.existsSync(outPath + files[i])) {
			//await fixFile(inPath, outPath, files[i]);
			fixFile(inPath, outPath, files[i]);
		}
	}
}


// RUN
// -----


//const EXTENSION = '.gz';
//
//const FOLDER = 'works/updated_date=2023-04-20/'; //folder for conversion
//
//const inPath = '/data/' + FOLDER;
//const outPath = '/data/converted/' + FOLDER;
//
//var files = fileSystem.readdirSync(inPath);
//
//start(inPath, outPath, files);
const EXTENSION = ".gz";
const WORKS_FOLDER = "works/";

const inRootPath = "openalex-original/data/";
const outRootPath = "openalex-processed/data/";

// Get a list of nested folders within the works directory
const folders = fileSystem.readdirSync(inRootPath + WORKS_FOLDER, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// Process each nested folder
for (let i = 0; i < folders.length; i++) {
  const folder = folders[i];
  const inPath = inRootPath + WORKS_FOLDER + folder + "/";
  const outPath = outRootPath + WORKS_FOLDER + folder + "/";

  // Create the outPath directory if it doesn't exist
  if (!fileSystem.existsSync(outPath)) {
    fileSystem.mkdirSync(outPath, { recursive: true });
  }

  var files = fileSystem.readdirSync(inPath);
  //await start(inPath, outPath, files);
  start(inPath, outPath, files);
}
