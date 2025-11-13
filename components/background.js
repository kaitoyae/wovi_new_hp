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
            console.warn('THREE.jsが読み込まれていないため、背景アニメーションをスキップします。');
            return null;
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`IDが${canvasId}のcanvasが見つからないため、背景アニメーションをスキップします。`);
            return null;
        }

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xffffff, 0.06);

        const camera = new THREE.PerspectiveCamera(options.fov || 60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = options.cameraZ || 18;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        let animationId = null;
        let scrollY = 0;

        function onResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function onScroll() {
            scrollY = window.scrollY / window.innerHeight;
        }

        const scrollOptions = { passive: true };
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, scrollOptions);

        const palette = (options.colors || DEFAULT_COLORS).map(c => new THREE.Color(c));
        const lineCount = options.lineCount || 45;
        const segments = options.segments || 80;
        const bounds = options.bounds || 7;

        function randomPointInSphere(radius) {
            const v = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            );
            return v.normalize().multiplyScalar(Math.random() * radius);
        }

        function randomUnitVector() {
            return randomPointInSphere(1).normalize();
        }

        const tmpVec3 = new THREE.Vector3();
        function sampleFlow(pos, t) {
            const scale = 0.25;
            const x = pos.x * scale;
            const y = pos.y * scale;
            const z = pos.z * scale;

            const vx = Math.sin(y + t) + Math.cos(z * 0.5 + t * 0.7);
            const vy = Math.sin(z + t * 0.8) + Math.cos(x * 0.6 - t * 0.3);
            const vz = Math.sin(x - t * 0.4) - Math.cos(y * 0.4 + t * 0.9);

            tmpVec3.set(vx, vy, vz);
            return tmpVec3.normalize();
        }

        class FlowLine {
            constructor(startPos) {
                this.head = startPos.clone();
                this.speed = 0.15 + Math.random() * 0.15;
                this.offset = Math.random() * 100;
                this.palette = palette;
                this.baseColor = pickColor(this.palette);
                this.targetColor = pickColor(this.palette);
                this.colorProgress = Math.random();
                this.direction = randomUnitVector();
                this.smoothing = 0.25 + Math.random() * 0.2;

                this.positions = new Float32Array(segments * 3);
                this.colors = new Float32Array(segments * 3);
                for (let i = 0; i < segments; i++) {
                    const idx = i * 3;
                    this.positions[idx] = this.head.x;
                    this.positions[idx + 1] = this.head.y;
                    this.positions[idx + 2] = this.head.z;
                    this.colors[idx] = this.baseColor.r;
                    this.colors[idx + 1] = this.baseColor.g;
                    this.colors[idx + 2] = this.baseColor.b;
                }

                this.geometry = new THREE.BufferGeometry();
                this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
                this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
                this.material = new THREE.LineBasicMaterial({
                    transparent: true,
                    opacity: 0.85,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    vertexColors: true,
                    linewidth: 3
                });

                this.line = new THREE.Line(this.geometry, this.material);
                scene.add(this.line);
            }

            step(time) {
                const flowDir = sampleFlow(this.head, time * this.speed + this.offset);
                this.direction.lerp(flowDir, 0.35).normalize();
                const stepSize = 0.028 + this.speed * 0.02;
                this.head.addScaledVector(this.direction, stepSize);

                if (this.head.x > bounds) this.head.x = -bounds;
                else if (this.head.x < -bounds) this.head.x = bounds;
                if (this.head.y > bounds) this.head.y = -bounds;
                else if (this.head.y < -bounds) this.head.y = bounds;
                if (this.head.z > bounds) this.head.z = -bounds;
                else if (this.head.z < -bounds) this.head.z = bounds;

                const p = this.positions;
                for (let i = segments - 1; i > 0; i--) {
                    const dst = i * 3;
                    const src = (i - 1) * 3;
                    p[dst] = p[src];
                    p[dst + 1] = p[src + 1];
                    p[dst + 2] = p[src + 2];
                }

                p[0] = this.head.x;
                p[1] = this.head.y;
                p[2] = this.head.z;

                const smoothFactor = this.smoothing;
                for (let i = 2; i < segments - 2; i++) {
                    const idx = i * 3;
                    const prevIdx = idx - 3;
                    const nextIdx = idx + 3;
                    p[idx] = THREE.MathUtils.lerp(p[idx], (p[prevIdx] + p[nextIdx]) * 0.5, smoothFactor);
                    p[idx + 1] = THREE.MathUtils.lerp(p[idx + 1], (p[prevIdx + 1] + p[nextIdx + 1]) * 0.5, smoothFactor);
                    p[idx + 2] = THREE.MathUtils.lerp(p[idx + 2], (p[prevIdx + 2] + p[nextIdx + 2]) * 0.5, smoothFactor);
                }
                this.geometry.attributes.position.needsUpdate = true;

                const c = this.colors;
                for (let i = segments - 1; i > 0; i--) {
                    const dst = i * 3;
                    const src = (i - 1) * 3;
                    c[dst] = c[src];
                    c[dst + 1] = c[src + 1];
                    c[dst + 2] = c[src + 2];
                }

                const headColor = this.nextColor();
                c[0] = headColor.r;
                c[1] = headColor.g;
                c[2] = headColor.b;
                this.geometry.attributes.color.needsUpdate = true;
            }

            nextColor() {
                this.colorProgress += 0.02 + Math.random() * 0.02;
                if (this.colorProgress >= 1) {
                    this.baseColor = this.targetColor;
                    this.targetColor = pickColor(this.palette);
                    this.colorProgress = 0;
                }
                return this.baseColor.clone().lerp(this.targetColor, this.colorProgress);
            }

            dispose() {
                scene.remove(this.line);
                this.geometry.dispose();
                this.material.dispose();
            }
        }

        function pickColor(palette) {
            const c = palette[Math.floor(Math.random() * palette.length)];
            return c instanceof THREE.Color ? c.clone() : new THREE.Color(c);
        }

        const flowLines = [];
        for (let i = 0; i < lineCount; i++) {
            const start = randomPointInSphere(bounds * 0.6);
            start.y -= 1.5;
            flowLines.push(new FlowLine(start));
        }

        const dustCount = 300;
        const dustPositions = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
            const p = randomPointInSphere(bounds * 0.9);
            const idx = i * 3;
            dustPositions[idx] = p.x;
            dustPositions[idx + 1] = p.y;
            dustPositions[idx + 2] = p.z;
        }
        const dustGeometry = new THREE.BufferGeometry();
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        const dustMaterial = new THREE.PointsMaterial({
            size: 2,
            sizeAttenuation: true,
            color: 0xffffff,
            transparent: true,
            opacity: 0.25,
            depthWrite: false
        });
        const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
        scene.add(dustPoints);

        function animate(now) {
            for (let i = 0; i < flowLines.length; i++) {
                flowLines[i].step(now / 1000);
            }

            dustMaterial.opacity = 0.2 + 0.1 * Math.sin(now * 0.0005);

            const targetY = scrollY * 0.25;
            scene.rotation.y += 0.003;
            scene.rotation.x += (targetY - scene.rotation.x) * 0.05;
            scene.rotation.z = Math.sin(now * 0.0001) * 0.08;

            renderer.render(scene, camera);
            animationId = requestAnimationFrame(animate);
        }

        animationId = requestAnimationFrame(animate);

        return {
            dispose() {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
                window.removeEventListener('resize', onResize);
                window.removeEventListener('scroll', onScroll, scrollOptions);
                flowLines.forEach(line => line.dispose());
                scene.remove(dustPoints);
                dustGeometry.dispose();
                dustMaterial.dispose();
                renderer.dispose();
            }
        };
    }

    global.initBackground = initBackground;
})(window);
