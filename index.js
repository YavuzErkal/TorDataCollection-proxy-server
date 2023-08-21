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

// Info GET endpoint
app.get('/info', (req, res, next) => {
    res.send('This is a proxy service which proxies to Billing and Account APIs.');
});

app.get('/', (req, res, next) => {
    res.sendFile('public/index.html', {root: __dirname});
});

/*app.get('/proxy-client', (req, res, next) => {
    res.send(request("http://info.cern.ch/", null, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            // writing the response to a file named data.html
            fs.writeFileSync("data.html", body);
        }
    }));
});*/

/*const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');*/
const agent = new SocksProxyAgent('socks5://127.0.0.1:9050');
let ip_tor, ip_not_tor;

app.get('/ip-with-tor', (req, res, next) => {
    https.get('https://ifconfig.me', {
        agent
    }, res => {
        res.pipe(process.stdout);
    })
    res.send('your TOR - IP is: ' + req.ip)
});


app.get('/ip-without-tor', (req, res, next) => {
    https.get('https://ifconfig.me', {}, res => {
        res.pipe(process.stdout);
    })
    res.send('your normal IP is: ' + req.ip)
});





/*
app.use('/proxy/', createProxyMiddleware({
    target: function (req, res) {
        // Get the URL parameter from the query string
        const targetUrl = req.query.url;

        // Return the target URL as the proxy target
        return targetUrl;
    },
    changeOrigin: true,
    pathRewrite: {
        '^/proxy/': ''
    }
}));*/

const networkInterface = 'en0';
const outputFile = '/Users/yavuzerkal/Desktop/node-express.txt';
const tcpdumpStart = `sudo tcpdump -i ${networkInterface} -w ${outputFile}`;
const tcpdumpStop = 'pkill tcpdump && kill tcpdump'

exec(tcpdumpStart, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
});

// Start the Proxy
app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy at ${HOST}:${PORT}`);
});