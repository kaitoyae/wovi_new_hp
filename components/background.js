(function(global) {
    const DEFAULT_COLORS = [
        0x00A9A4, // Wovi Green
        0xFFD166, // Spark Yellow
        0xf472b6, // Bright Pink
        0x9333ea, // Bright Violet
        0x2563eb, // Bright Blue
        0xdc2626, // Bright Red
        0x65a30d, // Bright Lime
        0xf59e0b, // Bright Orange
        0x06b6d4  // Bright Cyan
    ];

    function initBackground(canvasId = 'three-canvas', options = {}) {
        if (!global.THREE) {
            console.warn('THREE.jsが読み込まれていません。背景アニメーションをスキップします。');
            return null;
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`IDが${canvasId}のcanvasが見つからないため、背景アニメーションをスキップします。`);
            return null;
        }

        const colors = options.colors || DEFAULT_COLORS;
        const maxBranches = options.maxBranches || 120;
        const branchInterval = options.branchInterval || 1000;

        let scene, camera, renderer;
        const branches = [];
        let branchTimerId = null;
        let animationFrameId = null;
        let scrollY = 0;
        let autoRotation = true;
        let lastInteractionTime = Date.now();
        let animationStartTime = Date.now();
        const rotationDelay = options.rotationDelay || 3000;

        const cleanupHandlers = {};

        class Branch {
            constructor(startPos, color) {
                this.points = [startPos.clone()];
                this.maxPoints = 50 + Math.random() * 50;
                this.isGrowing = true;
                this.velocity = new THREE.Vector3(
                    (Math.random() - 0.5),
                    (Math.random() - 0.5),
                    (Math.random() - 0.5)
                ).normalize();

                const material = new THREE.LineBasicMaterial({
                    color,
                    transparent: true,
                    opacity: 0.9,
                    linewidth: 100
                });
                const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
                this.line = new THREE.Line(geometry, material);
                scene.add(this.line);
            }

            grow() {
                if (!this.isGrowing) return;

                const lastPoint = this.points[this.points.length - 1];

                this.velocity.multiplyScalar(0.985);
                const outwardVector = lastPoint.clone().normalize().multiplyScalar(0.012);
                this.velocity.add(outwardVector);
                const wobble = new THREE.Vector3(
                    (Math.random() - 0.5),
                    (Math.random() - 0.5),
                    (Math.random() - 0.5)
                ).multiplyScalar(0.04);
                this.velocity.add(wobble);

                if (this.points.length > 2) {
                    const prevDirection = this.points[this.points.length - 1]
                        .clone()
                        .sub(this.points[this.points.length - 2])
                        .normalize();
                    this.velocity.lerp(prevDirection, 0.15);
                }

                if (this.points.length % 8 === 0) {
                    const randomTurn = new THREE.Vector3(
                        (Math.random() - 0.5),
                        (Math.random() - 0.5),
                        (Math.random() - 0.5)
                    ).normalize().multiplyScalar(0.15);
                    this.velocity.add(randomTurn);
                }

                this.velocity.normalize().multiplyScalar(0.05);
                const newPoint = lastPoint.clone().add(this.velocity);
                this.points.push(newPoint);
                this.line.geometry.setFromPoints(this.points);

                if (this.points.length > this.maxPoints) {
                    this.isGrowing = false;
                }

                if (Math.random() < 0.015 && branches.length < maxBranches && this.points.length > 10) {
                    const newVelocity = this.velocity.clone().applyAxisAngle(
                        new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
                        (Math.random() - 0.5) * 0.5
                    );
                    const newBranch = new Branch(newPoint, this.line.material.color);
                    newBranch.velocity = newVelocity.multiplyScalar(0.8);
                    branches.push(newBranch);
                }
            }
        }

        function initScene() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 10;
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);

            for (let i = 0; i < 5; i++) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                branches.push(new Branch(new THREE.Vector3(0, 0, 0), color));
            }

            const scrollOptions = { passive: true };
            window.addEventListener('resize', onWindowResize);
            window.addEventListener('scroll', onScroll, scrollOptions);
            branchTimerId = setInterval(addNewBranch, branchInterval);

            cleanupHandlers.scrollOptions = scrollOptions;
        }

        function onWindowResize() {
            if (!camera || !renderer) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function addNewBranch() {
            if (branches.length >= maxBranches) return;

            const xPos = (Math.random() - 0.5) * 8;
            const yPos = (Math.random() - 0.5) * 8;
            const zPos = (Math.random() - 0.5) * 8;
            const color = colors[Math.floor(Math.random() * colors.length)];
            branches.push(new Branch(new THREE.Vector3(xPos, yPos, zPos), color));
        }

        function onScroll() {
            scrollY = window.scrollY / window.innerHeight;
            autoRotation = false;
            lastInteractionTime = Date.now();
        }

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            branches.forEach(branch => branch.grow());

            const now = Date.now();
            const timeSinceStart = now - animationStartTime;

            if (timeSinceStart > rotationDelay) {
                if (now - lastInteractionTime > 3000) {
                    autoRotation = true;
                }

                if (autoRotation) {
                    scene.rotation.x += 0.0015;
                    scene.rotation.y += 0.0025;
                } else {
                    const targetRotationX = scrollY * Math.PI * 0.2;
                    const targetRotationY = scrollY * Math.PI * 0.15;
                    scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.005;
                    scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.005;
                }
            }

            renderer.render(scene, camera);
        }

        initScene();
        animate();

        return {
            dispose() {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                if (branchTimerId) {
                    clearInterval(branchTimerId);
                }
                window.removeEventListener('resize', onWindowResize);
                if (cleanupHandlers.scrollOptions) {
                    window.removeEventListener('scroll', onScroll, cleanupHandlers.scrollOptions);
                } else {
                    window.removeEventListener('scroll', onScroll);
                }
                branches.forEach(branch => {
                    if (branch.line) {
                        scene.remove(branch.line);
                        branch.line.geometry.dispose();
                        branch.line.material.dispose();
                    }
                });
                renderer && renderer.dispose();
            }
        };
    }

    global.initBackground = initBackground;
})(window);
