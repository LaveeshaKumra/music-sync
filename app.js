class MusicVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.animationId = null;
        this.currentVisualization = 'waveform'; // Set default to waveform
        this.isInitialized = false;
        this.smoothedArray = [];
        this.phase = 0;
        this.lastValues = [];
        this.targetValues = [];
        this.shuffleInterval = null;
        this.isTransitioning = false;
        this.visualizationTypes = [
            'auroraWaves', 'waveform', 'bars', 'circular', 'arctic',
            'particles', 'spectrum', 'dna', 'orbs', 'dnaHelix', 'fractalTree'
        ];
        this.mouseX = 0;
        this.mouseY = 0;
        this.fractalHue = 0;
        this.orbs = this.initOrbs(); // Initialize orbs here

        this.setupEventListeners();
        this.resizeCanvas();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.orbs = this.initOrbs(); // Reinitialize orbs on resize
        });
    }

    transitionToVisualization(newVisualization) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Start fade out
        let opacity = 1;
        const fadeOut = setInterval(() => {
            opacity -= 0.05;
            this.canvas.style.opacity = opacity;
            
            if (opacity <= 0) {
                clearInterval(fadeOut);
                this.currentVisualization = newVisualization;
                
                // Start fade in
                opacity = 0;
                const fadeIn = setInterval(() => {
                    opacity += 0.05;
                    this.canvas.style.opacity = opacity;
                    
                    if (opacity >= 1) {
                        clearInterval(fadeIn);
                        this.isTransitioning = false;
                    }
                }, 20);
            }
        }, 20);
    }

    setupEventListeners() {
        // Start button click handler
        const startButton = document.getElementById('startButton');
        startButton.addEventListener('click', async () => {
            if (!this.isInitialized) {
                // Resume audio context if suspended
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                await this.initializeAudio();
                document.getElementById('startOverlay').classList.add('hidden');
            }
        });

        // Visualization selector change handler
        const visualizationSelect = document.getElementById('visualizationType');
        visualizationSelect.addEventListener('change', (e) => {
            this.transitionToVisualization(e.target.value);
        });

        // Mouse movement handler for interactive effects
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        // Mouse leave handler
        this.canvas.addEventListener('mouseleave', () => {
            this.mouseX = null;
            this.mouseY = null;
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (this.orbs) {
                this.orbs = this.initOrbs();
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.audioContext) {
                    this.audioContext.suspend();
                }
            } else {
                if (this.audioContext && this.isInitialized) {
                    this.audioContext.resume();
                }
            }
        });

        // Shuffle button handling
        const shuffleButton = document.getElementById('shuffleButton');
        shuffleButton.addEventListener('click', () => {
            const icon = shuffleButton.querySelector('i');
            if (this.shuffleInterval) {
                // Stop shuffling
                clearInterval(this.shuffleInterval);
                this.shuffleInterval = null;
                icon.classList.remove('fa-pause');
                icon.classList.add('fa-random');
                shuffleButton.classList.remove('active');
            } else {
                // Start shuffling
                this.shuffleInterval = setInterval(() => {
                    if (this.isTransitioning) return;

                    const currentIndex = this.visualizationTypes.indexOf(this.currentVisualization);
                    let nextIndex;
                    do {
                        nextIndex = Math.floor(Math.random() * this.visualizationTypes.length);
                    } while (nextIndex === currentIndex);

                    const newVisualization = this.visualizationTypes[nextIndex];
                    visualizationSelect.value = newVisualization;
                    this.transitionToVisualization(newVisualization);
                }, 8000); // Changed to 8 seconds to allow for smooth transitions

                icon.classList.remove('fa-random');
                icon.classList.add('fa-pause');
                shuffleButton.classList.add('active');
            }
        });

        // Fullscreen handling
        document.getElementById('fullscreenButton').addEventListener('click', () => {
            const container = document.querySelector('.container');
            const fullscreenIcon = document.querySelector('#fullscreenButton i');

            if (!document.fullscreenElement) {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if (container.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen();
                } else if (container.msRequestFullscreen) {
                    container.msRequestFullscreen();
                }
                fullscreenIcon.classList.remove('fa-expand');
                fullscreenIcon.classList.add('fa-compress');
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                fullscreenIcon.classList.remove('fa-compress');
                fullscreenIcon.classList.add('fa-expand');
            }
        });

        // Update fullscreen icon when fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            const fullscreenIcon = document.querySelector('#fullscreenButton i');
            if (document.fullscreenElement) {
                fullscreenIcon.classList.remove('fa-expand');
                fullscreenIcon.classList.add('fa-compress');
            } else {
                fullscreenIcon.classList.remove('fa-compress');
                fullscreenIcon.classList.add('fa-expand');
            }
        });
    }

    async initializeAudio() {
        try {
            console.log('Starting audio initialization...');
            
            // Create audio context first
            if (!this.audioContext) {
                console.log('Creating new AudioContext...');
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('AudioContext created:', this.audioContext.state);
            }

            // If context is suspended, try to resume it
            if (this.audioContext.state === 'suspended') {
                console.log('Resuming suspended AudioContext...');
                await this.audioContext.resume();
                console.log('AudioContext resumed:', this.audioContext.state);
            }

            console.log('Requesting microphone access...');
            const constraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            };
            
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Microphone access granted:', stream.active);

            // Create and configure analyzer
            console.log('Setting up audio nodes...');
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.85;
            
            // Connect the nodes
            source.connect(this.analyser);
            console.log('Audio nodes connected');

            // Initialize arrays for visualization
            const bufferLength = this.analyser.frequencyBinCount;
            this.smoothedArray = new Array(bufferLength).fill(128);
            this.lastValues = new Array(bufferLength).fill(128);
            this.targetValues = new Array(bufferLength).fill(128);
            
            // Set initialization flag and start
            this.isInitialized = true;
            console.log('Audio initialization complete');
            
            // Update UI
            const startButton = document.getElementById('startButton');
            startButton.textContent = 'Listening...';
            startButton.classList.add('active');
            document.getElementById('startOverlay').classList.add('hidden');
            
            // Start visualization
            this.startVisualization();
            
        } catch (error) {
            console.error('Audio initialization error:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            let errorMessage = 'Unable to access audio. ';
            
            switch (error.name) {
                case 'NotAllowedError':
                    errorMessage += 'Please make sure you have granted microphone permissions. Try clicking the microphone icon in your browser\'s address bar.';
                    break;
                case 'NotFoundError':
                    errorMessage += 'No microphone found. Please connect a microphone and refresh the page.';
                    break;
                case 'NotReadableError':
                    errorMessage += 'Your microphone is busy or not responding. Please close other apps that might be using it.';
                    break;
                case 'SecurityError':
                    errorMessage += 'Security error. Please make sure you\'re using HTTPS or localhost.';
                    break;
                default:
                    errorMessage += `Error: ${error.message}. Please check your browser settings and try again.`;
            }
            
            // Update UI to show error
            const startButton = document.getElementById('startButton');
            startButton.textContent = 'Start';
            startButton.classList.remove('active');
            
            // Show error to user
            console.error(errorMessage);
            alert(errorMessage);
            
            // Clean up
            this.isInitialized = false;
            if (this.audioContext) {
                try {
                    await this.audioContext.close();
                } catch (closeError) {
                    console.error('Error closing AudioContext:', closeError);
                }
                this.audioContext = null;
            }
            this.analyser = null;
        }
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    clearCanvas() {
        // Clear with black background and ensure it's not affected by composite operations
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    smoothData(dataArray) {
        const smoothingFactor = 0.6; // Less smoothing for better beat response
        const transitionSpeed = 0.4; // Faster transitions
        const noiseThreshold = 2; // Threshold to filter out small variations

        // Update target values with noise threshold
        for (let i = 0; i < dataArray.length; i++) {
            // Apply noise threshold
            const diff = Math.abs(dataArray[i] - 128);
            if (diff < noiseThreshold) {
                this.targetValues[i] = 128; // Center value when below threshold
            } else {
                this.targetValues[i] = dataArray[i];
            }
        }

        // Smooth transition between current and target values
        for (let i = 0; i < dataArray.length; i++) {
            const diff = this.targetValues[i] - this.lastValues[i];
            this.lastValues[i] += diff * transitionSpeed;
            this.smoothedArray[i] = this.smoothedArray[i] * smoothingFactor + 
                                  this.lastValues[i] * (1 - smoothingFactor);
        }

        return this.smoothedArray;
    }

    startVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        const draw = () => {
            if (!this.isInitialized) return;
            
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.animationId = requestAnimationFrame(draw);
            
            switch(this.currentVisualization) {
                case 'auroraWaves':
                    this.analyser.getByteFrequencyData(dataArray);
                    this.drawAuroraWaves(dataArray);
                    break;
                case 'waveform':
                    this.analyser.getByteTimeDomainData(dataArray);
                    this.drawWaveform(this.smoothData(dataArray));
                    break;
                case 'bars':
                    this.analyser.getByteFrequencyData(dataArray);
                    this.drawBars(dataArray);
                    break;
                case 'circular':
                    this.analyser.getByteFrequencyData(dataArray);
                    this.drawCircular(dataArray);
                    break;
                case 'arctic':
                    this.analyser.getByteTimeDomainData(dataArray);
                    this.drawArcticWaves(dataArray);
                    break;
                case 'particles':
                    this.analyser.getByteFrequencyData(dataArray);
                    this.drawParticles(dataArray);
                    break;
                case 'spectrum':
                    this.analyser.getByteFrequencyData(dataArray);
                    this.drawCircularSpectrum(dataArray);
                    break;
                case 'dna':
                    this.analyser.getByteFrequencyData(dataArray);
                    this.drawDNA(dataArray);
                    break;
                case 'orbs':
                    this.analyser.getByteFrequencyData(dataArray);
                    this.drawFloatingOrbs(dataArray);
                    break;
                case 'dnaHelix':
                    this.analyser.getByteFrequencyData(dataArray);
                    this.drawDNAHelix(this.smoothData(dataArray));
                    break;
                case 'fractalTree':
                    this.analyser.getByteFrequencyData(dataArray);
                    this.drawFractalTree(dataArray);
                    break;
            }
        };

        draw();
    }

    drawWaveform(dataArray) {
        this.clearCanvas();
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;
        
        // Calculate average for dynamic effects
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const intensity = average / 255;
        
        // Create main path
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        
        // Draw the primary wave
        for (let i = 0; i < width; i++) {
            const x = i;
            const progress = i / width;
            const index = Math.floor(progress * dataArray.length);
            const value = dataArray[index] / 128.0;
            
            // Simple sine wave mixed with audio data
            const y = centerY + ((value - 1) * height * 0.4) + 
                     Math.sin(progress * 5 + this.phase) * 20;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        // Create gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgba(0, 255, 255, ${0.2 + intensity * 0.3})`);
        gradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.8 + intensity * 0.2})`);
        gradient.addColorStop(1, `rgba(0, 255, 255, ${0.2 + intensity * 0.3})`);
        
        // Style the wave
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Add subtle glow
        this.ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
        this.ctx.shadowBlur = 10;
        
        // Draw the wave
        this.ctx.stroke();
        
        this.phase += 0.05;
    }

    drawBars(dataArray) {
        this.clearCanvas();
        const width = this.canvas.width;
        const height = this.canvas.height;
        const barCount = 64; // Reduced for wider bars
        const barWidth = (width / barCount) * 0.8; // 80% of available space
        const barGap = (width / barCount) * 0.2; // 20% gap
        const maxBarHeight = height * 0.7; // 70% of canvas height
        
        // Calculate average for dynamic effects
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const intensity = average / 255;
        
        // Update target values smoothly
        if (!this.targetValues.length) {
            this.targetValues = new Array(barCount).fill(0);
            this.lastValues = new Array(barCount).fill(0);
        }
        
        // Center bars horizontally
        const totalWidth = barCount * (barWidth + barGap);
        const startX = (width - totalWidth) / 2;
        
        for (let i = 0; i < barCount; i++) {
            // Sample frequencies logarithmically for better bass response
            const freqIndex = Math.floor(Math.pow(i / barCount, 1.5) * dataArray.length);
            const value = dataArray[freqIndex];
            
            // Smooth transitions
            this.targetValues[i] = value;
            this.lastValues[i] += (this.targetValues[i] - this.lastValues[i]) * 0.2;
            
            // Calculate bar height with exponential scaling for better dynamics
            const normalizedValue = this.lastValues[i] / 255;
            const barHeight = Math.pow(normalizedValue, 1.5) * maxBarHeight;
            
            // Add some vertical bounce based on average intensity
            const bounceOffset = Math.sin(this.phase * 3) * intensity * 10;
            
            // Calculate x position with gap
            const x = startX + i * (barWidth + barGap);
            
            // Create gradient for each bar
            const gradient = this.ctx.createLinearGradient(
                x, height,
                x, height - barHeight
            );
            
            // Dynamic color based on frequency and intensity
            const hue = (i / barCount * 360 + this.phase * 50) % 360;
            const sat = 90 + intensity * 10; // Increase saturation with intensity
            const light = 40 + intensity * 30; // Increase brightness with intensity
            
            // Multi-stop gradient for more depth
            gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, 1)`);
            gradient.addColorStop(0.5, `hsla(${hue + 30}, ${sat}%, ${light + 20}%, 0.9)`);
            gradient.addColorStop(1, `hsla(${hue + 60}, ${sat}%, ${light + 40}%, 0.8)`);
            
            this.ctx.fillStyle = gradient;
            
            // Add glow effect
            this.ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${intensity})`;
            this.ctx.shadowBlur = 15 * intensity;
            
            // Draw rounded rectangle for each bar
            const cornerRadius = barWidth / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x + cornerRadius, height);
            this.ctx.lineTo(x + cornerRadius, height - barHeight + cornerRadius + bounceOffset);
            this.ctx.quadraticCurveTo(
                x + cornerRadius, height - barHeight + bounceOffset,
                x, height - barHeight + bounceOffset
            );
            this.ctx.lineTo(x, height);
            this.ctx.closePath();
            
            // Use lighter composite operation for bloom effect
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.fill();
            
            // Mirror the bar (reflection effect)
            const reflectionHeight = barHeight * 0.3;
            const reflectionGradient = this.ctx.createLinearGradient(
                x, height + reflectionHeight,
                x, height
            );
            reflectionGradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
            reflectionGradient.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0.2)`);
            
            this.ctx.fillStyle = reflectionGradient;
            this.ctx.beginPath();
            this.ctx.moveTo(x, height);
            this.ctx.lineTo(x + barWidth, height);
            this.ctx.lineTo(x + barWidth, height + reflectionHeight);
            this.ctx.lineTo(x, height + reflectionHeight);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Update phase for color cycling
        this.phase += 0.03;
    }

    drawCircular(dataArray) {
        this.clearCanvas();
        const bufferLength = dataArray.length;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        // Calculate average frequency for dynamic effects
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const dynamicRadius = radius + (average * 0.3);
        
        // Draw multiple layers
        for (let layer = 0; layer < 3; layer++) {
            const layerRadius = dynamicRadius - (layer * 20);
            
            this.ctx.beginPath();
            this.ctx.lineWidth = 3; // Increased line width
            
            for (let i = 0; i < bufferLength; i++) {
                const value = dataArray[i] / 128.0;
                const angle = (i * 2 * Math.PI) / bufferLength;
                
                // Enhanced wave effect
                const waveAmplitude = 35 * (3 - layer) * (value - 1);
                const waveFreq = 6;
                const wavePhase = this.phase * 2;
                const waveOffset = Math.sin(angle * waveFreq + wavePhase) * waveAmplitude;
                
                const x = centerX + (layerRadius + waveOffset) * Math.cos(angle);
                const y = centerY + (layerRadius + waveOffset) * Math.sin(angle);
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.closePath();
            
            // Enhanced gradients with more vibrant colors
            const gradient = this.ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, layerRadius
            );
            
            // More vibrant base colors with neon effect
            const baseHue = (this.phase * 50) % 360;
            const layerHue = (baseHue + layer * 120) % 360; // More color separation between layers
            const intensity = Math.min(1, average / 128);
            
            // Increased saturation and lightness for more pop
            gradient.addColorStop(0, `hsla(${layerHue}, 100%, 60%, ${0.8})`);
            gradient.addColorStop(0.5, `hsla(${layerHue + 30}, 100%, 70%, ${0.6})`);
            gradient.addColorStop(1, `hsla(${layerHue + 60}, 100%, 80%, ${0.4})`);
            
            this.ctx.strokeStyle = gradient;
            
            // Enhanced glow effect
            const glowIntensity = Math.max(0.5, intensity);
            this.ctx.shadowBlur = 25 * glowIntensity;
            this.ctx.shadowColor = `hsla(${layerHue}, 100%, 70%, ${glowIntensity})`;
            
            // Composite operation for better blend
            this.ctx.globalCompositeOperation = 'lighter';
            
            this.ctx.stroke();
        }
        
        // Enhanced center circle
        const centerCircleRadius = 25 + (average * 0.3);
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, centerCircleRadius, 0, 2 * Math.PI);
        
        // More vibrant center gradient
        const centerGradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, centerCircleRadius
        );
        
        const centerHue = (180 + this.phase * 50) % 360;
        centerGradient.addColorStop(0, `hsla(${centerHue}, 100%, 80%, 1)`); // Brighter center
        centerGradient.addColorStop(0.5, `hsla(${centerHue + 30}, 100%, 70%, 0.8)`);
        centerGradient.addColorStop(1, `hsla(${centerHue + 60}, 100%, 60%, 0.6)`);
        
        // Add extra glow to center
        this.ctx.shadowBlur = 30;
        this.ctx.shadowColor = `hsla(${centerHue}, 100%, 70%, 0.8)`;
        
        this.ctx.fillStyle = centerGradient;
        this.ctx.fill();
        
        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Slightly faster phase update for more dynamic movement
        this.phase += 0.025;
    }

    drawArcticWaves(dataArray) {
        this.clearCanvas();
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Calculate audio intensity
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const intensity = average / 255;
        
        // Wave parameters
        const numWaves = 4;
        const baseAmplitude = height * 0.12;
        
        // Draw waves from bottom to top
        for (let i = numWaves - 1; i >= 0; i--) {
            const baseY = height * 0.7 - (i * height * 0.15);
            const points = [];
            const waveFreq = 2 + i * 0.5; // Different frequency for each wave
            
            // Generate wave points
            for (let x = 0; x <= width; x += 2) {
                const progress = x / width;
                const index = Math.floor(progress * dataArray.length);
                const value = dataArray[index] / 128.0 - 1;
                
                // Complex wave calculation
                const wave1 = Math.sin(progress * waveFreq * Math.PI + this.phase) * baseAmplitude;
                const wave2 = Math.cos(progress * (waveFreq/2) * Math.PI - this.phase * 0.5) * (baseAmplitude * 0.5);
                const audioEffect = value * baseAmplitude * intensity;
                
                const y = baseY + wave1 + wave2 + audioEffect;
                points.push({ x, y });
            }
            
            // Draw main wave
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, points[0].y);
            
            // Create smooth curve
            for (let j = 1; j < points.length - 2; j++) {
                const xc = (points[j].x + points[j + 1].x) / 2;
                const yc = (points[j].y + points[j + 1].y) / 2;
                this.ctx.quadraticCurveTo(points[j].x, points[j].y, xc, yc);
            }
            
            // Close the path to the bottom
            this.ctx.lineTo(width, height);
            this.ctx.lineTo(0, height);
            this.ctx.closePath();
            
            // Create gradient
            const gradient = this.ctx.createLinearGradient(0, baseY - baseAmplitude, 0, height);
            const hue = 200 + (i * 15); // Blue variations
            const lightness = 60 + (i * 5);
            
            gradient.addColorStop(0, `hsla(${hue}, 100%, ${lightness}%, 0)`);
            gradient.addColorStop(0.5, `hsla(${hue}, 90%, ${lightness}%, ${0.3 + intensity * 0.2})`);
            gradient.addColorStop(1, `hsla(${hue}, 80%, ${lightness-10}%, ${0.1 + intensity * 0.1})`);
            
            // Apply styles
            this.ctx.fillStyle = gradient;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness+10}%, ${0.6 + intensity * 0.4})`;
            this.ctx.lineWidth = 2;
            
            // Add glow
            this.ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${0.5 + intensity * 0.5})`;
            this.ctx.shadowBlur = 15;
            
            // Draw with lighter blend mode
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.fill();
            this.ctx.stroke();
            
            // Add sparkles on wave peaks
            if (intensity > 0.5) {
                const sparkleCount = Math.floor(intensity * 15);
                this.ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${intensity * 0.7})`;
                
                for (let s = 0; s < sparkleCount; s++) {
                    const sparkleX = Math.random() * width;
                    const waveY = points[Math.floor(sparkleX/2)].y;
                    const sparkleY = waveY - Math.random() * baseAmplitude * 0.5;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(sparkleX, sparkleY, Math.random() * 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        
        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
        this.phase += 0.02;
    }

    drawParticles(dataArray) {
        this.clearCanvas();
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Smooth audio analysis
        const bassSum = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const midSum = dataArray.slice(10, 100).reduce((a, b) => a + b, 0) / 90;
        const trebleSum = dataArray.slice(100).reduce((a, b) => a + b, 0) / (dataArray.length - 100);
        
        const bassIntensity = bassSum / 255;
        const midIntensity = midSum / 255;
        const trebleIntensity = trebleSum / 255;

        // Create multiple aurora layers
        const numLayers = 5;
        const baseAmplitude = height * 0.15;
        
        for (let layer = 0; layer < numLayers; layer++) {
            const layerOffset = (height / (numLayers + 1)) * (layer + 1);
            const waveSpeed = 0.001 + (layer * 0.0005);
            const frequency = 0.002 - (layer * 0.0002);
            
            // Create gradient for this layer
            const gradient = ctx.createLinearGradient(0, layerOffset - baseAmplitude, 0, layerOffset + baseAmplitude);
            
            // Calculate colors based on music and layer
            const hueBase = (this.phase * 10 + layer * 30) % 360;
            const hueShift = bassIntensity * 20;
            const saturation = 70 + trebleIntensity * 30;
            const brightness = 40 + midIntensity * 30;
            
            gradient.addColorStop(0, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0)`);
            gradient.addColorStop(0.2, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0.1)`);
            gradient.addColorStop(0.5, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0.3)`);
            gradient.addColorStop(0.8, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0.1)`);
            gradient.addColorStop(1, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0)`);

            ctx.beginPath();
            ctx.moveTo(0, layerOffset);

            // Draw smooth wave
            for (let x = 0; x <= width; x += 2) {
                const time = this.phase * waveSpeed;
                const waveFactor = Math.sin(x * frequency + time) + 
                                 Math.sin(x * frequency * 1.5 + time * 1.1) * 0.5 +
                                 Math.sin(x * frequency * 2 + time * 0.9) * 0.25;
                
                // Calculate wave amplitude based on music
                const amplitude = baseAmplitude * (1 + (bassIntensity * 0.3 + midIntensity * 0.2) * (1 - layer * 0.15));
                const y = layerOffset + waveFactor * amplitude;
                
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            // Complete the wave shape
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();

            // Apply gradient
            ctx.fillStyle = gradient;
            ctx.fill();

            // Add subtle glow effect
            ctx.shadowBlur = 20 * (1 + bassIntensity);
            ctx.shadowColor = `hsla(${hueBase}, ${saturation}%, ${brightness}%, ${0.3 + midIntensity * 0.2})`;
        }

        // Add floating particles for extra effect
        const numParticles = 20;
        for (let i = 0; i < numParticles; i++) {
            const x = (width * i / numParticles + this.phase * 50) % width;
            const baseY = height * 0.3 + Math.sin(x * 0.01 + this.phase) * height * 0.1;
            const y = baseY + Math.sin(this.phase * 2 + i) * height * 0.05;
            
            const particleSize = 2 + bassIntensity * 3;
            const particleOpacity = 0.1 + midIntensity * 0.3;
            
            ctx.beginPath();
            ctx.fillStyle = `hsla(${(this.phase * 20 + i * 20) % 360}, 80%, 70%, ${particleOpacity})`;
            ctx.arc(x, y, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add subtle mouse interaction ripples
        if (this.mouseX && this.mouseY) {
            const rippleRadius = 100 + bassIntensity * 50;
            const rippleGradient = ctx.createRadialGradient(
                this.mouseX, this.mouseY, 0,
                this.mouseX, this.mouseY, rippleRadius
            );
            
            const rippleHue = (this.phase * 20) % 360;
            rippleGradient.addColorStop(0, `hsla(${rippleHue}, 70%, 60%, ${0.1 + midIntensity * 0.1})`);
            rippleGradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
            
            ctx.beginPath();
            ctx.fillStyle = rippleGradient;
            ctx.arc(this.mouseX, this.mouseY, rippleRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Update phase for smooth animation
        this.phase += 0.01 * (1 + bassIntensity * 0.5);
    }

    initParticles() {
        return []; // No need for particle array in this visualization
    }

    drawCircularSpectrum(dataArray) {
        this.clearCanvas();
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Calculate average for dynamic effects
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const intensity = average / 255;
        
        // Base radius and number of bars
        const baseRadius = Math.min(width, height) * 0.2;
        const maxBarHeight = Math.min(width, height) * 0.15;
        const numBars = 180;
        const barWidth = (Math.PI * 2) / numBars;
        
        // Draw multiple layers
        for (let layer = 0; layer < 3; layer++) {
            const layerRadius = baseRadius + (layer * 20);
            const layerOpacity = 1 - (layer * 0.2);
            
            // Draw bars in a circle
            for (let i = 0; i < numBars; i++) {
                const angle = i * barWidth;
                const dataIndex = Math.floor((i / numBars) * dataArray.length);
                const value = dataArray[dataIndex];
                
                // Calculate bar height with audio reactivity
                const barHeight = (value / 255) * maxBarHeight * (1 + intensity * 0.3);
                
                // Calculate start and end points
                const startX = centerX + Math.cos(angle) * layerRadius;
                const startY = centerY + Math.sin(angle) * layerRadius;
                const endX = centerX + Math.cos(angle) * (layerRadius + barHeight);
                const endY = centerY + Math.sin(angle) * (layerRadius + barHeight);
                
                // Create gradient for each bar
                const gradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
                
                // Dynamic color based on frequency and intensity
                const hue = (i / numBars * 360 + this.phase * 30);
                
                gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.1 * layerOpacity})`);
                gradient.addColorStop(0.5, `hsla(${hue}, 100%, 70%, ${0.8 * layerOpacity})`);
                gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, ${0.1 * layerOpacity})`);
                
                // Draw bar
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                
                // Style and glow effect
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = gradient;
                this.ctx.shadowBlur = 10 * intensity;
                this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, ${intensity * layerOpacity})`;
                
                // Use lighter composite operation for bloom
                this.ctx.globalCompositeOperation = 'lighter';
                this.ctx.stroke();
            }
            
            // Draw connecting circle
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, layerRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `hsla(0, 0%, 100%, ${0.2 * layerOpacity})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
        
        this.phase += 0.02;
    }

    drawDNAHelix(dataArray) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        // Clear with fade effect
        this.clearCanvas(0.1);

        const points = 50;
        const frequency = 2;
        const amplitude = height * 0.1;
        const spacing = width / points;

        for (let i = 0; i < points; i++) {
            const x = i * spacing;
            const dataIndex = Math.floor((i / points) * dataArray.length);
            const intensity = dataArray[dataIndex] / 255;

            // Draw first helix strand
            const y1 = height/2 + Math.sin(i * 0.2 + this.phase) * amplitude * (1 + intensity);
            const y2 = height/2 + Math.sin(i * 0.2 + this.phase + Math.PI) * amplitude * (1 + intensity);

            // Draw connecting bars
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            const hue = (i / points * 360 + this.phase * 50) % 360;
            ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${0.3 + intensity * 0.7})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw points
            ctx.beginPath();
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.8 + intensity * 0.2})`;
            ctx.arc(x, y1, 5 * (1 + intensity), 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.fillStyle = `hsla(${(hue + 180) % 360}, 100%, 50%, ${0.8 + intensity * 0.2})`;
            ctx.arc(x, y2, 5 * (1 + intensity), 0, Math.PI * 2);
            ctx.fill();
        }

        this.phase += 0.05;
    }

    drawDNA(dataArray) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        // Clear with fade effect
        this.clearCanvas(0.1);

        const points = 50;
        const frequency = 2;
        const amplitude = height * 0.1;
        const spacing = width / points;

        for (let i = 0; i < points; i++) {
            const x = i * spacing;
            const dataIndex = Math.floor((i / points) * dataArray.length);
            const intensity = dataArray[dataIndex] / 255;
            
            // Draw first helix strand
            const y1 = height/2 + Math.sin(i * 0.2 + this.phase) * amplitude * (1 + intensity);
            const y2 = height/2 + Math.sin(i * 0.2 + this.phase + Math.PI) * amplitude * (1 + intensity);

            // Draw connecting bars
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            const hue = (i / points * 360 + this.phase * 50) % 360;
            ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${0.3 + intensity * 0.7})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw points
            ctx.beginPath();
            ctx.arc(x, y1, 5 * (1 + intensity), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y2, 5 * (1 + intensity), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(hue + 180) % 360}, 100%, 50%, 0.8)`;
            ctx.fill();
        }

        this.phase += 0.05;
    }

    drawFloatingOrbs(dataArray) {
        this.clearCanvas();
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Enhanced audio analysis
        const bassSum = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const midSum = dataArray.slice(10, 100).reduce((a, b) => a + b, 0) / 90;
        const trebleSum = dataArray.slice(100).reduce((a, b) => a + b, 0) / (dataArray.length - 100);
        
        const bassIntensity = bassSum / 255;
        const midIntensity = midSum / 255;
        const trebleIntensity = trebleSum / 255;

        // Mouse influence calculations
        const mouseRadius = 150;
        const maxForce = 5;

        // Update and draw each orb
        this.orbs.forEach((orb, index) => {
            // Mouse interaction
            const dx = this.mouseX - orb.x;
            const dy = this.mouseY - orb.y;
            const distToMouse = Math.sqrt(dx * dx + dy * dy);
            
            if (distToMouse < mouseRadius) {
                // Calculate repulsion force
                const force = (1 - distToMouse / mouseRadius) * maxForce;
                const angle = Math.atan2(dy, dx);
                
                // Apply force in opposite direction of mouse
                orb.speedX -= Math.cos(angle) * force * 0.1;
                orb.speedY -= Math.sin(angle) * force * 0.1;
            }

            // Get frequency data for this orb's range
            const freqRangeStart = Math.floor((index / this.orbs.length) * dataArray.length);
            const freqRangeEnd = Math.floor(((index + 1) / this.orbs.length) * dataArray.length);
            const orbFreqs = dataArray.slice(freqRangeStart, freqRangeEnd);
            const orbIntensity = orbFreqs.reduce((a, b) => a + b, 0) / orbFreqs.length / 255;

            // Update speed based on music
            const speedMultiplier = 1 + (bassIntensity * 2 + orbIntensity) * 1.5;
            orb.x += orb.speedX * speedMultiplier;
            orb.y += orb.speedY * speedMultiplier;

            // Add some subtle orbit around mouse when far
            if (distToMouse > mouseRadius * 2) {
                const orbitForce = 0.1;
                orb.speedX += Math.cos(this.phase + index) * orbitForce * orbIntensity;
                orb.speedY += Math.sin(this.phase + index) * orbitForce * orbIntensity;
            }

            // Bounce off edges with music-reactive bounce
            if (orb.x < orb.radius) {
                orb.x = orb.radius;
                orb.speedX = Math.abs(orb.speedX) * (1 + bassIntensity);
            } else if (orb.x > width - orb.radius) {
                orb.x = width - orb.radius;
                orb.speedX = -Math.abs(orb.speedX) * (1 + bassIntensity);
            }
            
            if (orb.y < orb.radius) {
                orb.y = orb.radius;
                orb.speedY = Math.abs(orb.speedY) * (1 + bassIntensity);
            } else if (orb.y > height - orb.radius) {
                orb.y = height - orb.radius;
                orb.speedY = -Math.abs(orb.speedY) * (1 + bassIntensity);
            }

            // Apply drag and limit speed
            orb.speedX *= 0.98;
            orb.speedY *= 0.98;
            const maxSpeed = 3 + bassIntensity * 4;
            const currentSpeed = Math.sqrt(orb.speedX * orb.speedX + orb.speedY * orb.speedY);
            if (currentSpeed > maxSpeed) {
                const scale = maxSpeed / currentSpeed;
                orb.speedX *= scale;
                orb.speedY *= scale;
            }

            // Draw the orb with music-reactive effects
            const pulseSize = 1 + orbIntensity * 0.5 + bassIntensity * 0.3;
            const glowSize = orb.radius * pulseSize;
            
            // Enhanced gradient with music reactivity
            const gradient = ctx.createRadialGradient(
                orb.x, orb.y, 0,
                orb.x, orb.y, glowSize
            );

            // Color based on frequency range and intensity
            const hue = (orb.baseHue + this.phase * 30 + bassIntensity * 30) % 360;
            const saturation = 70 + trebleIntensity * 30;
            const brightness = 50 + midIntensity * 30;
            
            gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${brightness}%, ${0.8 + orbIntensity * 0.2})`);
            gradient.addColorStop(0.6, `hsla(${hue + 30}, ${saturation - 10}%, ${brightness - 10}%, ${0.4 + bassIntensity * 0.3})`);
            gradient.addColorStop(1, `hsla(${hue + 60}, ${saturation}%, ${brightness}%, 0)`);

            // Draw orb with glow effect
            ctx.beginPath();
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 15 * (orbIntensity + bassIntensity);
            ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${brightness}%, ${orbIntensity})`;
            ctx.arc(orb.x, orb.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw connecting lines with music reactivity
            this.orbs.forEach((otherOrb, otherIndex) => {
                if (index < otherIndex) {
                    const dx = otherOrb.x - orb.x;
                    const dy = otherOrb.y - orb.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDistance = 150 * (1 + bassIntensity * 0.5);

                    if (distance < maxDistance) {
                        const lineOpacity = (1 - distance / maxDistance) * 0.3 * (bassIntensity + 0.2);
                        const lineWidth = (1 - distance / maxDistance) * 2 * (1 + bassIntensity);
                        
                        ctx.beginPath();
                        ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${brightness}%, ${lineOpacity})`;
                        ctx.lineWidth = lineWidth;
                        ctx.moveTo(orb.x, orb.y);
                        ctx.lineTo(otherOrb.x, otherOrb.y);
                        ctx.stroke();
                    }
                }
            });
        });

        // Update animation phase
        this.phase += 0.02 * (1 + bassIntensity * 0.5);
    }

    initOrbs() {
        const orbs = [];
        const numOrbs = 12;  // Reduced number of orbs

        for (let i = 0; i < numOrbs; i++) {
            orbs.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 15 + 10,  // Smaller radius range
                baseHue: (360 / numOrbs) * i,
                speedX: (Math.random() - 0.5) * 1.5,  // Reduced initial speed
                speedY: (Math.random() - 0.5) * 1.5
            });
        }
        return orbs;
    }

    drawFractalTree(dataArray) {
        this.clearCanvas();
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Basic audio reactivity
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const intensity = average / 255;

        // Draw a simple pattern that pulses with the music
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.4;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = maxRadius * (1 + intensity * 0.3);
            
            const x1 = centerX + Math.cos(angle + this.phase) * radius;
            const y1 = centerY + Math.sin(angle + this.phase) * radius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x1, y1);
            
            const hue = (this.phase * 50 + i * 45) % 360;
            ctx.strokeStyle = `hsla(${hue}, 80%, 50%, 0.6)`;
            ctx.lineWidth = 2 + intensity * 4;
            ctx.stroke();
            
            // Draw connecting lines
            for (let j = 1; j < 4; j++) {
                const innerRadius = radius * (j / 4);
                const x2 = centerX + Math.cos(angle + this.phase * 1.5) * innerRadius;
                const y2 = centerY + Math.sin(angle + this.phase * 1.5) * innerRadius;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = `hsla(${hue + j * 30}, 80%, 50%, ${0.3 + intensity * 0.4})`;
                ctx.stroke();
            }
        }

        // Update phase for animation
        this.phase += 0.02;
    }

    drawAuroraWaves(dataArray) {
        this.clearCanvas();
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Smooth audio analysis
        const bassSum = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const midSum = dataArray.slice(10, 100).reduce((a, b) => a + b, 0) / 90;
        const trebleSum = dataArray.slice(100).reduce((a, b) => a + b, 0) / (dataArray.length - 100);
        
        const bassIntensity = bassSum / 255;
        const midIntensity = midSum / 255;
        const trebleIntensity = trebleSum / 255;

        // Create multiple aurora layers
        const numLayers = 5;
        const baseAmplitude = height * 0.15;
        
        // Enhanced color palette
        const colorPalettes = [
            { hue: 280, sat: 90, light: 60 }, // Vibrant Purple
            { hue: 180, sat: 95, light: 55 }, // Bright Turquoise
            { hue: 320, sat: 85, light: 65 }, // Hot Pink
            { hue: 140, sat: 90, light: 50 }, // Electric Green
            { hue: 200, sat: 95, light: 60 }  // Deep Blue
        ];
        
        for (let layer = 0; layer < numLayers; layer++) {
            const layerOffset = (height / (numLayers + 1)) * (layer + 1);
            const waveSpeed = 0.001 + (layer * 0.0005);
            const frequency = 0.002 - (layer * 0.0002);
            
            // Create gradient for this layer
            const gradient = ctx.createLinearGradient(0, layerOffset - baseAmplitude, 0, layerOffset + baseAmplitude);
            
            // Calculate colors based on music and layer
            const palette = colorPalettes[layer % colorPalettes.length];
            const hueBase = (palette.hue + this.phase * 20) % 360;
            const hueShift = bassIntensity * 30;
            const saturation = palette.sat + trebleIntensity * 10;
            const brightness = palette.light + midIntensity * 40;
            
            // More vibrant gradient stops
            gradient.addColorStop(0, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0)`);
            gradient.addColorStop(0.2, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0.3)`);
            gradient.addColorStop(0.5, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0.7)`);
            gradient.addColorStop(0.8, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0.3)`);
            gradient.addColorStop(1, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0)`);

            ctx.beginPath();
            ctx.moveTo(0, layerOffset);

            // Draw smooth wave
            for (let x = 0; x <= width; x += 2) {
                const time = this.phase * waveSpeed;
                const waveFactor = Math.sin(x * frequency + time) + 
                                 Math.sin(x * frequency * 1.5 + time * 1.1) * 0.5 +
                                 Math.sin(x * frequency * 2 + time * 0.9) * 0.25;
                
                // Calculate wave amplitude based on music
                const amplitude = baseAmplitude * (1 + (bassIntensity * 0.5 + midIntensity * 0.3) * (1 - layer * 0.15));
                const y = layerOffset + waveFactor * amplitude;
                
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            // Complete the wave shape
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();

            // Apply gradient with enhanced glow
            ctx.fillStyle = gradient;
            ctx.fill();

            // Add intense glow effect
            ctx.shadowBlur = 30 * (1 + bassIntensity);
            ctx.shadowColor = `hsla(${hueBase}, ${saturation}%, ${brightness}%, ${0.5 + midIntensity * 0.5})`;
        }

        // Add enhanced floating particles
        const numParticles = 30; // Increased number of particles
        for (let i = 0; i < numParticles; i++) {
            const x = (width * i / numParticles + this.phase * 50) % width;
            const baseY = height * 0.3 + Math.sin(x * 0.01 + this.phase) * height * 0.1;
            const y = baseY + Math.sin(this.phase * 2 + i) * height * 0.05;
            
            const particleSize = 3 + bassIntensity * 5; // Larger particles
            const particleOpacity = 0.2 + midIntensity * 0.6; // More visible
            
            // Vibrant particle colors
            const particleHue = (this.phase * 30 + i * 20) % 360;
            ctx.beginPath();
            ctx.fillStyle = `hsla(${particleHue}, 100%, 70%, ${particleOpacity})`;
            ctx.arc(x, y, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Enhanced mouse interaction ripples
        if (this.mouseX && this.mouseY) {
            const rippleRadius = 120 + bassIntensity * 80; // Larger ripples
            const rippleGradient = ctx.createRadialGradient(
                this.mouseX, this.mouseY, 0,
                this.mouseX, this.mouseY, rippleRadius
            );
            
            const rippleHue = (this.phase * 30) % 360;
            rippleGradient.addColorStop(0, `hsla(${rippleHue}, 100%, 70%, ${0.3 + midIntensity * 0.3})`);
            rippleGradient.addColorStop(0.5, `hsla(${rippleHue + 30}, 100%, 60%, ${0.2 + midIntensity * 0.2})`);
            rippleGradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
            
            ctx.beginPath();
            ctx.fillStyle = rippleGradient;
            ctx.arc(this.mouseX, this.mouseY, rippleRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Update phase for smooth animation
        this.phase += 0.01 * (1 + bassIntensity * 0.5);
    }

    drawArctic(dataArray) {
        this.clearCanvas();
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Smooth audio analysis
        const bassSum = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const midSum = dataArray.slice(10, 100).reduce((a, b) => a + b, 0) / 90;
        const trebleSum = dataArray.slice(100).reduce((a, b) => a + b, 0) / (dataArray.length - 100);
        
        const bassIntensity = bassSum / 255;
        const midIntensity = midSum / 255;
        const trebleIntensity = trebleSum / 255;

        // Create multiple aurora layers
        const numLayers = 5;
        const baseAmplitude = height * 0.15;
        
        for (let layer = 0; layer < numLayers; layer++) {
            const layerOffset = (height / (numLayers + 1)) * (layer + 1);
            const waveSpeed = 0.001 + (layer * 0.0005);
            const frequency = 0.002 - (layer * 0.0002);
            
            // Create gradient for this layer
            const gradient = ctx.createLinearGradient(0, layerOffset - baseAmplitude, 0, layerOffset + baseAmplitude);
            
            // Calculate colors based on music and layer
            const hueBase = (this.phase * 10 + layer * 30) % 360;
            const hueShift = bassIntensity * 20;
            const saturation = 70 + trebleIntensity * 30;
            const brightness = 40 + midIntensity * 30;
            
            gradient.addColorStop(0, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0)`);
            gradient.addColorStop(0.2, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0.1)`);
            gradient.addColorStop(0.5, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0.3)`);
            gradient.addColorStop(0.8, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0.1)`);
            gradient.addColorStop(1, `hsla(${hueBase + hueShift}, ${saturation}%, ${brightness}%, 0)`);

            ctx.beginPath();
            ctx.moveTo(0, layerOffset);

            // Draw smooth wave
            for (let x = 0; x <= width; x += 2) {
                const time = this.phase * waveSpeed;
                const waveFactor = Math.sin(x * frequency + time) + 
                                 Math.sin(x * frequency * 1.5 + time * 1.1) * 0.5 +
                                 Math.sin(x * frequency * 2 + time * 0.9) * 0.25;
                
                // Calculate wave amplitude based on music
                const amplitude = baseAmplitude * (1 + (bassIntensity * 0.3 + midIntensity * 0.2) * (1 - layer * 0.15));
                const y = layerOffset + waveFactor * amplitude;
                
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            // Complete the wave shape
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();

            // Apply gradient
            ctx.fillStyle = gradient;
            ctx.fill();

            // Add subtle glow effect
            ctx.shadowBlur = 20 * (1 + bassIntensity);
            ctx.shadowColor = `hsla(${hueBase}, ${saturation}%, ${brightness}%, ${0.3 + midIntensity * 0.2})`;
        }

        // Add floating particles for extra effect
        const numParticles = 20;
        for (let i = 0; i < numParticles; i++) {
            const x = (width * i / numParticles + this.phase * 50) % width;
            const baseY = height * 0.3 + Math.sin(x * 0.01 + this.phase) * height * 0.1;
            const y = baseY + Math.sin(this.phase * 2 + i) * height * 0.05;
            
            const particleSize = 2 + bassIntensity * 3;
            const particleOpacity = 0.1 + midIntensity * 0.3;
            
            ctx.beginPath();
            ctx.fillStyle = `hsla(${(this.phase * 20 + i * 20) % 360}, 80%, 70%, ${particleOpacity})`;
            ctx.arc(x, y, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add subtle mouse interaction ripples
        if (this.mouseX && this.mouseY) {
            const rippleRadius = 100 + bassIntensity * 50;
            const rippleGradient = ctx.createRadialGradient(
                this.mouseX, this.mouseY, 0,
                this.mouseX, this.mouseY, rippleRadius
            );
            
            const rippleHue = (this.phase * 20) % 360;
            rippleGradient.addColorStop(0, `hsla(${rippleHue}, 70%, 60%, ${0.1 + midIntensity * 0.1})`);
            rippleGradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
            
            ctx.beginPath();
            ctx.fillStyle = rippleGradient;
            ctx.arc(this.mouseX, this.mouseY, rippleRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Update phase for smooth animation
        this.phase += 0.01 * (1 + bassIntensity * 0.5);
    }

    draw(dataArray) {
        switch (this.currentVisualization) {
            case 'waveform':
                this.drawWaveform(dataArray);
                break;
            case 'bars':
                this.drawBars(dataArray);
                break;
            case 'circular':
                this.drawCircular(dataArray);
                break;
            case 'arctic':
                this.drawArcticWaves(dataArray);
                break;
            case 'auroraWaves':
                this.drawAuroraWaves(dataArray);
                break;
            case 'spectrum':
                this.drawCircularSpectrum(dataArray);
                break;
            case 'dna':
                this.drawDNA(dataArray);
                break;
            case 'orbs':
                this.drawFloatingOrbs(dataArray);
                break;
            case 'dnaHelix':
                this.drawDNAHelix(dataArray);
                break;
            case 'fractalTree':
                this.drawFractalTree(dataArray);
                break;
            default:
                this.drawWaveform(dataArray);
        }
    }
}

// Initialize the visualizer when the page loads
window.addEventListener('load', () => {
    new MusicVisualizer();
});
