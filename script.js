
// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// --- STATE MANAGEMENT ---
const state = {
    currentStage: 'game',
    snake: { score: 0, winScore: 10, gridSize: 15 }, // gridSize is constant
    quiz: { index: 0 },
    code: { solution: "hamsterilikeyou" }
};

// --- NAVIGATION TRANSITIONS (GSAP) ---
function goToStage(stageId) {
    const current = document.querySelector('.stage.active');
    const next = document.getElementById(`stage-${stageId}`);

    // Disable interactions during transition
    if (current) current.style.pointerEvents = 'none';
    // Ensure the next stage is visible before animation starts
    if (next) next.style.visibility = 'visible';

    const tl = gsap.timeline({
        onComplete: () => {
            if (current) {
                current.classList.remove('active');
                current.style.pointerEvents = 'all';
            }
            if (next) {
                next.classList.add('active');
                // Important: Reset x/y translation after animation completion
                gsap.set(next, { x: 0, y: 0 });
            }

            // Initialize specific stage logic
            if (stageId === 'quiz') initQuiz();
            if (stageId === 'cert') animateCertEntry();
            if (stageId === 'choice') initChoiceStage(); // NEW
        }
    });

    // Animation: Slide out current left, Slide in next from right
    if (current) {
        tl.to(current, {
            x: -100,
            opacity: 0,
            duration: 0.5,
            ease: "power2.in",
            scale: 0.9
        });
    }

    // Using fromTo ensures the target state is correctly reached even if frames are dropped
    tl.fromTo(next,
        { x: 100, opacity: 0, scale: 1.1 },
        { x: 0, opacity: 1, duration: 0.6, ease: "back.out(1.2)", scale: 1 }
    );
}

// --- UTILS ---
function showChuss() {
    const popup = document.getElementById('chussPopup');
    const tl = gsap.timeline();

    tl.set(popup, { scale: 0, opacity: 1 })
        .to(popup, { scale: 1.2, duration: 0.2, ease: "back.out(1.7)" })
        .to(popup, { scale: 1, duration: 0.1 })
        .to(popup, { scale: 0, opacity: 0, duration: 0.3, delay: 0.8, ease: "power2.in" });
}

function createSparks() {
    const container = document.body;
    const rect = document.getElementById('certCard').getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 40; i++) {
        const spark = document.createElement('div');
        spark.className = 'spark';
        container.appendChild(spark);

        // Random angle
        const angle = Math.random() * Math.PI * 2;
        const velocity = 100 + Math.random() * 200;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        gsap.fromTo(spark,
            { x: centerX, y: centerY, scale: 1, opacity: 1 },
            {
                x: centerX + tx,
                y: centerY + ty,
                opacity: 0,
                scale: 0,
                duration: 1 + Math.random(),
                ease: "power4.out",
                onComplete: () => spark.remove()
            }
        );
    }
}

// --- STAGE 1: SNAKE GAME (Responsive Update) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = state.snake.gridSize; // 15
let snake = [{ x: 7, y: 7 }]; // Start in center
let food = { x: 10, y: 10 };
let dx = 0, dy = 0;
let gameInterval;
let blockSize = 20; // Will be calculated dynamically
// Unified function to set snake direction
function setDirection(newDx, newDy) {
    // Prevent 180 degree turns
    if (newDx === -dx && newDy === -dy) return;

    // Apply new direction
    dx = newDx;
    dy = newDy;
}
function resizeGameCanvas() {
    const container = document.getElementById('gameCanvasContainer');
    const size = container.offsetWidth;

    canvas.width = size;
    canvas.height = size;
    blockSize = size / gridSize;

    // Redraw immediately after resize
    drawGame();
}

function initGame() {
    snake = [{ x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) }];
    dx = 0; dy = 0;
    state.snake.score = 0;
    document.getElementById('scoreVal').innerText = 0;
    placeFood();

    resizeGameCanvas();
    window.addEventListener('resize', resizeGameCanvas);

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(drawGame, 100);

    // Inputs
    document.removeEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleKeydown);

    // Swipe support
    let tX, tY;
    canvas.addEventListener('touchstart', e => { tX = e.touches[0].clientX; tY = e.touches[0].clientY; e.preventDefault(); });
    canvas.addEventListener('touchmove', e => {
        if (!tX || !tY) return;
        let dX = tX - e.touches[0].clientX;
        let dY = tY - e.touches[0].clientY;

        // Determine direction based on largest movement
        if (Math.abs(dX) > Math.abs(dY)) {
            if (dX > 10 && dx !== 1) { dx = -1; dy = 0; } // Swiping left
            else if (dX < -10 && dx !== -1) { dx = 1; dy = 0; } // Swiping right
        } else {
            if (dY > 10 && dy !== 1) { dx = 0; dy = -1; } // Swiping up
            else if (dY < -10 && dy !== -1) { dx = 0; dy = 1; } // Swiping down
        }

        // Reset touch start points to prevent single touch registering multiple moves
        tX = null; tY = null;
        e.preventDefault();
    });
}

function handleKeydown(e) {
    if ([37, 38, 39, 40].includes(e.keyCode)) e.preventDefault();
    if (e.keyCode === 37 && dx !== 1) { dx = -1; dy = 0; }
    if (e.keyCode === 38 && dy !== 1) { dx = 0; dy = -1; }
    if (e.keyCode === 39 && dx !== -1) { dx = 1; dy = 0; }
    if (e.keyCode === 40 && dy !== -1) { dx = 0; dy = 1; }
}

function drawGame() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    // Walls wrap
    if (head.x < 0) head.x = gridSize - 1; if (head.x >= gridSize) head.x = 0;
    if (head.y < 0) head.y = gridSize - 1; if (head.y >= gridSize) head.y = 0;

    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            // Reset snake state upon collision
            snake = [{ x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) }];
            state.snake.score = Math.max(0, state.snake.score - 2);
            document.getElementById('scoreVal').innerText = state.snake.score;
            dx = 0; dy = 0; // Stop movement
            showChuss();
            return;
        }
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        state.snake.score++;
        document.getElementById('scoreVal').innerText = state.snake.score;
        if (state.snake.score >= 10) {
            clearInterval(gameInterval);
            window.removeEventListener('resize', resizeGameCanvas);
            goToStage('quiz');
        }
        placeFood();
    } else {
        snake.pop();
    }

    // Render
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines (subtle)
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += blockSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Snake
    ctx.fillStyle = '#ff4d6d';
    const padding = 1; // Small padding for rounded rect effect
    const cell = blockSize - 2 * padding;
    const radius = 4;

    snake.forEach(p => {
        const x = p.x * blockSize + padding;
        const y = p.y * blockSize + padding;
        ctx.beginPath();
        // Ensure roundedRect is supported or use rect with arc
        if (ctx.roundRect) {
            ctx.roundRect(x, y, cell, cell, radius);
        } else {
            ctx.rect(x, y, cell, cell);
        }
        ctx.fill();
    });

    // Food
    ctx.font = `${Math.floor(blockSize * 0.8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❤️', food.x * blockSize + blockSize / 2, food.y * blockSize + blockSize / 2);
}

function placeFood() {
    food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    // Check if food is placed on snake
    for (const segment of snake) {
        if (food.x === segment.x && food.y === segment.y) {
            placeFood(); // Recurse until safe spot is found
            return;
        }
    }
}

// --- STAGE 2: QUIZ ---
const quizData = [
    { q: "What does 'void' mean in main?", a: ["Returns Integer", "Returns Nothing", "Avoids Errors"], c: 1, exp: "Correct! Void methods return nada!" },
    { q: "What does % do?", a: ["Percentage", "Divide", "Remainder"], c: 2, exp: "Yep! It's the Modulo operator." },
    { q: "What is a Class?", a: ["Blueprint for Objects", "Variable", "Function"], c: 0, exp: "Exactly! Like a recipe for cookies." }
];

function initQuiz() {
    renderQuestion();
}

function renderQuestion() {
    const d = quizData[state.quiz.index];
    document.getElementById('qText').innerText = d.q;
    document.getElementById('qExplain').classList.add('hidden');
    document.getElementById('nextQBtn').classList.add('hidden');
    const opts = document.getElementById('qOptions');
    opts.innerHTML = '';

    d.a.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-white border border-gray-200 hover:bg-gray-50 p-4 rounded-xl shadow-sm transition flex items-center justify-between group opacity-0 transform translate-y-4";
        btn.innerHTML = `<span class="font-bold text-gray-700 group-hover:text-primary transition">${opt}</span>`;
        btn.onclick = () => checkQuiz(btn, i, d.c, d.exp);
        opts.appendChild(btn);
    });

    gsap.to("#qOptions button", { y: 0, opacity: 1, stagger: 0.1, duration: 0.4, ease: "power2.out" });
}

function checkQuiz(btn, idx, correct, exp) {
    const all = document.querySelectorAll('#qOptions button');
    all.forEach(b => b.disabled = true);

    const explain = document.getElementById('qExplain');
    explain.innerText = idx === correct ? exp : "Not quite! " + exp;
    explain.classList.remove('hidden');
    gsap.from(explain, { height: 0, opacity: 0, duration: 0.3 });

    if (idx === correct) {
        btn.classList.remove('bg-white', 'border-gray-200');
        btn.classList.add('bg-green-100', 'border-green-300', 'text-green-800');
        btn.innerHTML += ` ✅`;
    } else {
        btn.classList.remove('bg-white', 'border-gray-200');
        btn.classList.add('bg-red-100', 'border-red-300', 'text-red-800');
        btn.innerHTML += ` ❌`;
        all[correct].classList.add('bg-green-50', 'border-green-200'); // Highlight correct
        showChuss();
    }

    const nextBtn = document.getElementById('nextQBtn');
    nextBtn.classList.remove('hidden');

    gsap.fromTo(nextBtn, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, delay: 0.2, ease: "back.out(1.7)" });
}

function nextQuestion() {
    state.quiz.index++;
    if (state.quiz.index < quizData.length) {
        renderQuestion();
    } else {
        goToStage('code');
    }
}

// --- STAGE 3: CODE ---
function checkJavaCode() {
    const val = document.getElementById('userCode').value;
    const clean = val.toLowerCase().replace(/\s/g, '').replace(/;/g, '').replace(/"/g, '').replace(/'/g, ''); // Be forgiving on quotes and semicolon
    const err = document.getElementById('codeError');
    const txt = document.getElementById('errorText');

    // Basic check for print statement
    if (!val.toLowerCase().includes('system.out.print')) {
        txt.innerText = "Missing System.out.println or System.out.print statement!";
        err.classList.remove('hidden');
        showChuss();
        return;
    }

    // Check for correct output string
    if (clean.includes(state.code.solution)) {
        err.classList.add('hidden');
        // Success -> Go to the new choice stage
        goToStage('choice');
    } else {
        txt.innerText = "Print exactly: Hamster I Like You";
        err.classList.remove('hidden');
        showChuss();
    }
}

// --- STAGE 4: CHOICE (NEW) ---
function initChoiceStage() {
    // No specific initialization needed beyond goToStage
}

function moveNoButton() {
    const noBtn = document.getElementById('noBtn');
    const container = document.getElementById('choiceContainer');

    // Get current positions (relative to the container)
    // Note: container must have 'position: relative' which it does via .stage
    const containerRect = container.getBoundingClientRect();

    // Define bounds for random movement (keeping padding)
    // Use 15px padding for mobile safety
    const padding = 15;
    const maxW = containerRect.width - noBtn.offsetWidth - 2 * padding;
    const maxH = containerRect.height - noBtn.offsetHeight - 2 * padding;

    // Generate new coordinates relative to the parent container's content area
    const newX = padding + Math.random() * maxW;
    const newY = padding + Math.random() * maxH;

    // Ensure the button is absolutely positioned
    noBtn.style.position = 'absolute';

    // GSAP to smoothly move the button to a new random position
    gsap.to(noBtn, {
        // We use 'left' and 'top' to position relative to the container
        left: newX,
        top: newY,
        x: 0, // Reset any existing transform x/y translations from initial centering
        y: 0,
        duration: 0.3,
        ease: "power2.out",
        scale: 1.1,
        rotation: Math.random() * 10 - 5,
        onComplete: () => {
            gsap.to(noBtn, { scale: 1, rotation: 0, duration: 0.2 });
        }
    });

    showChuss(); // Show chuss when user tries to click No
}

function handleLoveChoice(isLove) {
    if (isLove) {
        // User clicked YES
        const container = document.getElementById('choiceContainer');
        container.innerHTML = `
                    <div class="text-center">
                        <div class="text-6xl mb-4 animate-ping text-primary">💖</div>
                        <h2 class="font-script text-3xl sm:text-4xl text-primary mb-3">I LOve You Too! :)</h2>
                        <p class="text-gray-600">This is the correct answer! Get ready for your certificate!</p>
                    </div>
                `;
        // Proceed to the next stage (Certificate - now stage 5)
        setTimeout(() => goToStage('cert'), 1500);
    } else {
        // User moused over NO (or tried to click). Use mouseover to trigger movement.
        moveNoButton();
    }
}

// --- STAGE 5: CERTIFICATE (WAS 4) ---
function animateCertEntry() {
    const card = document.getElementById('certCard');
    gsap.to(card, { opacity: 1, duration: 0.5 });
    gsap.fromTo(card,
        { rotationY: -90, scale: 0.8 },
        { rotationY: 0, scale: 1, duration: 1.2, ease: "elastic.out(1, 0.75)" }
    );
    setTimeout(createSparks, 600);
}

// --- STAGE 6: LOADING (WAS 5) ---
function startLoadingSequence() {
    goToStage('loading');
    const bar = document.getElementById('progressBar');
    gsap.to(bar, { width: "100%", duration: 3, ease: "power1.inOut", onComplete: () => goToStage('envelope') });
}

// --- STAGE 7 & 8: ENVELOPE & LETTER (WAS 6 & 7) ---
function openEnvelope() {
    const flap = document.getElementById('flap');
    const preview = document.getElementById('letterPreview');

    // Animate Flap Open
    gsap.to(flap, { rotateX: 180, zIndex: 1, duration: 0.6 });

    // Animate Paper Sliding Out
    gsap.to(preview, { y: -100, zIndex: 5, duration: 0.8, delay: 0.4 });

    // Expand to full screen
    setTimeout(() => {
        const envSection = document.getElementById('stage-envelope');
        const letterSection = document.getElementById('stage-letter');

        // Fade out envelope
        gsap.to(envSection, { opacity: 0, duration: 0.5 });

        // Show Letter (Scrollable overlay)
        letterSection.classList.remove('hidden');
        gsap.to(letterSection, { opacity: 1, duration: 1 });

        initParallaxHearts();
    }, 1200);
}

function initParallaxHearts() {
    const container = document.getElementById('parallaxContainer');

    // Create hearts
    for (let i = 0; i < 20; i++) {
        const h = document.createElement('div');
        h.innerHTML = '❤️';
        h.className = 'parallax-heart text-lg sm:text-2xl absolute';
        h.style.left = Math.random() * 100 + '%';
        h.style.top = Math.random() * 100 + '%';
        h.style.fontSize = (Math.random() * 20 + 10) + 'px';
        h.style.opacity = Math.random() * 0.5 + 0.2;
        container.appendChild(h);

        // GSAP ScrollTrigger Parallax
        gsap.to(h, {
            y: (Math.random() - 0.5) * 400, // Move up or down differently
            scrollTrigger: {
                trigger: "#stage-letter",
                start: "top top",
                end: "bottom top",
                scrub: 1
            }
        });
    }
}

// --- GEMINI API ---

// zaSyBUDsbMhtQVJHS5llCW0Q-dUUXTIrqxxLw
const apiKey = "c0185dde1ee0c56aaefe90a25097e67b";
async function callGemini(prompt) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    try {
        const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Love Error!";
    } catch (e) { return "Server busy loving you!"; }
}

async function generatePoem(btn) {
    const out = document.getElementById('aiOutput');
    btn.disabled = true; btn.innerText = "Writing...";
    const text = await callGemini("Write a 4 line rhyming love poem about a girl learning Java in a cheerful, sweet tone.");
    out.innerText = text;
    out.classList.remove('hidden');
    btn.disabled = false; btn.innerText = "✨ Magic Poem";
}

async function generateReason(btn) {
    const out = document.getElementById('aiOutput');
    btn.disabled = true; btn.innerText = "Thinking...";
    const text = await callGemini("Write one short, heartfelt sentence about why I love my coder girlfriend. Focus on her intelligence and kindness.");
    out.innerText = text;
    out.classList.remove('hidden');
    btn.disabled = false; btn.innerText = "✨ Why Special?";
}
async function generateLove(btn) {
    const out = document.getElementById('aiOutput');
    btn.disabled = true; btn.innerText = "Thinking...";
    const text = await callGemini("Write one short,Start with 'I Love You Because' and write heartfelt sentence about why I love my future wife. Focus on her cuteness, how she cares for me, supports me through every problem, and embraces all my childish, silly, and playful moments.");
    out.innerText = text;
    out.classList.remove('hidden');
    btn.disabled = false; btn.innerText = "🎀  Need Some Love?";
}
async function generateUpset(btn) {
    const out = document.getElementById('aiOutput');
    btn.disabled = true; btn.innerText = "Thinking...";
    const text = await callGemini("Write a short, loving sentence to remind my girlfriend how proud I am of her dedication and brilliance today. A sweet, motivating sentence for my girlfriend that celebrates her hard work and amazing heart.");
    out.innerText = text;
    out.classList.remove('hidden');
    btn.disabled = false; btn.innerText = "😭 Feeling Sad?";
}

// Start

initGame();

