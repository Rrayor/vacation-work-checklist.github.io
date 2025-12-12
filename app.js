document.addEventListener('DOMContentLoaded', () => {
    // State
    let items = [
        { id: 1, text: "Leave detailed status reports on all in-progress tickets", completed: false },
        { id: 2, text: "Notify relevant stakeholders about your absence", completed: false },
        { id: 3, text: "Set out-of-office messages in email and chat apps", completed: false },
        { id: 4, text: "Run system updates on your machine", completed: false },
        { id: 5, text: "Take a moment to reflect on your accomplishments this year", completed: false }
    ];

    // DOM Elements
    const checklistEl = document.getElementById('checklist');
    const newItemInput = document.getElementById('newItemInput');
    const addItemBtn = document.getElementById('addItemBtn');
    const fileInput = document.getElementById('fileInput');
    const snowCanvas = document.getElementById('snowCanvas');
    const endGameOverlay = document.getElementById('endGameOverlay');

    // Audio Context (initialized on first interaction)
    let audioCtx;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // --- Core List Logic ---

    function render(animate = false) {
        checklistEl.innerHTML = '';
        items.forEach((item, index) => {
            const li = createItemElement(item);
            if (animate) {
                li.style.animation = `fadeIn 0.5s ease forwards ${index * 0.1}s`;
                li.style.opacity = '0'; // Start hidden for animation
            }
            checklistEl.appendChild(li);
        });

        checkAllComplete();
    }

    function createItemElement(item) {
        const li = document.createElement('li');
        li.className = `checklist-item ${item.completed ? 'completed' : ''}`;
        li.dataset.id = item.id;

        // Graphite Pencil Path
        const pathD = `M 0 15 Q 75 ${5 + Math.random() * 20}, 150 15 T 300 ${10 + Math.random() * 10}`;

        li.innerHTML = `
            <div class="custom-checkbox">
                <span class="tick">✓</span>
            </div>
            <div class="checklist-item-text">
                ${item.text}
                <svg class="strikethrough-svg" viewBox="0 0 300 30" preserveAspectRatio="none">
                    <path class="strikethrough-path" d="${pathD}" />
                </svg>
            </div>
            <button class="delete-btn" aria-label="Delete item">×</button>
        `;

        li.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                deleteItem(item.id, li);
            } else {
                toggleComplete(item.id);
            }
        });

        return li;
    }

    function addItem(text) {
        if (!text.trim()) return;
        const newItem = {
            id: Date.now(),
            text: text.trim(),
            completed: false
        };
        items.push(newItem);

        const li = createItemElement(newItem);
        li.style.animation = 'fadeIn 0.5s ease forwards';
        checklistEl.appendChild(li);
        newItemInput.value = '';
        checkAllComplete();
    }

    function deleteItem(id, element) {
        if (element) {
            element.classList.add('fade-out');
            setTimeout(() => {
                items = items.filter(item => item.id !== id);
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                checkAllComplete();
            }, 400);
        } else {
            items = items.filter(item => item.id !== id);
            render();
        }
    }

    function toggleComplete(id) {
        initAudio();
        const item = items.find(i => i.id === id);
        if (item) {
            item.completed = !item.completed;
            const el = document.querySelector(`li[data-id='${id}']`);
            if (el) {
                el.classList.toggle('completed');
                if (item.completed) playPencilSound();
            }
            checkAllComplete();
        }
    }

    function checkAllComplete() {
        if (items.length > 0 && items.every(i => i.completed)) {
            triggerEndGame();
        }
    }

    // --- Input Handling ---

    addItemBtn.addEventListener('click', () => addItem(newItemInput.value));

    newItemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem(newItemInput.value);
    });

    // --- File Loading ---

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length > 0) {
                // Fade out existing list
                const existingItems = Array.from(checklistEl.children);
                if (existingItems.length > 0) {
                    existingItems.forEach((el, i) => {
                        el.style.transition = 'opacity 0.2s';
                        el.style.opacity = '0';
                    });

                    setTimeout(() => {
                        populateList(lines);
                    }, 300);
                } else {
                    populateList(lines);
                }
            } else {
                alert('File is empty or invalid.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    function populateList(lines) {
        items = lines.map((line, index) => ({
            id: Date.now() + index,
            text: line,
            completed: false
        }));
        render(true);
        // Custom notification instead of alert? For now alert is functional but could be better.
        // alert(`Loaded ${items.length} items!`); 
        console.log(`Loaded ${items.length} items`);
    }

    // --- Audio (Improved Synthesis) ---
    function createNoiseBuffer() {
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    let noiseBuffer = null;

    function playPencilSound() {
        if (!audioCtx) return;
        if (!noiseBuffer) noiseBuffer = createNoiseBuffer();

        const t = audioCtx.currentTime;
        const duration = 0.35;

        // Source
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;

        // Darker scratch filter
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);

        // Amplitude Envelope
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.6, t + 0.05);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        noise.start(t);
        noise.stop(t + duration + 0.1);
    }

    function playChime() {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;

        // "Sleigh Bell" / "Handbell" Sound
        // Bells have inharmonic partials. 
        // We'll stack a few sine waves with specific ratios to sound like a metal bell.

        // Fundamental frequencies for a C Major Chord
        const roots = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        roots.forEach((f, i) => {
            // For each note, create a bell tone
            // Partials: 1.0, 2.0, 3.0, 4.2, 5.4 (Approximation of bell-like overtones)
            const partials = [1, 2, 3, 4.2];

            partials.forEach((p, pIndex) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.value = f * p;

                // Stagger start slightly for "jingle" effect (not a perfect chord)
                // Randomize slightly between 0 and 50ms
                const start = t + (Math.random() * 0.05);

                // Decay depends on pitch (higher decays faster)
                const decay = 2.0 / (pIndex + 1);

                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(0.15 / (pIndex + 1), start + 0.02); // Attack
                gain.gain.exponentialRampToValueAtTime(0.001, start + decay);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(start);
                osc.stop(start + decay + 0.1);
            });
        });
    }

    // --- Modal Logic ---
    const infoBtn = document.getElementById('infoBtn');
    const helpModal = document.getElementById('helpModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (infoBtn && helpModal) {
        infoBtn.addEventListener('click', () => {
            helpModal.classList.remove('hidden');
            // Timeout to allow display:block to apply before opacity transition
            setTimeout(() => helpModal.classList.add('visible'), 10);
        });

        const close = () => {
            helpModal.classList.remove('visible');
            setTimeout(() => helpModal.classList.add('hidden'), 300);
        };

        closeModalBtn.addEventListener('click', close);
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) close();
        });
    }

    // --- Fluffy Snow ---

    function initSnow() {
        const ctx = snowCanvas.getContext('2d');
        let width = snowCanvas.width = window.innerWidth;
        let height = snowCanvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = snowCanvas.width = window.innerWidth;
            height = snowCanvas.height = window.innerHeight;
        });

        const particles = [];
        for (let i = 0; i < 200; i++) { // More snow
            particles.push(createSnowFlake(width, height));
        }

        function createSnowFlake(w, h, startTop = false) {
            return {
                x: Math.random() * w,
                y: startTop ? -10 : Math.random() * h,
                r: Math.random() * 4 + 2, // Larger, fluffier
                d: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.3,
                sway: Math.random() * 0.05 - 0.025,
                swayParam: Math.random() * Math.PI * 2
            };
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                ctx.beginPath();
                // Fluffy gradient
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                grad.addColorStop(0, `rgba(255, 255, 255, ${p.opacity})`);
                grad.addColorStop(1, "rgba(255, 255, 255, 0)");

                ctx.fillStyle = grad;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
                ctx.fill();
            }
            update();
            requestAnimationFrame(draw);
        }

        function update() {
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.y += p.d;
                p.swayParam += 0.02;
                p.x += Math.sin(p.swayParam) * 0.8;

                if (p.y > height) {
                    Object.assign(p, createSnowFlake(width, height, true));
                }
                if (p.x > width) p.x = 0;
                if (p.x < 0) p.x = width;
            }
        }

        draw();
    }

    // --- End Game Sparkles ---

    function createSparkles() {
        const treeContainer = document.querySelector('.tree-container');
        const sparklesContainer = document.querySelector('.sparkles');

        // Clear previous
        sparklesContainer.innerHTML = '';

        for (let i = 0; i < 40; i++) {
            const sparkle = document.createElement('div');
            sparkle.classList.add('sparkle');

            // Random position around the center/tree area
            // Assuming tree is roughly centered, spread -125px to 125px
            const x = (Math.random() - 0.5) * 250;
            const y = (Math.random() - 0.5) * 250;

            sparkle.style.left = `calc(50% + ${x}px)`;
            sparkle.style.top = `calc(50% + ${y}px)`;
            sparkle.style.animationDelay = `${Math.random() * 2}s`;

            sparklesContainer.appendChild(sparkle);
        }
    }

    // --- End Game Logic ---

    function triggerEndGame() {
        endGameOverlay.classList.remove('hidden');
        void endGameOverlay.offsetWidth; // Reflow
        endGameOverlay.classList.add('visible');

        // Animate Tree
        const tree = document.querySelector('.tree');
        tree.classList.remove('pulse'); // Reset if re-triggered
        tree.classList.remove('animate');
        void tree.offsetWidth; // Reflow
        tree.classList.add('animate');

        // Add pulse after drop
        setTimeout(() => {
            tree.classList.add('pulse');
        }, 1200);

        // Spawn Gifts after tree lands
        const giftsContainer = document.querySelector('.gifts-container');
        giftsContainer.innerHTML = '';

        const gifts = ['🎁', '🧸', '🚲', '🎮', '🥁'];
        // Position them in a semi-circle/pile at bottom
        const positions = [-80, -40, 0, 40, 80];

        setTimeout(() => {
            playChime();
            createSparkles();

            gifts.forEach((emoji, i) => {
                setTimeout(() => {
                    const gift = document.createElement('div');
                    gift.className = 'gift';
                    gift.textContent = emoji;
                    // Randomize slightly for pile effect
                    const rot = (Math.random() * 20) - 10;
                    gift.style.transform = `rotate(${rot}deg) scale(0)`; // Initial state
                    gift.style.left = `calc(50% + ${positions[i]}px)`;

                    // We need a class that applies the bounce animation
                    gift.classList.add('pop');
                    giftsContainer.appendChild(gift);
                }, i * 300); // 300ms staggering
            });

        }, 800); // Wait for tree drop
    }

    // --- Start Over Logic ---
    const startOverBtn = document.getElementById('startOverBtn');
    if (startOverBtn) {
        startOverBtn.addEventListener('click', resetGame);
    }

    function resetGame() {
        // Reset Logic
        items = [];
        render(); // This clears the list

        // Hide Overlay
        endGameOverlay.classList.remove('visible');
        setTimeout(() => endGameOverlay.classList.add('hidden'), 500); // Wait for fade

        // Reset Animations
        const tree = document.querySelector('.tree');
        tree.classList.remove('animate', 'pulse');

        document.querySelector('.gifts-container').innerHTML = '';
        document.querySelector('.sparkles').innerHTML = '';
    }


    // Initialize
    render();
    initSnow();
});
