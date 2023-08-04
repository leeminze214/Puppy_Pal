const socket = io.connect('http://' + document.domain + ':' + location.port);
const videoStream = document.getElementById('video-stream');
const startVideoButton = document.getElementById('startVideoButton');
const endVideoButton = document.getElementById('endVideoButton');
const videoWorker = new Worker('/static/videoWorker.js');
const testButton = document.getElementById('testing');
const audioContext = new (window.AudioContext || window.webkitAudioContext)(); //can be optimized by terminating after use
let mediaRecorder;


socket.on('server_message', function (message) {
    console.log('Received from server:', message);
});


socket.on('serverVideo', function (data) {
    //sends video data to background video worker to process
    videoWorker.postMessage(data);
});


videoWorker.onmessage = function (event) {
    //when worker finishes proccessing, video is updated
    console.log("loading video");
    imageUrl = event.data;
    videoStream.src = imageUrl;
};


socket.on('serverAudio', function (audioData) {
    //Process and play received server audio 
    audioContext.decodeAudioData(audioData.buffer, function (buffer) {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination); //connects to default output device
        source.start();
    });
});


startVideoButton.addEventListener("click", function () {
    //this function accesses user mic and sends client audio to server  
    navigator.mediaDevices.getUserMedia({ audio: true })//request access for mic
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);//create mediarecorder object that allows u to access mic data
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    socket.emit('clientAudio', event.data);
                    console.log("transmitting audio");
                }
            };
            mediaRecorder.start();
        })
        .catch(error => {
            console.error('Error accessing microphone:'.error);
        });
});


endVideoButton.addEventListener("click", function () {
    //this ends user audio tranmission
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log("stop transmit audio");
        mediaRecorder.stop();
    }
    mediaRecorder = null;
});





testButton.addEventListener("click", function () {
    videoWorker.postMessage('test');
    console.log("posting message to worker");
});

