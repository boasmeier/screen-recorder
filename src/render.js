// Imports
const { desktopCapturer } = require('electron');
const { Menu, dialog } = require('@electron/remote');
const { writeFile } = require('fs');

// Global state
let mediaRecorder;
const recordedChunks = [];

// Buttons
const videoElement = document.querySelector('video');

const startBtn = document.getElementById('startBtn');
startBtn.onclick = e => {
    mediaRecorder.start();
    startBtn.classList.add('is-danger');
    startBtn.innerText = 'Recording';
};

const stopBtn = document.getElementById('stopBtn');
stopBtn.onclick = e => {
    mediaRecorder.stop();
    startBtn.classList.remove('is-danger');
    startBtn.innerText = 'Start';
};

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;
async function getVideoSources() {
    console.log("Get video sources");
    const inputSources = await desktopCapturer.getSources({
        types: ['window', 'screen']
    });

    const videoOptionsMenu = Menu.buildFromTemplate(
        inputSources.map(source => {
            return {
                label: source.name,
                click: () => selectSource(source)
            };
        })
    );

    videoOptionsMenu.popup();
}

async function selectSource(source) {
    videoSelectBtn.innerText = source.name;

    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id
            }
        }
    };

    // Create and start the stream
    const videostream = await navigator.mediaDevices.getUserMedia(constraints);
    const audiostream = await navigator.mediaDevices.getUserMedia({video:false,audio:true});
    [videoTrack] = videostream.getVideoTracks();
    [audioTrack] = audiostream.getAudioTracks();
    var stream = new MediaStream([videoTrack, audioTrack]);
    videoElement.srcObject = stream;
    videoElement.play();
    videoElement.muted = true;

    // Create the Media Recorder
    const options = { mimeType: 'video/webm; codecs=vp9' };
    mediaRecorder = new MediaRecorder(stream, options);

    // Register Event Handlers
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
}

function handleDataAvailable(e) {
    console.log('video data available');
    recordedChunks.push(e.data);
}

// Save the video file on stop
async function handleStop(e) {
    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    });

    const buffer = Buffer.from(await blob.arrayBuffer());
    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Save video',
        defualtPath: `vid-${Date.now()}.webm`
    });

    console.log(filePath);
    writeFile(filePath, buffer, () => console.log('video saved successfully!'));
}