const socket = io.connect('http://' + document.domain + ':' + location.port);
const videoStream = document.getElementById('video-stream');
const startVideoButton = document.getElementById('startVideoButton');
const audioWorker = new Worker('/static/audioWorker.js');
const testButton = document.getElementById('testing');

audioWorker.onmessage = function (event) {
    console.log('Message from worker:', event.data);
};

socket.on('server_message', function (message) {
    console.log('Received from server:', message);
});


socket.on('serverVideo', function (data) {
    //Process and play received server video
    const imageData = btoa(String.fromCharCode(...new Uint8Array(data)));
    const imageUrl = 'data:image/jpeg;base64,' + imageData;
    videoStream.src = imageUrl;

});


socket.on('serverAudio', function (audioData) {
    //Process and play received server audio 
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContext.decodeAudioData(audioData.buffer, function (buffer) {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination); //connects to default output device
        source.start();
    });
});

testButton.addEventListener("click", function () {
    audioWorker.postMessage('test');
    console.log("posting message to worker");
})

startVideoButton.addEventListener("click", function () {
    //already sends a http POST request to server to start server video and audio transmission
    //this function needs to load and send client audio to server  



    //going to have to use web workers to perform audio tranmission on background thread
    //should emit 'clientAudio' to server for processing
});
