
process.env.UV_THREADPOOL_SIZE=3;
import chalk from "chalk";
import fileSystem from "fs";
import ndjson from "ndjson";
import zlib from "zlib";
import util from "util";
import stream from "stream";
import _ from "lodash";
//import recursiveKeyReplace from "recursive-key-replace";



// fix stuff
// ----------

//https://github.com/pbojinov/recursive-key-replace/blob/master/index.js

function recursiveKeyReplace(obj) {
    _.forOwn(obj, (value, key) => {
        // if key matches `search` term, replace all occurences with `replaceValue`
        if (_.includes(key, '-')) {
            const cleanKey = _.replace(key, /\-/g, '_');
            obj[cleanKey] = value;
            delete obj[key];
        }
        // continue recursively looping through if we have an object or array
        if (_.isObject(value)) {
            return recursiveKeyReplace(value);
        }
    });
    return obj;
}


function fixHyphen(data) {

       
    recursiveKeyReplace(data);

	return(data)

}



// #################################################

function fixRecord(data) {

}

async function fixFile(inPath, outPath, file) {
	console.log(inPath+file)

	var pipeline = util.promisify(stream.pipeline);
    var inputStream = fileSystem.createReadStream( inPath+file );
    var outputStream = fileSystem.createWriteStream( outPath + file );

    var transformOutStream = ndjson.stringify();
    
    var gunzip = zlib.createGunzip();
    var gzip = zlib.createGzip();

    let count = 0;

    var transformInStream = ndjson.parse()
			// Each "data" event will emit one item from our original record-set.
			.on(
				"data",

				function handleRecord( data ) {

                    ++count % 100000 || console.log(count);

					data = fixHyphen(data);
                    
                    delete data.international;

					//console.log( chalk.red( "Record:" ), data.id );
					
				}
			)

			// Once ndjson has parsed all the input, let's indicate done.
			.on(
				"end",
				function handleEnd() {

					console.log( chalk.green( "ndjson parsing complete!" ) );
					//transformOutStream.end();

				}
			)
		;

    await pipeline(
        inputStream,
        gunzip,
        transformInStream,
        transformOutStream,
        gzip,
        outputStream
    );
}


async function start(inPath, outPath, files) {
    for(let i=0; i< files.length; i++){
		// check if output file already exists
		if (!fileSystem.existsSync(outPath + files[i])) {
			await fixFile(inPath, outPath, files[i]);
		} else {
			console.log("Skipping " + files[i] + " because it already exists.")
		}
      }
}


// RUN
// -----


const EXTENSION = '.gz';

const INSTI_FOLDER = 'institutions/'; // Folder for conversion

const inRootPath = 'openalex-original/data/';
const outRootPath = 'openalex-processed/data/';

// Get a list of nested folders within the works directory
const folders = fileSystem.readdirSync(inRootPath + INSTI_FOLDER, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// Process each nested folder
for (let i = 0; i < folders.length; i++) {
  const folder = folders[i];
  const inPath = inRootPath + INSTI_FOLDER + folder + "/";
  const outPath = outRootPath + INSTI_FOLDER + folder + "/";

  // Create the outPath directory if it doesn't exist
  if (!fileSystem.existsSync(outPath)) {
    fileSystem.mkdirSync(outPath, { recursive: true });
  }

  var files = fileSystem.readdirSync(inPath);
  await start(inPath, outPath, files);
}