const socket = io.connect('http://' + document.domain + ':' + location.port);
const videoStream = document.getElementById('video-stream');
const startVideoButton = document.getElementById('startVideoButton');
const endVideoButton = document.getElementById('endVideoButton');
const videoWorker = new Worker('/static/videoWorker.js');
const testButton = document.getElementById('testing');
const testAudioButton = document.getElementById('testAudioButton');
//const audioContext = new (window.AudioContext || window.webkitAudioContext)(); //can be optimized by terminating after use
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

/*
socket.on('serverAudio', function (audioData) {
    //Process and play received server audio 
    print("playing server audio")
    const arrayBuffer = new Uint8Array(audioData).buffer;
    audioContext.decodeAudioData(arrayBuffer, function (buffer) {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination); //connects to default output device
        source.start();
    });
});
*/

testAudioButton.addEventListener("click", async () => {
    //this function accesses user mic and sends client audio to server  
    console.log("starting audio");
    try {
        const stream = navigator.mediaDevices.getUserMedia({ audio: true });//request access for mic
        let mediaRecorder = new MediaRecorder(stream);
        //create mediarecorder object that allows u to access mic data
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                socket.send(event.data);
                console.log("Transmitting audio");
            }

        };
        mediaRecorder.start();
        console.log("starting microphone")
    }
    catch (error) {
        console.error('Error accessing microphone!!!:', error);
    };
});

testButton.addEventListener("click", function () {

});
endVideoButton.addEventListener("click", function () {
    //this ends user audio tranmission
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log("stop transmit audio");
        mediaRecorder.stop();
    }
    mediaRecorder = null;
});

