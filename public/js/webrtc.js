'use strict';

/**
 * Small WebRTC helper for the faculty panel page. Wraps a single
 * RTCPeerConnection + local getUserMedia stream. Signalling (offer/answer/
 * ICE exchange) is wired in a later phase.
 *
 * Exposed as `window.pdrs.webrtc`.
 */
(function () {
  const DEFAULT_ICE = [{ urls: 'stun:stun.l.google.com:19302' }];

  function createPeer(options) {
    const opts = options || {};
    const pc = new RTCPeerConnection({ iceServers: opts.iceServers || DEFAULT_ICE });
    const handlers = { icecandidate: [], track: [], connectionstatechange: [] };

    pc.addEventListener('icecandidate', (ev) => fire('icecandidate', ev.candidate));
    pc.addEventListener('track', (ev) => fire('track', ev));
    pc.addEventListener('connectionstatechange', () => fire('connectionstatechange', pc.connectionState));

    function fire(name, payload) {
      (handlers[name] || []).slice().forEach((fn) => {
        try { fn(payload); } catch (err) { console.error('[pdrs.webrtc] listener error', err); }
      });
    }

    return {
      pc,
      on(name, fn) { (handlers[name] || (handlers[name] = [])).push(fn); },
      async attachLocalStream(mediaConstraints) {
        const constraints = mediaConstraints || { audio: true, video: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        for (const track of stream.getTracks()) pc.addTrack(track, stream);
        return stream;
      },
      async createOffer() {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        return offer;
      },
      async acceptOffer(remoteDescription) {
        await pc.setRemoteDescription(remoteDescription);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        return answer;
      },
      async acceptAnswer(remoteDescription) {
        await pc.setRemoteDescription(remoteDescription);
      },
      async addRemoteCandidate(candidate) {
        if (!candidate) return;
        await pc.addIceCandidate(candidate);
      },
      close() {
        pc.getSenders().forEach((s) => { try { s.track && s.track.stop(); } catch (_e) { /* ignore */ } });
        pc.close();
      },
    };
  }

  window.pdrs = window.pdrs || {};
  window.pdrs.webrtc = { createPeer };
})();
