const axios = require('axios');
const express = require('express');
const cors = require("cors")

const app = express();
app.use(cors()); // Cors

const PORT = 3000;
const HOST = "localhost";

app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy Server at ${HOST}:${PORT}`);
});

app.get('/', (req, res, next) => {
    res.sendFile('public/index.html', {root: __dirname});
});

let currentTcpdumpPID;
app.use(express.static('public')); // serve files in the public directory

app.get('/check-proxy-server', (req, res, next) => {
    console.log('Check-server request received from the client')
    const ipAddresses = req.header('x-forwarded-for');
    res.send(`Proxy server is running. Your ipAddresses is ${ipAddresses}`);
});

app.get('/proxy-request', function(req,res) {
    const requestUrl = req.query.url;
    console.log(`Received request for ${requestUrl} over the Tor circuit. Proxying it to the final destination`);

    const options = {
        method: 'get',
        url: 'https://facebook.com',
        port: 5678,
    };

    axios(options)
        .then(response => {
            const data = response.data;
            console.log(data);
            res.send("Your ip:" + ipAddresses + "data: " + data);
        })
        .catch(error => {
            console.error('Error:', error);
            res.status(500).send('An error occurred');
        });
});