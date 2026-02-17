// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing StoopCrypt...');
    initializeApp();
});

function initializeApp() {
    console.log('StoopCrypt initializing...');
    
    // State variables
    let currentTab = 'file';
    let currentMode = 'encrypt';
    let selectedFile = null;
    let selectedFileName = '';
    let isProcessing = false;

    // Check if electronAPI is available
    if (!window.electronAPI) {
        console.error('❌ Electron API not available!');
        alert('Error: Electron API not available. Please restart the app.');
        return;
    }

    console.log('✅ Electron API available');

    // Get DOM elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const fileDrop = document.getElementById('file-drop');
    const fileInput = document.getElementById('file-input');
    const filePath = document.getElementById('file-path');
    const fileActionBtn = document.getElementById('file-action-btn');
    const textActionBtn = document.getElementById('text-action-btn');
    const copyBtn = document.getElementById('copy-btn');
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');

    console.log('DOM elements loaded:', {
        fileActionBtn: fileActionBtn ? 'found' : 'not found',
        textActionBtn: textActionBtn ? 'found' : 'not found',
        fileDrop: fileDrop ? 'found' : 'not found',
        fileInput: fileInput ? 'found' : 'not found',
        filePath: filePath ? 'found' : 'not found'
    });

    // Tab switching
    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Tab clicked:', btn.dataset.tab);
                
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                currentTab = btn.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                const tabContent = document.getElementById(`${currentTab}-tab`);
                if (tabContent) {
                    tabContent.classList.add('active');
                }
                
                // Reset UI when switching tabs
                resetUI();
                updateActionButtonText();
            });
        });
    }

    // Mode switching
    if (modeBtns.length > 0) {
        modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const container = e.target.closest('.tab-content');
                if (!container) return;
                
                console.log('Mode clicked:', btn.dataset.mode, 'in tab:', container.id);
                
                container.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                currentMode = btn.dataset.mode;
                updateActionButtonText();
            });
        });
    }

    // Update action button text based on current mode and tab
    function updateActionButtonText() {
        const fileBtn = document.getElementById('file-action-btn');
        const textBtn = document.getElementById('text-action-btn');
        
        if (fileBtn) {
            const icon = fileBtn.querySelector('i');
            const span = fileBtn.querySelector('span');
            if (icon && span) {
                if (currentMode === 'encrypt') {
                    icon.className = 'fas fa-lock';
                    span.textContent = 'Encrypt File';
                } else {
                    icon.className = 'fas fa-unlock-alt';
                    span.textContent = 'Decrypt File';
                }
            }
        }
        
        if (textBtn) {
            const icon = textBtn.querySelector('i');
            const span = textBtn.querySelector('span');
            if (icon && span) {
                if (currentMode === 'encrypt') {
                    icon.className = 'fas fa-lock';
                    span.textContent = 'Encrypt Text';
                } else {
                    icon.className = 'fas fa-unlock-alt';
                    span.textContent = 'Decrypt Text';
                }
            }
        }
    }

    // File drop area - FIXED: Use electronAPI.selectFile() instead of file.path
    if (fileDrop) {
        fileDrop.addEventListener('click', async () => {
            try {
                // Use Electron's file dialog
                const filePath_result = await window.electronAPI.selectFile();
                if (filePath_result) {
                    selectedFile = filePath_result;
                    selectedFileName = filePath_result.split('/').pop().split('\\').pop(); // Get filename from path
                    
                    console.log('File selected via dialog:', selectedFile);
                    
                    // Update the display
                    if (filePath) {
                        filePath.textContent = selectedFileName;
                        filePath.style.color = '#00ff88';
                        filePath.classList.add('animate__animated', 'animate__fadeIn');
                    }
                    
                    // Show confirmation
                    showNotification(`File selected: ${selectedFileName}`, 'success');
                }
            } catch (error) {
                console.error('Error selecting file:', error);
                showNotification('Error selecting file', 'error');
            }
        });

        fileDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDrop.style.borderColor = '#00ff88';
            fileDrop.style.transform = 'scale(1.02)';
        });

        fileDrop.addEventListener('dragleave', () => {
            fileDrop.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            fileDrop.style.transform = 'scale(1)';
        });

        fileDrop.addEventListener('drop', async (e) => {
            e.preventDefault();
            fileDrop.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            fileDrop.style.transform = 'scale(1)';
            
            const file = e.dataTransfer.files[0];
            if (file) {
                // For drag and drop, we need to get the path from the file object
                // In Electron, we can use the file.path property
                if (file.path) {
                    selectedFile = file.path;
                    selectedFileName = file.name;
                } else {
                    // Fallback: use the selectFile dialog
                    showNotification('Processing dropped file...', 'info');
                    selectedFile = await window.electronAPI.selectFile();
                    if (selectedFile) {
                        selectedFileName = selectedFile.split('/').pop().split('\\').pop();
                    }
                }
                
                console.log('File selected via drag/drop:', selectedFile);
                
                if (selectedFile) {
                    // Update the display
                    if (filePath) {
                        filePath.textContent = selectedFileName;
                        filePath.style.color = '#00ff88';
                        filePath.classList.add('animate__animated', 'animate__fadeIn');
                    }
                    
                    // Show confirmation
                    showNotification(`File selected: ${selectedFileName}`, 'success');
                }
            }
        });
    }

    // Hide the file input since we're using the dialog
    if (fileInput) {
        fileInput.style.display = 'none';
    }

    // Password visibility toggle
    if (togglePasswordBtns.length > 0) {
        togglePasswordBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                const icon = btn.querySelector('i');
                
                if (input && input.type === 'password') {
                    input.type = 'text';
                    if (icon) icon.className = 'far fa-eye-slash';
                } else if (input) {
                    input.type = 'password';
                    if (icon) icon.className = 'far fa-eye';
                }
            });
        });
    }

    // FILE ENCRYPTION/DECRYPTION
    if (fileActionBtn) {
        console.log('✅ Adding click listener to file action button');
        
        // Remove any existing listeners by cloning and replacing
        const newFileActionBtn = fileActionBtn.cloneNode(true);
        fileActionBtn.parentNode.replaceChild(newFileActionBtn, fileActionBtn);
        
        // Add new click listener
        newFileActionBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔵 FILE BUTTON CLICKED - Mode:', currentMode);
            console.log('Current selectedFile:', selectedFile);
            
            if (isProcessing) {
                console.log('Already processing, ignoring click');
                return;
            }
            
            // Get password
            const passwordInput = document.getElementById('file-password');
            if (!passwordInput) {
                console.error('Password input not found');
                showNotification('Password field not found', 'error');
                return;
            }
            
            const password = passwordInput.value;
            console.log('Password entered:', password ? '******' : 'empty');
            
            // Validate inputs with clear error messages
            if (!selectedFile) {
                console.log('No file selected - selectedFile is:', selectedFile);
                showNotification('Please select a file first - click the drop area', 'error');
                return;
            }
            
            if (!password) {
                console.log('No password entered');
                showNotification('Please enter a password', 'error');
                return;
            }
            
            // Start processing
            isProcessing = true;
            
            // Show progress
            const progressContainer = document.getElementById('progress-container');
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            
            if (progressContainer) progressContainer.style.display = 'block';
            if (progressBar) progressBar.style.width = '0%';
            if (progressText) progressText.textContent = '0%';
            
            try {
                // Update progress
                let progress = 0;
                const interval = setInterval(() => {
                    if (progress < 90) {
                        progress += 10;
                        if (progressBar) progressBar.style.width = `${progress}%`;
                        if (progressText) progressText.textContent = `${progress}%`;
                    }
                }, 200);
                
                // Call the appropriate API
                console.log('Calling API with:', {
                    filePath: selectedFile,
                    mode: currentMode,
                    passwordLength: password.length
                });
                
                let result;
                if (currentMode === 'encrypt') {
                    result = await window.electronAPI.encryptFile({
                        filePath: selectedFile,
                        password: password
                    });
                } else {
                    result = await window.electronAPI.decryptFile({
                        filePath: selectedFile,
                        password: password
                    });
                }
                
                console.log('API result:', result);
                
                // Handle result
                if (result && result.success) {
                    clearInterval(interval);
                    if (progressBar) progressBar.style.width = '100%';
                    if (progressText) progressText.textContent = '100%';
                    
                    setTimeout(() => {
                        showNotification(`✅ File ${currentMode}ed successfully!\nSaved to: ${result.path}`, 'success');
                        resetUI();
                    }, 500);
                } else {
                    throw new Error(result ? result.error : 'Unknown error occurred');
                }
                
            } catch (error) {
                console.error('❌ Error:', error);
                showNotification(`Error: ${error.message}`, 'error');
                if (progressContainer) progressContainer.style.display = 'none';
            } finally {
                isProcessing = false;
            }
        });
        
        console.log('✅ File button listener added successfully');
    } else {
        console.error('❌ File action button not found in DOM');
    }

    // Text encryption/decryption
    if (textActionBtn) {
        console.log('✅ Adding click listener to text action button');
        
        const newTextActionBtn = textActionBtn.cloneNode(true);
        textActionBtn.parentNode.replaceChild(newTextActionBtn, textActionBtn);
        
        newTextActionBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Text action button clicked, mode:', currentMode);
            
            if (isProcessing) return;
            
            const textInput = document.getElementById('text-input');
            const passwordInput = document.getElementById('text-password');
            const outputArea = document.getElementById('output-area');
            const outputText = document.getElementById('text-output');
            
            if (!textInput || !passwordInput) {
                console.error('Required fields not found');
                showNotification('Required fields not found', 'error');
                return;
            }
            
            const text = textInput.value;
            const password = passwordInput.value;
            
            if (!text) {
                showNotification('Please enter text', 'error');
                return;
            }
            
            if (!password) {
                showNotification('Please enter a password', 'error');
                return;
            }
            
            isProcessing = true;
            
            try {
                let result;
                
                if (currentMode === 'encrypt') {
                    result = await window.electronAPI.encryptText({
                        text: text,
                        password: password
                    });
                } else {
                    result = await window.electronAPI.decryptText({
                        encryptedData: text,
                        password: password
                    });
                }
                
                console.log('API result:', result);
                
                if (result && result.success) {
                    if (outputText) outputText.value = result.data;
                    if (outputArea) {
                        outputArea.style.display = 'block';
                        outputArea.classList.add('animate__animated', 'animate__fadeIn');
                    }
                    showNotification(`${currentMode === 'encrypt' ? 'Encrypted' : 'Decrypted'} successfully!`, 'success');
                } else {
                    throw new Error(result ? result.error : 'Unknown error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification(error.message, 'error');
            }
            
            isProcessing = false;
        });
    }

    // Copy button
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const outputText = document.getElementById('text-output');
            if (outputText) {
                outputText.select();
                document.execCommand('copy');
                showNotification('Copied to clipboard!', 'success');
            }
        });
    }

    // Window controls
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
    }
    
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }

    // Initialize UI components
    createParticles();
    
    // Initialize 3D visualization
    let scene, camera, renderer, cube;
    let animationId = null;
    
    function init3DVisualization() {
        if (typeof THREE === 'undefined') {
            console.log('THREE not available, skipping 3D visualization');
            return;
        }
        
        // Remove existing visualization if any
        const existingViz = document.getElementById('encryption-viz');
        if (existingViz) existingViz.remove();
        
        // Stop existing animation
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        const container = document.createElement('div');
        container.id = 'encryption-viz';
        document.body.appendChild(container);
        
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(300, 300);
        container.appendChild(renderer.domElement);
        
        // Create encryption visualization
        const geometry = new THREE.IcosahedronGeometry(1, 2);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff88,
            wireframe: true,
            emissive: 0x004422,
            transparent: true,
            opacity: 0.8
        });
        cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        // Add particles around the shape
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 1000;
        const posArray = new Float32Array(particlesCount * 3);
        
        for(let i = 0; i < particlesCount * 3; i += 3) {
            const radius = 2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            posArray[i] = radius * Math.sin(phi) * Math.cos(theta);
            posArray[i+1] = radius * Math.sin(phi) * Math.sin(theta);
            posArray[i+2] = radius * Math.cos(phi);
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.02,
            color: 0x00ff88,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);
        
        camera.position.z = 3;
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        // Start animation
        animate3D();
    }

    function animate3D() {
        if (!renderer || !scene || !camera) return;
        
        animationId = requestAnimationFrame(animate3D);
        
        if (cube) {
            cube.rotation.x += 0.005;
            cube.rotation.y += 0.01;
        }
        
        renderer.render(scene, camera);
    }

    init3DVisualization();

    // Notification system
    function showNotification(message, type) {
        console.log(`Notification [${type}]: ${message}`);
        
        // Remove any existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type} animate__animated animate__fadeInRight`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('animate__fadeOutRight');
                setTimeout(() => {
                    if (notification.parentNode) notification.remove();
                }, 500);
            }
        }, 3000);
    }

    function resetUI() {
        selectedFile = null;
        selectedFileName = '';
        if (filePath) {
            filePath.textContent = '';
            filePath.style.color = '';
        }
        const filePassword = document.getElementById('file-password');
        if (filePassword) filePassword.value = '';
        const textInput = document.getElementById('text-input');
        if (textInput) textInput.value = '';
        const textPassword = document.getElementById('text-password');
        if (textPassword) textPassword.value = '';
        const outputArea = document.getElementById('output-area');
        if (outputArea) outputArea.style.display = 'none';
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) progressContainer.style.display = 'none';
    }

    // Particles background
    function createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;
        
        // Clear existing particles
        particlesContainer.innerHTML = '';
        
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 5 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDuration = `${Math.random() * 10 + 5}s`;
            particle.style.animationDelay = `${Math.random() * 5}s`;
            particlesContainer.appendChild(particle);
        }
    }

    // Add notification styles if not present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 60px;
                right: 20px;
                padding: 15px 25px;
                background: rgba(10, 10, 15, 0.95);
                border-left: 4px solid;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 1000;
                backdrop-filter: blur(10px);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                color: white;
                font-family: 'Segoe UI', sans-serif;
                white-space: pre-line;
                max-width: 400px;
                word-wrap: break-word;
            }
            
            .notification.success {
                border-left-color: #00ff88;
            }
            
            .notification.success i {
                color: #00ff88;
            }
            
            .notification.error {
                border-left-color: #ff4444;
            }
            
            .notification.error i {
                color: #ff4444;
            }
            
            .notification i {
                font-size: 20px;
            }
            
            .animate__fadeInRight {
                animation: fadeInRight 0.3s;
            }
            
            .animate__fadeOutRight {
                animation: fadeOutRight 0.3s forwards;
            }
            
            @keyframes fadeInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes fadeOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }

            .particle {
                position: absolute;
                background: rgba(0, 255, 136, 0.1);
                border-radius: 50%;
                pointer-events: none;
                animation: float linear infinite;
            }

            @keyframes float {
                from {
                    transform: translateY(100vh) scale(0);
                }
                to {
                    transform: translateY(-100vh) scale(1);
                }
            }

            #encryption-viz {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                height: 300px;
                z-index: 100;
                pointer-events: none;
                opacity: 0.3;
                transition: opacity 0.3s;
            }

            #encryption-viz:hover {
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }

    // App ready event
    if (window.electronAPI && window.electronAPI.onAppReady) {
        window.electronAPI.onAppReady(() => {
            console.log('✅ App ready event received');
            showNotification('Welcome to StoopCrypt!', 'success');
        });
    } else {
        // Fallback if onAppReady is not available
        setTimeout(() => {
            showNotification('Welcome to StoopCrypt!', 'success');
        }, 1000);
    }

    console.log('✅ StoopCrypt initialization complete');
}
