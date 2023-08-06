const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}

var peer = new Peer()


navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream =>{
    addVideoStream(myVideo, stream)

    peer.on('call', call => {
        call.answer(stream)
        const video = document.createElement('video')
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream)
        })
    })

    socket.on('user-connected', userId =>{
        connectToNewUser(userId, stream)
    })
})

socket.on('user-disconnected',  userId => {
    peers[userId].close()
})

peer.on('open', data => {
socket.emit('join-room', ROOM_ID, data)
})

/*fetch('/api/user/id')
    .then(response => response.json())
    .then(userId => { 
        console.log(userId);
        socket.emit('join-room', ROOM_ID, userId)
    })
    .catch(error => {
        console.error("Fetch Error: ", error);
    })*/

// socket.on('user-connected', userId => {
//     console.log('User connected' + userId)
// })


function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () =>{
        video.play()
    })
    videoGrid.append(video)
}

function connectToNewUser(userId, stream) {
    const call = peer.call(userId, stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
    })
    call.on('close', () => {
        video.remove()
    })

    peers[userId] = call
}