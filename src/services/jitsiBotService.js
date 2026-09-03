import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const activeBots = new Map();

/**
 * Find Chrome / Chromium executable
 */
const getExecutablePath = () => {
  const commonPaths = [
    "/snap/bin/chromium",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      console.log(`[JitsiBot] Using browser: ${p}`);
      return p;
    }
  }

  try {
    const puppeteerPath = puppeteer.executablePath();

    console.log(
      `[JitsiBot] Using Puppeteer browser: ${puppeteerPath}`,
    );

    return puppeteerPath;
  } catch (e) {
    console.error(
      "[JitsiBot] Could not find browser:",
      e,
    );

    return undefined;
  }
};

/**
 * Start Jitsi recording
 */
export const startRecording = async (roomName) => {
  if (activeBots.has(roomName)) {
    console.log(
      `[JitsiBot] Bot already active in room: ${roomName}`,
    );

    return null;
  }

  const uploadDir = path.join(
    __dirname,
    "..",
    "..",
    "public",
    "upload",
    "jitsi-recordings",
  );

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
      recursive: true,
    });
  }

  const fileName = `${roomName}-${Date.now()}.webm`;

  const filePath = path.join(
    uploadDir,
    fileName,
  );

  const fileStream = fs.createWriteStream(
    filePath,
  );

  console.log(
    `[JitsiBot] Launching bot for room ${roomName}`,
  );

  let browser;

  try {
    /**
     * --------------------------------------------------
     * PUPPETEER CONFIG
     * --------------------------------------------------
     */

    const launchConfig = {
      headless: true,

      executablePath: getExecutablePath(),

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",

        "--disable-dev-shm-usage",

        "--no-first-run",
        "--no-zygote",

        // Allow autoplay
        "--autoplay-policy=no-user-gesture-required",

        // WebRTC
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",

        // Screen capture
        "--auto-select-desktop-capture-source=Entire screen",
        "--allow-http-screen-capture",

        // Browser size
        "--window-size=1280,720",
      ],
    };

    /**
     * --------------------------------------------------
     * LAUNCH BROWSER
     * --------------------------------------------------
     */

    try {
      browser = await puppeteer.launch(
        launchConfig,
      );
    } catch (launchErr) {
      console.error(
        "[JitsiBot] Puppeteer failed to launch:",
        launchErr,
      );

      if (
        launchErr.message.includes(
          "Could not find Chrome",
        ) ||
        launchErr.message.includes(
          "Browser was not found",
        )
      ) {
        throw new Error(
          "Chrome is missing on the server! Please install Chromium/Chrome or run: node node_modules/puppeteer/install.mjs",
        );
      }

      throw launchErr;
    }

    /**
     * --------------------------------------------------
     * PAGE
     * --------------------------------------------------
     */

    const page = await browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 720,
    });

    /**
     * --------------------------------------------------
     * CAPTURE ALL JITSI WEBRTC CONNECTIONS
     *
     * IMPORTANT:
     * This executes BEFORE Jitsi loads.
     * --------------------------------------------------
     */

    await page.evaluateOnNewDocument(() => {
      window.__jitsiPeerConnections = [];

      const OriginalRTCPeerConnection =
        window.RTCPeerConnection;

      if (!OriginalRTCPeerConnection) {
        console.error(
          "[Recorder] RTCPeerConnection unavailable",
        );

        return;
      }

      window.RTCPeerConnection =
        function (...args) {
          const pc =
            new OriginalRTCPeerConnection(
              ...args,
            );

          window.__jitsiPeerConnections.push(
            pc,
          );

          console.log(
            "[Recorder] RTCPeerConnection captured",
          );

          return pc;
        };

      window.RTCPeerConnection.prototype =
        OriginalRTCPeerConnection.prototype;

      if (
        OriginalRTCPeerConnection.generateCertificate
      ) {
        window.RTCPeerConnection.generateCertificate =
          OriginalRTCPeerConnection.generateCertificate;
      }
    });

    /**
     * --------------------------------------------------
     * PAGE LOGGING
     * --------------------------------------------------
     */

    page.on("console", (msg) => {
      console.log(
        "[PAGE LOG]",
        msg.text(),
      );
    });

    page.on("pageerror", (error) => {
      console.error(
        "[PAGE ERROR]",
        error,
      );
    });

    /**
     * --------------------------------------------------
     * SEND MEDIA CHUNKS TO NODE
     * --------------------------------------------------
     */

    await page.exposeFunction(
      "onMediaData",
      (base64Chunk) => {
        try {
          const buffer = Buffer.from(
            base64Chunk,
            "base64",
          );

          if (fileStream.writable) {
            fileStream.write(buffer);
          }
        } catch (e) {
          console.error(
            "[JitsiBot] Error writing media chunk:",
            e,
          );
        }
      },
    );

    /**
     * --------------------------------------------------
     * JITSI URL
     * --------------------------------------------------
     */

    const url =
      `https://alpha.jitsi.net/${roomName}` +
      `#config.prejoinPageEnabled=false` +
      `&config.startWithAudioMuted=true` +
      `&config.startWithVideoMuted=true` +
      `&config.disableJoinLeaveSounds=true` +
      `&config.disabledSounds=PARTICIPANT_JOINED_SOUND,PARTICIPANT_LEFT_SOUND,RECORDING_ON_SOUND,RECORDING_OFF_SOUND,REACTION_SOUND,RAISE_HAND_SOUND,TALK_WHILE_MUTED_SOUND`;

    console.log(
      `[JitsiBot] Opening Jitsi room: ${roomName}`,
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    /**
     * --------------------------------------------------
     * MUTE JITSI UI / NOTIFICATION AUDIO
     *
     * IMPORTANT:
     *
     * We ONLY mute <audio> elements that don't
     * contain a WebRTC MediaStream.
     *
     * Participant WebRTC audio remains untouched.
     * --------------------------------------------------
     */

    await page.evaluate(() => {
      const muteJitsiSounds = () => {
        const audioElements =
          document.querySelectorAll(
            "audio",
          );

        audioElements.forEach((audio) => {
          /**
           * No WebRTC stream = most likely
           * Jitsi UI / notification sound.
           */
          if (!audio.srcObject) {
            audio.muted = true;
            audio.volume = 0;
          }
        });
      };

      muteJitsiSounds();

      if (
        window._muteJitsiSoundsInterval
      ) {
        clearInterval(
          window._muteJitsiSoundsInterval,
        );
      }

      window._muteJitsiSoundsInterval =
        setInterval(
          muteJitsiSounds,
          500,
        );

      console.log(
        "[Recorder] Jitsi notification audio protection enabled",
      );
    });

    /**
     * --------------------------------------------------
     * WAIT FOR JITSI
     * --------------------------------------------------
     */

    await new Promise((resolve) =>
      setTimeout(resolve, 3000),
    );

    /**
     * --------------------------------------------------
     * PREJOIN / NAME
     * --------------------------------------------------
     */

    await page.keyboard.type(
      "Recording Bot",
    );

    await page.keyboard.press(
      "Enter",
    );

    /**
     * Give Jitsi time to join
     */

    await new Promise((resolve) =>
      setTimeout(resolve, 5000),
    );

    console.log(
      `[JitsiBot] Injecting recorder for room ${roomName}`,
    );

    /**
     * --------------------------------------------------
     * RECORDING SCRIPT
     * --------------------------------------------------
     */

    await page.evaluate(async () => {
      try {
        console.log(
          "[Recorder] Initializing Canvas + WebRTC Audio recorder...",
        );

        /**
         * ==================================================
         * 1. VIDEO CANVAS
         * ==================================================
         */

        const canvas =
          document.createElement(
            "canvas",
          );

        canvas.width = 1280;
        canvas.height = 720;

        const ctx =
          canvas.getContext("2d");

        /**
         * ==================================================
         * 2. AUDIO CONTEXT
         * ==================================================
         */

        const AudioContextClass =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioContextClass) {
          throw new Error(
            "AudioContext is not supported",
          );
        }

        const audioCtx =
          new AudioContextClass();

        try {
          await audioCtx.resume();
        } catch (err) {
          console.error(
            "[Recorder] AudioContext resume error:",
            err,
          );
        }

        console.log(
          "[Recorder] AudioContext state:",
          audioCtx.state,
        );

        /**
         * ==================================================
         * 3. AUDIO DESTINATION
         * ==================================================
         */

        const dest =
          audioCtx.createMediaStreamDestination();

        console.log(
          "[Recorder] MediaStreamDestination created",
        );

        /**
         * Track IDs already connected
         */

        const connectedAudioTracks =
          new Set();

        /**
         * ==================================================
         * CONNECT ONLY WEBRTC AUDIO TRACK
         * ==================================================
         */

        const connectAudioTrack =
          (track) => {
            if (!track) {
              return;
            }

            /**
             * ONLY AUDIO
             */

            if (
              track.kind !== "audio"
            ) {
              return;
            }

            /**
             * Prevent duplicate connections
             */

            if (
              connectedAudioTracks.has(
                track.id,
              )
            ) {
              return;
            }

            try {
              console.log(
                "[Recorder] ==============================",
              );

              console.log(
                "[Recorder] REMOTE WEBRTC AUDIO TRACK",
              );

              console.log(
                "[Recorder] Track ID:",
                track.id,
              );

              console.log(
                "[Recorder] Label:",
                track.label,
              );

              console.log(
                "[Recorder] State:",
                track.readyState,
              );

              console.log(
                "[Recorder] Enabled:",
                track.enabled,
              );

              console.log(
                "[Recorder] Muted:",
                track.muted,
              );

              /**
               * Create stream containing ONLY
               * this WebRTC track.
               */

              const stream =
                new MediaStream([
                  track,
                ]);

              /**
               * IMPORTANT:
               *
               * createMediaStreamSource()
               *
               * NOT:
               *
               * createMediaElementSource()
               */

              const source =
                audioCtx.createMediaStreamSource(
                  stream,
                );

              /**
               * Connect ONLY to recording
               * destination.
               *
               * DO NOT connect to
               * audioCtx.destination.
               */

              source.connect(
                dest,
              );

              connectedAudioTracks.add(
                track.id,
              );

              console.log(
                "[Recorder] AUDIO CONNECTED:",
                track.id,
              );

              /**
               * Remove ended tracks
               */

              track.addEventListener(
                "ended",
                () => {
                  connectedAudioTracks.delete(
                    track.id,
                  );

                  console.log(
                    "[Recorder] Audio track ended:",
                    track.id,
                  );
                },
              );
            } catch (err) {
              console.error(
                "[Recorder] Audio connection error:",
                err,
              );
            }
          };

        /**
         * ==================================================
         * 4. SCAN JITSI WEBRTC RECEIVERS
         * ==================================================
         */

        const scanPeerConnections =
          () => {
            const pcs =
              window.__jitsiPeerConnections ||
              [];

            console.log(
              "[Recorder] Peer connections:",
              pcs.length,
            );

            for (const pc of pcs) {
              try {
                const receivers =
                  pc.getReceivers();

                console.log(
                  "[Recorder] Receivers:",
                  receivers.length,
                );

                for (const receiver of receivers) {
                  const track =
                    receiver.track;

                  if (!track) {
                    continue;
                  }

                  console.log(
                    "[Recorder] RECEIVER:",
                    {
                      kind: track.kind,
                      id: track.id,
                      label: track.label,
                      enabled:
                        track.enabled,
                      muted:
                        track.muted,
                      readyState:
                        track.readyState,
                    },
                  );

                  /**
                   * ONLY connect AUDIO tracks
                   */

                  if (
                    track.kind ===
                    "audio"
                  ) {
                    connectAudioTrack(
                      track,
                    );
                  }
                }
              } catch (err) {
                console.error(
                  "[Recorder] Receiver scan error:",
                  err,
                );
              }
            }
          };

        /**
         * ==================================================
         * 5. INITIAL AUDIO SCAN
         * ==================================================
         */

        scanPeerConnections();

        /**
         * ==================================================
         * 6. CONTINUOUS AUDIO SCAN
         * ==================================================
         */

        window._audioScanner =
          setInterval(
            async () => {
              /**
               * Resume AudioContext if required
               */

              if (
                audioCtx.state ===
                "suspended"
              ) {
                try {
                  await audioCtx.resume();
                } catch (err) {
                  console.error(
                    "[Recorder] AudioContext resume failed:",
                    err,
                  );
                }
              }

              /**
               * Scan WebRTC receivers
               */

              scanPeerConnections();

              console.log(
                "[Recorder] Connected WebRTC audio tracks:",
                connectedAudioTracks.size,
              );
            },
            1000,
          );

        /**
         * ==================================================
         * 7. DEBUG AUDIO ELEMENTS
         * ==================================================
         */

        window._debugAudioElements =
          setInterval(() => {
            const elements =
              [
                ...document.querySelectorAll(
                  "audio",
                ),
              ].map((audio) => ({
                hasSrcObject:
                  !!audio.srcObject,

                muted:
                  audio.muted,

                volume:
                  audio.volume,

                paused:
                  audio.paused,

                src:
                  audio.src,

                readyState:
                  audio.readyState,
              }));

            console.log(
              "[Recorder] Audio elements:",
              JSON.stringify(
                elements,
              ),
            );
          }, 5000);

        /**
         * ==================================================
         * 8. VIDEO RENDER LOOP
         * ==================================================
         */

        const renderLoop =
          () => {
            /**
             * Background
             */

            ctx.fillStyle = "#111";

            ctx.fillRect(
              0,
              0,
              canvas.width,
              canvas.height,
            );

            /**
             * Jitsi large video
             */

            const largeVideo =
              document.getElementById(
                "largeVideo",
              );

            if (
              largeVideo &&
              largeVideo.readyState >= 2 &&
              largeVideo.videoWidth > 0 &&
              largeVideo.videoHeight > 0
            ) {
              const vRatio =
                canvas.width /
                largeVideo.videoWidth;

              const hRatio =
                canvas.height /
                largeVideo.videoHeight;

              const ratio =
                Math.min(
                  vRatio,
                  hRatio,
                );

              const centerShiftX =
                (canvas.width -
                  largeVideo.videoWidth *
                    ratio) /
                2;

              const centerShiftY =
                (canvas.height -
                  largeVideo.videoHeight *
                    ratio) /
                2;

              try {
                ctx.drawImage(
                  largeVideo,

                  0,
                  0,

                  largeVideo.videoWidth,
                  largeVideo.videoHeight,

                  centerShiftX,
                  centerShiftY,

                  largeVideo.videoWidth *
                    ratio,

                  largeVideo.videoHeight *
                    ratio,
                );
              } catch (e) {
                console.error(
                  "[Recorder] drawImage error:",
                  e,
                );
              }
            } else {
              /**
               * Waiting screen
               */

              ctx.fillStyle = "#fff";

              ctx.font =
                "30px Arial";

              ctx.textAlign =
                "center";

              ctx.fillText(
                "Waiting for participants...",
                canvas.width / 2,
                canvas.height / 2,
              );
            }

            setTimeout(
              renderLoop,
              1000 / 30
            );
          };

        renderLoop();

        /**
         * ==================================================
         * 9. VIDEO STREAM
         * ==================================================
         */

        const videoStream =
          canvas.captureStream(
            30,
          );

        const videoTracks =
          videoStream.getVideoTracks();

        /**
         * ==================================================
         * 10. AUDIO STREAM
         * ==================================================
         */

        /**
         * Add silent oscillator to keep audio flowing
         */
        const silentOsc = audioCtx.createOscillator();
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        silentOsc.connect(silentGain);
        silentGain.connect(dest);
        silentOsc.start();

        const audioTracks =
          dest.stream.getAudioTracks();

        console.log(
          "[Recorder] Video tracks:",
          videoTracks.length,
        );

        console.log(
          "[Recorder] Audio output tracks:",
          audioTracks.length,
        );

        audioTracks.forEach(
          (track) => {
            console.log(
              "[Recorder] Output audio:",
              {
                id: track.id,
                enabled:
                  track.enabled,
                readyState:
                  track.readyState,
                muted:
                  track.muted,
              },
            );
          },
        );

        /**
         * ==================================================
         * 11. COMBINED MEDIA STREAM
         * ==================================================
         */

        const combinedStream =
          new MediaStream([
            ...videoTracks,
            ...audioTracks,
          ]);

        console.log(
          "[Recorder] Combined stream:",
          {
            video:
              combinedStream.getVideoTracks()
                .length,

            audio:
              combinedStream.getAudioTracks()
                .length,
          },
        );

        /**
         * ==================================================
         * 12. MEDIA RECORDER
         * ==================================================
         */

        let mimeType =
          "video/webm;codecs=vp8,opus";

        /**
         * Check support
         */

        if (
          !MediaRecorder.isTypeSupported(
            mimeType,
          )
        ) {
          console.warn(
            "[Recorder] Preferred MIME type not supported",
          );

          mimeType =
            "video/webm";
        }

        console.log(
          "[Recorder] MIME type:",
          mimeType,
        );

        const recorder =
          new MediaRecorder(
            combinedStream,
            {
              mimeType,
            },
          );

        /**
         * ==================================================
         * 13. MEDIA DATA
         * ==================================================
         */

        recorder.ondataavailable =
          async (e) => {
            try {
              console.log("[Recorder] Chunk size:", e.data ? e.data.size : "undefined");
              if (
                !e.data ||
                e.data.size === 0
              ) {
                console.log("[Recorder] Data size is 0! Skipping.");
                return;
              }

              const buffer =
                await e.data.arrayBuffer();

              let binary = "";

              const bytes =
                new Uint8Array(
                  buffer,
                );

              const len =
                bytes.byteLength;

              for (
                let i = 0;
                i < len;
                i++
              ) {
                binary += String.fromCharCode(
                  bytes[i],
                );
              }

              const base64 =
                btoa(binary);

              await window.onMediaData(
                base64,
              );
            } catch (err) {
              console.error(
                "[Recorder] ondataavailable error:",
                err,
              );
            }
          };

        /**
         * ==================================================
         * 14. RECORDER EVENTS
         * ==================================================
         */

        recorder.onerror =
          (event) => {
            console.error(
              "[Recorder] MediaRecorder error:",
              event,
            );
          };

        recorder.onstart =
          () => {
            console.log(
              "[Recorder] MediaRecorder STARTED",
            );
          };

        recorder.onstop =
          () => {
            console.log(
              "[Recorder] MediaRecorder STOPPED",
            );
          };

        /**
         * ==================================================
         * 15. START RECORDING
         * ==================================================
         */

        recorder.start(1000);

        /**
         * Store globally so Node can stop it.
         */

        window._jitsiRecorder =
          recorder;

        window._jitsiAudioContext =
          audioCtx;

        console.log(
          "[Recorder] MediaRecorder started successfully!",
        );
      } catch (err) {
        console.error(
          "[Recorder] Failed to start recorder:",
          err.message,
          err.name,
          err.stack,
        );
      }
    });

    /**
     * --------------------------------------------------
     * SAVE ACTIVE BOT
     * --------------------------------------------------
     */

    activeBots.set(roomName, {
      browser,
      fileStream,
      filePath,
      fileName,
    });

    console.log(
      `[JitsiBot] Recording started successfully for ${roomName}`,
    );

    return filePath;
  } catch (error) {
    console.error(
      `[JitsiBot] Failed to start recording for ${roomName}:`,
      error,
    );

    try {
      fileStream.end();
    } catch {}

    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    throw error;
  }
};

/**
 * ======================================================
 * STOP RECORDING
 * ======================================================
 */

export const stopRecording = async (
  roomName,
) => {
  const botInfo =
    activeBots.get(roomName);

  if (!botInfo) {
    console.log(
      `[JitsiBot] No active bot found for room ${roomName}`,
    );

    return null;
  }

  console.log(
    `[JitsiBot] Stopping recording for room ${roomName}`,
  );

  try {
    const {
      browser,
      fileStream,
      filePath,
      fileName,
    } = botInfo;

    /**
     * --------------------------------------------------
     * STOP BROWSER RECORDER
     * --------------------------------------------------
     */

    const pages =
      await browser.pages();

    if (pages.length > 0) {
      const page =
        pages[pages.length - 1];

      try {
        await page.evaluate(
          async () => {
            /**
             * Stop audio scanner
             */

            if (
              window._audioScanner
            ) {
              clearInterval(
                window._audioScanner,
              );

              window._audioScanner =
                null;
            }

            /**
             * Stop audio debug logger
             */

            if (
              window._debugAudioElements
            ) {
              clearInterval(
                window._debugAudioElements,
              );

              window._debugAudioElements =
                null;
            }

            /**
             * Stop Jitsi sound muting
             */

            if (
              window._muteJitsiSoundsInterval
            ) {
              clearInterval(
                window._muteJitsiSoundsInterval,
              );

              window._muteJitsiSoundsInterval =
                null;
            }

            /**
             * Stop MediaRecorder
             */

            if (
              window._jitsiRecorder &&
              window._jitsiRecorder.state !==
                "inactive"
            ) {
              console.log(
                "[Recorder] Stopping MediaRecorder...",
              );

              window._jitsiRecorder.stop();
            }

            /**
             * Close AudioContext
             */

            if (
              window._jitsiAudioContext
            ) {
              try {
                await window._jitsiAudioContext.close();
              } catch {}
            }

            console.log(
              "[Recorder] Browser recorder cleanup complete",
            );
          },
        );
      } catch (e) {
        console.error(
          "[JitsiBot] Error stopping recorder:",
          e,
        );
      }
    }

    /**
     * --------------------------------------------------
     * WAIT FOR FINAL MEDIA CHUNK
     * --------------------------------------------------
     */

    console.log(
      "[JitsiBot] Waiting for final recording chunk...",
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 3000),
    );

    /**
     * --------------------------------------------------
     * CLOSE FILE STREAM
     * --------------------------------------------------
     */

    await new Promise((resolve) => {
      if (!fileStream.writableEnded) {
        fileStream.end(resolve);
      } else {
        resolve();
      }
    });

    console.log(
      `[JitsiBot] WebM saved: ${filePath}`,
    );

    /**
     * --------------------------------------------------
     * CLOSE BROWSER
     * --------------------------------------------------
     */

    try {
      await browser.close();
    } catch (e) {
      console.error(
        "[JitsiBot] Browser close error:",
        e,
      );
    }

    /**
     * Remove bot
     */

    activeBots.delete(roomName);

    /**
     * --------------------------------------------------
     * CONVERT WEBM -> MP4
     * --------------------------------------------------
     */

    const mp4FileName =
      `${path.parse(fileName).name}.mp4`;

    const mp4FilePath =
      path.join(
        path.dirname(filePath),
        mp4FileName,
      );

    console.log(
      `[JitsiBot] Starting MP4 conversion for ${roomName}...`,
    );

    /**
     * Dynamic imports
     */

    const ffmpeg =
      await import(
        "ffmpeg-static"
      );

    const {
      spawn,
    } = await import(
      "child_process"
    );

    /**
     * --------------------------------------------------
     * FFMPEG
     * --------------------------------------------------
     */

    await new Promise(
      (resolve, reject) => {
        const proc =
          spawn(
            ffmpeg.default,
            [
              "-y",

              "-i",
              filePath,

              /**
               * Video
               */

              "-c:v",
              "libx264",

              "-preset",
              "ultrafast",

              "-pix_fmt",
              "yuv420p",

              /**
               * Audio
               */

              "-c:a",
              "aac",

              "-b:a",
              "128k",

              "-ar",
              "48000",

              "-ac",
              "2",

              /**
               * MP4 optimization
               */

              "-movflags",
              "+faststart",

              mp4FilePath,
            ],
          );

        proc.stdout?.on(
          "data",
          (data) => {
            console.log(
              `[FFmpeg] ${data}`,
            );
          },
        );

        proc.stderr?.on(
          "data",
          (data) => {
            console.log(
              `[FFmpeg] ${data}`,
            );
          },
        );

        proc.on(
          "error",
          (error) => {
            console.error(
              "[FFmpeg] Process error:",
              error,
            );

            reject(error);
          },
        );

        proc.on(
          "close",
          (code) => {
            if (code === 0) {
              console.log(
                `[JitsiBot] MP4 conversion complete: ${mp4FilePath}`,
              );

              /**
               * Delete WebM only after
               * successful MP4 conversion.
               */

              fs.unlink(
                filePath,
                (err) => {
                  if (err) {
                    console.error(
                      "[JitsiBot] Failed to delete WebM:",
                      err,
                    );
                  } else {
                    console.log(
                      "[JitsiBot] WebM deleted after successful conversion",
                    );
                  }
                },
              );

              resolve();
            } else {
              console.error(
                `[FFmpeg] Conversion failed with code ${code}`,
              );

              reject(
                new Error(
                  `FFmpeg exited with code ${code}`,
                ),
              );
            }
          },
        );
      },
    );

    /**
     * --------------------------------------------------
     * RETURN MP4 URL
     * --------------------------------------------------
     */

    const relativePath =
      `/uploads/jitsi-recordings/${mp4FileName}`;

    console.log(
      `[JitsiBot] Recording saved to ${relativePath}`,
    );

    return relativePath;
  } catch (error) {
    console.error(
      `[JitsiBot] Error stopping bot for room ${roomName}:`,
      error,
    );

    activeBots.delete(
      roomName,
    );
    return null;
  }
};