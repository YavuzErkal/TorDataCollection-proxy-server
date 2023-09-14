const express = require('express');
const cors = require("cors")
const https = require('https');
const fs = require('fs');
const {spawn, exec} = require("node:child_process");
const util = require('util');
const archiver = require('archiver');
const path = require("path");

const app = express();

const PORT = 3000;
const HOST = "localhost";
const execPromise = util.promisify(exec);
const outputDirectory = path.join(__dirname, 'tcpdump_logs');
let outputFile;
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
    console.log(`Starting tcpdump at server side`);

    const getNetworkInterface = "tcpdump -D | awk -F '[. ]' 'NR==1 {print $2}'";
    const { stdout: networkInterface_ } = await execPromise(getNetworkInterface);
    networkInterface = networkInterface_.replace(/\r?\n$/, '');
    console.log(`Network interface: ${networkInterface}`);

    outputFile = `${outputDirectory}/${formatToCustomString(new Date())}-server-tcpdump.txt`;
    spawn('tcpdump', ["-i", networkInterface, "-w", outputFile])

    const getTcpdumpPID = `ps -A | grep tcpdump | grep -v grep | awk '{print $1}'`
    const getTcpdumpInfo = `ps -A | grep tcpdump | grep -v grep`

    const { stdout: tcpdumpInfo } = await execPromise(getTcpdumpInfo);
    const currentTcpdumpProcessInfo = tcpdumpInfo.replace(/\r?\n$/, '');
    console.log(`Current tcpdump process: ${currentTcpdumpProcessInfo}`);


    const { stdout: tcpdumpPID } = await execPromise(getTcpdumpPID);
    currentTcpdumpPID = tcpdumpPID.replace(/\r?\n$/, '');

    //res.send(`Proxy server: tcpdump is started successfully \n${currentTcpdumpProcessInfo}`);

    const jsonResponse = {
        message: 'Proxy server: tcpdump is started successfully.',
        outputFile: outputFile.replace('/root/', '')
    };

    res.json(jsonResponse)
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

app.get('/download-tcpdump-files', (req, res) => {
    fs.readdir(outputDirectory, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).send('Internal server error.');
        }

        // Filter the files to only get .txt files
        const txtFiles = files.filter(file => path.extname(file) === '.txt');
        if (!txtFiles.length) {
            return res.status(404).send('No .txt files found.');
        }

        // Use archiver to create a .zip file
        const archive = archiver('zip', {zlib: {level: 9}});

        archive.on('error', (err) => {
            console.error('Archiver error:', err);
            res.status(500).send('Error creating archive.');
        });

        // Set the archive name
        res.attachment('tcpdump-files.zip');

        // Pipe archive data to the response
        archive.pipe(res);

        // Append all txt files to the archive
        txtFiles.forEach(file => {
            const filePath = path.join(__dirname, 'tcpdump_logs', file);
            archive.append(fs.createReadStream(filePath), { name: file });
        });

        archive.finalize();
        console.log('tcpdump files have been saved as a .zip file')
    });
    res.send('tcpdump files have been saved as a .zip file');
});

function formatToCustomString(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy at ${HOST}:${PORT}`);
});