var Lazy = require('lazy');
var fs = require('fs');
var logfile = 'access.23.log';

var regexLogLine = /^[0-9a-f.:]+ - - \[([0-9]{2}\/[a-z]{3}\/[0-9]{4}):([0-9]{2}:[0-9]{2}:[0-9]{2}[^\]]*)\] \"([^\"]+)\" [0-9]+ [0-9]+/i;

var currentHour = undefined;
var currentday = undefined;
var currentPartLog = undefined;


var fd = fs.openSync(logfile, 'r');
var bufferSize = 16384;
var buffer = new Buffer(bufferSize);
var leftOver = '';
var read, line, idxStart, idx;

while ((read = fs.readSync(fd, buffer, 0, bufferSize, null)) !== 0) {
    leftOver += buffer.toString('utf8', 0, read);
    idxStart = 0
    while ((idx = leftOver.indexOf("\n", idxStart)) !== -1) {
        line = leftOver.substring(idxStart, idx);
        processLine(line);
        idxStart = idx + 1;
    }
    leftOver = leftOver.substring(idxStart);
}


function processLine(line) {
    // Remote host, Remote logname, Remote user, time, request, return code, Bytes sent, referer, user agent
    var parts = line.trim().split(/\s+/);

    var dateString = parts[3].substring(1); // [02/Jan/2015:04:30:08
    dateString = dateString.split('/'); // [ '02', 'Jan', '2015:04:31:29' ]
    var tmp = dateString[2]; // '2015:04:31:29'
    dateString.splice(2); // remove '2015:04:31:29' from [ '02', 'Jan', '2015:04:31:29' ]
    dateString = dateString.concat(tmp.split(':')); // [ '02', 'Jan', '2015', '04', '31', '29' ]
    var timeOffset = parts[4].substring(0, parts[4].length - 1); // from +0100] to +0100

    var date = new Date(Date.parse(dateString[2] + // 2015
                                    "-" + dateString[1] + // Jan
                                    "-" + dateString[0] + // 02
                                    " " + dateString[3] + // 04
                                    ":" + dateString[4] + // 31
                                    ":" + dateString[5] + // 29
                                    " UTC " + timeOffset)); // +0100

    if (currentHour === undefined) {
        currentHour = date.getHours();
        currentday = date.getDate();
        currentPartLog = date.getTime() + '.part.log';
        //console.log("new log: " + currentPartLog);

        //fs.writeFileSync(currentPartLog, '');

    } else if (date.getHours() !== currentHour){
        currentHour = date.getHours();
        currentPartLog = date.getTime() + '.part.log';
        //console.log("new log: " + currentPartLog);
        // TODO: make next file
    }

    if (date.getDate() !== currentday) {
        currentday = date.getDate();
        console.log(date);
    }
}
