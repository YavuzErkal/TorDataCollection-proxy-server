const express = require('express');
const cors = require("cors")
const https = require('https');
const {spawn, exec} = require("node:child_process");

const app = express(); // Create Express Server

// Configuration
const PORT = 3000;
const HOST = "localhost";

app.use(cors()); // Cors
app.use(express.static('public')); // serve files in the public directory

app.get('/', (req, res, next) => {
    res.sendFile('public/index.html', {root: __dirname});
});

app.get('/check-proxy-server', (req, res, next) => {
    console.log('Check-server request received from the client')
    res.send('Proxy server is running');
});

const networkInterface = 'eth0';
const outputFile = '/root/server-tcpdump.txt';

let currentTcpdumpPID = 0;

app.get('/tcpdump-server-start', (req, res) => {
    const deleteLogFileIfExisting = `if [ -f /root/server-tcpdump.txt ]; then
                                            echo "Deleting previous log file ${outputFile}";
                                            echo -n "Creating new log file ${outputFile}";
                                            rm /root/server-tcpdump.txt;
                                     else
                                         echo -n "Creating new log file ${outputFile} to save tcpdump values"; fi`;
    exec(deleteLogFileIfExisting, (error, stdout) => {
        if (error) {console.error(`Error: ${error.message}`); res.send(error.message); return;}
        console.log(stdout);
        console.log("Starting tcpdump at server side")
    })

    spawn('tcpdump', ["-i", networkInterface, "-w", outputFile])

    const getTcpdumpPID =  `ps -A | grep tcpdump | grep -v grep | awk '{print $1}'`
    const getTcpdumpInfo =  `ps -A | grep tcpdump | grep -v grep`
    let currentTcpdumpProcessInfo;

    exec(getTcpdumpInfo, (error, stdout) => {
        if (error) {console.error(`Error: ${error.message}`); res.send(error.message); return;}
        currentTcpdumpProcessInfo = stdout.replace(/\r?\n$/, '') // remove carriage return at the end of line
        console.log(`Current tcpdump process: ${currentTcpdumpProcessInfo}`);
    });

    exec(getTcpdumpPID, (error, stdout) => {
        if (error) {console.error(`Error: ${error.message}`); res.send(error.message);return;}

        currentTcpdumpPID = stdout.replace(/\r?\n$/, '') // remove carriage return at the end of line
        res.send(`Proxy server: tcpdump is started successfully \n${currentTcpdumpProcessInfo}`);
    });
})

app.get('/tcpdump-server-stop', (req, res) => {
    console.log("Stopping tcpdump")

    const tcpdumpStop = 'kill ' + currentTcpdumpPID

    exec(tcpdumpStop, (error, stdout, stderr) => {
        if (error) {console.error(`Error: ${error.message}`); res.send(error.message); return;}
        if (stderr) {console.error(`stderr: ${stderr}`); res.send(error.message); return;}

        console.log('tcpdump with PID ' + currentTcpdumpPID + ' is stopped.')
        res.send(`Proxy server: tcpdump with PID ${currentTcpdumpPID} is stopped`);
    });
})

app.get('/proxy-request', function(req,res) {
    const requestUrl = req.query.url;
    console.log(`Received request for ${requestUrl} over the Tor circuit. Proxying it to the final destination...`);

    https.get('https://' + requestUrl,  externalRequest => {
        externalRequest.pipe(process.stdout);
        console.log(externalRequest)
        res.sendStatus(200)
    }).on("error", err => {
        console.error('Error: ', err.message)
        res.send(err.message)
        return;
    })
});

app.get('/get-tcpdump-from-proxy-server', (req,res) => {
    console.log(`Sending  ${outputFile} to the client`);

    res.sendFile(outputFile, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(err.status || 500).send('Error sending tcpdump file');
        } else {
            console.log('Tcpdump file sent successfully');
        }
    });
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy at ${HOST}:${PORT}`);
});