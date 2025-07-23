// --- DragControls for Three.js ---
// This is a custom utility for the cover page animation.
const DragControls = function (_objects, _camera, _domElement) {
    const _plane = new THREE.Plane();
    const _raycaster = new THREE.Raycaster();
    const _mouse = new THREE.Vector2();
    const _offset = new THREE.Vector3();
    const _intersection = new THREE.Vector3();
    const _worldPosition = new THREE.Vector3();
    let _intersections = [];
    let _selected = null, _hovered = null;

    const scope = this;
    function activate() {
        _domElement.addEventListener('mousemove', onDocumentMouseMove, false);
        _domElement.addEventListener('mousedown', onDocumentMouseDown, false);
        _domElement.addEventListener('mouseup', onDocumentMouseUp, false);
    }
    function deactivate() {
        _domElement.removeEventListener('mousemove', onDocumentMouseMove, false);
        _domElement.removeEventListener('mousedown', onDocumentMouseDown, false);
        _domElement.removeEventListener('mouseup', onDocumentMouseUp, false);
    }
    function dispose() { deactivate(); }

    function onDocumentMouseMove(event) {
        event.preventDefault();
        const rect = _domElement.getBoundingClientRect();
        _mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        _mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        _raycaster.setFromCamera(_mouse, _camera);

        if (_selected) {
            if (_raycaster.ray.intersectPlane(_plane, _intersection)) {
                _selected.position.copy(_intersection.sub(_offset));
            }
            scope.dispatchEvent({ type: 'drag', object: _selected });
            return;
        }
        _intersections.length = 0;
        _raycaster.intersectObjects(_objects, true, _intersections);
        if (_intersections.length > 0) {
            const object = _intersections[0].object;
            _plane.setFromNormalAndCoplanarPoint(_camera.getWorldDirection(_plane.normal), _worldPosition.setFromMatrixPosition(object.matrixWorld));
            if (_hovered !== object) {
                scope.dispatchEvent({ type: 'hoveron', object: object });
                _domElement.style.cursor = 'pointer';
                _hovered = object;
            }
        } else {
            if (_hovered !== null) {
                scope.dispatchEvent({ type: 'hoveroff', object: _hovered });
                _domElement.style.cursor = 'grab';
                _hovered = null;
            }
        }
    }

    function onDocumentMouseDown(event) {
        event.preventDefault();
        _raycaster.setFromCamera(_mouse, _camera);
        _intersections.length = 0;
        _raycaster.intersectObjects(_objects, true, _intersections);
        if (_intersections.length > 0) {
            _selected = _intersections[0].object;
            if (_raycaster.ray.intersectPlane(_plane, _intersection)) {
                 _offset.copy(_intersection).sub(_worldPosition.setFromMatrixPosition(_selected.matrixWorld));
            }
            _domElement.style.cursor = 'grabbing';
            scope.dispatchEvent({ type: 'dragstart', object: _selected });
        }
    }

    function onDocumentMouseUp(event) {
        event.preventDefault();
        if (_selected) {
            scope.dispatchEvent({ type: 'dragend', object: _selected });
            _selected = null;
        }
        _domElement.style.cursor = 'grab';
    }
    activate();
    this.enabled = true;
    this.activate = activate;
    this.deactivate = deactivate;
    this.dispose = dispose;
};
DragControls.prototype = Object.create(THREE.EventDispatcher.prototype);
DragControls.prototype.constructor = DragControls;


document.addEventListener('DOMContentLoaded', function() {
    const mainContainer = document.querySelector('.container');
    const coverPage = document.getElementById('cover-page');
    const enterButton = document.getElementById('enter-button');
    
    let coverAnimationId;
    let stars; // Make stars accessible for the transition

    // --- 3D COVER PAGE ANIMATION ---
    if (coverPage) {
        function initCoverAnimation() {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
            const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('cover-canvas'), alpha: true, antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            
            const allPlanets = [];
            
            const starGeometry = new THREE.BufferGeometry();
            const starVertices = [];
            for (let i = 0; i < 20000; i++) {
                const x = (Math.random() - 0.5) * 3000;
                const y = (Math.random() - 0.5) * 3000;
                const z = (Math.random() - 0.5) * 3000;
                starVertices.push(x, y, z);
            }
            starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
            const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.9 });
            stars = new THREE.Points(starGeometry, starMaterial);
            scene.add(stars);

            function createSystem(config) {
                const systemGroup = new THREE.Group();
                systemGroup.position.copy(config.position);
                scene.add(systemGroup);

                const centralBody = config.createCentralBody();
                systemGroup.add(centralBody);
                
                for (let i = 0; i < config.numPlanets; i++) {
                    const planetGeometry = new THREE.SphereGeometry(Math.random() * 5 + 8, 32, 32);
                    const planetMaterial = new THREE.MeshBasicMaterial({ color: config.planetColors[i % config.planetColors.length] });
                    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
                    
                    planet.userData = {
                        parentSystem: systemGroup,
                        orbitRadius: (i + 1.5) * 40 + 20,
                        speed: (Math.random() * 0.005 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
                        angle: Math.random() * Math.PI * 2,
                        isDragging: false
                    };
                    
                    planet.position.x = Math.cos(planet.userData.angle) * planet.userData.orbitRadius;
                    planet.position.z = Math.sin(planet.userData.angle) * planet.userData.orbitRadius;
                    
                    allPlanets.push(planet);
                    systemGroup.add(planet);
                }
                return { group: systemGroup, centralBody: centralBody, animateCentralBody: config.animateCentralBody };
            }

            const systems = [
                {
                    position: new THREE.Vector3(350, -150, -250),
                    numPlanets: 3,
                    planetColors: [0x66ccff, 0x66ff66, 0xff6666],
                    createCentralBody: () => {
                        const binaryGroup = new THREE.Group();
                        const star1 = new THREE.Mesh(new THREE.SphereGeometry(15, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff8844, wireframe: true }));
                        const star2 = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), new THREE.MeshBasicMaterial({ color: 0x4488ff, wireframe: true }));
                        binaryGroup.add(star1, star2);
                        binaryGroup.userData.star1 = star1;
                        binaryGroup.userData.star2 = star2;
                        return binaryGroup;
                    },
                    animateCentralBody: (body, time) => { 
                        body.userData.star1.position.x = Math.cos(time * 0.5) * 30;
                        body.userData.star1.position.z = Math.sin(time * 0.5) * 30;
                        body.userData.star2.position.x = Math.cos(time * 0.5 + Math.PI) * 30;
                        body.userData.star2.position.z = Math.sin(time * 0.5 + Math.PI) * 30;
                    }
                }
            ];

            const createdSystems = systems.map(s => createSystem(s));

            camera.position.z = 400;
            camera.position.y = 150;
            camera.lookAt(new THREE.Vector3(0,0,0));

            const controls = new DragControls(allPlanets, camera, renderer.domElement);
            controls.addEventListener('dragstart', (event) => { event.object.userData.isDragging = true; });
            controls.addEventListener('dragend', (event) => {
                event.object.userData.isDragging = false;
                const planet = event.object;
                const systemGroup = planet.userData.parentSystem;
                const localPos = systemGroup.worldToLocal(planet.position.clone());
                planet.userData.orbitRadius = Math.sqrt(localPos.x * localPos.x + localPos.z * localPos.z);
                planet.userData.angle = Math.atan2(localPos.z, localPos.x);
            });
            
            const clock = new THREE.Clock();
            function animate() {
                coverAnimationId = requestAnimationFrame(animate);
                const time = clock.getElapsedTime();

                createdSystems.forEach(sys => {
                    if (sys.animateCentralBody) sys.animateCentralBody(sys.centralBody, time);
                });

                allPlanets.forEach((planet) => {
                    if (!planet.userData.isDragging) {
                        const systemGroup = planet.userData.parentSystem;
                        planet.userData.angle += planet.userData.speed;
                        const localX = Math.cos(planet.userData.angle) * planet.userData.orbitRadius;
                        const localZ = Math.sin(planet.userData.angle) * planet.userData.orbitRadius;
                        
                        const worldPos = new THREE.Vector3(localX, 0, localZ);
                        systemGroup.localToWorld(worldPos);
                        planet.position.copy(worldPos);
                    }
                });
                
                stars.rotation.y += 0.0001;
                renderer.render(scene, camera);
            }
            animate();

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
        }
        initCoverAnimation();
    }

    function animateContent(section) {
        const itemsToAnimate = section.querySelectorAll('p, li, h4');
        itemsToAnimate.forEach((item, index) => {
            item.style.animation = 'none';
            void item.offsetWidth; // Trigger reflow
            if(item.tagName === 'H4') {
                 item.style.animation = `glitch 1s linear forwards ${index * 0.05}s`;
            } else {
                item.style.animation = `fade-in-up 0.5s ease-out forwards ${index * 0.05}s`;
            }
        });
    }

    // --- GENERAL PAGE LOGIC ---
    if (coverPage && enterButton) {
        setTimeout(() => { coverPage.classList.add('loaded'); }, 100);

        enterButton.addEventListener('click', () => {
            let startTime = null;
            const duration = 1500; // 1.5 seconds

            function hyperspace(timestamp) {
                if (!startTime) startTime = timestamp;
                const progress = (timestamp - startTime) / duration;

                stars.material.size = 1.5 + progress * 30;
                stars.position.z = progress * 3000;

                if (progress < 1) {
                    requestAnimationFrame(hyperspace);
                } else {
                    coverPage.style.opacity = '0';
                    coverPage.addEventListener('transitionend', () => { 
                        coverPage.style.display = 'none'; 
                        if (coverAnimationId) cancelAnimationFrame(coverAnimationId);
                    }, { once: true });
                    mainContainer.style.display = 'flex';
                    document.body.classList.add('site-entered');
                    setTimeout(() => { 
                        mainContainer.style.opacity = '1'; 
                        const activeSection = document.querySelector('.content-section.active');
                        if (activeSection) animateContent(activeSection);
                    }, 50);
                }
            }
            requestAnimationFrame(hyperspace);
        });
    }

    // --- BACKGROUND & SCANNER ANIMATION ---
    const mainStarfieldCanvas = document.getElementById('starfield');
    const fastParticlesCanvas = document.getElementById('fast-particles');
    const tooltip = document.getElementById('scan-tooltip');
    
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
    
    // --- SCANNER LOGIC ---
    if (tooltip) {
        document.querySelectorAll('.scannable').forEach(el => {
            el.addEventListener('mouseenter', e => {
                tooltip.textContent = e.target.dataset.scanInfo;
                tooltip.style.opacity = '1';
            });
            el.addEventListener('mousemove', e => {
                tooltip.style.left = `${e.clientX + 25}px`;
                tooltip.style.top = `${e.clientY + 25}px`;
            });
            el.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });
        });
    }

    document.querySelectorAll('.research-panel').forEach(panel => {
        panel.addEventListener('click', () => {
            // Get the link from the data-href attribute and go to that page
            window.location.href = panel.dataset.href;
        });
    });

    // --- NAVIGATION AND CONTENT ANIMATION SCRIPT ---
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href').includes('.html')) return;
            
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            if (!targetSection || targetSection.classList.contains('active')) return;
            
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            
            contentSections.forEach(section => section.classList.remove('active'));
            targetSection.classList.add('active');
            
            animateContent(targetSection);
        });
    });

    const hash = window.location.hash;
    if (hash) {
        const targetLink = document.querySelector(`.nav-link[href="${hash}"]`);
        if (targetLink) {
            targetLink.click();
        }
    }

    // This makes “Return to Log” (with href="#research") go straight to your logs view.
    if (window.location.hash === '#research') {
        // Hide the cover immediately
        coverPage.style.display = 'none';
        if (typeof coverAnimationId !== 'undefined') cancelAnimationFrame(coverAnimationId);

        // Show the main research-logs container
        mainContainer.style.display = 'flex';
        document.body.classList.add('site-entered');

        // Fade in the active section
        setTimeout(() => {
            mainContainer.style.opacity = '1';
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection) animateContent(activeSection);
        }, 50);
    }

});
