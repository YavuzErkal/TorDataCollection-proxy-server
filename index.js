const express = require('express');
const cors = require("cors")
const https = require('https');
const {spawn, exec} = require("node:child_process");
const util = require('util');

const app = express(); // Create Express Server

const PORT = 3000;
const HOST = "localhost";
const outputFile = '/root';
const execPromise = util.promisify(exec);
let networkInterface;
let currentTcpdumpPID;


app.use(cors()); // Cors
app.use(express.static('public')); // serve files in the public directory

app.get('/', (req, res, next) => {
    res.sendFile('public/index.html', {root: __dirname});
});

app.get('/check-proxy-server', (req, res, next) => {
    console.log('Check-server request received from the client')
    res.send('Proxy server is running');
});

app.get('/tcpdump-server-start', async (req, res) => {
    const deleteLogFileIfExisting = `if [ -f /root/server-tcpdump.txt ]; then
                                            echo "Deleting previous log file ${outputFile}";
                                            echo -n "Creating new log file ${outputFile}";
                                            rm /root/server-tcpdump.txt;
                                     else
                                         echo -n "Creating new log file ${outputFile} to save tcpdump values"; fi`;
    const { stdout: deleteLogFileResult } = await execPromise(deleteLogFileIfExisting);
    console.log(`${deleteLogFileResult}\nStarting tcpdump at server side`);


    const getNetworkInterface = "tcpdump -D | awk -F '[. ]' 'NR==1 {print $2}'";
    const { stdout: networkInterface_ } = await execPromise(getNetworkInterface);
    networkInterface = networkInterface_.replace(/\r?\n$/, '');
    console.log(`Network interface: ${networkInterface}`);

    spawn('tcpdump', ["-i", networkInterface, "-w", `${outputFile}/${new Date()}-server-tcpdump.txt`])


    const getTcpdumpPID = `ps -A | grep tcpdump | grep -v grep | awk '{print $1}'`
    const getTcpdumpInfo = `ps -A | grep tcpdump | grep -v grep`

    const { stdout: tcpdumpInfo } = await execPromise(getTcpdumpInfo);
    const currentTcpdumpProcessInfo = tcpdumpInfo.replace(/\r?\n$/, '');
    console.log(`Current tcpdump process: ${currentTcpdumpProcessInfo}`);


    const { stdout: tcpdumpPID } = await execPromise(getTcpdumpPID);
    currentTcpdumpPID = tcpdumpPID.replace(/\r?\n$/, '');
    res.send(`Proxy server: tcpdump is started successfully \n${currentTcpdumpProcessInfo}`);

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
    console.log(`Received request for ${requestUrl} over the Tor circuit. Proxying it to the final destination`);

    https.get('https://' + requestUrl,  externalRequest => {
        res.send(`Request has been sent to: 'https:\/\/${requestUrl}'`);
    }).on("error", err => {
        console.error('Error: ', err.message)
        res.status(404).send(err.message);
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