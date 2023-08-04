self.onmessage = function (event) {
    const imageData = btoa(String.fromCharCode(...new Uint8Array(event.data)));
    const imageUrl = 'data:image/jpeg;base64,' + imageData;
    self.postMessage(imageUrl);
}