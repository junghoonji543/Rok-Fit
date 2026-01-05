const app = {
    video: null,
    canvas: null,
    ctx: null,
    detector: null,
    counter: null,
    rafId: null,
    currentMode: 'pushup',

    init: async () => {
        app.video = document.getElementById('video');
        app.canvas = document.getElementById('canvas');
        app.ctx = app.canvas.getContext('2d');

        app.detector = new PoseDetector();
        app.counter = new ExerciseCounter();

        await app.detector.init();
        document.getElementById('loading').style.display = 'none';

        app.setupListeners();
    },

    setupListeners: () => {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                app.setMode(e.target.dataset.mode);
            });
        });

        document.getElementById('file-in').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                app.loadVideo(url);
            }
        });

        app.video.addEventListener('loadedmetadata', () => {
            app.canvas.width = app.video.videoWidth;
            app.canvas.height = app.video.videoHeight;
            app.video.play();
            app.loop();
        });
    },

    setMode: (mode) => {
        app.currentMode = mode;
        app.counter.setMode(mode);
    },

    startCamera: async () => {
        if (app.rafId) cancelAnimationFrame(app.rafId);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            app.video.srcObject = stream;
        } catch (err) {
            alert("Camera Error: " + err.message);
        }
    },

    loadVideo: (src) => {
        if (app.rafId) cancelAnimationFrame(app.rafId);
        if (app.video.srcObject) {
            app.video.srcObject.getTracks().forEach(t => t.stop());
            app.video.srcObject = null;
        }
        app.video.src = src;
    },

    reset: () => {
        // Stop video playback and clear source
        if (app.video.srcObject) {
            app.video.srcObject.getTracks().forEach(t => t.stop());
            app.video.srcObject = null;
        }
        app.video.pause();
        app.video.removeAttribute('src'); // Completely remove src
        app.video.load(); // Reload to clear visual buffer

        // Clear Canvas
        app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);

        // Reset Logic
        app.counter.reset();
        app.updateUI({ count: 0, feedback: 'Ready', debug: '-' });

        // Hide overlay text
        document.getElementById('feedback-overlay').innerText = "";
    },

    frameCount: 0,

    loop: async () => {
        if (app.video.paused || app.video.ended) {
            app.rafId = requestAnimationFrame(app.loop);
            return;
        }

        // Optimization: Skip frames to keep up with video (1 detection per 3 frames)
        app.frameCount++;
        if (app.frameCount % 3 !== 0) {
            // Just draw the previous frame's results or clear/keep?
            // If we don't draw, the canvas might blink. Better to NOT clear if we skipped.
            // But we need to sync with video. 
            // Let's just skip the heavy ESTIMATE.
            app.rafId = requestAnimationFrame(app.loop);
            return;
        }

        const poses = await app.detector.estimate(app.video);

        // Draw Results (Skeleton)
        app.detector.drawResults(app.ctx, poses[0] ? poses[0].keypoints : [], app.currentMode);

        // Process Logic & Draw Debug Text (Angle)
        if (poses.length > 0) {
            const result = app.counter.process(poses[0].keypoints, app.ctx);
            if (result) app.updateUI(result);
        } else {
            app.updateUI({ count: app.counter.count, feedback: 'No Pose', debug: 'Searching...' });
        }

        app.rafId = requestAnimationFrame(app.loop);
    },

    updateUI: (data) => {
        document.getElementById('count-val').innerText = data.count;
        document.getElementById('status-val').innerText = data.feedback;
        document.getElementById('debug-val').innerText = data.debug;

        if (data.feedback.includes('Count') || data.feedback.includes('Sit-up')) {
            document.getElementById('status-val').className = 'stat-value status-active';
        } else {
            document.getElementById('status-val').className = 'stat-value status-ready';
        }

        document.getElementById('feedback-overlay').innerText = data.feedback;
    }
};

window.addEventListener('DOMContentLoaded', app.init);
