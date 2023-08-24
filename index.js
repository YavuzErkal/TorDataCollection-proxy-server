const express = require('express');
const morgan = require("morgan");
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require("cors")
const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');
const {spawn, exec} = require("node:child_process");

const app = express(); // Create Express Server

// Configuration
const PORT = 3000;
const HOST = "localhost";
const target_URL = "https://google.com";

app.use(morgan('dev')); // Logging
app.use(cors()); // Cors
app.use(express.static('public')); // serve files in the public directory

app.get('/', (req, res, next) => {
    res.sendFile('public/index.html', {root: __dirname});
});

app.get('/check-server', (req, res, next) => {
    res.send('This is a proxy service for Tor connections');
});

app.get('/proxy', function(req,res) {
    const requestedUrl = req.query.url;
    console.log("Received URL:", requestedUrl);

    https.get('https://' + requestedUrl,  res => {
        res.pipe(process.stdout);
        console.log(res)
    }).on("error", err => {
        console.error('Error: ', err.message)
        // TODO signal to the client that the URL was invalid
    })


    res.sendStatus(200)
});

app.get('/proxy-request', function(req,res) {
    res.send("Yürü beeee")
});

const networkInterface = 'en0';
const outputFile = '/Users/yavuzerkal/Desktop/server-tcpdump.txt';

let currentTcpdumpPID = 0;

app.get('/tcpdump-start', (req, res) => {
    console.log("Starting tcpdump at server side")
    spawn('tcpdump', ["-i", networkInterface, "-w", outputFile])

    const getTcpdumpPID =  `ps -A | grep tcpdump | grep -v grep | awk '{print $1}'`
    const getTcpdumpInfo =  `ps -A | grep tcpdump | grep -v grep`

    exec(getTcpdumpInfo, (error, stdout) => {
        if (error) {console.error(`Error: ${error.message}`);return;}
        console.log(`currentTcpdumpPID: ${stdout}`);
    });


    exec(getTcpdumpPID, (error, stdout) => {
        if (error) {console.error(`Error: ${error.message}`);return;}

        currentTcpdumpPID = stdout.replace(/\r?\n$/, '') // remove carriage return at the end of line
        console.log(`currentTcpdumpPID: ${currentTcpdumpPID}`);
    });
})

app.get('/tcpdump-stop', (req, res) => {
    console.log("Stopping tcpdump")

    const tcpdumpStop = 'kill ' + currentTcpdumpPID

    exec(tcpdumpStop, (error, stdout, stderr) => {
        if (error) {console.error(`Error: ${error.message}`);return;}
        if (stderr) {console.error(`stderr: ${stderr}`);return;}

        console.log('tcpdump with PID ' + currentTcpdumpPID + ' is stopped.')
    });
})

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy at ${HOST}:${PORT}`);
});