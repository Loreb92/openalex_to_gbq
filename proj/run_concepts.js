import chalk from "chalk";
import fileSystem from "fs";
import ndjson from "ndjson";
import zlib from "zlib";
import JSON from "JSON";
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

//async function fixFile(inPath, outPath, file) {
function fixFile(inPath, outPath, file) {
	console.log(inPath+file)

	//var pipeline = util.promisify(stream.pipeline);
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

					data = fixHyphen(data);
                    
                    delete data.international; //TODO

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
    //pipeline(
    //    inputStream,
    //    gunzip,
    //    transformInStream,
    //    transformOutStream,
    //    gzip,
    //    outputStream
    //).then(() => {
	//	callback(); // Move to the next file once processing is complete
	//}).catch(error => console.error('Error occurred: ', error));
    inputStream
        .pipe(gunzip)
        .pipe(transformInStream)
        .pipe(transformOutStream)
        .pipe(gzip)
        .pipe(outputStream)
        .on("finish", function () {
            console.log(chalk.green(`File processed: ${file}`));
            // Processed file, continue to the next one...
        });
}


//async function start(inPath, outPath, files) {
function start(inPath, outPath, files) {
    for(let i=0; i< files.length; i++){
        // if the output file does not already exist, run the fix
        if (!fileSystem.existsSync(outPath + files[i])) {
            //await fixFile(inPath, outPath, files[i]);
            fixFile(inPath, outPath, files[i]);
        } else {
			console.log("Skipped: " + inPath + files[i])
		}
    }
}


// RUN
// -----


const EXTENSION = '.gz';

const CONCEPTS_FOLDER = 'concepts/'; // manually change to folder you wish to convert

const inRootPath = 'openalex-original/data/';
const outRootPath = 'openalex-processed/data/';

// Get a list of nested folders within the works directory
const folders = fileSystem.readdirSync(inRootPath + CONCEPTS_FOLDER, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// Process each nested folder
for (let i = 0; i < folders.length; i++) {
  const folder = folders[i];
  const inPath = inRootPath + CONCEPTS_FOLDER + folder + "/";
  const outPath = outRootPath + CONCEPTS_FOLDER + folder + "/";

  // Create the outPath directory if it doesn't exist
  if (!fileSystem.existsSync(outPath)) {
    fileSystem.mkdirSync(outPath, { recursive: true });
  }

  var files = fileSystem.readdirSync(inPath);
  //await start(inPath, outPath, files);
  start(inPath, outPath, files);
}
