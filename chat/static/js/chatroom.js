document.addEventListener("DOMContentLoaded", function () {
    // =============== CONFIGURATION & GLOBALS ===============
    const roomName = window.roomName;
    const username = window.username;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 3000;
    let uploadedFiles = [];
    let isDrawing = false;

    // Media library for persistence
    window.mediaLibrary = { images: [], videos: [] };

    // =============== DOM ELEMENTS ===============
    const chatLog = document.getElementById("chat-log");
    const input = document.getElementById("chat-message-input");
    const fileInput = document.getElementById("file-input");
    const previewContainer = document.getElementById("preview");
    const previewContent = document.getElementById("preview-content");
    const progressBar = document.getElementById("progress-bar");
    const progressWrap = document.getElementById("progress-container");
    const cancelPreviewBtn = document.getElementById("cancel-preview");
    const messageForm = document.getElementById("message-form");
    const whiteboardCanvas = document.getElementById('whiteboard-canvas');
    const ctx = whiteboardCanvas?.getContext('2d');
    const typingIndicator = document.getElementById("typing-indicator");

    // =============== WEBSOCKET CONNECTION ===============
    function connectWebSocket() {
        const wsUrl = `${protocol}://${window.location.host}/ws/chat/${roomName}/`;

        try {
            const socket = new WebSocket(wsUrl);
            window.socket = socket;

            socket.addEventListener("open", () => {
                console.log(`WebSocket connected to room: ${roomName}`);
                reconnectAttempts = 0;

                // Request initial data
                socket.send(JSON.stringify({ type: 'users', action: 'list' }));

                if (window.username) {
                    socket.send(JSON.stringify({ type: 'meetup', action: 'list' }));
                    requestOnlineFriends();
                    requestRoomRecommendations();
                }
            });

            socket.addEventListener("message", handleSocketMessage);

            socket.addEventListener("error", () => {
                alertUserOfConnectionIssue();
            });

            socket.addEventListener("close", (event) => {
                if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = reconnectDelay * Math.min(reconnectAttempts, 5);

                    setTimeout(() => {
                        connectWebSocket();
                    }, delay);
                } else if (reconnectAttempts >= maxReconnectAttempts) {
                    alertUserOfMaxReconnectAttempts();
                }

                alertUserOfConnectionIssue();
            });

            return socket;
        } catch (e) {
            console.error("Failed to create WebSocket connection:", e);
            alertUserOfConnectionIssue();
            return null;
        }
    }

    // Alert functions (placeholder implementations)
    function alertUserOfConnectionIssue() {
        // Implementation depends on your UI design
    }

    function alertUserOfMaxReconnectAttempts() {
        // Implementation depends on your UI design
    }

    // =============== MESSAGE HANDLING ===============
    function handleSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            const messageType = data.type || 'unknown';

            switch (messageType) {
                case "chat":
                    renderMessage(data);
                    trackMediaInMessage(data.message);
                    break;

                case "reaction":
                    updateReaction(data);
                    break;

                case "typing":
                    showTyping(data.username);
                    break;

                case "users":
                    if (data.users && Array.isArray(data.users)) {
                        updateUserList(data.users);
                    }
                    break;

                case "whiteboard":
                    handleWhiteboardMessage(data);
                    break;

                case "meetups":
                    renderMeetups(data.meetups);
                    break;

                case "announcement":
                    handleAnnouncementMessage(data);
                    break;

                case "friends":
                    handleFriendsMessage(data);
                    break;

                case "recommendations":
                    handleRecommendationsMessage(data);
                    break;

                case "pong":
                    // Pong received - connection alive
                    break;

                case "error":
                    console.error("Error from server:", data.message);
                    break;
            }
        } catch (e) {
            console.error("Error processing message:", e);
        }
    }

    // Request user list
    function requestUserList() {
        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
            window.socket.send(JSON.stringify({
                type: 'users',
                action: 'list'
            }));
        }
    }

    // =============== INITIALIZATION ===============
    // Initialize WebSocket connection
    const socket = connectWebSocket();

    // Request user list after a short delay
    setTimeout(requestUserList, 1000);

    // Message form setup
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

    // Initialize all features
    initFriendsAndRecommendations();
    initFileUpload();
    initEmojiPanel();
    initReactionModal();
    initWhiteboard();
    initMeetupPlanner();
    initMobileUserList();
    initAnnouncementHandlers();
    initMediaLibrary();
    initializeBookmarkButton();

    // Initialize message reaction listeners
    document.querySelectorAll(".message-bubble").forEach(addReactionListeners);

    // Auto-scroll chat on load
    if (chatLog) {
        setTimeout(() => {
            chatLog.scrollTo({ top: chatLog.scrollHeight });
        }, 100);
    }

    // =============== MEDIA HANDLING ===============
    // Image compression function
    async function compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');

                    // Calculate new dimensions (maintaining aspect ratio)
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 900;

                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    }, 'image/jpeg', 0.5);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Track media in messages for media library
    function trackMediaInMessage(message) {
        try {
            if (!message) return;

            if (!window.mediaLibrary) {
                window.mediaLibrary = { images: [], videos: [] };
            }

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = message;

            // Track images
            tempDiv.querySelectorAll('img').forEach(img => {
                if (img.src && !window.mediaLibrary.images.includes(img.src)) {
                    window.mediaLibrary.images.push(img.src);
                }
            });

            // Track videos
            tempDiv.querySelectorAll('video source').forEach(source => {
                if (source.src && !window.mediaLibrary.videos.includes(source.src)) {
                    window.mediaLibrary.videos.push(source.src);
                }
            });
        } catch (error) {
            console.error("Error tracking media in message:", error);
        }
    }

    // =============== MESSAGE FUNCTIONS ===============
    function sendMessage() {
        const msg = input.value.trim();

        // Check authentication
        if (!window.username) {
            if (document.querySelector('.guest-banner')) {
                const guestBanner = document.querySelector('.guest-banner');
                guestBanner.classList.add('highlight-banner');
                setTimeout(() => {
                    guestBanner.classList.remove('highlight-banner');
                }, 2000);
            } else {
                showLoginPrompt();
            }
            return;
        }

        // Send text message
        if (msg) {
            try {
                window.socket.send(JSON.stringify({
                    type: "chat",
                    message: msg
                }));
                input.value = "";
            } catch (error) {
                console.error("Error sending text message:", error);
                alertUserOfConnectionIssue();
            }
        }
        // Send file uploads
        else if (uploadedFiles.length > 0) {
            uploadFilesAndSend().catch(error => {
                console.error("Error in file upload process:", error);
            });
        }
    }

    function showLoginPrompt() {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Please log in to send messages</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3500);
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

        // Set message content as HTML
        wrapper.querySelector(".message-content").innerHTML = message;

        chatLog.appendChild(wrapper);
        chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });

        addReactionListeners(wrapper);
        trackMediaInMessage(message);
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

    function showTyping(typingUsername) {
        if (!typingIndicator) return;

        // Only show typing for other users
        if (typingUsername === username) return;

        const usernameElement = document.getElementById("typing-username");
        if (usernameElement) {
            usernameElement.textContent = `${typingUsername || 'Someone'} is typing...`;
        }

        typingIndicator.classList.remove("hidden");
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => typingIndicator.classList.add("hidden"), 1500);
    }

    function updateUserList(users) {
        const userList = document.getElementById("user-list");
        const mobileList = document.getElementById("mobile-user-list-content");

        if (!userList) return;

        // Clear existing content
        userList.innerHTML = "";
        if (mobileList) mobileList.innerHTML = "";

        // Check if we have users to display
        if (!users || users.length === 0) {
            userList.innerHTML = `<li class="text-gray-400 text-xs italic py-2">No users currently in this room.</li>`;
            if (mobileList) {
                mobileList.innerHTML = `<span class="text-gray-400 text-xs italic">No users currently in this room.</span>`;
            }
            return;
        }

        // Get current username for comparison
        const currentUsername = window.username;

        // Ensure unique users
        const uniqueUsers = [...new Set(users)];

        // Create list items for each user
        uniqueUsers.forEach(user => {
            // Create desktop list item
            const li = document.createElement("li");
            li.className = "flex items-center justify-between py-1";

            // User's initial for avatar
            const userInitial = user && user.length > 0 ? user.charAt(0).toUpperCase() : '?';

            // Different layout for current user
            if (user === currentUsername) {
                li.innerHTML = `
                <div class="flex items-center">
                  <div class="user-avatar h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs">
                      ${userInitial}
                  </div>
                  <span class="truncate max-w-[100px]">${user}</span>
                  <span class="ml-2 text-xs text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full">You</span>
                </div>`;
            } else {
                li.innerHTML = `
                <div class="flex items-center">
                  <div class="user-avatar h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs">
                      ${userInitial}
                  </div>
                  <span class="truncate max-w-[100px]">${user}</span>
                </div>
                <button data-username="${user}" class="add-friend-btn text-xs bg-pink-100 hover:bg-pink-200 text-pink-700 py-0.5 px-2 rounded transition-colors">
                  Add Friend
                </button>`;
            }
            userList.appendChild(li);

            // If mobile list exists, populate it as well
            if (mobileList) {
                const mobileItem = document.createElement("div");
                mobileItem.className = "user-list-item flex items-center justify-between py-1";

                if (user === currentUsername) {
                    mobileItem.innerHTML = `
                    <div class="flex items-center">
                      <div class="h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs">
                          ${userInitial}
                      </div>
                      <span>${user}</span>
                      <span class="ml-2 text-xs text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full">You</span>
                    </div>`;
                } else {
                    mobileItem.innerHTML = `
                    <div class="flex items-center">
                      <div class="h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs">
                          ${userInitial}
                      </div>
                      <span>${user}</span>
                    </div>
                    <button data-username="${user}" class="mobile-add-friend-btn text-xs bg-pink-100 hover:bg-pink-200 text-pink-700 py-0.5 px-2 rounded transition-colors">
                      Add
                    </button>`;
                }

                mobileList.appendChild(mobileItem);
            }
        });

        // Add event listeners for add friend buttons
        document.querySelectorAll('.add-friend-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const username = this.dataset.username;
                sendFriendRequest(username);
                this.textContent = 'Sent';
                this.disabled = true;
                this.classList.remove('hover:bg-pink-200');
                this.classList.add('bg-gray-100', 'text-gray-500');
            });
        });

        // Add event listeners for mobile add friend buttons
        document.querySelectorAll('.mobile-add-friend-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const username = this.dataset.username;
                sendFriendRequest(username);
                this.textContent = 'Sent';
                this.disabled = true;
                this.classList.remove('hover:bg-pink-200');
                this.classList.add('bg-gray-100', 'text-gray-500');
            });
        });

        // Make sure the mobile user list is visible if it exists
        const mobileUserList = document.getElementById("mobile-user-list");
        if (mobileUserList) {
            mobileUserList.classList.remove("hidden");
        }
    }

    // =============== FILE UPLOAD ===============
    function initFileUpload() {
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

        // Handle typing indicator
        if (input) {
            input.addEventListener("keypress", e => {
                if (e.key === "Enter") {
                    sendMessage();
                } else if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                    window.socket.send(JSON.stringify({
                        type: "typing",
                        username: username
                    }));
                }
            });
        }
    }

    // Get CSRF token for API requests
    function getCsrfToken() {
        // Method 1: From cookies
        try {
            const name = 'csrftoken=';
            const decodedCookie = decodeURIComponent(document.cookie);
            const cookieArray = decodedCookie.split(';');

            for (let cookie of cookieArray) {
                cookie = cookie.trim();
                if (cookie.indexOf(name) === 0) {
                    return cookie.substring(name.length);
                }
            }
        } catch (e) {}

        // Method 2: From meta tag
        try {
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            if (csrfMeta) {
                return csrfMeta.getAttribute('content');
            }
        } catch (e) {}

        // Method 3: From hidden input field
        try {
            const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
            if (csrfInput) {
                return csrfInput.value;
            }
        } catch (e) {}

        return '';
    }

    // Upload files and send in chat
    async function uploadFilesAndSend() {
        if (uploadedFiles.length === 0) return;

        const formData = new FormData();
        const csrfToken = getCsrfToken();

        try {
            // Compress images before uploading
            for (const file of uploadedFiles) {
                try {
                    if (file.type.startsWith('image/')) {
                        const compressedFile = await compressImage(file);
                        formData.append("media", compressedFile);
                    } else {
                        formData.append("media", file);
                    }
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                }
            }

            progressWrap.classList.remove("hidden");
            progressBar.style.width = "0%";

            const uploadUrl = "/api/upload_media/";

            const response = await fetch(uploadUrl, {
                method: "POST",
                body: formData,
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const result = await response.json();
            progressBar.style.width = "100%";

            if (result.success && result.urls && result.urls.length > 0) {
                result.urls.forEach(url => {
                    const html = url.match(/\.(mp4|webm)$/i)
                        ? `<video controls class='max-w-xs rounded-lg'><source src="${url}"></video>`
                        : `<img src="${url}" class='max-w-xs rounded-lg' />`;

                    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                        window.socket.send(JSON.stringify({
                            type: "chat",
                            message: html,
                        }));

                        // Add to media library immediately
                        if (url.match(/\.(mp4|webm)$/i)) {
                            if (!window.mediaLibrary.videos.includes(url)) {
                                window.mediaLibrary.videos.push(url);
                            }
                        } else {
                            if (!window.mediaLibrary.images.includes(url)) {
                                window.mediaLibrary.images.push(url);
                            }
                        }
                    } else {
                        console.error("WebSocket not connected. Cannot send media message.");
                        alertUserOfConnectionIssue();
                    }
                });
            } else {
                throw new Error("No media URLs returned from server");
            }
        } catch (error) {
            console.error("Error uploading files:", error);
            // Show upload error to user
            const errorMsg = document.createElement("div");
            errorMsg.className = "text-red-500 text-xs mt-1";
            errorMsg.textContent = "Upload failed: " + (error.message || "Please try again.");

            if (progressWrap && progressWrap.parentNode) {
                progressWrap.parentNode.appendChild(errorMsg);
                setTimeout(() => errorMsg.remove(), 5000);
            }
            throw error;
        } finally {
            // Reset UI
            fileInput.value = "";
            uploadedFiles = [];
            previewContainer.classList.add("hidden");

            // Delay hiding progress
            setTimeout(() => {
                progressWrap.classList.add("hidden");
            }, 1000);
        }
    }

    // =============== EMOJI PANEL ===============
    function initEmojiPanel() {
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
    }

    // =============== REACTIONS ===============
    function initReactionModal() {
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
    }

    function addReactionListeners(wrapper) {
        const messageId = wrapper.dataset.messageId;
        wrapper.querySelectorAll(".emoji-reaction").forEach(btn => {
            const emoji = btn.textContent;
            btn.addEventListener("click", function () {
                if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                    window.socket.send(JSON.stringify({
                        type: "reaction",
                        message_id: messageId,
                        reaction: emoji
                    }));
                } else {
                    console.error("Cannot send reaction: WebSocket not connected");
                    alertUserOfConnectionIssue();
                }
            });
        });
    }

    // =============== MOBILE UI ===============
    function initMobileUserList() {
        const mobileUserListToggle = document.getElementById("mobile-user-list-toggle");
        const mobileUserList = document.getElementById("mobile-user-list");

        if (mobileUserListToggle && mobileUserList) {
            mobileUserListToggle.addEventListener("click", () => {
                mobileUserList.classList.toggle("hidden");
            });
        }
    }

    // =============== WHITEBOARD ===============
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
            setTimeout(resizeCanvas, 100);
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
            if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                window.socket.send(JSON.stringify({
                    type: 'whiteboard',
                    action: 'clear'
                }));
            } else {
                console.error("Cannot clear whiteboard: WebSocket not connected");
                alertUserOfConnectionIssue();
            }
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
            if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                window.socket.send(JSON.stringify({
                    type: 'whiteboard',
                    action: 'draw',
                    x: e.offsetX / whiteboardCanvas.width,
                    y: e.offsetY / whiteboardCanvas.height,
                    color: brushColor.value,
                    size: brushSize.value
                }));
            }
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
            if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                window.socket.send(JSON.stringify({
                    type: 'whiteboard',
                    action: 'draw',
                    x: x / whiteboardCanvas.width,
                    y: y / whiteboardCanvas.height,
                    color: brushColor.value,
                    size: brushSize.value
                }));
            }
        }

        function stopDrawing() {
            isDrawing = false;
            ctx.beginPath();
        }

        // Handle window resize
        window.addEventListener('resize', resizeCanvas);
    }

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

    // =============== MEETUPS ===============
    function initMeetupPlanner() {
        const createMeetupBtn = document.getElementById('create-meetup-btn');
        const meetupModal = document.getElementById('meetup-modal');
        const cancelMeetupBtn = document.getElementById('cancel-meetup');
        const meetupForm = document.getElementById('meetup-form');

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
            if (window.socket && window.socket.readyState === WebSocket.OPEN) {
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
            } else {
                console.error("Cannot create meetup: WebSocket not connected");
                alertUserOfConnectionIssue();
            }
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
                if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                    window.socket.send(JSON.stringify({
                        type: 'meetup',
                        action: isAttending ? 'leave' : 'join',
                        meetup_id: meetup.id
                    }));
                } else {
                    console.error("Cannot update meetup attendance: WebSocket not connected");
                    alertUserOfConnectionIssue();
                }
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

    // =============== ANNOUNCEMENTS ===============
    function initAnnouncementHandlers() {
        // Handle close buttons for announcements in the top container
        const closeButtons = document.querySelectorAll('.close-announcement');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const announcementItem = this.closest('.announcement-item, .announcement-popup');
                if (announcementItem) {
                    const announcementId = announcementItem.dataset.announcementId;
                    if (announcementId) {
                        markAnnouncementAsRead(announcementId);
                    }
                }
            });
        });

        // Process existing announcements from the page and add them to the chat
        const chatLog = document.getElementById('chat-log');
        const container = document.getElementById('announcements-container');
        const announcements = container ? container.querySelectorAll('.announcement-item:not(.hidden)') : [];

        if (announcements.length > 0 && chatLog) {
            // Hide the original container
            if (container) {
                container.classList.add('hidden');
            }

            // Convert each announcement to a chat message
            announcements.forEach(originalAnnouncement => {
                try {
                    // Get important data with null checks
                    const announcementId = originalAnnouncement.dataset.announcementId;
                    if (!announcementId) return;

                    // Safely get announcement content
                    const creatorElement = originalAnnouncement.querySelector('.text-blue-800');
                    const contentElement = originalAnnouncement.querySelector('.text-gray-700');
                    const timestampElement = originalAnnouncement.querySelector('.text-gray-500');

                    const creator = creatorElement ? creatorElement.textContent.replace('Announcement from ', '') : 'Admin';
                    const content = contentElement ? contentElement.innerHTML : '';
                    const timestamp = timestampElement ? timestampElement.textContent : new Date().toLocaleString();

                    // Create in-chat announcement element
                    const announcement = document.createElement('div');
                    announcement.className = 'message-bubble announcement-popup bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-xl shadow-md mb-4 mx-auto max-w-lg border border-blue-200 announcement-banner';
                    announcement.dataset.announcementId = announcementId;
                    announcement.style.width = 'fit-content';

                    announcement.innerHTML = `
                        <button class="close-announcement" aria-label="Dismiss announcement">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div class="flex items-start">
                            <div class="bg-blue-500 rounded-full p-2 mr-3 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-semibold text-blue-800">Announcement from ${creator}</h3>
                                <div class="text-gray-700 text-sm mt-1">${content}</div>
                                <div class="text-xs text-gray-500 mt-2">${timestamp}</div>
                            </div>
                        </div>
                    `;

                    // Add to chat log
                    chatLog.appendChild(announcement);

                    // Add event listener for close button
                    const closeBtn = announcement.querySelector('.close-announcement');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', function() {
                            markAnnouncementAsRead(announcementId);

                            // Add a fade-out animation
                            announcement.style.transition = 'all 0.5s ease';
                            announcement.style.opacity = '0';
                            announcement.style.maxHeight = '0';
                            announcement.style.margin = '0';
                            announcement.style.padding = '0';
                            announcement.style.overflow = 'hidden';

                            // Remove after animation completes
                            setTimeout(() => {
                                announcement.remove();
                            }, 500);
                        });
                    }
                } catch (e) {
                    console.error("Error processing announcement:", e);
                }
            });

            // Scroll to make announcements visible
            chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
        }
    }

    function handleAnnouncementMessage(data) {
        const chatLog = document.getElementById('chat-log');
        if (!chatLog) return;

        if (data.action === 'new') {
            try {
                // Check if this announcement is already displayed
                const existingAnnouncement = document.querySelector(`.announcement-popup[data-announcement-id="${data.announcement_id}"]`);
                if (existingAnnouncement) return;

                // Create announcement element that appears in the chat stream
                const announcement = document.createElement('div');
                announcement.className = 'message-bubble announcement-popup bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-xl shadow-md mb-4 mx-auto max-w-lg border border-blue-200 announcement-banner';
                announcement.dataset.announcementId = data.announcement_id;
                announcement.style.width = 'fit-content';

                announcement.innerHTML = `
                    <button class="close-announcement" aria-label="Dismiss announcement">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div class="flex items-start">
                        <div class="bg-blue-500 rounded-full p-2 mr-3 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                        </div>
                        <div class="flex-1">
                            <h3 class="font-semibold text-blue-800">Announcement from ${data.creator || 'Admin'}</h3>
                            <div class="text-gray-700 text-sm mt-1">${data.content ? data.content.replace(/\n/g, '<br>') : 'New announcement'}</div>
                            <div class="text-xs text-gray-500 mt-2">${
                                data.created_at ? new Date(data.created_at).toLocaleString() : new Date().toLocaleString()
                            }</div>
                        </div>
                    </div>
                `;

                // Add to chat log
                chatLog.appendChild(announcement);

                // Scroll to make announcement visible
                chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });

                // Add event listener for close button
                const closeBtn = announcement.querySelector('.close-announcement');
                if (closeBtn) {
                    closeBtn.addEventListener('click', function() {
                        markAnnouncementAsRead(data.announcement_id);

                        // Add a fade-out animation
                        announcement.style.transition = 'all 0.5s ease';
                        announcement.style.opacity = '0';
                        announcement.style.maxHeight = '0';
                        announcement.style.margin = '0';
                        announcement.style.padding = '0';
                        announcement.style.overflow = 'hidden';

                        // Remove after animation completes
                        setTimeout(() => {
                            announcement.remove();
                        }, 500);
                    });
                }
            } catch (e) {
                console.error("Error handling announcement message:", e);
            }
        }
    }

    function markAnnouncementAsRead(announcementId) {
        if (!announcementId) return;

        // Get CSRF token
        const csrfToken = getCsrfToken();

        // Send request to mark announcement as read
        fetch(`/api/announcement/${announcementId}/mark_read/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Hide in the top container if it exists
                const topAnnouncement = document.querySelector(`#announcements-container .announcement-item[data-announcement-id="${announcementId}"]`);
                if (topAnnouncement) {
                    topAnnouncement.classList.add('hidden');

                    // Check if all announcements are hidden
                    const visibleAnnouncements = document.querySelectorAll('#announcements-container .announcement-item:not(.hidden)');
                    if (visibleAnnouncements.length === 0) {
                        // Hide the container
                        const container = document.getElementById('announcements-container');
                        if (container) {
                            container.classList.add('hidden');
                            container.classList.remove('mb-6');
                        }
                    }
                }

                // Animate and remove from chat if it exists there
                const chatAnnouncement = document.querySelector(`.announcement-popup[data-announcement-id="${announcementId}"]`);
                if (chatAnnouncement) {
                    // Add a fade-out animation
                    chatAnnouncement.style.transition = 'all 0.5s ease';
                    chatAnnouncement.style.opacity = '0';
                    chatAnnouncement.style.maxHeight = '0';
                    chatAnnouncement.style.margin = '0';
                    chatAnnouncement.style.padding = '0';
                    chatAnnouncement.style.overflow = 'hidden';

                    // Remove after animation completes
                    setTimeout(() => {
                        chatAnnouncement.remove();
                    }, 500);
                }
            }
        })
        .catch(error => {
            console.error('Error marking announcement as read:', error);
        });
    }

    // =============== MEDIA LIBRARY ===============
    function initMediaLibrary() {
        try {
            // Ensure the global media library exists
            if (!window.mediaLibrary) {
                window.mediaLibrary = { images: [], videos: [] };
            }

            // Get DOM elements
            const openMediaBtn = document.getElementById('open-media-library');
            const closeMediaBtn = document.getElementById('close-media-library');
            const mediaModal = document.getElementById('media-library-modal');
            const mediaGrid = document.getElementById('media-grid');
            const filterBtns = document.querySelectorAll('.media-filter-btn');
            const closePreviewBtn = document.getElementById('close-media-preview');
            const previewModal = document.getElementById('media-preview-modal');

            // Check for required elements and exit if missing
            if (!openMediaBtn) return;

            if (!mediaModal || !mediaGrid) {
                // We can still attach the event listener to the button, but we'll show an error when clicked
                openMediaBtn.addEventListener('click', function() {
                    alert("Media library functionality is not available.");
                });
                return;
            }

            // Initial scan for media in the DOM
            scanDOMForMedia();

            // Open media library button
            openMediaBtn.addEventListener('click', function() {
                // Scan again to make sure we have the latest media
                scanDOMForMedia();

                // Apply the "all" filter by default
                if (filterBtns && filterBtns.length > 0) {
                    // First reset all filter buttons
                    filterBtns.forEach(btn => {
                        if (btn.dataset.filter === 'all') {
                            btn.classList.remove('bg-gray-200', 'text-gray-700');
                            btn.classList.add('bg-pink-500', 'text-white');
                        } else {
                            btn.classList.remove('bg-pink-500', 'text-white');
                            btn.classList.add('bg-gray-200', 'text-gray-700');
                        }
                    });
                }

                // Render the media grid with all media
                renderMediaGrid('all');

                // Show the modal
                mediaModal.classList.remove('hidden');
                mediaModal.classList.add('flex');
            });

            // Close media library button
            if (closeMediaBtn) {
                closeMediaBtn.addEventListener('click', function() {
                    mediaModal.classList.add('hidden');
                    mediaModal.classList.remove('flex');
                });
            }

            // Close preview button
            if (closePreviewBtn && previewModal) {
                closePreviewBtn.addEventListener('click', function() {
                    previewModal.classList.add('hidden');
                    previewModal.classList.remove('flex');
                });
            }

            // Filter buttons
            if (filterBtns && filterBtns.length > 0) {
                filterBtns.forEach(btn => {
                    btn.addEventListener('click', function() {
                        if (!btn.dataset.filter) return;

                        // Update active state
                        filterBtns.forEach(b => {
                            b.classList.remove('bg-pink-500', 'text-white');
                            b.classList.add('bg-gray-200', 'text-gray-700');
                        });

                        btn.classList.remove('bg-gray-200', 'text-gray-700');
                        btn.classList.add('bg-pink-500', 'text-white');

                        // Apply filter
                        renderMediaGrid(btn.dataset.filter);
                    });
                });
            }
        } catch (error) {
            console.error("Error initializing media library:", error);
        }
    }

    // Scan DOM for media
    function scanDOMForMedia() {
        try {
            // Ensure mediaLibrary exists
            if (!window.mediaLibrary) {
                window.mediaLibrary = { images: [], videos: [] };
            }

            // Find all images in message content
            const messageImages = document.querySelectorAll('.message-content img');
            messageImages.forEach(img => {
                if (img.src && !window.mediaLibrary.images.includes(img.src)) {
                    window.mediaLibrary.images.push(img.src);
                }
            });

            // Find all standalone images
            const standaloneImages = document.querySelectorAll('img:not(.message-content img)');
            standaloneImages.forEach(img => {
                if (img.src &&
                    !img.src.includes('data:image') && // Skip inline data URLs
                    !window.mediaLibrary.images.includes(img.src)) {
                    window.mediaLibrary.images.push(img.src);
                }
            });

            // Find all videos in message content
            const messageVideos = document.querySelectorAll('.message-content video source');
            messageVideos.forEach(source => {
                if (source.src && !window.mediaLibrary.videos.includes(source.src)) {
                    window.mediaLibrary.videos.push(source.src);
                }
            });

            // Find all standalone videos
            const standaloneVideos = document.querySelectorAll('video:not(.message-content video) source');
            standaloneVideos.forEach(source => {
                if (source.src && !window.mediaLibrary.videos.includes(source.src)) {
                    window.mediaLibrary.videos.push(source.src);
                }
            });
        } catch (error) {
            console.error("Error scanning DOM for media:", error);
        }
    }

    // Render media grid
    function renderMediaGrid(filter) {
        try {
            const mediaGrid = document.getElementById('media-grid');
            if (!mediaGrid) return;

            // Ensure the media library exists
            if (!window.mediaLibrary) {
                window.mediaLibrary = { images: [], videos: [] };
            }

            // Clear the grid
            mediaGrid.innerHTML = '';

            // Collect media items based on filter
            let mediaItems = [];

            if (filter === 'all' || filter === 'images') {
                (window.mediaLibrary.images || []).forEach(src => {
                    if (src) mediaItems.push({ type: 'image', src });
                });
            }

            if (filter === 'all' || filter === 'videos') {
                (window.mediaLibrary.videos || []).forEach(src => {
                    if (src) mediaItems.push({ type: 'video', src });
                });
            }

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
                return;
            }

            // Create media items
            mediaItems.forEach((item, index) => {
                if (!item.src) return; // Skip items with no source

                const mediaItem = document.createElement('div');
                mediaItem.className = 'media-item rounded-lg overflow-hidden shadow-md hover:shadow-lg transition cursor-pointer bg-gray-100 aspect-square flex items-center justify-center';

                try {
                    if (item.type === 'image') {
                        mediaItem.innerHTML = `<img src="${item.src}" class="object-cover w-full h-full" alt="Media item ${index}" />`;
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

                    // Get references to modal elements
                    const previewModal = document.getElementById('media-preview-modal');
                    const previewContent = document.getElementById('media-preview-content');

                    // Add preview functionality
                    mediaItem.addEventListener('click', function() {
                        if (!previewModal || !previewContent) return;

                        try {
                            // Clear previous content
                            previewContent.innerHTML = '';

                            // Add appropriate content based on type
                            if (item.type === 'image') {
                                previewContent.innerHTML = `<img src="${item.src}" class="max-w-full max-h-[80vh] object-contain" alt="Media preview" />`;
                            } else {
                                previewContent.innerHTML = `
                                    <video controls autoplay class="max-w-full max-h-[80vh] object-contain"><source src="${item.src}">
                                    </video>
                                `;
                            }

                            // Show the preview modal
                            previewModal.classList.remove('hidden');
                            previewModal.classList.add('flex');
                        } catch (error) {
                            console.error("Error showing preview:", error);
                        }
                    });

                    // Add to grid
                    mediaGrid.appendChild(mediaItem);
                } catch (error) {
                    console.error("Error creating media item:", error);
                }
            });
        } catch (error) {
            console.error("Error rendering media grid:", error);
        }
    }

    // =============== FRIENDS & RECOMMENDATIONS ===============
    function initFriendsAndRecommendations() {
        // Get DOM elements
        const onlineFriendsList = document.getElementById('online-friends-list');
        const recommendedRoomsList = document.getElementById('recommended-rooms-list');

        // If none of these elements exist, exit early
        if (!onlineFriendsList && !recommendedRoomsList) return;

        // Request online friends if the element exists
        if (onlineFriendsList) {
            requestOnlineFriends();

            // Set up interval to refresh online friends every 30 seconds
            setInterval(requestOnlineFriends, 30000);
        }

        // Request room recommendations if the element exists
        if (recommendedRoomsList) {
            requestRoomRecommendations();
        }
    }

    // Request online friends from the server
    function requestOnlineFriends() {
        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
            window.socket.send(JSON.stringify({
                type: 'friends',
                action: 'list_online'
            }));
        }
    }

    // Request room recommendations from the server
    function requestRoomRecommendations() {
        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
            window.socket.send(JSON.stringify({
                type: 'recommendations',
                action: 'get',
                include_bookmarks: true // Add flag to request bookmarked rooms
            }));
        } else {
            // Fallback to HTTP API if WebSocket isn't connected
            fallbackRequestRoomRecommendations();
        }
    }

    // HTTP fallback for room recommendations
    function fallbackRequestRoomRecommendations() {
        fetch('/api/get_recommendations/')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderRoomRecommendations(data.rooms || [], data.bookmarked_rooms || []);
                }
            })
            .catch(error => {
                console.error("Error in fallback recommendations request:", error);
            });
    }

    // Handle friends messages from the server
    function handleFriendsMessage(data) {
        if (data.action === 'online_list') {
            renderOnlineFriends(data.friends || []);
        }
    }

    // Handle recommendations messages from the server
    function handleRecommendationsMessage(data) {
        if (data.action === 'list') {
            // Extract bookmarked rooms and regular recommendations
            const bookmarkedRooms = data.bookmarked_rooms || [];
            const recommendedRooms = data.rooms || [];

            // Render with both sets of data
            renderRoomRecommendations(recommendedRooms, bookmarkedRooms);
        }
    }

    // Render online friends list
    function renderOnlineFriends(friends) {
        const onlineFriendsList = document.getElementById('online-friends-list');
        if (!onlineFriendsList) return;

        // Default to empty list
        onlineFriendsList.innerHTML = '';

        if (!friends || !Array.isArray(friends) || friends.length === 0) {
            onlineFriendsList.innerHTML = `
                <div class="text-gray-400 text-xs italic py-2">
                    None of your friends are online right now.
                </div>
            `;
            return;
        }

        friends.forEach(friend => {
            const friendItem = document.createElement('div');
            friendItem.className = 'flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors';

            // If the friend object doesn't have an avatar, use the first letter of the username
            const avatar = friend.avatar || friend.username.charAt(0).toUpperCase();

            friendItem.innerHTML = `
                <div class="user-avatar h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs">
                    ${avatar}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium">${friend.username}</p>
                    <span class="flex items-center text-xs text-green-500">
                        <span class="h-1.5 w-1.5 bg-green-500 rounded-full mr-1"></span>
                        Online now
                    </span>
                </div>
                <a href="/chat/dm/${friend.username}/" class="text-gray-400 hover:text-pink-500 p-1.5 rounded-full hover:bg-pink-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </a>
            `;

            onlineFriendsList.appendChild(friendItem);
        });
    }

    // Helper function to render a single room item
    function renderRoomItem(room, container, isBookmarked) {
        const roomItem = document.createElement('div');
        roomItem.className = 'p-2 hover:bg-gray-50 rounded-lg transition-colors room-card-interactive';

        // Determine activity status
        const activityClass = room.activity === 'high' ? 'bg-green-500' : 'bg-yellow-500';
        const activityLabel = room.activity === 'high' ? 'Very active' : 'Active';

        // Create bookmarked indicator if needed
        const bookmarkIndicator = isBookmarked ? `
            <span class="ml-1 text-pink-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 inline" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
            </span>
        ` : '';

        roomItem.innerHTML = `
            <div class="flex items-center">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br ${room.is_protected ? 'from-yellow-400 to-orange-300' : 'from-pink-400 to-orange-300'} text-white flex items-center justify-center mr-2 font-medium text-xs">
                    ${room.display_name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <a href="/chat/${room.name}/" class="text-sm font-medium hover:text-pink-600 hover:underline">
                        ${room.display_name}${bookmarkIndicator}
                    </a>
                    <div class="flex items-center text-xs text-gray-500">
                        ${room.category ? `<span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs mr-2">${room.category}</span>` : ''}
                        <span>${room.message_count || 0} messages</span>
                        <span class="ml-2 flex items-center">
                            <span class="h-1.5 w-1.5 rounded-full mr-1 ${activityClass}"></span>
                            ${activityLabel}
                        </span>
                    </div>
                </div>
                <a href="/chat/${room.name}/" class="text-gray-400 hover:text-pink-500 p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </div>
        `;

        container.appendChild(roomItem);
    }

    // Render room recommendations list
    function renderRoomRecommendations(rooms, bookmarkedRooms = []) {
        const recommendedRoomsList = document.getElementById('recommended-rooms-list');
        if (!recommendedRoomsList) return;

        recommendedRoomsList.innerHTML = '';

        // First, render bookmarked rooms with a heading
        if (bookmarkedRooms && bookmarkedRooms.length > 0) {
            // Add a heading for bookmarked rooms
            const bookmarksHeading = document.createElement('h4');
            bookmarksHeading.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 mb-2';
            bookmarksHeading.textContent = 'Your Bookmarks';
            recommendedRoomsList.appendChild(bookmarksHeading);

            // Render each bookmarked room
            bookmarkedRooms.forEach(room => {
                renderRoomItem(room, recommendedRoomsList, true);
            });

            // Add a separator if we also have recommendations
            if (rooms && rooms.length > 0) {
                const separator = document.createElement('div');
                separator.className = 'border-t border-gray-200 my-3';
                recommendedRoomsList.appendChild(separator);

                // Add a heading for recommended rooms
                const recommendationsHeading = document.createElement('h4');
                recommendationsHeading.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 mb-2';
                recommendationsHeading.textContent = 'Recommended For You';
                recommendedRoomsList.appendChild(recommendationsHeading);
            }
        }

        // Then render regular recommendations
        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            if (bookmarkedRooms.length === 0) {
                // Only show this message if there are no bookmarks either
                recommendedRoomsList.innerHTML = `
                    <div class="text-gray-400 text-xs italic py-2">
                        No recommendations available yet. Join more chat rooms or bookmark your favorites!
                    </div>
                `;
            }
            return;
        }

        // Render each recommended room
        rooms.forEach(room => {
            renderRoomItem(room, recommendedRoomsList, false);
        });
    }

    // =============== BOOKMARK FUNCTIONALITY ===============
    // Initialize bookmark button
    function initializeBookmarkButton() {
        const bookmarkBtn = document.getElementById('bookmark-room');

        if (!bookmarkBtn) return;

        // Check if room is already bookmarked from localStorage
        const isBookmarked = localStorage.getItem(`bookmarked_${window.roomName}`) === 'true';

        // Update button appearance based on current state
        updateBookmarkButton(isBookmarked);

        // Add click event listener
        bookmarkBtn.addEventListener('click', function() {
            // Toggle bookmarked state
            const newState = localStorage.getItem(`bookmarked_${window.roomName}`) === 'true' ? false : true;

            // Get CSRF token
            const csrfToken = getCsrfToken();

            // Send bookmark request to server
            fetch('/api/toggle_bookmark_room/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    room_name: window.roomName,
                    bookmarked: newState
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store bookmark state in localStorage
                    localStorage.setItem(`bookmarked_${window.roomName}`, newState);

                    // Update button appearance
                    updateBookmarkButton(newState);

                    // Show notification
                    showNotification(newState ? 'Room bookmarked!' : 'Room bookmark removed');

                    // Update recommendations to reflect the new bookmark state
                    requestRoomRecommendations();
                } else {
                    showNotification('Failed to update bookmark: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error toggling room bookmark:', error);
                showNotification('An error occurred while updating bookmark');
            });
        });
    }

    // Update bookmark button appearance
    function updateBookmarkButton(isBookmarked) {
        const bookmarkBtn = document.getElementById('bookmark-room');
        if (!bookmarkBtn) return;

        if (isBookmarked) {
            // Bookmarked state - filled icon
            bookmarkBtn.classList.add('active');
            bookmarkBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
            `;
            bookmarkBtn.setAttribute('title', 'Remove bookmark');
        } else {
            // Not bookmarked state - outlined icon
            bookmarkBtn.classList.remove('active');
            bookmarkBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
            `;
            bookmarkBtn.setAttribute('title', 'Bookmark this room');
        }
    }

    // Send a friend request
    function sendFriendRequest(userId) {
        // Get CSRF token
        const csrfToken = getCsrfToken();

        fetch('/api/friend_request/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                receiver_id: userId // Can be username or user ID
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Friend request sent!');
            } else {
                console.error('Failed to send friend request:', data.error);
                showNotification('Failed to send friend request: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error sending friend request:', error);
            showNotification('Error sending friend request');
        });
    }

    // Show notification helper
    function showNotification(message) {
        const toast = document.getElementById('notification-toast');
        const toastMessage = document.getElementById('notification-message');

        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.remove('hidden');

            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        } else {
            // Fallback if the notification elements aren't found
            const tempToast = document.createElement('div');
            tempToast.className = 'notification-toast';
            tempToast.textContent = message;
            document.body.appendChild(tempToast);

            setTimeout(() => {
                document.body.removeChild(tempToast);
            }, 3000);
        }
    }

        // Initialize bookmark button if it exists
        initializeBookmarkButton();
});
