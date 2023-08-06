const pc = new RTCPeerConnection()
const dataChannel = pc.createDataChannel("channel");

dataChannel.onmessage = e => console.log("Got a Message" + e.data)
dataChannel.onopen = e => console.log("Connection opened !")
pc.onicecandidate = e => console.log("New Ice Candidate" + JSON.stringify(pc.localDescription))
pc.createOffer()
    .then(o => pc.setLocalDescription(o))
    .then(a => console.log("Set Successfully"))


const answer = {} // The Answer from B
pc.setRemoteDescription(ans  )


//--------------------------------------------------------------
const offer = {} //The offer from A
const rc = new RTCPeerConnection();
rc. onicecandidate = e => console.log("New Ice Candidate" + JSON.stringify(rc.localDescription))
rc.ondatachannel = e => {
    rc.dc = e.channel;
    rc.dc.onmessage = e => console.log("New Message from client" + e.data)
    rc.dc.onopen = e => console.log("Connection Open")
}
rc.setRemoteDescription(offer)
    .then(a=> console.log("offer set"))
rc.createAnswer()
    .then(a => rc.setLocalDescription(a))
    .then(a=> console.log("Answer created"))

//--------------------------------------------------------------