document.addEventListener('DOMContentLoaded', function() {
    const mainContainer = document.querySelector('.container');
    const isResearchPage = document.querySelector('.research-detail-page');

    /**
     * Animates the content of a section by making elements fade in.
     * @param {HTMLElement} section - The section element to animate.
     */
    function animateContent(section) {
        const itemsToAnimate = section.querySelectorAll('p, li, h4');
        itemsToAnimate.forEach((item, index) => {
            item.style.animation = 'none';
            void item.offsetWidth; // Trigger a reflow to restart the animation
            if(item.tagName === 'H4') {
                 item.style.animation = `glitch 1s linear forwards ${index * 0.05}s`;
            } else {
                item.style.animation = `fade-in-up 0.5s ease-out forwards ${index * 0.05}s`;
            }
        });
    }

    // --- GENERAL PAGE LOGIC for Research Pages ---
    // If this is a research detail page, show the content immediately.
    if (isResearchPage) {
        mainContainer.style.display = 'flex';
        document.body.classList.add('site-entered');
        mainContainer.style.opacity = '1';
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection) {
            // Use a small timeout to ensure styles are applied before animating
            setTimeout(() => animateContent(activeSection), 50);
        }
    }

    // --- BACKGROUND STARFIELD ANIMATION ---
    const mainStarfieldCanvas = document.getElementById('starfield');
    const fastParticlesCanvas = document.getElementById('fast-particles');
    
    if (mainStarfieldCanvas && fastParticlesCanvas) {
        const mainStarfieldCtx = mainStarfieldCanvas.getContext('2d');
        const fastParticlesCtx = fastParticlesCanvas.getContext('2d');

        function setupCanvas(canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        
        setupCanvas(mainStarfieldCanvas);
        setupCanvas(fastParticlesCanvas);

        window.addEventListener('resize', () => {
            setupCanvas(mainStarfieldCanvas);
            setupCanvas(fastParticlesCanvas);
        });

        const staticStars = Array.from({ length: 300 }, () => ({
            x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
            radius: Math.random() * 1.2, alpha: Math.random() * 0.7 + 0.3
        }));
        
        const fastParticles = Array.from({ length: 100 }, () => ({
            x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
            len: Math.random() * 20 + 10, speed: Math.random() * 5 + 2
        }));

        let mousePos = {x: 0, y: 0};
        window.addEventListener('mousemove', (e) => {
            mousePos.x = e.clientX;
            mousePos.y = e.clientY;
        });

        function animateStarfields() {
            // Animate the starfield as long as the site has been "entered"
            if (document.body.classList.contains('site-entered')) {
                mainStarfieldCtx.clearRect(0, 0, mainStarfieldCanvas.width, mainStarfieldCanvas.height);
                const offsetX = (mousePos.x - mainStarfieldCanvas.width / 2) / 40;
                const offsetY = (mousePos.y - mainStarfieldCanvas.height / 2) / 40;
                staticStars.forEach(star => {
                    const starX = star.x + offsetX;
                    const starY = star.y + offsetY;
                    mainStarfieldCtx.beginPath();
                    mainStarfieldCtx.arc(starX, starY, star.radius, 0, Math.PI * 2);
                    mainStarfieldCtx.fillStyle = `rgba(224, 224, 224, ${star.alpha})`;
                    mainStarfieldCtx.fill();
                });

                fastParticlesCtx.clearRect(0, 0, fastParticlesCanvas.width, fastParticlesCanvas.height);
                fastParticlesCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                fastParticles.forEach(p => {
                    p.x -= p.speed;
                    if(p.x < 0) { p.x = fastParticlesCanvas.width; p.y = Math.random() * fastParticlesCanvas.height; }
                    fastParticlesCtx.beginPath();
                    fastParticlesCtx.moveTo(p.x, p.y);
                    fastParticlesCtx.lineTo(p.x + p.len, p.y);
                    fastParticlesCtx.stroke();
                });
            }
            requestAnimationFrame(animateStarfields);
        }
        animateStarfields();
    }
});
