// client.js
const peer = new Peer(); // Create a Peer instance
let localStream;
let hostConnection;
const remoteStreams = {}; // Store remote streams by peer ID

// Join space using host's peer ID
document.getElementById('join-space').addEventListener('click', async () => {
  const hostPeerId = document.getElementById('peer-id-input').value;
  if (!hostPeerId) return alert('Please enter a valid Peer ID.');

  try {
    // Get local video stream
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('client-video').srcObject = localStream;

    // Connect to the host
    hostConnection = peer.connect(hostPeerId);
    hostConnection.on('open', () => {
      hostConnection.send('Client joined!');
    });

    // Call the host
    const callToHost = peer.call(hostPeerId, localStream);
    callToHost.on('stream', (remoteStream) => {
      addVideoStream(hostPeerId, remoteStream);
    });

    // Listen for incoming calls from the host (screen sharing)
    peer.on('call', (call) => {
      call.answer(localStream); // Answer the call with the local stream
      call.on('stream', (remoteStream) => {
        if (call.peer === hostPeerId) {
          // This is the screen-sharing stream from the host
          document.getElementById('host-screen').srcObject = remoteStream;
        } else {
          // This is a face cam stream from another client
          addVideoStream(call.peer, remoteStream);
        }
      });
    });

    // Listen for new clients joining (via host)
    hostConnection.on('data', (data) => {
      if (data.type === 'new-client') {
        const newClientPeerId = data.peerId;
        if (newClientPeerId !== peer.id) {
          // Call the new client
          const callToNewClient = peer.call(newClientPeerId, localStream);
          callToNewClient.on('stream', (remoteStream) => {
            addVideoStream(newClientPeerId, remoteStream);
          });
        }
      }
    });
  } catch (error) {
    console.error('Error joining space:', error);
  }
});

// Add a video stream to the video container
function addVideoStream(peerId, stream) {
  if (remoteStreams[peerId]) return; // Skip if stream already exists

  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.classList.add('remote-video');
  document.getElementById('video-container').appendChild(video);

  remoteStreams[peerId] = video; // Store the video element
}

// Toggle video on/off
document.getElementById('toggle-video').addEventListener('click', () => {
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
  }
});

// End call
document.getElementById('end-call').addEventListener('click', () => {
  if (hostConnection) hostConnection.close();
  if (localStream) localStream.getTracks().forEach(track => track.stop());
  document.getElementById('client-video').srcObject = null;

  // Remove all remote video streams
  Object.values(remoteStreams).forEach(video => video.remove());
  remoteStreams = {};
});