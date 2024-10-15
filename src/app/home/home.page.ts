import { Component, ElementRef, ViewChild } from '@angular/core';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  @ViewChild('localVideo') localVideo!: ElementRef;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef;

  private localStream!: MediaStream;
  private peerConnection!: RTCPeerConnection;
  private socket = io('https://callappbkdnode.onrender.com/'); // Change to your server URL

  constructor() {
    this.socket.on('offer', (offer) => this.handleOffer(offer));
    this.socket.on('answer', (answer) => this.handleAnswer(answer));
    this.socket.on('ice-candidate', (candidate) => this.handleICECandidate(candidate));
  }

  async startCall() {
    // Get local media stream (video/audio)
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localVideo.nativeElement.srcObject = this.localStream;

    // Create peer connection
    this.createPeerConnection();

    // Add local stream tracks to peer connection
    this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));

    // Create and send the offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.socket.emit('offer', offer);
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection();

    // Handle ICE candidate event
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', event.candidate);
      }
    };

    // Handle track event (remote stream)
    this.peerConnection.ontrack = (event) => {
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
    };
  }

  async handleOffer(offer:any) {
    // Handle offer from remote peer
    this.createPeerConnection();
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Create and send the answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.socket.emit('answer', answer);
  }

  async handleAnswer(answer:any) {
    // Set remote description when receiving an answer
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  handleICECandidate(candidate:any) {
    // Add received ICE candidate to peer connection
    this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

}
