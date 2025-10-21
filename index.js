<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stranger Video Connect (Reliable UI)</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }
        #root {
            width: 100%;
            max-width: 450px;
        }
        .app-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            padding: 25px;
            text-align: center;
        }
        h1 {
            color: #1c2b36;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        .status-bar {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.3s;
        }
        .status-default { background-color: #e0f7fa; color: #007bff; }
        .status-waiting { background-color: #fff8e1; color: #ffa000; }
        .status-connected { background-color: #e8f5e9; color: #388e3c; }

        .indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 10px;
            animation: pulse 1.5s infinite; 
        }
        .indicator.waiting { background-color: #ffa000; }
        .indicator.connected { background-color: #388e3c; }

        .controls {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
        }
        button {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: background-color 0.2s;
            flex: 1;
            margin: 0 5px;
        }
        .btn-connect { background-color: #007bff; color: white; }
        .btn-connect:hover { background-color: #0056b3; }
        .btn-connect:disabled { background-color: #adb5bd; cursor: not-allowed; }
        .btn-disconnect { background-color: #dc3545; color: white; }
        .btn-disconnect:hover { background-color: #c82333; }
        .btn-disconnect:disabled { opacity: 0.6; cursor: not-allowed; }
        
        /* Video Container Styling */
        .video-container {
            position: relative;
            width: 100%;
            padding-top: 75%; /* 4:3 Aspect Ratio (300/400=0.75) for video feeds */
            margin-bottom: 20px;
            background: #222;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .remote-video, .local-video {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .local-video {
            width: 30%;
            height: 30%;
            top: 10px;
            right: 10px;
            left: auto;
            border-radius: 6px;
            border: 2px solid white;
            z-index: 10;
        }
        
        /* Tip Styling (Rest of CSS omitted for brevity but included in full code) */
        .tip-toggle {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 15px;
            cursor: pointer;
            color: #6c757d;
            font-size: 1em;
            font-weight: 500;
            transition: color 0.2s;
            user-select: none;
        }
        .tip-toggle:hover {
            color: #007bff;
        }
        .tip-icon {
            font-size: 1.5em;
            margin-right: 5px;
        }

        .tip-cards-container {
            margin-top: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 0; 
            padding-top: 0;
            overflow: hidden;
            transition: max-height 0.4s ease-in-out;
        }
        .tip-cards-container.visible {
            max-height: 200px;
            padding-top: 10px;
        }
        
        .tip-card {
            background: #f7f9fc;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            font-size: 0.9em;
            text-align: left;
            border-left: 3px solid #007bff;
            opacity: 0; 
            transform: translateY(10px);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        }
        .tip-card.show {
            opacity: 1;
            transform: translateY(0);
        }
        .tip-card strong {
            display: block;
            margin-bottom: 3px;
            color: #333;
            font-size: 1em;
        }

        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(56, 142, 60, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(56, 142, 60, 0); }
            100% { box-shadow: 0 0 0 0 rgba(56, 142, 60, 0); }
        }
    </style>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>

    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef, useCallback } = React;

        const rtcConfig = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        };

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.host;
        const websocketUrl = `${protocol}://${host}`; 

        // ----------------------------------------------------------------
        // Main App Component
        // ----------------------------------------------------------------

        const VideoConnectApp = () => {
            const [status, setStatus] = useState("Welcome! Click Connect to start video chat.");
            const [isPaired, setIsPaired] = useState(false);
            const [isConnecting, setIsConnecting] = useState(false);
            const [showTips, setShowTips] = useState(false);
            
            const [tipCard1Visible, setTipCard1Visible] = useState(false);
            const [tipCard2Visible, setTipCard2Visible] = useState(false);
            
            const socketRef = useRef(null);
            const peerConnectionRef = useRef(null);
            const localStreamRef = useRef(null);
            
            // Ref for LOCAL video (user's own camera feed)
            const localVideoRef = useRef(null); 
            // Ref for REMOTE video (stranger's camera feed)
            const remoteVideoRef = useRef(null); 

            const logMessage = useCallback((text, isError = false) => {
                if (isError) {
                    console.error(`[${new Date().toLocaleTimeString()}] [ERROR] ${text}`);
                } else {
                    console.log(`[${new Date().toLocaleTimeString()}] ${text}`);
                }
            }, []);

            const setControls = useCallback((pairedStatus, connectingStatus, statusText) => {
                setIsPaired(pairedStatus);
                setIsConnecting(connectingStatus);
                if (statusText) setStatus(statusText);
            }, []);

            // ----------------------------------------------------------------
            // WebRTC Logic - Updated for Video
            // ----------------------------------------------------------------

            const closeWebRTC = useCallback(() => {
                if (peerConnectionRef.current) {
                    peerConnectionRef.current.close();
                    peerConnectionRef.current = null;
                    logMessage('WebRTC connection closed.');
                }
                if (localStreamRef.current) {
                    // Stop all media tracks (audio and video)
                    localStreamRef.current.getTracks().forEach(track => track.stop());
                    localStreamRef.current = null;
                }
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = null;
                }
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = null;
                }
            }, [logMessage]);

            const startLocalStream = useCallback(async () => {
                if (localStreamRef.current) return true;

                try {
                    // *** KEY CHANGE: Requesting both audio and video ***
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                    localStreamRef.current = stream;
                    
                    // Display local stream in the local video element
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                        localVideoRef.current.muted = true; // Mute local preview
                    }

                    logMessage('Camera and microphone access granted.');
                    return true;
                } catch (err) {
                    logMessage('ERROR: Could not get camera/microphone access. Check permissions.', true);
                    setControls(false, false, 'Media Error: Camera and Microphone required.');
                    return false;
                }
            }, [logMessage, setControls]);

            const createPeerConnection = useCallback((isCaller) => {
                
                if (peerConnectionRef.current) return;

                logMessage('Creating RTCPeerConnection...');
                const pc = new RTCPeerConnection(rtcConfig);
                peerConnectionRef.current = pc;
                const socket = socketRef.current;

                // 1. Add ALL local tracks (Audio and Video)
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => {
                        pc.addTrack(track, localStreamRef.current);
                    });
                    logMessage('Local video and audio tracks added.');
                } 

                // 2. Handle remote track (stranger's video/audio)
                pc.ontrack = (event) => {
                    logMessage('Remote track received!');
                    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
                        // Attach the remote stream (containing both video and audio) to the remote video element
                        remoteVideoRef.current.srcObject = event.streams[0];
                        logMessage('Remote stream attached to video element. Connection established! 📸');
                    }
                };

                // 3. Gather ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'CANDIDATE',
                            candidate: event.candidate
                        }));
                    }
                };
                
                pc.oniceconnectionstatechange = () => {
                    logMessage(`ICE State: ${pc.iceConnectionState}`);
                };

                // 4. Caller initiates negotiation (sends OFFER)
                if (isCaller) {
                    pc.onnegotiationneeded = async () => {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            socket.send(JSON.stringify({ type: 'OFFER', sdp: pc.localDescription }));
                            logMessage('WebRTC Offer sent.');
                        } catch (e) {
                            logMessage('Failed to create/send offer: ' + e, true);
                        }
                    };
                }
            }, [logMessage]); 

            const handleOffer = useCallback(async (sdp) => {
                try {
                    createPeerConnection(false); 
                    const pc = peerConnectionRef.current;

                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socketRef.current.send(JSON.stringify({ type: 'ANSWER', sdp: pc.localDescription }));
                    logMessage('WebRTC Offer processed. Answer sent.');
                } catch (e) {
                    logMessage('Failed to handle offer: ' + e, true);
                }
            }, [logMessage, createPeerConnection]);

            const handleAnswer = useCallback(async (sdp) => {
                try {
                    if (!peerConnectionRef.current) return;
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
                    logMessage('WebRTC Answer received.');
                } catch (e) {
                    logMessage('Failed to handle answer: ' + e, true);
                }
            }, [logMessage]);

            const handleCandidate = useCallback(async (candidate) => {
                try {
                    if (!peerConnectionRef.current) return;
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                    logMessage('ICE Candidate added.');
                } catch (e) {
                    logMessage('Warning: Failed to add ICE candidate: ' + e.name, true);
                }
            }, [logMessage]);


            // ----------------------------------------------------------------
            // WebSocket/Connection Handlers
            // ----------------------------------------------------------------

            const connectStranger = useCallback(async () => {
                if (isConnecting) return;
                
                // CRITICAL: Must start local stream (video/audio) BEFORE attempting to connect
                if (!await startLocalStream()) {
                    return; 
                }
                
                setControls(false, true, 'Connecting to server...');

                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({ type: 'CONNECT' }));
                    setControls(false, true, 'Looking for a stranger...');
                    logMessage("Searching for a new stranger...");
                    return;
                }
                
                if (socketRef.current) socketRef.current.close(); 

                logMessage("Starting server connection...");
                socketRef.current = new WebSocket(websocketUrl); 
                const socket = socketRef.current;

                socket.onopen = () => {
                    logMessage("Connection to server established. Requesting match.");
                    socket.send(JSON.stringify({ type: 'CONNECT' }));
                };

                socket.onmessage = async (event) => {
                    const data = JSON.parse(event.data);
                    
                    switch (data.type) {
                        case 'STATUS':
                            setStatus(data.message);
                            break;
                        
                        case 'START_CALL':
                            setControls(true, false, 'Connected! Setting up video call...'); 
                            createPeerConnection(true); 
                            break;

                        case 'DISCONNECTED':
                            closeWebRTC();
                            setStatus(data.message);
                            setControls(false, false);
                            break;
                            
                        // WebRTC Signaling
                        case 'OFFER':
                            setControls(true, false, 'Connected! Setting up video call...');
                            await handleOffer(data.sdp);
                            break;
                        case 'ANSWER':
                            await handleAnswer(data.sdp);
                            break;
                        case 'CANDIDATE':
                            await handleCandidate(data.candidate);
                            break;
                    }
                };

                socket.onclose = () => {
                    closeWebRTC();
                    setStatus('Disconnected from server.');
                    setControls(false, false);
                };

                socket.onerror = (error) => {
                    console.error("WebSocket Error:", error);
                    closeWebRTC();
                    setStatus('Connection Error. See browser console.');
                    setControls(false, false);
                };
            }, [logMessage, setControls, startLocalStream, createPeerConnection, handleOffer, handleAnswer, handleCandidate, closeWebRTC, isConnecting]);

            const disconnectStranger = useCallback(() => {
                if (socketRef.current && isPaired) { 
                    socketRef.current.send(JSON.stringify({ type: 'DISCONNECT' }));
                    closeWebRTC();
                    setStatus('You disconnected. Click Connect to find a new stranger.');
                    setControls(false, false); 
                }
            }, [closeWebRTC, isPaired, setControls]);
            
            // --- UI Tips Logic (Unchanged) ---
            useEffect(() => {
                let timer2;
                if (showTips) {
                    setTipCard1Visible(true);
                    timer2 = setTimeout(() => {
                        setTipCard2Visible(true);
                    }, 400);
                } else {
                    setTipCard1Visible(false);
                    setTipCard2Visible(false);
                }
                return () => clearTimeout(timer2);
            }, [showTips]);


            // --- Render Logic ---
            const getStatusClass = () => {
                if (isPaired) return 'status-connected';
                if (isConnecting) return 'status-waiting';
                return 'status-default';
            };

            return (
                <div className="app-card">
                    <h1>Stranger Video Connect</h1>
                    
                    <div className={`status-bar ${getStatusClass()}`}>
                        {isPaired && <span className="indicator connected"></span>}
                        {status}
                    </div>

                    {/* New Video Container */}
                    <div className="video-container">
                        {/* Remote Video Feed (Main View) */}
                        <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline></video>
                        {/* Local Video Feed (Small overlay) */}
                        <video ref={localVideoRef} className="local-video" autoPlay playsInline muted></video>
                    </div>

                    <div className="controls">
                        <button 
                            className="btn-connect"
                            onClick={connectStranger} 
                            disabled={isConnecting && !isPaired}
                        >
                            {isPaired ? 'Find New Stranger' : 'Start Video Chat'}
                        </button>
                        <button 
                            className="btn-disconnect"
                            onClick={disconnectStranger} 
                            disabled={!isPaired}
                        >
                            Disconnect
                        </button>
                    </div>

                    {/* Tip Toggle Icon */}
                    <div className="tip-toggle" onClick={() => setShowTips(!showTips)}>
                        <span className="tip-icon">💡</span> 
                        {showTips ? 'Hide Tips' : 'Connectivity Tips'}
                    </div>

                    {/* Tip Cards Container */}
                    <div className={`tip-cards-container ${showTips ? 'visible' : ''}`}>
                        <div className={`tip-card ${tipCard1Visible ? 'show' : ''}`}>
                            <strong>Keep Browser Active</strong>
                            Do not minimize the browser to maintain a stable connection.
                        </div>
                        <div className={`tip-card ${tipCard2Visible ? 'show' : ''}`}>
                            <strong>Avoid Screen Lock</strong>
                            Do not lock your screen, as this may pause network activity and cause a disconnect.
                        </div>
                    </div>
                </div>
            );
        };

        ReactDOM.render(<VideoConnectApp />, document.getElementById('root'));
    </script>
</body>
</html>