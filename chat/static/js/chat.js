document.addEventListener("DOMContentLoaded", function () {
    const roomName = window.roomName;
    const username = window.username;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";

    let uploadedFiles = [];
    let isDrawing = false;

    // DOM Elements
    const chatLog = document.getElementById("chat-log");
    const input = document.getElementById("chat-message-input");
    const fileInput = document.getElementById("file-input");
    const previewContainer = document.getElementById("preview");
    const previewContent = document.getElementById("preview-content");
    const progressBar = document.getElementById("progress-bar");
    const progressWrap = document.getElementById("progress-container");
    const cancelPreviewBtn = document.getElementById("cancel-preview");
    const messageForm = document.getElementById("message-form");
    const sendButton = document.getElementById("send-btn");
    const whiteboardCanvas = document.getElementById('whiteboard-canvas');
    const ctx = whiteboardCanvas?.getContext('2d');

    // Debug WebSocket connection
    console.log("WebSocket connection details:");
    console.log("Room name:", roomName);
    console.log("Protocol:", protocol);
    console.log("Host:", window.location.host);
    console.log("URL:", `${protocol}://${window.location.host}/ws/chat/${roomName}/`);

    // Create WebSocket URL
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws/chat/${roomName}/`);

    // Make socket globally accessible
    window.socket = socket;

    // Replace inline event handlers with event listeners
    if (messageForm) {
        messageForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (username) {
                sendMessage();
            } else {
                alert('Please log in to send messages.');
            }
        });
    }

    // Message sending function
    function sendMessage() {
        const msg = input.value.trim();

        // Debug check WebSocket state
        if (window.socket.readyState !== WebSocket.OPEN) {
            console.error("WebSocket is not connected! ReadyState:", window.socket.readyState);
            return;
        }

        if (msg && window.socket.readyState === WebSocket.OPEN) {
            window.socket.send(JSON.stringify({ type: "chat", message: msg }));
            input.value = "";
        } else if (uploadedFiles.length > 0 && window.socket.readyState === WebSocket.OPEN) {
            uploadFilesAndSend();
        }
    }

    // WebSocket event listeners
    socket.addEventListener("open", () => {
        console.log("✅ WebSocket connected to room:", roomName);

        // Request user list and meetups on connection
        window.socket.send(JSON.stringify({
            type: 'users',
            action: 'list'
        }));

        window.socket.send(JSON.stringify({
            type: 'meetup',
            action: 'list'
        }));
    });

    socket.addEventListener("message", (event) => {
        console.log("📩 Message received:", event.data);
        try {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "chat":
                    console.log("Chat message:", data);
                    renderMessage(data);
                    break;
                case "reaction":
                    console.log("Reaction:", data);
                    updateReaction(data);
                    break;
                case "typing":
                    console.log("Typing indicator:", data);
                    showTyping();
                    break;
                case "users":
                    console.log("User list update:", data);
                    updateUserList(data.users);
                    break;
                case "whiteboard":
                    console.log("Whiteboard update:", data);
                    handleWhiteboardMessage(data);
                    break;
                case "meetups":
                    console.log("Meetups update:", data);
                    renderMeetups(data.meetups);
                    break;
                default:
                    console.log("Unknown message type:", data.type, data);
            }
        } catch (e) {
            console.error("Error processing message:", e, event.data);
        }
    });

    socket.addEventListener("error", (error) => {
        console.error("⚠️ WebSocket error:", error);
    });

    socket.addEventListener("close", (event) => {
        console.log("❌ WebSocket closed:", event.code, event.reason);
    });

    // Helper function for whiteboard messages
    function handleWhiteboardMessage(data) {
        if (!ctx) return;

        if (data.action === 'draw') {
            const x = data.x * whiteboardCanvas.width;
            const y = data.y * whiteboardCanvas.height;

            ctx.lineWidth = data.size;
            ctx.lineCap = 'round';
            ctx.strokeStyle = data.color;

            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else if (data.action === 'clear') {
            ctx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
        }
    }

    function renderMessage({ username: sender, message, message_id }) {
        const isSelf = sender === username;
        const wrapper = document.createElement("div");
        wrapper.className = `message-bubble ${isSelf ? "sent" : "received"} group`;
        wrapper.dataset.messageId = message_id || Date.now().toString();

        wrapper.innerHTML = `<div class="flex items-start">
                    <div class="flex-1">
                        <p class="text-xs font-semibold mb-0.5 ${isSelf ? "text-pink-500" : "text-yellow-600"}">${sender}</p>
                        <div class="text-sm text-gray-700 message-content"></div>
                    </div>
                    <div class="ml-2 opacity-0 group-hover:opacity-100 sm:flex hidden">
                        <div class="flex space-x-1">
                        <span class="emoji-reaction cursor-pointer bg-white rounded-full h-6 w-6 flex items-center justify-center shadow-sm hover:bg-pink-50">❤️</span>
                        <span class="emoji-reaction cursor-pointer bg-white rounded-full h-6 w-6 flex items-center justify-center shadow-sm hover:bg-pink-50">👍</span>
                        <span class="emoji-reaction cursor-pointer bg-white rounded-full h-6 w-6 flex items-center justify-center shadow-sm hover:bg-pink-50">😂</span>
                        </div>
                    </div>
                    </div>
                    <div class="reactions-container flex flex-wrap gap-1 mt-1 text-xs"></div>
                `;

        // Inject message as raw HTML so <img> or <video> shows
        wrapper.querySelector(".message-content").innerHTML = message;

        chatLog.appendChild(wrapper);
        chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });

        addReactionListeners(wrapper);

        // Track media for the library
        const mediaImages = wrapper.querySelectorAll('img');
        const mediaVideos = wrapper.querySelectorAll('video source');
    }

    function updateReaction({ message_id, reaction, count, users }) {
        const msg = document.querySelector(`[data-message-id="${message_id}"]`);
        if (!msg) return;

        const container = msg.querySelector(".reactions-container");
        let span = container.querySelector(`[data-emoji="${reaction}"]`);

        if (!span) {
            span = document.createElement("span");
            span.className = "bg-white rounded-full px-2 py-0.5 inline-flex items-center shadow-sm cursor-pointer hover:bg-yellow-50 transition-colors";
            span.dataset.emoji = reaction;
            container.appendChild(span);
            span.addEventListener("click", () => {
                window.socket.send(JSON.stringify({
                    type: "reaction",
                    message_id,
                    reaction
                }));
            });
        }

        if (count > 0) {
            span.innerHTML = `${reaction} <span class="reaction-count ml-1">${count}</span>`;
            span.title = users.join(", ");
        } else {
            span.remove();
        }
    }

    function showTyping() {
        const el = document.getElementById("typing-indicator");
        if (!el) return;

        el.classList.remove("hidden");
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => el.classList.add("hidden"), 1500);
    }

    function updateUserList(users) {
        console.log("Updating user list with:", users);
        const userList = document.getElementById("user-list");
        const mobileList = document.getElementById("mobile-user-list-content");

        if (!userList || !mobileList) {
            console.error("User list elements not found!");
            return;
        }

        userList.innerHTML = "";
        mobileList.innerHTML = "";

        if (!users || users.length === 0) {
            console.log("No users in the list");
            return;
        }

        users.forEach(user => {
            // Desktop list with avatars
            const li = document.createElement("li");
            li.className = "flex items-center";
            li.innerHTML = `
            <div class="user-avatar h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs">
                ${user.charAt(0).toUpperCase()}
            </div>
            <span>${user}</span>
            `;
            userList.appendChild(li);

            // Mobile list (simpler)
            const span = document.createElement("span");
            span.className = "user-list-item";
            span.textContent = user;
            mobileList.appendChild(span);
        });

        // Show the mobile user list if we're updating it
        const mobileUserList = document.getElementById("mobile-user-list");
        if (mobileUserList) {
            mobileUserList.classList.remove("hidden");
        }
    }

    // File upload handling
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            uploadedFiles = [...e.target.files];
            previewContainer.classList.remove("hidden");
            previewContent.innerHTML = "";

            uploadedFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    const preview = document.createElement("div");
                    preview.className = "file-preview";
                    if (file.type.startsWith("image")) {
                        preview.innerHTML = `<img src="${reader.result}" class="w-full rounded" />`;
                    } else if (file.type.startsWith("video")) {
                        preview.innerHTML = `<video controls class="w-full rounded"><source src="${reader.result}" type="${file.type}"></video>`;
                    }
                    previewContent.appendChild(preview);
                };
                reader.readAsDataURL(file);
            });
        });
    }

    if (cancelPreviewBtn) {
        cancelPreviewBtn.addEventListener("click", () => {
            uploadedFiles = [];
            fileInput.value = "";
            previewContainer.classList.add("hidden");
        });
    }

    async function uploadFilesAndSend() {
        if (uploadedFiles.length === 0) return;

        const formData = new FormData();
        uploadedFiles.forEach(f => formData.append("media", f)); // ✅ MUST be 'media'

        progressWrap.classList.remove("hidden");
        progressBar.style.width = "0%";

        // Use the actual URL path instead of Django template tag
        const uploadUrl = "/api/upload_media/";
        try {
            const response = await fetch(uploadUrl, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            progressBar.style.width = "100%";

            if (result.success && result.urls.length > 0) {
                result.urls.forEach(url => {
                    const html = url.match(/\.(mp4|webm)$/i)
                        ? `<video controls class='max-w-xs rounded-lg'><source src="${url}"></video>`
                        : `<img src="${url}" class='max-w-xs rounded-lg' />`;

                    window.socket.send(JSON.stringify({
                        type: "chat",
                        message: html,
                    }));
                });
            }
        } catch (error) {
            console.error("Error uploading files:", error);
        }

        // Reset
        fileInput.value = "";
        uploadedFiles = [];
        previewContainer.classList.add("hidden");
        progressWrap.classList.add("hidden");
    }

    // Handle typing indicator
    if (input) {
        input.addEventListener("keypress", e => {
            if (e.key === "Enter") {
                sendMessage();
            } else if (window.socket.readyState === WebSocket.OPEN) {
                window.socket.send(JSON.stringify({ type: "typing" }));
            }
        });
    }

    // Emoji panel handling
    const emojiButton = document.getElementById("emoji-button");
    const emojiPanel = document.getElementById("emoji-panel");

    if (emojiButton && emojiPanel) {
        emojiButton.addEventListener("click", () => emojiPanel.classList.toggle("show"));

        document.addEventListener("click", e => {
            if (!emojiButton.contains(e.target) && !emojiPanel.contains(e.target)) {
                emojiPanel.classList.remove("show");
            }
        });

        document.querySelectorAll(".emoji-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                input.value += btn.textContent;
                input.focus();
                emojiPanel.classList.remove("show");
            });
        });
    }

    // Reaction modal functionality
    const reactionModal = document.getElementById("reactionModal");
    const closeModal = document.getElementById("closeModal");

    document.addEventListener("click", function (e) {
        if (e.target.matches("[data-emoji]")) {
            const users = e.target.title?.split(", ") || [];
            const list = document.getElementById("reactionUserList");
            if (!list) return;

            list.innerHTML = "";
            users.forEach(name => {
                const li = document.createElement("li");
                li.className = "flex items-center py-1";
                li.innerHTML = `
                    <div class="h-5 w-5 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs">
                    ${name.charAt(0).toUpperCase()}
                    </div>
                    <span>${name}</span>
                `;
                list.appendChild(li);
            });
            reactionModal.classList.remove("hidden");
            reactionModal.classList.add("flex");
        }
    });

    if (closeModal) {
        closeModal.addEventListener("click", () => {
            reactionModal.classList.add("hidden");
            reactionModal.classList.remove("flex");
        });
    }

    function addReactionListeners(wrapper) {
        const messageId = wrapper.dataset.messageId;
        wrapper.querySelectorAll(".emoji-reaction").forEach(btn => {
            const emoji = btn.textContent;
            btn.addEventListener("click", function () {
                window.socket.send(JSON.stringify({
                    type: "reaction",
                    message_id: messageId,
                    reaction: emoji
                }));
            });
        });
    }

    // Initialize all message bubbles with reaction listeners
    document.querySelectorAll(".message-bubble").forEach(addReactionListeners);

    // Auto-scroll to bottom of chat on load
    if (chatLog) {
        chatLog.scrollTo({ top: chatLog.scrollHeight });
    }

    // Mobile user list toggle
    const mobileUserListToggle = document.getElementById("mobile-user-list-toggle");
    const mobileUserList = document.getElementById("mobile-user-list");

    if (mobileUserListToggle && mobileUserList) {
        mobileUserListToggle.addEventListener("click", () => {
            mobileUserList.classList.toggle("hidden");
        });
    }

    // Whiteboard functionality
    function initWhiteboard() {
        const openWhiteboardBtn = document.getElementById('open-whiteboard');
        const closeWhiteboardBtn = document.getElementById('close-whiteboard');
        const whiteboardModal = document.getElementById('whiteboard-modal');
        const clearWhiteboardBtn = document.getElementById('clear-whiteboard');
        const brushColor = document.getElementById('brush-color');
        const brushSize = document.getElementById('brush-size');

        if (!openWhiteboardBtn || !whiteboardCanvas) return;

        // Set canvas size
        function resizeCanvas() {
            const container = whiteboardCanvas.parentElement;
            whiteboardCanvas.width = container.clientWidth;
            whiteboardCanvas.height = container.clientHeight;
        }

        openWhiteboardBtn.addEventListener('click', () => {
            whiteboardModal.classList.remove('hidden');
            whiteboardModal.classList.add('flex');
            setTimeout(resizeCanvas, 100); // Delay to ensure modal is visible
        });

        closeWhiteboardBtn.addEventListener('click', () => {
            whiteboardModal.classList.add('hidden');
            whiteboardModal.classList.remove('flex');
        });

        // Canvas drawing events
        whiteboardCanvas.addEventListener('mousedown', startDrawing);
        whiteboardCanvas.addEventListener('mousemove', draw);
        whiteboardCanvas.addEventListener('mouseup', stopDrawing);
        whiteboardCanvas.addEventListener('mouseout', stopDrawing);

        // Touch events
        whiteboardCanvas.addEventListener('touchstart', startDrawingTouch);
        whiteboardCanvas.addEventListener('touchmove', drawTouch);
        whiteboardCanvas.addEventListener('touchend', stopDrawing);

        clearWhiteboardBtn.addEventListener('click', () => {
            ctx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
            // Broadcast clear event
            window.socket.send(JSON.stringify({
                type: 'whiteboard',
                action: 'clear'
            }));
        });

        function startDrawing(e) {
            isDrawing = true;
            draw(e);
        }

        function startDrawingTouch(e) {
            isDrawing = true;
            drawTouch(e);
        }

        function draw(e) {
            if (!isDrawing) return;

            ctx.lineWidth = brushSize.value;
            ctx.lineCap = 'round';
            ctx.strokeStyle = brushColor.value;

            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);

            // Broadcast drawing data
            window.socket.send(JSON.stringify({
                type: 'whiteboard',
                action: 'draw',
                x: e.offsetX / whiteboardCanvas.width,
                y: e.offsetY / whiteboardCanvas.height,
                color: brushColor.value,
                size: brushSize.value
            }));
        }

        function drawTouch(e) {
            if (!isDrawing) return;
            e.preventDefault();

            const touch = e.touches[0];
            const rect = whiteboardCanvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            ctx.lineWidth = brushSize.value;
            ctx.lineCap = 'round';
            ctx.strokeStyle = brushColor.value;

            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);

            // Broadcast drawing data
            window.socket.send(JSON.stringify({
                type: 'whiteboard',
                action: 'draw',
                x: x / whiteboardCanvas.width,
                y: y / whiteboardCanvas.height,
                color: brushColor.value,
                size: brushSize.value
            }));
        }

        function stopDrawing() {
            isDrawing = false;
            ctx.beginPath();
        }

        // Handle window resize
        window.addEventListener('resize', resizeCanvas);
    }

    // Initialize whiteboard
    initWhiteboard();

    // Meetup functionality
    function initMeetupPlanner() {
        const createMeetupBtn = document.getElementById('create-meetup-btn');
        const meetupModal = document.getElementById('meetup-modal');
        const cancelMeetupBtn = document.getElementById('cancel-meetup');
        const meetupForm = document.getElementById('meetup-form');
        const upcomingMeetupsList = document.getElementById('upcoming-meetups');

        if (!createMeetupBtn || !meetupModal) return;

        createMeetupBtn.addEventListener('click', () => {
            // Set default date to tomorrow at noon
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(12, 0, 0, 0);

            const formattedDate = formatDateForInput(tomorrow);
            document.getElementById('meetup-datetime').value = formattedDate;

            meetupModal.classList.remove('hidden');
            meetupModal.classList.add('flex');
        });

        cancelMeetupBtn.addEventListener('click', () => {
            meetupModal.classList.add('hidden');
            meetupModal.classList.remove('flex');
        });

        meetupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = document.getElementById('meetup-title').value;
            const datetime = document.getElementById('meetup-datetime').value;
            const location = document.getElementById('meetup-location').value;
            const description = document.getElementById('meetup-description').value;

            // Create a meetup object
            const meetup = {
                id: Date.now().toString(),
                title,
                datetime,
                location,
                description,
                created_by: username,
                attendees: [username]
            };

            // Send to WebSocket
            window.socket.send(JSON.stringify({
                type: 'meetup',
                action: 'create',
                meetup
            }));

            // Close modal
            meetupModal.classList.add('hidden');
            meetupModal.classList.remove('flex');

            // Reset form
            meetupForm.reset();
        });

        // Helper function to format date for the datetime-local input
        function formatDateForInput(date) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    }

    // Initialize meetup planner
    initMeetupPlanner();

    // Function to render meetups
    function renderMeetups(meetups) {
        const upcomingMeetupsList = document.getElementById('upcoming-meetups');
        if (!upcomingMeetupsList) return;

        if (!meetups || meetups.length === 0) {
            upcomingMeetupsList.innerHTML = `
            <p class="text-gray-400 text-xs italic">No upcoming meetups planned yet.</p>
            <button id="create-meetup-btn" class="btn w-full bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-xl transition text-sm inline-flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Plan a Meetup
            </button>
            `;

            // Re-attach the event listener
            const newCreateBtn = document.getElementById('create-meetup-btn');
            if (newCreateBtn) {
                const meetupModal = document.getElementById('meetup-modal');
                newCreateBtn.addEventListener('click', () => {
                    meetupModal.classList.remove('hidden');
                    meetupModal.classList.add('flex');
                });
            }

            return;
        }

        // Sort by date
        meetups.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        // Only show upcoming meetups
        const upcomingMeetups = meetups.filter(m => new Date(m.datetime) > new Date());

        upcomingMeetupsList.innerHTML = '';

        upcomingMeetups.forEach(meetup => {
            const meetupDate = new Date(meetup.datetime);
            const formattedDate = meetupDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            const formattedTime = meetupDate.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });

            const isAttending = meetup.attendees.includes(username);

            const meetupEl = document.createElement('div');
            meetupEl.className = 'p-3 rounded-lg bg-gradient-to-r from-pink-50 to-yellow-50 border border-pink-100';
            meetupEl.innerHTML = `
            <div class="flex justify-between items-start">
                <h4 class="font-medium text-gray-800">${meetup.title}</h4>
                <span class="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">${formattedDate}</span>
            </div>
            <div class="mt-1 text-xs">
                <div class="flex items-center text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ${formattedTime}
                </div>
                <div class="flex items-center text-gray-600 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                ${meetup.location}
                </div>
            </div>
            <div class="mt-2 flex justify-between items-center">
                <span class="text-xs text-gray-500">${meetup.attendees.length} attending</span>
                <button class="attend-btn text-xs px-2 py-1 rounded ${isAttending ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700 hover:bg-pink-50'}" data-meetup-id="${meetup.id}">
                ${isAttending ? 'Attending ✓' : 'Attend'}
                </button>
            </div>
            `;

            upcomingMeetupsList.appendChild(meetupEl);

            // Add event listener for attendance button
            meetupEl.querySelector('.attend-btn').addEventListener('click', () => {
                window.socket.send(JSON.stringify({
                    type: 'meetup',
                    action: isAttending ? 'leave' : 'join',
                    meetup_id: meetup.id
                }));
            });
        });

        // Add the create button at the end
        const createBtn = document.createElement('button');
        createBtn.id = 'create-meetup-btn';
        createBtn.className = 'btn w-full bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-xl transition text-sm inline-flex items-center justify-center mt-3';
        createBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Plan a Meetup
        `;
        upcomingMeetupsList.appendChild(createBtn);

        // Re-attach the event listener
        const meetupModal = document.getElementById('meetup-modal');
        createBtn.addEventListener('click', () => {
            meetupModal.classList.remove('hidden');
            meetupModal.classList.add('flex');
        });
    }

    // Media Library functionality
    function initMediaLibrary() {
        const openMediaBtn = document.getElementById('open-media-library');
        const closeMediaBtn = document.getElementById('close-media-library');
        const mediaModal = document.getElementById('media-library-modal');
        const mediaGrid = document.getElementById('media-grid');
        const filterBtns = document.querySelectorAll('.media-filter-btn');
        const closePreviewBtn = document.getElementById('close-media-preview');
        const previewModal = document.getElementById('media-preview-modal');
        const previewContent = document.getElementById('media-preview-content');

        if (!openMediaBtn || !mediaModal) return;

        // Media library data structure
        let mediaLibrary = {
            images: [],
            videos: []
        };

        // Open and close handlers
        openMediaBtn.addEventListener('click', () => {
            loadMediaLibrary();
            mediaModal.classList.remove('hidden');
            mediaModal.classList.add('flex');
        });

        closeMediaBtn.addEventListener('click', () => {
            mediaModal.classList.add('hidden');
            mediaModal.classList.remove('flex');
        });

        closePreviewBtn.addEventListener('click', () => {
            previewModal.classList.add('hidden');
            previewModal.classList.remove('flex');
        });

        // Filter handlers
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                filterBtns.forEach(b => {
                    b.classList.remove('bg-pink-500', 'text-white');
                    b.classList.add('bg-gray-200', 'text-gray-700');
                });
                btn.classList.remove('bg-gray-200', 'text-gray-700');
                btn.classList.add('bg-pink-500', 'text-white');

                // Apply filter
                const filter = btn.dataset.filter;
                renderMediaGrid(filter);
            });
        });

        // Load media from the server or local storage
        function loadMediaLibrary() {
            // Scan the chat for media
            mediaLibrary = {
                images: [],
                videos: []
            };

            document.querySelectorAll('.message-content img').forEach(img => {
                if (!mediaLibrary.images.includes(img.src)) {
                    mediaLibrary.images.push(img.src);
                }
            });

            document.querySelectorAll('.message-content video source').forEach(source => {
                if (!mediaLibrary.videos.includes(source.src)) {
                    mediaLibrary.videos.push(source.src);
                }
            });

            renderMediaGrid('all');
        }

        // Render the media grid based on filter
        function renderMediaGrid(filter) {
            if (!mediaGrid) return;

            mediaGrid.innerHTML = '';

            let mediaItems = [];
            if (filter === 'all' || filter === 'images') {
                mediaLibrary.images.forEach(src => {
                    mediaItems.push({
                        type: 'image',
                        src: src
                    });
                });
            }

            if (filter === 'all' || filter === 'videos') {
                mediaLibrary.videos.forEach(src => {
                    mediaItems.push({
                        type: 'video',
                        src: src
                    });
                });
            }

            // Sort by most recent (for now we'll just use the order they appear)
            mediaItems.forEach(item => {
                const mediaItem = document.createElement('div');
                mediaItem.className = 'media-item rounded-lg overflow-hidden shadow-md hover:shadow-lg transition cursor-pointer bg-gray-100 aspect-square flex items-center justify-center';

                if (item.type === 'image') {
                    mediaItem.innerHTML = `<img src="${item.src}" class="object-cover w-full h-full" />`;
                } else {
                    mediaItem.innerHTML = `
                    <div class="relative w-full h-full">
                        <video class="object-cover w-full h-full">
                        <source src="${item.src}">
                        </video>
                        <div class="absolute inset-0 flex items-center justify-center">
                        <div class="bg-black bg-opacity-50 rounded-full p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        </div>
                    </div>
                    `;
                }

                mediaItem.addEventListener('click', () => {
                    previewContent.innerHTML = '';

                    if (item.type === 'image') {
                        previewContent.innerHTML = `<img src="${item.src}" class="max-w-full max-h-[80vh] object-contain" />`;
                    } else {
                        previewContent.innerHTML = `
                            <video controls class="max-w-full max-h-[80vh] object-contain">
                            <source src="${item.src}">
                            </video>
                        `;
                    }

                    previewModal.classList.remove('hidden');
                    previewModal.classList.add('flex');
                });

                mediaGrid.appendChild(mediaItem);
            });

            // Show empty state if no media
            if (mediaItems.length === 0) {
                mediaGrid.innerHTML = `
                    <div class="col-span-full flex flex-col items-center justify-center py-10 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="text-center">No media found in this room yet.<br>Share images or videos in the chat to see them here.</p>
                    </div>
                `;
            }
        }
    }

    // Initialize media library
    initMediaLibrary();
});
