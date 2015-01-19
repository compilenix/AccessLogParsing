var fs = require('fs');
var readline = require('readline');
var config;

if (fs.existsSync("./config.js")) {
    config = require('./config.js').config;
} else {
    config = require('./config.js.example').config;
}

var partsDir = config.partsDir;
var currentHour = undefined;
var currentday = undefined;
var currentPartLog = undefined;
var linesprocessed = 0;
var outputChunk = '';
var outputChunkLimit = (config.buffer / 2);

process.argv.forEach(function(val, index, array) {
    if (index < 2) { // first two args are 'node' and '/path/to/app.js'
        return true; // equivalent of 'continue'
    }

    parseAccessLog(val);
});


function parseAccessLog(file) {

    var fd = fs.openSync(file, 'r');
    var bufferSize = (config.buffer / 2);
    var buffer = new Buffer(bufferSize);
    var leftOver = '';
    var read, line, idxStart, idx;

    // create $partsDir if not exist
    try {
        fs.mkdirSync(partsDir);
    } catch (e) {
        if (e.code !== 'EEXIST') {
            console.error(e);
            throw (e);
        }
    }

    // read the $logfile line by line synchronously and call processLine(line);
    while ((read = fs.readSync(fd, buffer, 0, bufferSize, null)) !== 0) {
        leftOver += buffer.toString('utf8', 0, read);
        idxStart = 0;
        while ((idx = leftOver.indexOf("\n", idxStart)) !== -1) {
            line = leftOver.substring(idxStart, idx);
            processLine(line);
            linesprocessed++;
            idxStart = idx + 1;
        }
        leftOver = leftOver.substring(idxStart);
    }

    if (outputChunk.length > 0) {
        fs.appendFileSync(currentPartLog, outputChunk);
        outputChunk = '';
    }
}

// END //

function processLine(line) {
    var date = parseDateFromLogLine(line);

    if (date.getHours() !== currentHour) { // next log.part (1h)
        currentHour = date.getHours();
        currentday = date.getDate();
        currentPartLog = getNewPartFileName(date);

        // update stdout
        if (config.displaymode === 'n') {
            stdoutResetLine();
            var out = date.getFullYear().toString() + "-" + 
                InsertingPadding(date.getMonth().toString(), 2) + "-" + 
                InsertingPadding(date.getDate().toString(), 2) + "  " +
                InsertingPadding(date.getHours().toString(), 2) + "h  lines: " + linesprocessed.toString();
            stdoutWrite(out);
        }
    }

    // write every $outputChunkLimit the outputChunk to file
    if (outputChunk.length >= outputChunkLimit) {
        fs.appendFileSync(currentPartLog, outputChunk);
        outputChunk = '';
    } else {
        outputChunk += (line + '\n');
    }
}

function parseDateFromLogLine(line) {
    // apache "combined" LogFormat: Remote host, Remote logname, Remote user, time, request, return code, Bytes sent, referer, user agent
    var parts = line.trim().split(/\s+/);

    var dateString = parts[3].substring(1); // [02/Jan/2015:04:30:08
    dateString = dateString.split('/'); // [ '02', 'Jan', '2015:04:31:29' ]
    var tmp = dateString[2]; // '2015:04:31:29'
    dateString.splice(2); // remove '2015:04:31:29' from [ '02', 'Jan', '2015:04:31:29' ]
    dateString = dateString.concat(tmp.split(':')); // [ '02', 'Jan', '2015', '04', '31', '29' ]
    var timeOffset = parts[4].substring(0, parts[4].length - 1); // from +0100] to +0100

    return new Date(Date.parse(dateString[2] + // 2015
                                    "-" + dateString[1] + // Jan
                                    "-" + dateString[0] + // 02
                                    " " + dateString[3] + // 04
                                    ":" + dateString[4] + // 31
                                    ":" + dateString[5] + // 29
                                    " UTC " + timeOffset)); // +0100
}

function getNewPartFileName(date) {
    return partsDir
         + date.getFullYear().toString()
         + InsertingPadding(date.getMonth().toString(), 2)
         + InsertingPadding(date.getDate().toString(), 2)
         + InsertingPadding(date.getHours().toString(), 2)
         + ".part.log"; // return: 2014112104.part.log
}

function InsertingPadding(input, width, insert) { // 2, 4 , "-"
    insert = insert || '0';
    input = input + '';
    return input.length >= width ? input : new Array(width - input.length + 1).join(insert) + input; // return: "--2"
}

function stdoutResetLine() {
    readline.cursorTo(process.stdout, 0);
}

function stdoutWrite(data) {
    process.stdout.write(data.toString());
}

exports.parseAccessLog = parseAccessLog;
