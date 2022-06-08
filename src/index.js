import AgoraRTC from "agora-rtc-sdk-ng";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";

var client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
var screenClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

/*
 * Clear the video and audio tracks used by `client` on initiation.
 */
let screenTracks = {
  screenVideoTrack: null,
  screenAudioTrack: null,
};

let screenTrackState = {
  screenVideoTrackMuted: true,
  screenAudioTrackMuted: true,
};

let localTracks = {
  videoTrack: null,
  audioTrack: null,
};

let localTrackState = {
  videoTrackMuted: false,
  audioTrackMuted: false,
};
/*
 * On initiation no users are connected.
 */
let remoteUsers = {};

/*
 * On initiation. `client` is not attached to any project or channel for any specific user.
 */
let options = {
  appid: null,
  channel: null,
  uid: null,
  token: null,
};

let screenshareoptions = {
  appid: null,
  channel: null,
  uid: null,
  token: null,
};

AgoraRTC.onAutoplayFailed = () => {
  alert("click to start autoplay!");
};

AgoraRTC.onMicrophoneChanged = async (changedDevice) => {
  // When plugging in a device, switch to a device that is newly plugged in.
  if (changedDevice.state === "ACTIVE") {
    localTracks.audioTrack.setDevice(changedDevice.device.deviceId);
    // Switch to an existing device when the current device is unplugged.
  } else if (
    changedDevice.device.label === localTracks.audioTrack.getTrackLabel()
  ) {
    const oldMicrophones = await AgoraRTC.getMicrophones();
    oldMicrophones[0] &&
      localTracks.audioTrack.setDevice(oldMicrophones[0].deviceId);
  }
};

AgoraRTC.onCameraChanged = async (changedDevice) => {
  // When plugging in a device, switch to a device that is newly plugged in.
  if (changedDevice.state === "ACTIVE") {
    localTracks.videoTrack.setDevice(changedDevice.device.deviceId);
    // Switch to an existing device when the current device is unplugged.
  } else if (
    changedDevice.device.label === localTracks.videoTrack.getTrackLabel()
  ) {
    const oldCameras = await AgoraRTC.getCameras();
    oldCameras[0] && localTracks.videoTrack.setDevice(oldCameras[0].deviceId);
  }
};

/*
 * When this page is called with parameters in the URL, this procedure
 * attempts to join a Video Call channel using those parameters.
 */
$(() => {
  var urlParams = new URL(location.href).searchParams;
  options.appid = urlParams.get("appid");
  options.channel = urlParams.get("channel");
  options.token = urlParams.get("token");
  options.uid = urlParams.get("uid");
  if (options.appid && options.channel) {
    $("#uid").val(options.uid);
    $("#appid").val(options.appid);
    $("#token").val(options.token);
    $("#channel").val(options.channel);
    $("#join-form").submit();
  }
});

/*
 * When a user clicks Join or Leave in the HTML form, this procedure gathers the information
 * entered in the form and calls join asynchronously. The UI is updated to match the options entered
 * by the user.
 */
$("#join-form").submit(async function (e) {
  e.preventDefault();
  $("#join").attr("disabled", true);
  try {
    options.appid = $("#appid").val();
    options.token = $("#token").val();
    options.channel = $("#channel").val();
    options.uid = Number($("#uid").val());
    await join();
    if (options.token) {
      $("#success-alert-with-token").css("display", "block");
    } else {
      $("#success-alert a").attr(
        "href",
        `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`
      );
      $("#success-alert").css("display", "block");
    }
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
});

/*
 * Called when a user clicks Leave in order to exit a channel.
 */

$("#leave").on("click", function (e) {
  leave();
  window.location.reload();
});

/*
 * Called when a user mutes/unmutes audio.
 */
$("#mute-audio").on("click", function (e) {
  if (!localTrackState.audioTrackMuted) {
    muteAudio();
  } else {
    unmuteAudio();
  }
});
/*
 * Called when a user mutes/unmutes video.
 */
$("#mute-video").on("click", function (e) {
  if (!localTrackState.videoTrackMuted) {
    muteVideo();
  } else {
    unmuteVideo();
  }
});

/**
 * Called when a user starts screenshare
 */

$("#start-screenshare").on("click", function (e) {
  if (screenTrackState.screenVideoTrackMuted) {
    startScreenshare();
  }
});

/*
 * Join a channel, then create local video and audio tracks and publish them to the channel.
 */
async function join() {
  // Add an event listener to play remote tracks when remote users join, publish and leave
  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);

  client.on("user-joined", handleUserJoined);
  client.on("user-left", handleUserLeft);

  // Join a channel and create local tracks. Best practice is to use Promise.all and run them concurrently.
  [options.uid, localTracks.audioTrack, localTracks.videoTrack] =
    await Promise.all([
      // Join the channel.
      client.join(
        options.appid,
        options.channel,
        options.token || null,
        options.uid || null
      ),
      // Create tracks to the local microphone and camera.
      AgoraRTC.createMicrophoneAudioTrack(),
      AgoraRTC.createCameraVideoTrack(),
    ]);

  // Show the buttons
  showMuteButton();
  showScreenshareControls();
  // Play the local video track to the local browser and update the UI with the user ID.
  const player = $(`
        <div id="local-player-wrapper-${options.uid}">
          <p id="local-player-name-${options.uid}" class="player-name">localUser(${options.uid})</p>
          <div id="local-player-${options.uid}" class="player"></div>
        </div>
      `);
  $("#local-playerlist").append(player);
  localTracks.videoTrack.play(`local-player-${options.uid}`);
  // Publish the local video and audio tracks to the channel.
  await client.publish(Object.values(localTracks));
  console.log("publish success");
}

/*
 * Stop all local and remote tracks then leave the channel.
 */
async function leave() {
  for (let trackName in localTracks) {
    let track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }
  for (let trackName in screenTracks) {
    let track = screenTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      screenTracks[trackName] = undefined;
    }
  }

  // Remove remote users and player views.
  remoteUsers = {};
  $("#local-playerlist").html("");
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();
  await screenClient.leave();

  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  console.log("client leaves channel success");
}

/*
 * Add the local use to a remote channel.
 *
 * @param  {IAgoraRTCRemoteUser} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to add.
 * @param {trackMediaType - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/itrack.html#trackmediatype | media type} to add.
 */
async function subscribe(user, mediaType) {
  const uid = user.uid;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("subscribe success");
  if (mediaType === "video") {
    if ($(`#player-wrapper-${uid}`).length === 0) {
      const player = $(`
        <div id="player-wrapper-${uid}">
          <p class="player-name">remoteUser(${uid})</p>
          <div id="player-${uid}" class="player"></div>
        </div>
      `);
      $("#remote-playerlist").append(player);
    }
    // Play the remote video.
    user.videoTrack.play(`player-${uid}`);
  }
  if (mediaType === "audio") {
    user.audioTrack.play();
  }
}

/*
 * Add a user who has subscribed to the live channel to the local interface.
 */
function handleUserPublished(user, mediaType) {
  const id = user.uid;
  if (
    !screenTrackState.screenVideoTrackMuted &&
    id === screenshareoptions.uid
  ) {
    // do nothing
  } else {
    remoteUsers[id] = user;
    subscribe(user, mediaType);
  }
}

/*
 * Remove the user specified from the channel in the local interface.
 */
function handleUserUnpublished(user, mediaType) {
  if (mediaType === "video") {
    const id = user.uid;
    delete remoteUsers[id];
    $(`#player-wrapper-${id}`).remove();
  }
}

function handleUserJoined(user) {
  const id = user.uid;
  remoteUsers[id] = user;
}

function handleUserLeft(user) {
  const id = user.uid;
  delete remoteUsers[id];
  $(`#player-wrapper-${id}`).remove();
}

function showMuteButton() {
  $("#mute-video").css("display", "inline-block");
  $("#mute-audio").css("display", "inline-block");
}

async function muteAudio() {
  if (!localTracks.audioTrack) return;
  /**
   * After calling setMuted to mute an audio or video track, the SDK stops sending the audio or video stream. Users whose tracks are muted are not counted as users sending streams.
   * Calling setEnabled to disable a track, the SDK stops audio or video capture
   */
  await localTracks.audioTrack.setMuted(true);
  localTrackState.audioTrackMuted = true;
  $("#mute-audio").text("Unmute Audio");
}

async function muteVideo() {
  if (!localTracks.videoTrack) return;
  await localTracks.videoTrack.setEnabled(false);
  localTrackState.videoTrackMuted = true;
  $("#mute-video").text("Unmute Video");
}

async function unmuteAudio() {
  if (!localTracks.audioTrack) return;
  await localTracks.audioTrack.setMuted(false);
  localTrackState.audioTrackMuted = false;
  $("#mute-audio").text("Mute Audio");
}

async function unmuteVideo() {
  if (!localTracks.videoTrack) return;
  await localTracks.videoTrack.setEnabled(true);
  localTrackState.videoTrackMuted = false;
  $("#mute-video").text("Mute Video");
}

// Screenshare code begins

function showScreenshareControls() {
  $("#start-screenshare").css("display", "inline-block");
}

async function startScreenshare() {
  let screenStream;
  try {
    [screenshareoptions.uid, screenStream] = await Promise.all([
      // Join the channel.
      screenClient.join(options.appid, options.channel, null, null),
      AgoraRTC.createScreenVideoTrack(
        {
          encoderConfig: {
            framerate: 15,
            height: 720,
            width: 1280,
          },
        },
        "auto"
      ),
    ]);
    $("#start-screenshare").attr("disabled", true);
  } catch (error) {
    console.error("Error: cannot screenshare check permissions");
  }

  if (screenStream instanceof Array) {
    screenTracks.screenVideoTrack = screenStream[0];
    screenTracks.screenAudioTrack = screenStream[1];
  } else {
    screenTracks.screenVideoTrack = screenStream;
  }

  // const player = $(`
  //       <div id="local-player-wrapper-${screenshareoptions.uid}">
  //         <p id="local-player-name-${screenshareoptions.uid}" class="player-name">localUser(${screenshareoptions.uid})</p>
  //         <div id="local-player-${screenshareoptions.uid}" class="player"></div>
  //       </div>
  //     `);

  // $("#local-playerlist").append(player);

  // // play local video track
  // screenTracks.screenVideoTrack.play(`local-player-${screenshareoptions.uid}`);

  //bind "track-ended" event, and when screensharing is stopped, there is an alert to notify the end user.
  screenTracks.screenVideoTrack.on("track-ended", () => {
    alert(
      `Screen-share track ended, stop sharing screen ` +
        screenTracks.screenVideoTrack.getTrackId()
    );
    screenClient.leave();
    screenTracks.screenVideoTrack && screenTracks.screenVideoTrack.close();
    screenTracks.screenAudioTrack && screenTracks.screenAudioTrack.close();
    screenStream = {};
    // screenTracks.audioTrack && screenTracks.audioTrack.close();
    screenTrackState.screenVideoTrackMuted = true;
    screenTrackState.screenAudioTrackMuted = true;
    $("#start-screenshare").attr("disabled", false);
    // $(`#local-player-wrapper-${screenshareoptions.uid}`).remove();
  });

  // publish local tracks to channel
  if (screenTracks.screenAudioTrack == null) {
    screenTrackState.screenVideoTrackMuted = false;
    await screenClient.publish([screenTracks.screenVideoTrack]);
  } else {
    screenTrackState.screenVideoTrackMuted = false;
    screenTrackState.screenAudioTrackMuted = false;
    await screenClient.publish([
      screenTracks.screenVideoTrack,
      screenTracks.screenAudioTrack,
    ]);
  }
  console.log("screenshare publish success");
}
