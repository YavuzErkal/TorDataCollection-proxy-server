const express = require('express');
const cors = require("cors")
const fs = require('fs');
const {spawn, exec} = require("node:child_process");
const util = require('util');
const path = require("path");
const AdmZip = require('adm-zip');
const axios = require('axios');


const app = express();
//app.set('trust proxy', true)

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
    console.log('req.remoteAddress');
    console.log(req.remoteAddress);
    console.log('req.socket.remoteAddress');
    console.log(req.socket.remoteAddress);

    const ipAddresses = req.header('x-forwarded-for');
    res.send(`Proxy server is running. Your ipAddresses is ${ipAddresses}`);

    // res.send("Proxy server running - Your ip is: " + req.remoteAddress + " or" + req.socket.remoteAddress + " and IP is:" + ipAddresses);
});

app.get('/tcpdump-server-start', async (req, res) => {
    console.log(`Starting tcpdump at server side`);

    // const getNetworkInterface = "tcpdump -D | awk -F '[. ]' 'NR==1 {print $2}'";
    // const { stdout: networkInterface_ } = await execPromise(getNetworkInterface);
    //networkInterface = networkInterface_.replace(/\r?\n$/, '');

    networkInterface = "any";
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

    const jsonResponse = {
        message: `Proxy server: tcpdump is started successfully with PID. ${currentTcpdumpPID}`,
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

    const ipAddresses = req.header('x-forwarded-for');

    // const reqHeaders = req.headers
    const options = {
        method: 'get',
        url: 'https://facebook.com',
        port: 5678,
    };

    axios(options)
        .then(response => {
            const data = response.data;
            res.send("Your ip:" + ipAddresses + "data: " + data);
        })
        .catch(error => {
            console.error('Error:', error);
            res.status(500).send('An error occurred');
        });

    // https.get(options, externalRequest => {
    //     res.send(`Request has been proxied to: 'https:\/\/${requestUrl}'`);
    // }).on("error", err => {
    //     console.error('Error: ', err.message)
    //     res.status(404).send(err.message);
    // })

    // Create a new http.ClientRequest object
    // const request = http.request(options, (response) => {
    //     // Set the response encoding to utf8
    //     response.setEncoding('utf8');
    //
    //     // When a chunk of data is received, append it to the body
    //     let body = '';
    //     response.on('data', (chunk) => {
    //         body += chunk;
    //     });
    //
    //     // When the response completes, parse the JSON and log the IP address
    //     response.on('end', () => {
    //         const data = JSON.parse(body);
    //         console.log(data.ip);
    //         res.send("Your public IP is: " + data.ip)
    //     });
    // });
});

app.get('/download-tcpdump-zip', (req, res) => {
    console.log('Sending tcpdump .zip file to the client')

    const zip = new AdmZip();

    const folderPath = 'tcpdump_logs';
    const files = fs.readdirSync(folderPath);

    files.forEach(file => {
        zip.addLocalFile('tcpdump_logs/' + file);
    })


    // get everything as a buffer
    const zipFileContents = zip.toBuffer();
    /*const fileName = 'uploads.zip';
    const fileType = 'application/zip';*/
    res.writeHead(200, {
        'Content-Disposition': `attachment; filename="tcpdump.zip"`,
        'Content-Type': 'application/zip',
    })
    return res.end(zipFileContents);
});

app.get('/delete-tcpdump-files-on-proxy-server', (req, res) => {
    console.log('Request received to delete all tcpdump files')
    const folderPath = 'tcpdump_logs';
    try {
        const files = fs.readdirSync(folderPath);
        let errorOccurred = false;
        files.forEach(file => {
            fs.unlink(path.join(folderPath, file), (err) => {
                if (err) {
                    console.error('Error deleting file:', file, err);
                    errorOccurred = true;
                }
            })
        })

        if (errorOccurred)
            res.status(500).send('Some files could not be deleted.');
        else {
            console.log('All files deleted successfully.')
            res.send('All files deleted successfully.');
        }
    } catch (err) {
        console.error('Error reading the directory:', err);
        res.status(500).send('Error occurred while processing the request.');
    }
})

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
    console.log(`Starting Proxy Server at ${HOST}:${PORT}`);
});