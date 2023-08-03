self.onmessage = function (event) {
    const message = event.data;
    self.postMessage("received");
}