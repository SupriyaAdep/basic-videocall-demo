import AgoraRTC from "agora-rtc-sdk-ng";

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let remoteUsers = {};

let rtc = {
  localAudioTrack: null,
  localVideoTrack: null,
  client: null,
};

let screenRtc = {
  audio: null,
  video: null,
  client: null,
};

let options = {
  // Pass your App ID here.
  appId: "1fd91d3d4bd841dba5f053e3e4e3f668",
  // Set the channel name.
  channel: "test",
  // Pass your temp token here.
  token: null,
  // Set the user ID.
  uid: null,
};

let screenClient = {};
let screenTrack = {};

AgoraRTC.onAutoplayFailed = () => {
  alert("click to start autoplay!");
};

async function startBasicCall() {
  options.uid = getRandomInt(1, 10000000);
  // Create an AgoraRTCClient object.
  rtc.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  // Listen for the "user-published" event, from which you can get an AgoraRTCRemoteUser object.
  rtc.client.on("user-published", async (user, mediaType) => {
    console.log("supriya user-published: ", user);
    // Subscribe to the remote user when the SDK triggers the "user-published" event
    if (user.uid === screenRtc?.client?.uid) return;
    await rtc.client.subscribe(user, mediaType);
    console.log("subscribe success");

    // If the remote user publishes a video track.
    if (mediaType === "video") {
      // Get the RemoteVideoTrack object in the AgoraRTCRemoteUser object.
      const remoteVideoTrack = user.videoTrack;
      // Dynamically create a container in the form of a DIV element for playing the remote video track.
      const remotePlayerContainer = document.createElement("div");
      remotePlayerContainer.style.margin = 10;
      // Specify the ID of the DIV container. You can use the uid of the remote user.
      remotePlayerContainer.id = user.uid.toString();
      remotePlayerContainer.textContent = "Remote user " + user.uid.toString();
      remotePlayerContainer.style.width = "640px";
      remotePlayerContainer.style.height = "480px";
      document.body.append(remotePlayerContainer);

      // Play the remote video track.
      // Pass the DIV container and the SDK dynamically creates a player in the container for playing the remote video track.
      remoteVideoTrack.play(remotePlayerContainer);

      // Or just pass the ID of the DIV container.
      // remoteVideoTrack.play(playerContainer.id);
    }

    // If the remote user publishes an audio track.
    if (mediaType === "audio") {
      // Get the RemoteAudioTrack object in the AgoraRTCRemoteUser object.
      const remoteAudioTrack = user.audioTrack;
      // Play the remote audio track. No need to pass any DOM element.
      remoteAudioTrack.play();
    }
  });

  // Listen for the "user-unpublished" event
  rtc.client.on("user-unpublished", (user) => {
    // Get the dynamically created DIV container.
    const remotePlayerContainer = document.getElementById(user.uid);
    // Destroy the container.
    remotePlayerContainer?.remove();
  });

  window.onload = function () {
    document.getElementById("join").onclick = async function () {
      // Join an RTC channel.
      await rtc.client.join(
        options.appId,
        options.channel,
        options.token,
        options.uid
      );
      // Create a local audio track from the audio sampled by a microphone.
      rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      // Create a local video track from the video captured by a camera.
      rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
      // Publish the local audio and video tracks to the RTC channel.
      await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
      // await rtc.localVideoTrack?.setEnabled(false);
      await rtc.localAudioTrack?.setMuted(true);

      // Dynamically create a container in the form of a DIV element for playing the local video track.
      const localPlayerContainer = document.createElement("div");

      // Specify the ID of the DIV container. You can use the uid of the local user.
      localPlayerContainer.id = options.uid;
      localPlayerContainer.textContent = "Local user " + options.uid;
      localPlayerContainer.style.margin = 10;
      localPlayerContainer.style.width = "640px";
      localPlayerContainer.style.height = "480px";
      document.body.append(localPlayerContainer);

      // Play the local video track.
      // Pass the DIV container and the SDK dynamically creates a player in the container for playing the local video track.
      rtc.localVideoTrack.play(localPlayerContainer);
      console.log("publish success!");
    };

    document.getElementById("leave").onclick = async function () {
      // Destroy the local audio and video tracks.
      rtc.localAudioTrack.close();
      rtc.localVideoTrack.close();

      // Traverse all remote users.
      rtc.client.remoteUsers.forEach((user) => {
        // Destroy the dynamically created DIV containers.
        const playerContainer = document.getElementById(user.uid);
        playerContainer && playerContainer.remove();
      });

      // Leave the channel.
      await rtc.client.leave();
    };

    // document.getElementById("muteVideo").onclick = async function () {
    //   try {
    //     console.log("unmuting the track");
    //     await rtc.localVideoTrack?.setEnabled(false);
    //   } catch (e) {
    //     console.log("error while muting: ", e);
    //   }
    // };

    // document.getElementById("unmuteVideo").onclick = async function () {
    //   try {
    //     console.log("unmuting the track");
    //     await rtc.localVideoTrack?.setEnabled(true);
    //   } catch (e) {
    //     console.log("error while unmuting: ", e);
    //   }
    // };

    // document.getElementById("muteAudio").onclick = async function () {
    //   try {
    //     console.log("unmuting the track");
    //     await rtc.localAudioTrack?.setEnabled(false);
    //   } catch (e) {
    //     console.log("error while muting: ", e);
    //   }
    // };

    // document.getElementById("unmuteAudio").onclick = async function () {
    //   try {
    //     console.log("unmuting the track");
    //     await rtc.localAudioTrack?.setEnabled(true);
    //   } catch (e) {
    //     console.log("error while unmuting: ", e);
    //   }
    // };

    document.getElementById("startScreenshare").onclick = async function () {
      screenRtc.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

      try {
        console.log("[screenshare]: creating stream");
        const screenTracks = await AgoraRTC.createScreenVideoTrack({}, "auto");
        if (Object.keys(screenTracks).length > 0) {
          screenRtc.video = screenTracks;
        } else {
          screenRtc.video = screenTracks[0];
          screenRtc.audio = screenTracks[1];
        }
        console.log("supriya screenStream", this.screenStream);
      } catch (e) {
        console.log("[screenshare]: Error during intialization");
        throw e;
      }

      await screenRtc.client.join(
        options.appId,
        options.channel,
        options.token
      );

      await screenRtc.client.publish(
        screenRtc.audio ? [screenRtc.video, screenRtc.audio] : screenRtc.video
      );

      screenRtc?.localScreenTrack?.on("track-ended", () => {
        console.log("inside my track ended");
        screenRtc.client.leave();
        screenRtc?.audio?.close();
        screenRtc?.video?.close();
        screenRtc = {
          audio: {},
          video: {},
        };
      });
    };
  };
}

startBasicCall();
