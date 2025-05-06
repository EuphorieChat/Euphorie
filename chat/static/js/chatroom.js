document.addEventListener("DOMContentLoaded", function () {
    // Configuration and Globals
    const roomName = window.roomName;
    const username = window.username;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 3000; // 3 seconds
    let uploadedFiles = [];
    let isDrawing = false;

    // Make media library globally accessible for persistence
    window.mediaLibrary = {
        images: [],
        videos: []
    };

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
    const typingIndicator = document.getElementById("typing-indicator");

    function connectWebSocket() {
        const wsUrl = `${protocol}://${window.location.host}/ws/chat/${roomName}/`;
        console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);

        try {
            const socket = new WebSocket(wsUrl);

            // Make socket globally accessible for debugging
            window.socket = socket;

            // WebSocket Event Listeners with improved logging
            socket.addEventListener("open", (event) => {
                console.log(`✅ WebSocket connected to room: ${roomName}`);
                reconnectAttempts = 0; // Reset reconnect counter on successful connection

                // Request user list immediately on connection
                socket.send(JSON.stringify({
                    type: 'users',
                    action: 'list'
                }));

                // Request other initial data
                if (window.username) {
                    socket.send(JSON.stringify({
                        type: 'meetup',
                        action: 'list'
                    }));

                    // Request friends and recommendations
                    requestOnlineFriends();
                    requestRoomRecommendations();
                }
            });

            socket.addEventListener("message", handleSocketMessage);

            socket.addEventListener("error", (error) => {
                console.error("⚠️ WebSocket error:", error);
                alertUserOfConnectionIssue();
            });

            socket.addEventListener("close", (event) => {
                console.log(`❌ WebSocket closed: ${event.code}, reason: ${event.reason || 'No reason provided'}`);

                // Auto-reconnect after a short delay
                if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = reconnectDelay * Math.min(reconnectAttempts, 5);
                    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts}) in ${delay/1000} seconds...`);

                    setTimeout(() => {
                        console.log("Reconnecting WebSocket...");
                        connectWebSocket();
                    }, delay);
                } else if (reconnectAttempts >= maxReconnectAttempts) {
                    console.error("Maximum reconnection attempts reached. Please refresh the page.");
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

    function handleSocketMessage(event) {
        // Log incoming data for debugging
        console.log("📩 Message received:", event.data.substring(0, 200) + (event.data.length > 200 ? '...' : ''));

        try {
            const data = JSON.parse(event.data);
            const messageType = data.type || 'unknown';

            console.log(`Processing message of type: ${messageType}`);

            switch (messageType) {
                case "chat":
                    console.log("Chat message:", data);
                    renderMessage(data);
                    // Track media in the message for media library
                    trackMediaInMessage(data.message);
                    break;

                case "reaction":
                    console.log("Reaction update:", data);
                    updateReaction(data);
                    break;

                case "typing":
                    console.log("Typing indicator:", data);
                    showTyping(data.username);
                    break;

                case "users":
                    console.log("User list update received:", data);
                    if (data.users && Array.isArray(data.users)) {
                        updateUserList(data.users);
                    } else {
                        console.error("Invalid users data:", data.users);
                    }
                    break;

                case "whiteboard":
                    console.log("Whiteboard update:", data);
                    handleWhiteboardMessage(data);
                    break;

                case "meetups":
                    console.log("Meetups update:", data);
                    renderMeetups(data.meetups);
                    break;

                case "announcement":
                    console.log("Announcement update:", data);
                    handleAnnouncementMessage(data);
                    break;

                case "friends":
                    console.log("Friends update:", data);
                    handleFriendsMessage(data);
                    break;

                case "recommendations":
                    console.log("Recommendations update:", data);
                    handleRecommendationsMessage(data);
                    break;

                case "pong":
                    console.log("Pong received from server");
                    break;

                case "error":
                    console.error("Error from server:", data.message);
                    if (data.message && data.message.includes("authentication")) {
                        // Handle authentication errors specially
                        console.log("Authentication issue detected - user may need to log in");
                    }
                    break;

                default:
                    console.log("Unknown message type:", messageType, data);
            }
        } catch (e) {
            console.error("Error processing message:", e);
            console.error("Raw message data:", event.data);
        }
    }

    function requestUserList() {
        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
            console.log("Manually requesting user list");
            window.socket.send(JSON.stringify({
                type: 'users',
                action: 'list'
            }));
        } else {
            console.error("Cannot request user list: WebSocket not connected");
        }
    }

    // Initialize WebSocket connection
    const socket = connectWebSocket();

    setTimeout(() => {
        // Request user list again after a short delay to ensure connection is established
        requestUserList();
    }, 1000);

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

    // Init functions
    initFriendsAndRecommendations();
    initFileUpload();
    initEmojiPanel();
    initReactionModal();
    initWhiteboard();
    initMeetupPlanner();
    initMobileUserList();
    initAnnouncementHandlers(); // Initialize announcement handlers
    initMediaLibrary(); // Initialize media library immediately

    // Initialize all message bubbles with reaction listeners
    document.querySelectorAll(".message-bubble").forEach(addReactionListeners);

    // Auto-scroll to bottom of chat on load
    if (chatLog) {
        // Delay scroll to ensure all content is rendered first
        setTimeout(() => {
            chatLog.scrollTo({ top: chatLog.scrollHeight });
        }, 100);
    }

    // Image compression function
    async function compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Create canvas for compression
                    const canvas = document.createElement('canvas');

                    // Calculate new dimensions (maintaining aspect ratio)
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 900; // Maximum dimension

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

                    // Draw image on canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to blob with reduced quality
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    }, 'image/jpeg', 0.5); // Adjust quality (0.5 = 50%)
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Media tracking function - CRITICAL for media library
    function trackMediaInMessage(message) {
        try {
            if (!message) {
                console.warn("No message content to track media from");
                return;
            }

            console.log("Tracking media in message");

            // Ensure mediaLibrary exists
            if (!window.mediaLibrary) {
                window.mediaLibrary = { images: [], videos: [] };
            }

            // Create a temporary div to parse the HTML content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = message;

            // Find and track images
            const images = tempDiv.querySelectorAll('img');
            images.forEach(img => {
                if (img.src && !window.mediaLibrary.images.includes(img.src)) {
                    console.log("Adding image to library:", img.src);
                    window.mediaLibrary.images.push(img.src);
                }
            });

            // Find and track videos
            const videos = tempDiv.querySelectorAll('video source');
            videos.forEach(source => {
                if (source.src && !window.mediaLibrary.videos.includes(source.src)) {
                    console.log("Adding video to library:", source.src);
                    window.mediaLibrary.videos.push(source.src);
                }
            });
        } catch (error) {
            console.error("Error tracking media in message:", error);
        }
    }

    // Enhanced sendMessage function with error handling
    function sendMessage() {
        const msg = input.value.trim();

        // Check authentication first
        if (!window.username) {
            // Instead of alert, we could show a more user-friendly message
            console.log('Cannot send: User not authenticated');

            if (document.querySelector('.guest-banner')) {
                // Highlight the guest banner to draw attention
                const guestBanner = document.querySelector('.guest-banner');
                guestBanner.classList.add('highlight-banner');
                setTimeout(() => {
                    guestBanner.classList.remove('highlight-banner');
                }, 2000);
            } else {
                // Show a small notification
                showLoginPrompt();
            }
            return;
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

            // Remove toast after animation
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 3500);
        }

        // Send text message
        if (msg) {
            try {
                window.socket.send(JSON.stringify({
                    type: "chat",
                    message: msg
                }));
                input.value = "";
                console.log("Text message sent successfully");
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

        // Make sure to track media in the message for the media library
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

        // Only show typing for other users, not for current user
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
        console.log("Updating user list with:", users);
        const userList = document.getElementById("user-list");
        const mobileList = document.getElementById("mobile-user-list-content");

        // Early error handling with more descriptive console messages
        if (!userList) {
            console.error("Desktop user list element not found! Make sure element with id 'user-list' exists.");
            return;
        }

        // Clear the existing content
        userList.innerHTML = "";

        // Handle the mobile list if it exists
        if (mobileList) {
            mobileList.innerHTML = "";
        }

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

        // Use a Set to ensure each username only appears once
        const uniqueUsers = [...new Set(users)];
        console.log("Unique users:", uniqueUsers);

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

        // Add event listeners for add friend buttons (after all elements are added to DOM)
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

    // File Upload Functions
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

    // Enhanced CSRF token handling function
    function getCsrfToken() {
        // Try multiple methods to get the CSRF token

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
        } catch (e) {
            console.warn("Error getting CSRF token from cookies:", e);
        }

        // Method 2: From meta tag
        try {
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            if (csrfMeta) {
                return csrfMeta.getAttribute('content');
            }
        } catch (e) {
            console.warn("Error getting CSRF token from meta tag:", e);
        }

        // Method 3: From hidden input field
        try {
            const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
            if (csrfInput) {
                return csrfInput.value;
            }
        } catch (e) {
            console.warn("Error getting CSRF token from input field:", e);
        }

        console.error("CSRF token not found. This may cause issues with AJAX requests.");
        return '';
    }

    // Enhanced file upload function with better error handling and CSRF token
    async function uploadFilesAndSend() {
        if (uploadedFiles.length === 0) return;

        const formData = new FormData();
        const csrfToken = getCsrfToken();

        // Compress images before uploading
        try {
            for (const file of uploadedFiles) {
                try {
                    if (file.type.startsWith('image/')) {
                        const compressedFile = await compressImage(file);
                        formData.append("media", compressedFile);
                        console.log("Added compressed image to upload: original size:", file.size, "compressed size:", compressedFile.size);
                    } else {
                        formData.append("media", file);
                    }
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    // Continue with other files
                }
            }

            progressWrap.classList.remove("hidden");
            progressBar.style.width = "0%";

            // Use the actual URL path
            const uploadUrl = "/api/upload_media/";

            // Add CSRF token to request headers
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

                        // Add to media library immediately after sending
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
                console.error("Upload succeeded but no URLs returned:", result);
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
                setTimeout(() => errorMsg.remove(), 5000);  // Show for 5 seconds
            }
            throw error; // Re-throw so caller can handle it
        } finally {
            // Reset UI regardless of outcome
            fileInput.value = "";
            uploadedFiles = [];
            previewContainer.classList.add("hidden");

            // Delay hiding progress to make success visible
            setTimeout(() => {
                progressWrap.classList.add("hidden");
            }, 1000);
        }
    }

    // Emoji Panel Functions
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

    // Reaction Functions
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

    // Mobile UI Functions
    function initMobileUserList() {
        const mobileUserListToggle = document.getElementById("mobile-user-list-toggle");
        const mobileUserList = document.getElementById("mobile-user-list");

        if (mobileUserListToggle && mobileUserList) {
            mobileUserListToggle.addEventListener("click", () => {
                mobileUserList.classList.toggle("hidden");
            });
        }
    }

    // Whiteboard Functions
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

    // Meetup Functions
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

    // Announcement Functions - FIXED VERSION
    function initAnnouncementHandlers() {
        console.log("Initializing announcement handlers");

        // Handle close buttons for announcements in the top container
        const closeButtons = document.querySelectorAll('.close-announcement');
        if (closeButtons.length > 0) {
            console.log(`Found ${closeButtons.length} close buttons`);
            closeButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const announcementItem = this.closest('.announcement-item, .announcement-popup');
                    if (announcementItem) {
                        const announcementId = announcementItem.dataset.announcementId;
                        if (announcementId) {
                            markAnnouncementAsRead(announcementId);
                        } else {
                            console.error("No announcement ID found on item", announcementItem);
                        }
                    }
                });
            });
        } else {
            console.log("No close buttons found");
        }

        // Process existing announcements from the page and add them to the chat
        const chatLog = document.getElementById('chat-log');
        const container = document.getElementById('announcements-container');
        const announcements = container ? container.querySelectorAll('.announcement-item:not(.hidden)') : [];

        if (announcements.length > 0 && chatLog) {
            console.log(`Found ${announcements.length} visible announcements to process`);

            // Hide the original container
            if (container) {
                container.classList.add('hidden');
            }

            // Convert each announcement to a chat message
            announcements.forEach(originalAnnouncement => {
                try {
                    // Get important data with null checks
                    const announcementId = originalAnnouncement.dataset.announcementId;
                    if (!announcementId) {
                        console.error("Missing announcement ID", originalAnnouncement);
                        return;
                    }

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
        } else {
            console.log("No announcements to process or chat log not found", {
                chatLogExists: !!chatLog,
                announcements: announcements.length
            });
        }
    }

    function handleAnnouncementMessage(data) {
        console.log("Handling announcement message:", data);

        const chatLog = document.getElementById('chat-log');
        if (!chatLog) {
            console.error("Chat log element not found");
            return;
        }

        if (data.action === 'new') {
            try {
                // Check if this announcement is already displayed
                const existingAnnouncement = document.querySelector(`.announcement-popup[data-announcement-id="${data.announcement_id}"]`);
                if (existingAnnouncement) {
                    console.log("Announcement already displayed, not showing again");
                    return;
                }

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
        if (!announcementId) {
            console.error("No announcement ID provided");
            return;
        }

        console.log(`Marking announcement ${announcementId} as read`);

        // Get CSRF token
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            console.error("Could not get CSRF token");
        }

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
            console.log("Announcement marked as read response:", data);
            if (data.success) {
                // Hide all instances of this announcement (both in top container and in chat)

                // 1. Hide in the top container if it exists
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

                // 2. Animate and remove from chat if it exists there
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

    // Media Library Functions - ROBUST VERSION
    function initMediaLibrary() {
        try {
            console.log("Initializing media library...");

            // If the global media library doesn't exist, create it
            if (!window.mediaLibrary) {
                window.mediaLibrary = {
                    images: [],
                    videos: []
                };
            }

            // Get DOM elements with null checks
            const openMediaBtn = document.getElementById('open-media-library');
            const closeMediaBtn = document.getElementById('close-media-library');
            const mediaModal = document.getElementById('media-library-modal');
            const mediaGrid = document.getElementById('media-grid');
            const filterBtns = document.querySelectorAll('.media-filter-btn');
            const closePreviewBtn = document.getElementById('close-media-preview');
            const previewModal = document.getElementById('media-preview-modal');
            const previewContent = document.getElementById('media-preview-content');

            // Debug check for necessary elements
            console.log("Media library elements:", {
                openMediaBtn: !!openMediaBtn,
                closeMediaBtn: !!closeMediaBtn,
                mediaModal: !!mediaModal,
                mediaGrid: !!mediaGrid,
                filterButtons: filterBtns?.length,
                previewModal: !!previewModal,
                previewContent: !!previewContent
            });

            // Check for required elements and exit if missing
            if (!openMediaBtn) {
                console.error("Media library button not found - cannot initialize");
                return;
            }

            if (!mediaModal || !mediaGrid) {
                console.error("Media library modal or grid not found - cannot initialize fully");
                // We can still attach the event listener to the button, but we'll show an error when clicked
                openMediaBtn.addEventListener('click', function() {
                    alert("Media library functionality is not available. Please contact support.");
                });
                return;
            }

            // Initial scan for media in the DOM
            scanDOMForMedia();

            // Open media library button
            openMediaBtn.addEventListener('click', function() {
                console.log("Opening media library");

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
                if (mediaModal) {
                    mediaModal.classList.remove('hidden');
                    mediaModal.classList.add('flex');
                }
            });

            // Close media library button
            if (closeMediaBtn) {
                closeMediaBtn.addEventListener('click', function() {
                    console.log("Closing media library");
                    if (mediaModal) {
                        mediaModal.classList.add('hidden');
                        mediaModal.classList.remove('flex');
                    }
                });
            }

            // Close preview button
            if (closePreviewBtn && previewModal) {
                closePreviewBtn.addEventListener('click', function() {
                    console.log("Closing media preview");
                    previewModal.classList.add('hidden');
                    previewModal.classList.remove('flex');
                });
            }

             // Filter buttons
             if (filterBtns && filterBtns.length > 0) {
                filterBtns.forEach(btn => {
                    btn.addEventListener('click', function() {
                        if (!btn.dataset.filter) {
                            console.error("Filter button missing data-filter attribute");
                            return;
                        }

                        console.log("Filter clicked:", btn.dataset.filter);

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
            console.log("Media library initialization complete");
        } catch (error) {
            console.error("Error initializing media library:", error);
        }
    }

    // Scan DOM for media with robust error handling
    function scanDOMForMedia() {
        try {
            console.log("Scanning DOM for media...");

            // Ensure mediaLibrary exists
            if (!window.mediaLibrary) {
                window.mediaLibrary = { images: [], videos: [] };
            }

            // Use a more comprehensive approach to find media
            // 1. Find all images in message content
            const messageImages = document.querySelectorAll('.message-content img');
            messageImages.forEach(img => {
                if (img.src && !window.mediaLibrary.images.includes(img.src)) {
                    console.log("Found image in message:", img.src);
                    window.mediaLibrary.images.push(img.src);
                }
            });

            // 2. Find all standalone images
            const standaloneImages = document.querySelectorAll('img:not(.message-content img)');
            standaloneImages.forEach(img => {
                if (img.src &&
                    !img.src.includes('data:image') && // Skip inline data URLs
                    !window.mediaLibrary.images.includes(img.src)) {
                    console.log("Found standalone image:", img.src);
                    window.mediaLibrary.images.push(img.src);
                }
            });

            // 3. Find all videos in message content
            const messageVideos = document.querySelectorAll('.message-content video source');
            messageVideos.forEach(source => {
                if (source.src && !window.mediaLibrary.videos.includes(source.src)) {
                    console.log("Found video in message:", source.src);
                    window.mediaLibrary.videos.push(source.src);
                }
            });

            // 4. Find all standalone videos
            const standaloneVideos = document.querySelectorAll('video:not(.message-content video) source');
            standaloneVideos.forEach(source => {
                if (source.src && !window.mediaLibrary.videos.includes(source.src)) {
                    console.log("Found standalone video:", source.src);
                    window.mediaLibrary.videos.push(source.src);
                }
            });

            console.log("Media library after scan:", {
                images: window.mediaLibrary.images.length,
                videos: window.mediaLibrary.videos.length
            });
        } catch (error) {
            console.error("Error scanning DOM for media:", error);
        }
    }

    // Render media grid with robust error handling
    function renderMediaGrid(filter) {
        try {
            console.log(`Rendering media grid with filter: ${filter}`);

            const mediaGrid = document.getElementById('media-grid');
            if (!mediaGrid) {
                console.error("Media grid element not found!");
                return;
            }

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

            console.log(`Found ${mediaItems.length} media items for filter '${filter}'`);

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
                        console.log("Media item clicked:", item);

                        if (!previewModal || !previewContent) {
                            console.error("Preview elements not found!");
                            alert("Preview functionality is not available");
                            return;
                        }

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

    // Helper Functions
    function formatDate(date) {
        try {
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error("Error formatting date:", error);
            return date.toString();
        }
    }

    // Friend and Recommendations Functions
    function initFriendsAndRecommendations() {
        console.log("Initializing friends and recommendations features");

        // Get DOM elements for friends section
        const onlineFriendsList = document.getElementById('online-friends-list');

        // Get DOM elements for recommendations section
        const recommendedRoomsList = document.getElementById('recommended-rooms-list');

        // If none of these elements exist, exit early
        if (!onlineFriendsList && !recommendedRoomsList) {
            console.log("No friends/recommendations elements found - skipping initialization");
            return;
        }

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
            console.log("Requesting online friends");
            window.socket.send(JSON.stringify({
                type: 'friends',
                action: 'list_online'
            }));
        } else {
            console.warn("WebSocket not connected - cannot request online friends");
        }
    }

    // Request room recommendations from the server
    function requestRoomRecommendations() {
        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
            console.log("Requesting room recommendations");
            window.socket.send(JSON.stringify({
                type: 'recommendations',
                action: 'get'
            }));
        } else {
            console.warn("WebSocket not connected - cannot request room recommendations");
        }
    }

    // Handle friends messages from the server
    function handleFriendsMessage(data) {
        console.log("Got friends message:", data);
        if (data.action === 'online_list') {
            renderOnlineFriends(data.friends || []);
        }
    }

    // Handle recommendations messages from the server
    function handleRecommendationsMessage(data) {
        console.log("Got recommendations message:", data);
        if (data.action === 'list') {
            renderRoomRecommendations(data.rooms || []);
        }
    }

    // Render online friends list
    function renderOnlineFriends(friends) {
        const onlineFriendsList = document.getElementById('online-friends-list');
        if (!onlineFriendsList) return;

        // Generate dummy data for demo if we didn't get any friends
        if (!friends || !Array.isArray(friends) || friends.length === 0) {
            // Create sample data for demonstration
            friends = [
                { username: 'Sarah', avatar: 'S', status: 'online' },
                { username: 'Mike', avatar: 'M', status: 'online' }
            ];
        }

        onlineFriendsList.innerHTML = '';

        if (friends.length === 0) {
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

    // Render room recommendations list
    function renderRoomRecommendations(rooms) {
        const recommendedRoomsList = document.getElementById('recommended-rooms-list');
        if (!recommendedRoomsList) return;

        // Generate dummy data for demo if we didn't get any recommendations
        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            // Create sample recommendations for demonstration
            rooms = [
                {
                    name: 'tech-talk',
                    display_name: 'Tech Talk',
                    category: 'Technology',
                    message_count: 128,
                    activity: 'high',
                    is_protected: false
                },
                {
                    name: 'book-club',
                    display_name: 'Book Club',
                    category: 'Reading',
                    message_count: 84,
                    activity: 'medium',
                    is_protected: false
                }
            ];
        }

        recommendedRoomsList.innerHTML = '';

        if (rooms.length === 0) {
            recommendedRoomsList.innerHTML = `
                <div class="text-gray-400 text-xs italic py-2">
                    No recommendations available yet. Join more chat rooms!
                </div>
            `;
            return;
        }

        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'p-2 hover:bg-gray-50 rounded-lg transition-colors';

            // Determine activity status
            const activityClass = room.activity === 'high' ? 'bg-green-500' : 'bg-yellow-500';
            const activityLabel = room.activity === 'high' ? 'Very active' : 'Active';

            roomItem.innerHTML = `
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br ${room.is_protected ? 'from-yellow-400 to-orange-300' : 'from-pink-400 to-orange-300'} text-white flex items-center justify-center mr-2 font-medium text-xs">
                        ${room.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1">
                        <a href="/chat/${room.name}/" class="text-sm font-medium hover:text-pink-600 hover:underline">${room.display_name}</a>
                        <div class="flex items-center text-xs text-gray-500">
                            ${room.category ? `<span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs mr-2">${room.category}</span>` : ''}
                            <span>${room.message_count} messages</span>
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

            recommendedRoomsList.appendChild(roomItem);
        });
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
            console.log("Friend request response:", data);
            if (data.success) {
                console.log('Friend request sent successfully');
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
});
