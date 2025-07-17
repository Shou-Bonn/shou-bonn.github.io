// --- DragControls for Three.js ---
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
    function initCoverAnimation() {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
        const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('cover-canvas'), alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        const allPlanets = [];
        const allTrails = [];
        const trailLength = 100;
        
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

        const textureLoader = new THREE.TextureLoader();
        
        function createSystem(config) {
            const systemGroup = new THREE.Group();
            systemGroup.position.copy(config.position);
            scene.add(systemGroup);

            const centralBody = config.createCentralBody(textureLoader);
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

                const trailGeometry = new THREE.BufferGeometry();
                const trailPositions = new Float32Array(trailLength * 3);
                trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
                const trailMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
                const trail = new THREE.Line(trailGeometry, trailMaterial);
                trail.userData.points = [];
                allTrails.push({trail: trail, planet: planet});
                scene.add(trail);
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

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

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
                if (sys.animateCentralBody) {
                    sys.animateCentralBody(sys.centralBody, time);
                }
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

            allTrails.forEach(({trail, planet}) => {
                const worldPos = new THREE.Vector3();
                planet.getWorldPosition(worldPos);
                trail.userData.points.push(worldPos);
                if(trail.userData.points.length > trailLength) trail.userData.points.shift();
                
                const positions = trail.geometry.attributes.position.array;
                trail.userData.points.forEach((p, i) => {
                    positions[i*3] = p.x;
                    positions[i*3+1] = p.y;
                    positions[i*3+2] = p.z;
                });
                trail.geometry.setDrawRange(0, trail.userData.points.length);
                trail.geometry.attributes.position.needsUpdate = true;
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

    // --- GENERAL PAGE LOGIC ---
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
                    cancelAnimationFrame(coverAnimationId);
                }, { once: true });
                mainContainer.style.display = 'flex';
                document.body.classList.add('site-entered');
                setTimeout(() => { 
                    mainContainer.style.opacity = '1'; 
                    animateContent(document.querySelector('.content-section.active'));
                }, 50);
            }
        }
        requestAnimationFrame(hyperspace);
    });

    // --- BACKGROUND & SCANNER ANIMATION (MAIN SITE) ---
    const mainStarfieldCanvas = document.getElementById('starfield');
    const mainStarfieldCtx = mainStarfieldCanvas.getContext('2d');
    const fastParticlesCanvas = document.getElementById('fast-particles');
    const fastParticlesCtx = fastParticlesCanvas.getContext('2d');
    const tooltip = document.getElementById('scan-tooltip');
    
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
        if (mainContainer.style.display === 'flex') {
            // Draw static stars
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

            // Draw fast particles
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
    
    initCoverAnimation();
    animateStarfields();
    
    // --- SCANNER LOGIC ---
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

    // --- NAVIGATION AND CONTENT ANIMATION SCRIPT ---
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const researchPanels = document.querySelectorAll('.research-panel');
    const researchGridView = document.getElementById('research-grid-view');
    const researchDetailContainer = document.getElementById('research-detail-container');
    
    const researchDetails = {
        exoplanets: {
            title: 'Exoplanet Architectures',
            content: `<h4>Project: Exploring Planet Nine Analogues with Gaia DR4 and Roman Space Telescope</h4>
                      <p>This research focuses on using data from the Gaia space observatory and the upcoming Nancy Grace Roman Space Telescope to search for and characterize distant objects in our solar system, including potential analogues to the hypothesized Planet Nine. The work involves analyzing astrometric data to detect the subtle gravitational influences these distant bodies exert on other objects.</p>`
        },
        gw: {
            title: 'Gravitational Waves',
            content: `<h4>Project: Targeted Searches for Supermassive Black Hole Binary with NANOGrav 15 yr Data</h4>
                      <p>Utilizing 15 years of data from the North American Nanohertz Observatory for Gravitational Waves (NANOGrav), this project aims to conduct targeted searches for gravitational waves from individual supermassive black hole binaries. The methodology involves advanced Bayesian statistics and MCMC sampling on high-performance computing clusters.</p>`
        },
        ir: {
            title: 'Infrared Instrumentation',
            content: `<h4>Projects: OSIRIS Imager Saturation Readout Correction & New Spectroscopic Data Reduction Pipeline</h4>
                      <p>This work at UCLA involved improving the scientific output of the OSIRIS instrument on the Keck Telescope. Key contributions include developing a new method for correcting saturated readouts in the imager using up-the-ramp sampling and building a new, more efficient spectroscopic data reduction pipeline. This involved deep knowledge of astronomical data calibration and point-spread function (PSF) modeling.</p>`
        },
        polarimetry: {
            title: 'Exoplanet & Brown Dwarf Polarimetry',
            content: `<h4>Projects at UCSB & Caltech</h4>
                      <p><b>Brown Dwarf Disks (Caltech):</b> This project focused on optimizing the data reduction pipeline for the WIRC+Pol instrument and using near-infrared spectropolarimetry to characterize the circumstellar disks around brown dwarfs in the Taurus Molecular Cloud. This helps us understand the early stages of planet formation around these low-mass objects.</p>
                      <p><b>Exoplanet Polarimetry (UCSB):</b> This research involved attempting to detect polarized light from the unresolved Luhman 16 brown dwarf binary system. A successful detection would provide valuable information about the atmospheric properties, such as cloud bands and rotational flattening, of these nearby objects.</p>`
        }
    };

    function showResearchDetail(researchId) {
        const detailData = researchDetails[researchId];
        if (!detailData) return;

        researchDetailContainer.innerHTML = `
            <div class="research-detail-view">
                <button class="back-button">&lt; Return to Logs</button>
                <h3>${detailData.title}</h3>
                ${detailData.content}
            </div>
        `;
        
        researchGridView.style.opacity = '0';
        setTimeout(() => {
            researchGridView.style.display = 'none';
            researchDetailContainer.style.display = 'block';
        }, 300);

        researchDetailContainer.querySelector('.back-button').addEventListener('click', () => {
            researchDetailContainer.style.display = 'none';
            researchGridView.style.display = 'block';
            setTimeout(() => researchGridView.style.opacity = '1', 50);
        });
    }

    researchPanels.forEach(panel => {
        panel.addEventListener('click', () => {
            showResearchDetail(panel.dataset.researchId);
        });
    });

    function animateContent(section) {
        const itemsToAnimate = section.querySelectorAll('p, li, h4, .research-panel');
        itemsToAnimate.forEach((item, index) => {
            item.style.animation = 'none';
            void item.offsetWidth;
            if(item.tagName === 'H4') {
                 item.style.animation = `glitch 1s linear forwards ${index * 0.05}s`;
            } else {
                item.style.animation = `fade-in-up 0.5s ease-out forwards ${index * 0.05}s`;
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection.classList.contains('active')) return;
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            contentSections.forEach(section => section.classList.remove('active'));
            targetSection.classList.add('active');
            animateContent(targetSection);
        });
    });
});