const express = require('express');
const morgan = require("morgan");
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require("cors")
const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');

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

app.get('/info', (req, res, next) => {
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


const networkInterface = 'en0';
const outputFile = '/Users/yavuzerkal/Desktop/node-express.txt';
const tcpdumpStart = `sudo tcpdump -i ${networkInterface} -w ${outputFile}`;
const tcpdumpStop = 'pkill tcpdump && kill tcpdump'

/*exec(tcpdumpStart, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
});*/

// Start the Proxy
app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy at ${HOST}:${PORT}`);
});