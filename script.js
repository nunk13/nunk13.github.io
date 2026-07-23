(function() {
    let canvas, ctx, gameArea, muteBtn, alertBtn, alertBox;
    
    let grid = 11; 
    let margin = 4;
    let playWidth = 0, playHeight = 0;
    let startX = 0, startY = 0;

    let ular = [];
    let arah = 'KANAN';
    let makanan = {x: 0, y: 0};

    let totalSkorKumulatif = 0;
    let level = 1;
    let kecepatanAwal = 350;
    let kecepatan = kecepatanAwal;
    let isMuted = false;
    let gameDihentikan = true;
    let isPaused = false;
    let gameLoopTimeout = null;
    let statusAlertMode = 'START';
    let highScore = 0;

    // --- AUDIO GENERATOR SUPER LOUD & PUNCHY ---
    let audioCtx = null;
    let compressorNode = null;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
                
                compressorNode = audioCtx.createDynamicsCompressor();
                compressorNode.threshold.setValueAtTime(-12, audioCtx.currentTime);
                compressorNode.knee.setValueAtTime(30, audioCtx.currentTime);
                compressorNode.ratio.setValueAtTime(12, audioCtx.currentTime);
                compressorNode.attack.setValueAtTime(0.003, audioCtx.currentTime);
                compressorNode.release.setValueAtTime(0.2, audioCtx.currentTime);
                
                compressorNode.connect(audioCtx.destination);
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playSound(type) {
        if (isMuted) return;
        initAudio();
        if (!audioCtx) return;

        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.connect(gain);
            gain.connect(compressorNode || audioCtx.destination);

            if (type === 'eat') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.14);
                
                gain.gain.setValueAtTime(2.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
                
                osc.start(now);
                osc.stop(now + 0.14);
            } else if (type === 'levelup') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(523.25, now); 
                osc.frequency.setValueAtTime(659.25, now + 0.08); 
                osc.frequency.setValueAtTime(783.99, now + 0.16); 
                osc.frequency.setValueAtTime(1046.50, now + 0.24);
                
                gain.gain.setValueAtTime(2.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
                
                osc.start(now);
                osc.stop(now + 0.38);
            } else if (type === 'gameover') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);
                
                gain.gain.setValueAtTime(2.8, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                
                osc.start(now);
                osc.stop(now + 0.5);
            }
        } catch (e) {
            console.log("Audio Error:", e);
        }
    }

    async function init() {
        canvas = document.getElementById("gameCanvas");
        ctx = canvas.getContext("2d");
        gameArea = document.getElementById("game-area");
        muteBtn = document.getElementById("mute-btn");
        alertBtn = document.getElementById("alert-btn");
        alertBox = document.getElementById("cyber-alert");

        sesuaikanUkuran();
        setupEvents();

        let firebasePromise = new Promise((resolve) => {
            let checkInterval = setInterval(async () => {
                if (window.loadHighScoreFromFirebase) {
                    clearInterval(checkInterval);
                    let score = await window.loadHighScoreFromFirebase();
                    resolve(score);
                }
            }, 100);
        });

        let timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(0), 2000));
        highScore = await Promise.race([firebasePromise, timeoutPromise]);

        document.getElementById("hi-score-box").innerText = "HI: " + highScore;
        tampilkanAlert("NEON CYBER SNAKE", "Koneksi Firebase Berhasil!\nTekan OK untuk mulai bermain!", "START");
        alertBtn.style.display = "inline-block";
    }

    function sesuaikanUkuran() {
        if (!gameArea || !canvas) return;
        canvas.width = gameArea.clientWidth;
        canvas.height = gameArea.clientHeight;
        playWidth = Math.floor((canvas.width - (margin * 2)) / grid) * grid;
        playHeight = Math.floor((canvas.height - (margin * 2)) / grid) * grid;
        startX = Math.floor((playWidth / 2) / grid) * grid + margin;
        startY = Math.floor((playHeight / 2) / grid) * grid + margin;
    }

    function tampilkanAlert(title, message, mode) {
        gameDihentikan = true;
        if(gameLoopTimeout) clearTimeout(gameLoopTimeout);
        statusAlertMode = mode;
        document.getElementById("alert-title").innerText = title;
        document.getElementById("alert-msg").innerText = message;
        alertBtn.innerText = (mode === 'GAMEOVER') ? "MAIN LAGI" : "OK";
        alertBox.style.display = "block";
    }

    function setupEvents() {
        alertBtn.onclick = function(e) {
            if(e) e.stopPropagation();
            initAudio();
            alertBox.style.display = "none";

            if (statusAlertMode === 'PAUSE') {
                gameDihentikan = false;
                isPaused = false;
                main();
            } else {
                resetGame();
                gameDihentikan = false;
                isPaused = false;
                main();
            }
        };

        muteBtn.onclick = function(e) {
            if(e) e.stopPropagation();
            initAudio();
            isMuted = !isMuted;
            muteBtn.innerText = isMuted ? "🔇" : "🔊";
        };

        let touchStartX = 0, touchStartY = 0;

        gameArea.addEventListener('touchstart', function(e) {
            initAudio();
            if (e.target === alertBtn || e.target === muteBtn) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, {passive: true});

        gameArea.addEventListener('touchend', function(e) {
            if (e.target === alertBtn || e.target === muteBtn) return;
            if (e.changedTouches.length === 0) return;

            let dx = e.changedTouches[0].clientX - touchStartX;
            let dy = e.changedTouches[0].clientY - touchStartY;
            let jarak = Math.hypot(dx, dy);

            if (jarak < 12) {
                if (!gameDihentikan && !isPaused) {
                    isPaused = true;
                    tampilkanAlert("GAME PAUSED", "Permainan dijeda.\nTekan OK untuk melanjutkan.", "PAUSE");
                }
                return;
            }

            if (gameDihentikan || isPaused) return;

            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && arah !== 'KIRI') arah = 'KANAN';
                else if (dx < 0 && arah !== 'KANAN') arah = 'KIRI';
            } else {
                if (dy > 0 && arah !== 'ATAS') arah = 'BAWAH';
                else if (dy < 0 && arah !== 'BAWAH') arah = 'ATAS';
            }
        }, {passive: true});
    }

    function acakMakanan() {
        let kolomMax = Math.max(1, Math.floor(playWidth / grid));
        let barisMax = Math.max(1, Math.floor(playHeight / grid));
        makanan.x = Math.floor(Math.random() * kolomMax) * grid + margin;
        makanan.y = Math.floor(Math.random() * barisMax) * grid + margin;
    }

    function resetGame() {
        sesuaikanUkuran();
        ular = [];
        for(let i=0; i<5; i++) {
            ular.push({x: startX - (i * grid), y: startY});
        }
        arah = 'KANAN'; 
        totalSkorKumulatif = 0; 
        level = 1; 
        kecepatan = kecepatanAwal; 
        perbaruiInfo(); 
        acakMakanan();
    }

    function perbaruiInfo() {
        let targetLevel = level * 10;
        let formatSkor = totalSkorKumulatif < 10 ? "0" + totalSkorKumulatif : totalSkorKumulatif;
        let formatLvl = level < 10 ? "0" + level : level;
        
        document.getElementById("skor-txt").innerText = "FEED: " + formatSkor + "/" + targetLevel;
        document.getElementById("level-txt").innerText = "LVL: " + formatLvl;
    }

    function main() {
        if (gameDihentikan || isPaused) return;

        gameLoopTimeout = setTimeout(function() {
            if (gameDihentikan || isPaused) return;

            let kepalaBaru = {x: ular[0].x, y: ular[0].y};
            if (arah === 'ATAS') kepalaBaru.y -= grid;
            if (arah === 'BAWAH') kepalaBaru.y += grid;
            if (arah === 'KIRI') kepalaBaru.x -= grid;
            if (arah === 'KANAN') kepalaBaru.x += grid;

            if (kepalaBaru.x < margin) kepalaBaru.x = playWidth - grid + margin;
            else if (kepalaBaru.x >= playWidth + margin) kepalaBaru.x = margin;
            if (kepalaBaru.y < margin) kepalaBaru.y = playHeight - grid + margin;
            else if (kepalaBaru.y >= playHeight + margin) kepalaBaru.y = margin;

            // TABRAKAN DIRI
            if (ular.slice(1).some(s => s.x === kepalaBaru.x && s.y === kepalaBaru.y)) {
                playSound('gameover');
                tampilkanAlert("GAME OVER", "Skor Anda: " + totalSkorKumulatif + "\nHighScore Online: " + highScore, "GAMEOVER");
                return;
            }

            ular.unshift(kepalaBaru);

            let foodCX = makanan.x + grid / 2;
            let foodCY = makanan.y + grid / 2;
            let headCX = kepalaBaru.x + grid / 2;
            let headCY = kepalaBaru.y + grid / 2;

            let jarakEuclidean = Math.hypot(headCX - foodCX, headCY - foodCY);
            
            // --- DETEKSI TEPAT DEPAN KEPALA ---
            let mauMakan = false;
            let difX = makanan.x - kepalaBaru.x;
            let difY = makanan.y - kepalaBaru.y;

            if (arah === 'KANAN' && difY === 0 && difX > 0 && difX <= grid * 2.5) mauMakan = true;
            if (arah === 'KIRI' && difY === 0 && difX < 0 && Math.abs(difX) <= grid * 2.5) mauMakan = true;
            if (arah === 'BAWAH' && difX === 0 && difY > 0 && difY <= grid * 2.5) mauMakan = true;
            if (arah === 'ATAS' && difX === 0 && difY < 0 && Math.abs(difX) <= grid * 2.5) mauMakan = true;

            if (jarakEuclidean < grid * 0.85) {
                totalSkorKumulatif += 1;
                
                if (totalSkorKumulatif >= level * 10) {
                    level += 1;
                    kecepatan = Math.max(80, kecepatan - 25);
                    playSound('levelup');
                } else {
                    playSound('eat');
                }

                if (totalSkorKumulatif > highScore) {
                    highScore = totalSkorKumulatif;
                    if (window.saveHighScoreToFirebase) {
                        window.saveHighScoreToFirebase(highScore);
                    }
                    document.getElementById("hi-score-box").innerText = "HI: " + highScore;
                }

                perbaruiInfo();
                acakMakanan();
            } else {
                ular.pop();
            }

            // CLEAR CANVAS
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // BORDER GAME AREA
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(margin - 1, margin - 1, playWidth + 2, playHeight + 2);

            // MAKANAN APEL MERAH
            ctx.save();
            ctx.fillStyle = '#ff2244';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff0055';
            ctx.beginPath();
            ctx.arc(foodCX, foodCY, grid * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
            ctx.restore();

            // === RENDERING BADAN ULAR ===
            ctx.save();
            let totalSeg = ular.length;

            for (let i = 0; i < totalSeg - 1; i++) {
                let p1 = {x: ular[i].x + grid/2, y: ular[i].y + grid/2};
                let p2 = {x: ular[i+1].x + grid/2, y: ular[i+1].y + grid/2};

                if (Math.abs(p2.x - p1.x) > playWidth / 2 || Math.abs(p2.y - p1.y) > playHeight / 2) {
                    continue;
                }

                let w1 = (grid * 0.48) * Math.pow(1 - (i / totalSeg), 0.3);
                let w2 = (grid * 0.48) * Math.pow(1 - ((i + 1) / totalSeg), 0.3);
                w1 = Math.max(2, w1);
                w2 = Math.max(1.5, w2);

                let dx = p2.x - p1.x;
                let dy = p2.y - p1.y;
                let len = Math.hypot(dx, dy);
                if (len === 0) continue;

                let nx = -dy / len;
                let ny = dx / len;

                // Outline Hitam
                ctx.beginPath();
                ctx.moveTo(p1.x + nx * (w1 + 1), p1.y + ny * (w1 + 1));
                ctx.lineTo(p2.x + nx * (w2 + 1), p2.y + ny * (w2 + 1));
                ctx.lineTo(p2.x - nx * (w2 + 1), p2.y - ny * (w2 + 1));
                ctx.lineTo(p1.x - nx * (w1 + 1), p1.y - ny * (w1 + 1));
                ctx.closePath();
                ctx.fillStyle = '#000000';
                ctx.fill();

                // Isi Hijau
                ctx.beginPath();
                ctx.moveTo(p1.x + nx * w1, p1.y + ny * w1);
                ctx.lineTo(p2.x + nx * w2, p2.y + ny * w2);
                ctx.lineTo(p2.x - nx * w2, p2.y - ny * w2);
                ctx.lineTo(p1.x - nx * w1, p1.y - ny * w1);
                ctx.closePath();
                ctx.fillStyle = '#7ec850';
                ctx.fill();
            }

            // Sendi & Totol Hijau Tua
            for (let i = 1; i < totalSeg; i++) {
                let pt = {x: ular[i].x + grid/2, y: ular[i].y + grid/2};
                let r = (grid * 0.48) * Math.pow(1 - (i / totalSeg), 0.3);
                r = Math.max(1.5, r);

                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r + 1, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                ctx.fillStyle = '#7ec850';
                ctx.fill();

                if (i % 2 === 0 && r > 3) {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y - (r * 0.2), r * 0.35, 0, Math.PI * 2);
                    ctx.fillStyle = '#2e7d32';
                    ctx.fill();
                }
            }
            ctx.restore();

            // === RENDERING KEPALA ULAR ===
            ctx.save();
            ctx.translate(headCX, headCY);

            let angle = 0;
            if (arah === 'KANAN') angle = 0;
            else if (arah === 'BAWAH') angle = Math.PI / 2;
            else if (arah === 'KIRI') angle = Math.PI;
            else if (arah === 'ATAS') angle = -Math.PI / 2;

            ctx.rotate(angle);

            let headR = grid * 0.52;

            if (mauMakan) {
                let mouthAngle = 0.35 * Math.PI; 

                ctx.beginPath();
                ctx.arc(0, 0, headR + 1, mouthAngle, Math.PI * 2 - mouthAngle);
                ctx.lineTo(headR * 0.2, 0);
                ctx.closePath();
                ctx.fillStyle = '#000000';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, headR, mouthAngle, Math.PI * 2 - mouthAngle);
                ctx.lineTo(headR * 0.3, 0);
                ctx.closePath();
                ctx.fillStyle = '#7ec850';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, headR * 0.85, mouthAngle * 0.9, Math.PI * 2 - (mouthAngle * 0.9));
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fillStyle = '#e63946';
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(headR * 0.2, 0);
                ctx.lineTo(headR * 1.3, 0);
                ctx.lineTo(headR * 1.5, -headR * 0.25);
                ctx.moveTo(headR * 1.3, 0);
                ctx.lineTo(headR * 1.5, headR * 0.25);
                ctx.strokeStyle = '#ff0055';
                ctx.lineWidth = 1.2;
                ctx.stroke();

            } else {
                ctx.beginPath();
                ctx.arc(0, 0, headR + 1, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, headR, 0, Math.PI * 2);
                ctx.fillStyle = '#7ec850';
                ctx.fill();
            }

            let eyeOffsetY = headR * 0.42;
            let eyeOffsetX = headR * 0.22;
            let eyeR = headR * 0.32;
            let pupilR = eyeR * 0.5;

            ctx.beginPath();
            ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(eyeOffsetX + (mauMakan ? 1.5 : 0.5), -eyeOffsetY, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(eyeOffsetX + (mauMakan ? 1.5 : 0.5), eyeOffsetY, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();

            ctx.restore();

            main();
        }, kecepatan);
    }

    window.addEventListener('resize', function() {
        sesuaikanUkuran();
    });

    window.onload = init;
})();
          
