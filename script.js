document.addEventListener('DOMContentLoaded', () => {
    // Move variable declarations to the top
    const windows = new Map();
    let activeWindow = null;
    let zIndex = 1000;
    let selectedFile = null;
    let currentApp = null;
    let fileSystem = loadFileSystem();
    let aiAssistantOpen = true;
    let aiAssistantMessages = [
        { role: 'system', text: 'Hello! I\'m your AI assistant. How can I help you today?' }
    ];
    let wallpaper = localStorage.getItem('wallpaper') || 'wallpaper.png';
    let terminalCommands = {
        help: () => "Available commands: help, ls, cat, echo, clear, date, whoami, mkdir, touch, rm",
        ls: (dir) => {
            const files = Object.keys(fileSystem);
            return files.length > 0 ? files.join('\n') : "No files found";
        },
        cat: (filename) => {
            if (!filename) return "Please specify a filename";
            return fileSystem[filename] || `File ${filename} not found`;
        },
        echo: (...args) => args.join(' '),
        clear: () => {
            const terminal = document.querySelector(`[data-app="terminal"] .terminal-output`);
            if (terminal) terminal.innerHTML = '';
            return '';
        },
        date: () => new Date().toString(),
        whoami: () => "user@baseos",
        mkdir: (dirname) => {
            if (!dirname) return "Please specify a directory name";
            return "Directory created (simulated)";
        },
        touch: (filename) => {
            if (!filename) return "Please specify a filename";
            fileSystem[filename] = "";
            saveFileSystem();
            return `File ${filename} created`;
        },
        rm: (filename) => {
            if (!filename) return "Please specify a filename";
            if (fileSystem[filename]) {
                delete fileSystem[filename];
                saveFileSystem();
                return `File ${filename} removed`;
            }
            return `File ${filename} not found`;
        }
    };

    // Function to render AI messages
    function renderAIMessages(container) {
        // Clear container
        container.innerHTML = '';
        
        // Add each message
        aiAssistantMessages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `ai-message ${msg.role}`;
            
            // Create avatar
            const avatar = document.createElement('div');
            avatar.className = 'ai-avatar';
            if (msg.role === 'system') {
                avatar.innerHTML = `<img src="assistant.png" alt="AI">`;
            } else {
                avatar.innerHTML = `<img src="user.png" alt="User">`;
            }
            
            // Create message text
            const messageText = document.createElement('div');
            messageText.className = 'ai-message-text';
            messageText.innerHTML = formatAIMessage(msg.text);
            
            // Add to message element
            messageEl.appendChild(avatar);
            messageEl.appendChild(messageText);
            container.appendChild(messageEl);
        });
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    // Function to format AI message text with markdown-like formatting
    function formatAIMessage(text) {
        // Convert URLs to links
        text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        // Bold text between **
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic text between *
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code blocks
        text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Inline code
        text = text.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Convert line breaks to <br>
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    // Function to send a message to the AI assistant
    function sendAIMessage(message, container) {
        if (!message.trim()) return;
        
        // Add user message
        aiAssistantMessages.push({ role: 'user', text: message });
        
        // Update UI
        renderAIMessages(container);
        
        // Generate AI response
        setTimeout(() => {
            const response = generateAIResponse(message);
            aiAssistantMessages.push({ role: 'system', text: response });
            renderAIMessages(container);
        }, 500);
    }

    // Function to generate AI responses
    function generateAIResponse(message) {
        // Convert message to lowercase for easier matching
        const lower = message.toLowerCase();
        
        // Simple responses based on keywords
        if (lower.includes('hello') || lower.includes('hi ') || lower === 'hi') {
            return "Hello! How can I help you today?";
        }
        
        if (lower.includes('how are you')) {
            return "I'm doing well, thank you for asking! I'm here to assist you with any questions or tasks.";
        }
        
        if (lower.includes('your name')) {
            return "I'm the BaseOS AI Assistant, designed to help you navigate and use this operating system.";
        }
        
        if (lower.includes('time') && (lower.includes('what') || lower.includes('current'))) {
            return `The current time is ${new Date().toLocaleTimeString()}.`;
        }
        
        if (lower.includes('date') && (lower.includes('what') || lower.includes('current') || lower.includes('today'))) {
            return `Today's date is ${new Date().toLocaleDateString()}.`;
        }
        
        if (lower.includes('weather')) {
            return "I don't have access to real-time weather data in this demo, but in a full implementation, I could show you the weather forecast.";
        }
        
        if (lower.includes('joke') || lower.includes('funny')) {
            const jokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "Why did the computer go to the doctor? Because it had a virus!",
                "What's a computer's favorite snack? Microchips!",
                "Why did the computer keep freezing? It left its Windows open!",
                "How many programmers does it take to change a light bulb? None, that's a hardware problem."
            ];
            return jokes[Math.floor(Math.random() * jokes.length)];
        }
        
        if (lower.includes('open') || lower.includes('launch') || lower.includes('start')) {
            const apps = ['finder', 'browser', 'notes', 'calculator', 'terminal', 'settings'];
            for (const app of apps) {
                if (lower.includes(app)) {
                    launchApp(app);
                    return `I've opened the ${app} app for you.`;
                }
            }
        }
        
        if (lower.includes('search for') || lower.includes('search')) {
            const searchTerm = message.replace(/search for|search/i, '').trim();
            if (searchTerm) {
                launchApp('browser');
                const win = windows.get('browser');
                const addressBar = win.element.querySelector('.browser-address');
                const goButton = win.element.querySelector('.browser-go');
                
                addressBar.value = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
                goButton.click();
                
                return `I've started a search for "${searchTerm}" in the browser.`;
            }
        }
        
        if (lower.includes('create file') || lower.includes('new file')) {
            launchApp('notes');
            return "I've opened the Notes app for you to create a new file.";
        }
        
        if (lower.includes('calculate') || lower.includes('what is') || lower.match(/[0-9]+\s*[\+\-\*\/]\s*[0-9]+/)) {
            let calculation = message.replace(/calculate|what is/i, '').trim();
            try {
                calculation = calculation.replace(/x/gi, '*');
                const result = eval(calculation);
                return `The result of ${calculation} is ${result}.`;
            } catch (e) {
                return "I couldn't process that calculation. Try a simpler equation.";
            }
        }
        
        if (lower.includes('help') || lower.includes('can you do')) {
            return `I can help you with various tasks in BaseOS:
            
- **Open apps**: Ask me to open any application like Browser, Notes, Calculator, etc.
- **Search the web**: Say "search for [topic]" and I'll open a search in the browser
- **Simple calculations**: Ask me to calculate something
- **Create files**: Ask me to create a new file
- **Basic information**: Ask about the time, date, or request a joke
- **System help**: Ask about how to use different features in BaseOS

What would you like help with today?`;
        }
        
        // Default response if no specific matches
        return "I'm here to help with your questions about BaseOS and assist with tasks. If you're not sure what to ask, try saying 'What can you do?' for some suggestions.";
    }

    // Add null check for desktop element
    const desktop = document.getElementById('desktop');
    if (desktop) {
        desktop.style.background = `url('${wallpaper}') center/cover`;
    }

    // File system functions
    function loadFileSystem() {
        const fs = localStorage.getItem('fileSystem');
        return fs ? JSON.parse(fs) : {
            'welcome.txt': 'Welcome to BaseOS!\nThis is a simple file system simulation.',
            'notes.md': '# My Notes\n\nThis is a markdown file that you can edit.',
            'todo.txt': '- Add more apps\n- Finish the project\n- Learn more about web development'
        };
    }

    function saveFileSystem() {
        localStorage.setItem('fileSystem', JSON.stringify(fileSystem));
    }

    // Window class with app-specific functionality
    class Window {
        constructor(app) {
            this.app = app;
            this.content = '';
            this.filename = '';
            this.element = document.createElement('div');
            this.element.className = 'window';
            this.element.dataset.app = app;
            
            // Random position with limits to keep windows on screen
            const maxX = window.innerWidth - 500;
            const maxY = window.innerHeight - 400;
            this.element.style.left = `${Math.random() * maxX + 50}px`;
            this.element.style.top = `${Math.random() * maxY + 50}px`;
            this.element.style.width = '600px';
            this.element.style.height = '400px';
            
            // Create window header
            const header = document.createElement('div');
            header.className = 'window-header';
            header.innerHTML = `
                <div class="window-button window-close"></div>
                <div class="window-button window-minimize"></div>
                <div class="window-button window-maximize"></div>
                <div class="window-title">${this.getAppTitle(app)}</div>
            `;
            
            // Create window content
            const content = document.createElement('div');
            content.className = 'window-content';
            
            // Add app-specific content
            this.setupAppContent(content);
            
            this.element.appendChild(header);
            this.element.appendChild(content);
            
            // Add to DOM
            document.getElementById('windows').appendChild(this.element);
            
            // Make window draggable
            this.makeDraggable();
            
            // Add window controls
            header.querySelector('.window-close').onclick = () => this.close();
            header.querySelector('.window-maximize').onclick = () => this.toggleMaximize();
            header.querySelector('.window-minimize').onclick = () => this.minimize();
            
            // Focus window on click
            this.element.addEventListener('mousedown', () => this.focus());
            
            // Set up app-specific behavior after adding to DOM
            this.initAppBehavior();
        }

        getAppTitle(app) {
            const titles = {
                finder: 'File Explorer',
                browser: 'Web Browser',
                notes: 'Notes',
                calculator: 'Calculator',
                settings: 'System Settings',
                terminal: 'Terminal',
                trash: 'Trash',
                assistant: 'AI Assistant'
            };
            return titles[app] || app.charAt(0).toUpperCase() + app.slice(1);
        }

        setupAppContent(container) {
            switch(this.app) {
                case 'vsquares':
                    container.innerHTML = `<iframe src="index.html" style="width:100%; height:100%; border:none;"></iframe>`;
                    break;

                case 'chat':
                    container.innerHTML = `<iframe src="https://webchat.oftc.net" style="width:100%; height:100%; border:none;"></iframe>`;
                    break;

                case 'games':
                    container.innerHTML = `<iframe src="https://chromedino.com" style="width:100%; height:100%; border:none;"></iframe>`;
                    break;

                case 'calendar':
                    container.innerHTML = `
                        <div style="display:flex;flex-direction:column;height:100%;">
                            <div>
                                <input type="date" id="calendar-date">
                                <input type="text" id="calendar-event" placeholder="Event">
                                <button id="calendar-add">Add</button>
                            </div>
                            <ul id="calendar-events" style="flex:1;overflow:auto;margin-top:10px;"></ul>
                        </div>
                    `;
                    break;

                case 'write':
                    container.innerHTML = `
                        <div contenteditable="true" style="height:100%;padding:10px;border:1px solid #ccc;overflow:auto;background:white;">
                            Start writing...
                        </div>
                    `;
                    break;

                case 'graphs':
                    container.innerHTML = `
                        <table style="width:100%;height:100%;border-collapse:collapse;">
                            <tr><th contenteditable style="border:1px solid #ccc;">A</th><th contenteditable style="border:1px solid #ccc;">B</th><th contenteditable style="border:1px solid #ccc;">C</th><th contenteditable style="border:1px solid #ccc;">D</th><th contenteditable style="border:1px solid #ccc;">E</th></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                        </table>
                    `;
                    break;

                case 'appstore':
                    const url = prompt("Enter website URL for the new app:");
                    if (url) {
                        const appId = `custom-${Date.now()}`;
                        const title = url.replace(/https?:\/\//, '').split('/')[0];
                        container.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>`;
                        document.querySelector('#dock').innerHTML += `
                            <div class="dock-icon" data-app="${appId}">
                                <img src="browser.png">
                            </div>
                        `;
                        document.querySelector('#desktop-icons').innerHTML += `
                            <div class="desktop-icon" data-app="${appId}">
                                <img src="browser.png">
                                <span>${title}</span>
                            </div>
                        `;
                        document.querySelectorAll(`[data-app="${appId}"]`).forEach(icon => {
                            icon.onclick = () => launchApp(appId);
                        });
                        windows.set(appId, this);
                    }
                    break;
    
                case 'finder':
                    container.innerHTML = `
                        <div class="explorer-view">
                            <div class="sidebar">
                                <div class="sidebar-item">Documents</div>
                                <div class="sidebar-item">Pictures</div>
                                <div class="sidebar-item">Music</div>
                                <div class="sidebar-item">Videos</div>
                                <div class="sidebar-item">Downloads</div>
                            </div>
                            <div class="file-browser"></div>
                        </div>
                    `;
                    break;
                    
                case 'browser':
                    container.innerHTML = `
                        <div class="browser-content">
                            <div class="browser-toolbar">
                                <button class="browser-back">←</button>
                                <button class="browser-forward">→</button>
                                <button class="browser-refresh">↻</button>
                                <input type="text" class="browser-address" value="https://example.com">
                                <button class="browser-go">Go</button>
                            </div>
                            <iframe class="browser-frame" src="https://example.com" sandbox="allow-same-origin allow-scripts"></iframe>
                        </div>
                    `;
                    break;
                    
                case 'notes':
                    container.innerHTML = `
                        <div class="notes-content">
                            <div class="notes-toolbar">
                                <button class="notes-new">New</button>
                                <button class="notes-open">Open</button>
                                <button class="notes-save">Save</button>
                                <select class="notes-format">
                                    <option value="text">Plain Text</option>
                                    <option value="markdown">Markdown</option>
                                </select>
                            </div>
                            <div class="notes-editor">
                                <textarea placeholder="Type your notes here..."></textarea>
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'calculator':
                    container.innerHTML = `
                        <div class="calculator-content">
                            <div class="calculator-display">0</div>
                            <div class="calculator-btn clear">C</div>
                            <div class="calculator-btn">±</div>
                            <div class="calculator-btn">%</div>
                            <div class="calculator-btn operator">÷</div>
                            <div class="calculator-btn">7</div>
                            <div class="calculator-btn">8</div>
                            <div class="calculator-btn">9</div>
                            <div class="calculator-btn operator">×</div>
                            <div class="calculator-btn">4</div>
                            <div class="calculator-btn">5</div>
                            <div class="calculator-btn">6</div>
                            <div class="calculator-btn operator">-</div>
                            <div class="calculator-btn">1</div>
                            <div class="calculator-btn">2</div>
                            <div class="calculator-btn">3</div>
                            <div class="calculator-btn operator">+</div>
                            <div class="calculator-btn" style="grid-column: span 2;">0</div>
                            <div class="calculator-btn">.</div>
                            <div class="calculator-btn equal">=</div>
                        </div>
                    `;
                    break;
                    
                case 'settings':
                    container.innerHTML = `
                        <div class="settings-content">
                            <h2>System Settings</h2>
                            
                            <div class="settings-section">
                                <h3>Appearance</h3>
                                <div class="settings-option">
                                    <label>Wallpaper</label>
                                    <div class="wallpaper-options">
                                        <div class="wallpaper-option" style="background-image: url('wallpaper.png')" data-wallpaper="wallpaper.png"></div>
                                        <div class="wallpaper-option" style="background-color: #1e88e5" data-wallpaper="blue"></div>
                                        <div class="wallpaper-option" style="background-color: #43a047" data-wallpaper="green"></div>
                                        <div class="wallpaper-option" style="background-color: #e53935" data-wallpaper="red"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="settings-section">
                                <h3>Terminal</h3>
                                <div class="settings-option">
                                    <label>Add Custom Command</label>
                                    <input type="text" id="command-name" placeholder="Command name">
                                    <input type="text" id="command-output" placeholder="Command output">
                                    <button id="add-command">Add</button>
                                </div>
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'terminal':
                    container.innerHTML = `
                        <div class="terminal-content">
                            <div class="terminal-output">Welcome to BaseOS Terminal
Type 'help' to see available commands</div>
                            <div class="terminal-prompt">
                                <div class="terminal-prompt-text">user@baseos:~$</div>
                                <input type="text" class="terminal-input">
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'trash':
                    container.innerHTML = `
                        <div class="explorer-view">
                            <div class="file-browser"></div>
                        </div>
                        <div style="padding: 10px;">
                            <button id="empty-trash">Empty Trash</button>
                        </div>
                    `;
                    break;
                    
                case 'assistant':
                    container.innerHTML = `
                        <div class="ai-assistant-content">
                            <div class="ai-messages-container"></div>
                            <div class="ai-input-container">
                                <input type="text" class="ai-input" placeholder="Ask me anything...">
                                <button class="ai-send-btn">Send</button>
                            </div>
                        </div>
                    `;
                    break;
                    
                default:
                    container.innerHTML = `<div>Welcome to ${this.app}</div>`;
            }
        }

        initAppBehavior() {
            switch(this.app) {
                case 'vsquares':
                    container.innerHTML = `<iframe src="index.html" style="width:100%; height:100%; border:none;"></iframe>`;
                    break;

                case 'chat':
                    container.innerHTML = `<iframe src="https://webchat.oftc.net" style="width:100%; height:100%; border:none;"></iframe>`;
                    break;

                case 'games':
                    container.innerHTML = `<iframe src="https://chromedino.com" style="width:100%; height:100%; border:none;"></iframe>`;
                    break;

                case 'calendar':
                    container.innerHTML = `
                        <div style="display:flex;flex-direction:column;height:100%;">
                            <div>
                                <input type="date" id="calendar-date">
                                <input type="text" id="calendar-event" placeholder="Event">
                                <button id="calendar-add">Add</button>
                            </div>
                            <ul id="calendar-events" style="flex:1;overflow:auto;margin-top:10px;"></ul>
                        </div>
                    `;
                    break;

                case 'write':
                    container.innerHTML = `
                        <div contenteditable="true" style="height:100%;padding:10px;border:1px solid #ccc;overflow:auto;background:white;">
                            Start writing...
                        </div>
                    `;
                    break;

                case 'graphs':
                    container.innerHTML = `
                        <table style="width:100%;height:100%;border-collapse:collapse;">
                            <tr><th contenteditable style="border:1px solid #ccc;">A</th><th contenteditable style="border:1px solid #ccc;">B</th><th contenteditable style="border:1px solid #ccc;">C</th><th contenteditable style="border:1px solid #ccc;">D</th><th contenteditable style="border:1px solid #ccc;">E</th></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                            <tr><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td><td contenteditable style="border:1px solid #ccc;"></td></tr>
                        </table>
                    `;
                    break;

                case 'appstore':
                    const url = prompt("Enter website URL for the new app:");
                    if (url) {
                        const appId = `custom-${Date.now()}`;
                        const title = url.replace(/https?:\/\//, '').split('/')[0];
                        container.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>`;
                        document.querySelector('#dock').innerHTML += `
                            <div class="dock-icon" data-app="${appId}">
                                <img src="browser.png">
                            </div>
                        `;
                        document.querySelector('#desktop-icons').innerHTML += `
                            <div class="desktop-icon" data-app="${appId}">
                                <img src="browser.png">
                                <span>${title}</span>
                            </div>
                        `;
                        document.querySelectorAll(`[data-app="${appId}"]`).forEach(icon => {
                            icon.onclick = () => launchApp(appId);
                        });
                        windows.set(appId, this);
                    }
                    break;
    
                case 'finder':
                    this.updateFileBrowser();
                    break;
                    
                case 'browser':
                    const addressBar = this.element.querySelector('.browser-address');
                    const goButton = this.element.querySelector('.browser-go');
                    const iframe = this.element.querySelector('.browser-frame');
                    
                    goButton.addEventListener('click', () => {
                        let url = addressBar.value;
                        if (!url.startsWith('http')) {
                            url = 'https://' + url;
                            addressBar.value = url;
                        }
                        iframe.src = url;
                    });
                    
                    addressBar.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            goButton.click();
                        }
                    });
                    
                    this.element.querySelector('.browser-refresh').addEventListener('click', () => {
                        iframe.src = iframe.src;
                    });
                    
                    break;
                    
                case 'notes':
                    const textarea = this.element.querySelector('textarea');
                    const saveBtn = this.element.querySelector('.notes-save');
                    const openBtn = this.element.querySelector('.notes-open');
                    const newBtn = this.element.querySelector('.notes-new');
                    const formatSelect = this.element.querySelector('.notes-format');
                    
                    saveBtn.addEventListener('click', () => {
                        this.content = textarea.value;
                        showSaveDialog();
                    });
                    
                    openBtn.addEventListener('click', () => {
                        showOpenDialog();
                    });
                    
                    newBtn.addEventListener('click', () => {
                        textarea.value = '';
                        this.filename = '';
                        this.content = '';
                    });
                    
                    break;
                    
                case 'calculator':
                    const display = this.element.querySelector('.calculator-display');
                    const buttons = this.element.querySelectorAll('.calculator-btn');
                    let currentValue = '0';
                    let storedValue = null;
                    let currentOperator = null;
                    let resetOnNextInput = false;
                    
                    buttons.forEach(button => {
                        button.addEventListener('click', () => {
                            const value = button.textContent;
                            
                            if (value === 'C') {
                                currentValue = '0';
                                storedValue = null;
                                currentOperator = null;
                                resetOnNextInput = false;
                            } else if (value === '=') {
                                if (storedValue !== null && currentOperator) {
                                    currentValue = calculate(storedValue, parseFloat(currentValue), currentOperator);
                                    storedValue = null;
                                    currentOperator = null;
                                    resetOnNextInput = true;
                                }
                            } else if (['+', '-', '×', '÷'].includes(value)) {
                                if (storedValue !== null && currentOperator && !resetOnNextInput) {
                                    currentValue = calculate(storedValue, parseFloat(currentValue), currentOperator);
                                }
                                storedValue = parseFloat(currentValue);
                                currentOperator = value;
                                resetOnNextInput = true;
                            } else if (value === '±') {
                                currentValue = (parseFloat(currentValue) * -1).toString();
                            } else if (value === '%') {
                                currentValue = (parseFloat(currentValue) / 100).toString();
                            } else if (value === '.') {
                                if (resetOnNextInput) {
                                    currentValue = '0.';
                                    resetOnNextInput = false;
                                } else if (!currentValue.includes('.')) {
                                    currentValue += '.';
                                }
                            } else { // numbers
                                if (currentValue === '0' || resetOnNextInput) {
                                    currentValue = value;
                                    resetOnNextInput = false;
                                } else {
                                    currentValue += value;
                                }
                            }
                            
                            display.textContent = currentValue;
                        });
                    });
                    
                    function calculate(a, b, operator) {
                        switch(operator) {
                            case '+': return (a + b).toString();
                            case '-': return (a - b).toString();
                            case '×': return (a * b).toString();
                            case '÷': return (a / b).toString();
                            default: return b.toString();
                        }
                    }
                    break;
                    
                case 'settings':
                    // Set active wallpaper
                    const activeWallpaper = document.querySelector(`.wallpaper-option[data-wallpaper="${wallpaper}"]`);
                    if (activeWallpaper) {
                        activeWallpaper.classList.add('active');
                    }
                    
                    // Wallpaper selection
                    const wallpaperOptions = this.element.querySelectorAll('.wallpaper-option');
                    wallpaperOptions.forEach(option => {
                        option.addEventListener('click', () => {
                            const newWallpaper = option.dataset.wallpaper;
                            
                            // Update active class
                            wallpaperOptions.forEach(o => o.classList.remove('active'));
                            option.classList.add('active');
                            
                            // Set wallpaper
                            if (newWallpaper.endsWith('.png')) {
                                document.getElementById('desktop').style.background = `url('${newWallpaper}') center/cover`;
                            } else {
                                document.getElementById('desktop').style.background = newWallpaper;
                            }
                            
                            // Save preference
                            wallpaper = newWallpaper;
                            localStorage.setItem('wallpaper', newWallpaper);
                        });
                    });
                    
                    // Custom terminal commands
                    const addCommandBtn = this.element.querySelector('#add-command');
                    if (addCommandBtn) {
                        addCommandBtn.addEventListener('click', () => {
                            const commandName = this.element.querySelector('#command-name').value.trim();
                            const commandOutput = this.element.querySelector('#command-output').value;
                            
                            if (commandName) {
                                terminalCommands[commandName] = () => commandOutput;
                                this.element.querySelector('#command-name').value = '';
                                this.element.querySelector('#command-output').value = '';
                                alert(`Command "${commandName}" added successfully`);
                            }
                        });
                    }
                    break;
                    
                case 'terminal':
                    const input = this.element.querySelector('.terminal-input');
                    const output = this.element.querySelector('.terminal-output');
                    
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            const command = input.value.trim();
                            input.value = '';
                            
                            // Add command to output
                            output.innerHTML += `\n<div>user@baseos:~$ ${command}</div>`;
                            
                            // Process command
                            if (command) {
                                const parts = command.split(' ');
                                const cmd = parts[0];
                                const args = parts.slice(1);
                                
                                if (terminalCommands[cmd]) {
                                    const result = terminalCommands[cmd](...args);
                                    if (result) {
                                        output.innerHTML += `<div>${result}</div>`;
                                    }
                                } else {
                                    output.innerHTML += `<div>Command not found: ${cmd}</div>`;
                                }
                            }
                            
                            // Scroll to bottom
                            output.scrollTop = output.scrollHeight;
                        }
                    });
                    
                    // Focus input when terminal is focused
                    this.element.addEventListener('click', () => {
                        input.focus();
                    });
                    
                    // Initial focus
                    setTimeout(() => input.focus(), 0);
                    break;
                    
                case 'trash':
                    this.updateTrashBrowser();
                    
                    const emptyTrashBtn = this.element.querySelector('#empty-trash');
                    emptyTrashBtn.addEventListener('click', () => {
                        if (confirm('Are you sure you want to permanently delete all items in the trash?')) {
                            // In a real system, we'd delete trash items here
                            // For now, just update the view
                            this.updateTrashBrowser(true);
                        }
                    });
                    break;
                    
                case 'assistant':
                    const messagesContainer = this.element.querySelector('.ai-messages-container');
                    const aiInput = this.element.querySelector('.ai-input');
                    const sendBtn = this.element.querySelector('.ai-send-btn');
                    
                    // Render existing messages
                    renderAIMessages(messagesContainer);
                    
                    // Send button click handler
                    sendBtn.addEventListener('click', () => {
                        sendAIMessage(aiInput.value, messagesContainer);
                        aiInput.value = '';
                    });
                    
                    // Enter key handler
                    aiInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            sendAIMessage(aiInput.value, messagesContainer);
                            aiInput.value = '';
                        }
                    });
                    
                    // Initial focus
                    setTimeout(() => aiInput.focus(), 0);
                    break;
            }
        }

updateFileBrowser() {
            const browser = this.element.querySelector('.file-browser');
            if (!browser) return;
            
            browser.innerHTML = '';
            
            // Add files from file system
            Object.keys(fileSystem).forEach(filename => {
                const file = document.createElement('div');
                file.className = 'file-item';
                file.dataset.filename = filename;
                
                const icon = document.createElement('img');
                icon.className = 'file-icon';
                icon.src = filename.endsWith('.md') ? 'notes.png' : 'notes.png';
                
                const name = document.createElement('div');
                name.className = 'file-name';
                name.textContent = filename;
                
                file.appendChild(icon);
                file.appendChild(name);
                browser.appendChild(file);
                
                // Double-click to open file
                file.addEventListener('dblclick', () => {
                    openFile(filename);
                });
            });
        }

        updateTrashBrowser(empty = false) {
            const browser = this.element.querySelector('.file-browser');
            if (!browser) return;
            
            if (empty) {
                browser.innerHTML = '<div style="padding: 20px;">Trash is empty</div>';
                return;
            }
            
            browser.innerHTML = '<div style="padding: 20px;">Trash is empty</div>';
            // In a real system, we'd show deleted files here
        }

        makeDraggable() {
            const header = this.element.querySelector('.window-header');
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;

            header.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('window-button')) return;
                
                isDragging = true;
                initialX = e.clientX - this.element.offsetLeft;
                initialY = e.clientY - this.element.offsetTop;
                this.focus();
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    
                    // Keep window within viewport bounds
                    currentX = Math.max(0, Math.min(currentX, window.innerWidth - this.element.offsetWidth));
                    currentY = Math.max(0, Math.min(currentY, window.innerHeight - this.element.offsetHeight));
                    
                    this.element.style.left = `${currentX}px`;
                    this.element.style.top = `${currentY}px`;
                }
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }

        focus() {
            this.element.style.zIndex = ++zIndex;
            activeWindow = this;
            currentApp = this.app;
        }

        close() {
            this.element.remove();
            windows.delete(this.app);
            if (activeWindow === this) {
                activeWindow = null;
            }
        }

        minimize() {
            this.element.classList.add('hidden');
            // In a full implementation, we'd show this in a taskbar
        }

        toggleMaximize() {
            if (this.element.classList.contains('maximized')) {
                // Restore previous size and position
                this.element.classList.remove('maximized');
                this.element.style.width = this.savedWidth || '600px';
                this.element.style.height = this.savedHeight || '400px';
                this.element.style.left = this.savedLeft || '100px';
                this.element.style.top = this.savedTop || '50px';
            } else {
                // Save current size and position
                this.savedWidth = this.element.style.width;
                this.savedHeight = this.element.style.height;
                this.savedLeft = this.element.style.left;
                this.savedTop = this.element.style.top;
                
                // Maximize
                this.element.classList.add('maximized');
                this.element.style.width = '100%';
                this.element.style.height = 'calc(100% - 30px)';
                this.element.style.left = '0';
                this.element.style.top = '30px';
            }
        }
    }

    // Handle app launching
    function launchApp(appName) {
        if (!windows.has(appName)) {
            const window = new Window(appName);
            windows.set(appName, window);
            window.focus();
        } else {
            const win = windows.get(appName);
            win.element.classList.remove('hidden');
            win.focus();
        }
    }

    // Add click handlers for dock and desktop icons
    document.querySelectorAll('.dock-icon, .desktop-icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const app = icon.dataset.app;
            launchApp(app);
        });
    });

    // Menu handling
    let activeMenu = null;
    
    document.querySelectorAll('.menu-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const menuName = header.dataset.menu;
            const menu = document.getElementById(`${menuName}-menu`);
            
            // Close any open menus
            document.querySelectorAll('.dropdown-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });
            
            // Toggle current menu
            if (menu.style.display === 'block') {
                menu.style.display = 'none';
                activeMenu = null;
            } else {
                menu.style.display = 'block';
                menu.style.left = `${header.offsetLeft}px`;
                activeMenu = menu;
                
                // Position menu below header
                const headerRect = header.getBoundingClientRect();
                menu.style.top = `${headerRect.bottom}px`;
                menu.style.left = `${headerRect.left}px`;
            }
            
            e.stopPropagation();
        });
    });
    
    // Close menus when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (activeMenu && !activeMenu.contains(e.target)) {
            activeMenu.style.display = 'none';
            activeMenu = null;
        }
    });
    
    // Handle menu actions
    document.querySelectorAll('.dropdown-menu .menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            
            // Close menu
            if (activeMenu) {
                activeMenu.style.display = 'none';
                activeMenu = null;
            }
            
            // Process action based on current app
            processMenuAction(action);
        });
    });
    
    function processMenuAction(action) {
        if (!activeWindow) return;
        
        switch(action) {
            case 'new':
                if (activeWindow.app === 'notes') {
                    const textarea = activeWindow.element.querySelector('textarea');
                    textarea.value = '';
                    activeWindow.filename = '';
                }
                break;
                
            case 'open':
                showOpenDialog();
                break;
                
            case 'save':
                if (activeWindow.app === 'notes') {
                    const textarea = activeWindow.element.querySelector('textarea');
                    activeWindow.content = textarea.value;
                    showSaveDialog();
                }
                break;
                
            case 'about':
                alert('BaseOS - A web-based operating system simulation');
                break;
                
            case 'help':
                alert('Help not available in this demo.');
                break;
        }
    }
    
    // File dialogs
    const saveDialog = document.getElementById('save-dialog');
    const openDialog = document.getElementById('open-dialog');
    
    function showSaveDialog() {
        const input = document.getElementById('save-filename');
        input.value = activeWindow.filename || '';
        saveDialog.classList.remove('hidden');
        input.focus();
    }
    
    function showOpenDialog() {
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';
        selectedFile = null;
        
        // Populate file list
        Object.keys(fileSystem).forEach(filename => {
            const item = document.createElement('div');
            item.className = 'file-list-item';
            item.textContent = filename;
            item.dataset.filename = filename;
            
            item.addEventListener('click', () => {
                // Deselect previous selection
                document.querySelectorAll('.file-list-item.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Select this item
                item.classList.add('selected');
                selectedFile = filename;
            });
            
            fileList.appendChild(item);
        });
        
        openDialog.classList.remove('hidden');
    }
    
    // Save dialog buttons
    document.getElementById('save-cancel').addEventListener('click', () => {
        saveDialog.classList.add('hidden');
    });
    
    document.getElementById('save-confirm').addEventListener('click', () => {
        const filename = document.getElementById('save-filename').value.trim();
        
        if (filename) {
            // Save file to file system
            fileSystem[filename] = activeWindow.content;
            activeWindow.filename = filename;
            saveFileSystem();
            saveDialog.classList.add('hidden');
            
            // Update file browser if finder is open
            windows.forEach(window => {
                if (window.app === 'finder') {
                    window.updateFileBrowser();
                }
            });
        }
    });
    
    // Open dialog buttons
    document.getElementById('open-cancel').addEventListener('click', () => {
        openDialog.classList.add('hidden');
    });
    
    document.getElementById('open-confirm').addEventListener('click', () => {
        if (selectedFile) {
            openFile(selectedFile);
            openDialog.classList.add('hidden');
        }
    });
    
    function openFile(filename) {
        const content = fileSystem[filename];
        
        // Determine app to use based on file extension
        let appName = 'notes';
        
        // Open file with appropriate app
        const window = windows.get(appName) || new Window(appName);
        window.focus();
        
        // Set file content
        const textarea = window.element.querySelector('textarea');
        if (textarea) {
            textarea.value = content;
            window.content = content;
            window.filename = filename;
        }
    }
    
    // Clock update
    const timeDisplay = document.getElementById('time');
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timeDisplay.textContent = `${hours}:${minutes}`;
    }
    updateTime();
    setInterval(updateTime, 60000);
    
    // Launch Finder by default
    launchApp('finder');
});
