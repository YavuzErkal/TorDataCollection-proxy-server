const express = require('express');
const morgan = require("morgan");
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require("cors")
const { exec } = require("child_process");
const request = require("request");
const fs = require("fs");
const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');

const app = express(); // Create Express Server

// Configuration
const PORT = 3000;
const HOST = "localhost";
const target_URL = "https://google.com";

app.use(morgan('dev')); // Logging
//app.use(cors()); // Cors
app.use(express.static('public')); // serve files in the public directory
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next()
})

// Info GET endpoint
app.get('/info', (req, res, next) => {
    res.send('This is a proxy service which proxies to Billing and Account APIs.');
});

app.get('/', (req, res, next) => {
    res.sendFile('public/index.html', {root: __dirname});
});

/*const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');*/
const agent = new SocksProxyAgent('socks5://127.0.0.1:9050');
let ip_tor, ip_not_tor;

app.get('/ip-with-tor', (req, res, next) => {
    https.get('https://ifconfig.me', {
        agent
    }, res => {
        res.pipe(process.stdout);
    })
});

app.get('/ip-without-tor', (req, res, next) => {
    https.get('https://ifconfig.me', {}, res => {
        res.pipe(process.stdout);
    })
});

app.get('/tor-test', (req, res, next) => {
    https.get('https://youtube.com', {
        agent
    }, res => {
        res.pipe(process.stdout);
        console.log(res)
    })
    res.sendStatus(200)
});


app.use('/proxy-test',
    createProxyMiddleware({
        target: 'https://facebook.com',
        changeOrigin: true,
    })
);

app.get("/proxy/:url", (req, res) => {
    const url = req.params.url;
    console.log(req.params)

    let origin = req.get('origin');
    console.log('origin')
    console.log(origin)

    //1request(url).pipe(res);
    //fetch(url).then(r => console.log(r))
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