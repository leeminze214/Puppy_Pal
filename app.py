from picamera import PiCamera
from datetime import datetime
from time import sleep
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from io import BytesIO
import RPi.GPIO as GPIO
import queue #to communicate between background video thread and main thread
import pyaudio

motorPin =11
GPIO.setmode(GPIO.BOARD)
GPIO.setup(motorPin,GPIO.OUT)
GPIO.output(motorPin, GPIO.LOW)

video_stream_state = False
video_frame_queue = queue.Queue()

audio_frame_queue = queue.Queue()
client_audio_frame_queue = queue.Queue()
form_1 = pyaudio.paInt16 # 16-bit resolution
chans = 2 # 1 channel
samp_rate = 44100 # 44.1kHz sampling rate
chunk = 4096 # 2^12 samples for buffer
dev_index = 2 # usb mic index id

app =Flask(__name__)
app.config['SECRET_KEY'] = 'secret'
socketio = SocketIO(app)


@socketio.on('connect')
def handle_connect():
    print('Client connected: '+request.sid)
    emit('server_message','Welcome to the server!')


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected: '+request.sid)


#-----------------------------------------loading stream audio and video-----------------------------------------
def audio_stream():
    global video_stream_state
    global audio_frame_queue
    try:
        audio
    except NameError:
        audio = pyaudio.PyAudio()
    
    stream = audio.open(format = form_1,rate = samp_rate,channels = chans, \
                    input_device_index = dev_index,input = True, \
                    frames_per_buffer=chunk)
    try:
        while video_stream_state == True:
            audio_frame = stream.read(chunk)#this automaticallyy reads next chunk of data in stream
            sleep(0.05)
            audio_frame_queue.put(audio_frame)
            print("loading audio frames")
    except KeyboardInterrupt:
        pass
    stream.stop_stream()
    stream.close()
    audio.terminate()
    
    
def video_stream():
    global video_stream_state
    global video_frame_queue

    with PiCamera() as camera:
        camera.resolution = (360,240)
        camera.framerate = 30
        sleep(2)
         
        stream = BytesIO()
        for _ in camera.capture_continuous(stream,format='jpeg',use_video_port=True):
            #for frame in capture_continous
            if video_stream_state == False:
                print("stopping video")
                break
            stream.seek(0) #point to beginning
            video_frame_queue.put(stream.read())#enqueues next video frame (FIFO)
            #emit('video',stream.read(),binary=True, namespace = "/") #cannot emmit here since this is ran in background thread that does not have access to the main thread's user request context
            stream.seek(0)
            stream.truncate(0)
            sleep(0.05)
            print("loading video frames")
        

#-----------------------------------------emitting stream audio and video to client-----------------------------------------
def emit_video_frames():
    global video_stream_state
    global video_frame_queue
    
    while video_stream_state == True:
        try:
            print("emitting video frames")
            video_frame = video_frame_queue.get(timeout=1)
            socketio.emit('serverVideo',video_frame)#,namespace='/')
        except queue.Empty:
            print("empty video queue")
            #for some reasons if video stops tranmission
            pass
        

def emit_audio_frames():
    global video_stream_state
    global audio_frame_queue
    
    while video_stream_state == True:
        try:
            print("emitting audio frames")
            audio_frame = audio_frame_queue.get(timeout=1)
            socketio.emit('serverAudio',audio_frame),#namespace='/')
        except queue.Empty:
            print("empty audio queue")
            #for some reasons if video stops tranmission
             


#-----------------------------------------receive and process client audio frames---------------------------------------
socketio.on('clientAudio')
def load_client_audio(audio_frame):
    client_audio_frame_queue.put(audio_frame)


def process_client_audio():
    global client_audio_frame_queue

    audio = pyaudio.PyAudio()
    audio_stream = audio.open(format=form_1,
                              channels=chans,
                              rate=samp_rate,
                              output=True)
    while video_stream_state == True:
        try:
            audio_frame = client_audio_frame_queue.get(timeout = 1)
            audio_stream.write(audio_frame)
        except queue.Empty:
            print("client audio queue empty")

    audio_stream.stop_stream()
    audio_stream.close()

#-------------------------------------------routes--------------------------------------------

@app.route('/', methods=["GET", "POST"])
def home():
    global video_stream_state                   
    if request.method == 'POST':
        action = request.form.get('action')
        print(action)

        if action == 'motor':
            print("motor starting")
            GPIO.output(motorPin,GPIO.HIGH)
            print("state is:",GPIO.input(motorPin))
            sleep(1)
            GPIO.output(motorPin,GPIO.LOW)
            print("state is:",GPIO.input(motorPin))

        elif action == 'startVideo':
            print("video starting")
            video_stream_state = True
            
            socketio.start_background_task(video_stream)
            socketio.start_background_task(audio_stream)
            socketio.start_background_task(emit_video_frames)
            socketio.start_background_task(emit_audio_frames)

        elif action == 'endVideo':
            print("video ending")
            video_stream_state = False
        
    return render_template('home.html')


if __name__=="__main__":
    try:
        socketio.run(app,host = '0.0.0.0',port=5000)
    except KeyboardInterrupt:
        video_stream_state = False
        GPIO.cleanup()
	
