// Reliable Chat Implementation - Simplified and with proper debugging
document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 Chat application initializing...");

    // Core Variables
    const roomName = window.roomName || '';
    const username = window.username || 'Guest';
    let socket = null;

    // ============ DOM ELEMENT REFERENCES ============
    const chatLog = document.getElementById("chat-log");
    const messageForm = document.getElementById("message-form");
    const messageInput = document.getElementById("chat-message-input");
    const sendButton = document.getElementById("send-btn");
    const typingIndicator = document.getElementById("typing-indicator");
    const userList = document.getElementById("user-list");
    const mobileUserList = document.getElementById("mobile-user-list-content");

    // Log important element status for debugging
    console.log("📌 Chat log element:", chatLog ? "Found" : "Missing");
    console.log("📌 Message form:", messageForm ? "Found" : "Missing");
    console.log("📌 Message input:", messageInput ? "Found" : "Missing");

    // ============ CONNECTION MANAGEMENT ============
    function connectWebSocket() {
        if (!roomName) {
            console.error("❌ Room name is not defined - cannot connect WebSocket");
            return false;
        }

        // Correctly construct WebSocket URL
        const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
        const wsUrl = `${wsScheme}://${window.location.host}/ws/chat/${roomName}/`;

        console.log("🔌 Connecting to WebSocket:", wsUrl);

        try {
            socket = new WebSocket(wsUrl);

            // Connection opened
            socket.addEventListener("open", function () {
                console.log("✅ WebSocket connected successfully");

                // Announce presence and request data once connected
                if (username && username !== 'Guest') {
                    sendToSocket({
                        type: 'users',
                        action: 'list'
                    });

                    sendToSocket({
                        type: 'meetup',
                        action: 'list'
                    });
                }
            });

            // Listen for messages
            socket.addEventListener("message", handleSocketMessage);

            // Connection error
            socket.addEventListener("error", function (event) {
                console.error("❌ WebSocket error:", event);
            });

            // Connection closed
            socket.addEventListener("close", function (event) {
                console.log("⚠️ WebSocket closed. Code:", event.code, "Reason:", event.reason);

                // Attempt to reconnect after a delay unless it was a normal closure
                if (event.code !== 1000) {
                    console.log("🔄 Attempting to reconnect in 5 seconds...");
                    setTimeout(connectWebSocket, 5000);
                }
            });

            // Store globally for console debugging
            window.chatSocket = socket;
            return true;

        } catch (error) {
            console.error("❌ Failed to create WebSocket connection:", error);
            return false;
        }
    }

    // Helper to safely send messages to the socket
    function sendToSocket(data) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.error("❌ Cannot send message - socket not connected");
            return false;
        }

        try {
            const jsonData = JSON.stringify(data);
            socket.send(jsonData);
            console.log("📤 Sent to socket:", data);
            return true;
        } catch (error) {
            console.error("❌ Error sending to socket:", error);
            return false;
        }
    }

    // ============ MESSAGE HANDLERS ============
    function handleSocketMessage(event) {
        console.log("📥 Received message:", event.data);

        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "chat":
                    addMessageToChat(data);
                    break;

                case "typing":
                    showTypingIndicator();
                    break;

                case "users":
                    updateUsersList(data.users);
                    break;

                case "reaction":
                    updateMessageReaction(data);
                    break;

                case "whiteboard":
                    handleWhiteboardUpdate(data);
                    break;

                case "meetups":
                    updateMeetupsList(data.meetups);
                    break;

                default:
                    console.log("📌 Received unknown message type:", data.type);
            }
        } catch (error) {
            console.error("❌ Error processing message:", error);
        }
    }

    // ============ CHAT FUNCTIONALITY ============
    function initMessageForm() {
        if (!messageForm) {
            console.error("❌ Message form not found");
            return;
        }

        messageForm.addEventListener("submit", function (event) {
            event.preventDefault();

            if (username && username !== 'Guest') {
                sendChatMessage();
            } else {
                alert("Please log in to send messages");
            }
        });

        console.log("✅ Message form initialized");
    }

    function sendChatMessage() {
        if (!messageInput) return;

        const message = messageInput.value.trim();
        if (!message) return;

        // Send the message through WebSocket
        sendToSocket({
            type: "chat",
            message: message
        });

        // Clear the input
        messageInput.value = "";
    }

    function addMessageToChat(data) {
        if (!chatLog) {
            console.error("❌ Chat log element not found");
            return;
        }

        const { username: sender, message, message_id } = data;
        const isOwnMessage = sender === username;

        // Create message element
        const messageElement = document.createElement("div");
        messageElement.className = `message-bubble ${isOwnMessage ? "sent" : "received"} group`;
        messageElement.dataset.messageId = message_id || Date.now();

        // Build the message HTML
        messageElement.innerHTML = `
            <div class="flex items-start">
                <div class="flex-1">
                    <p class="text-xs font-semibold mb-0.5 ${isOwnMessage ? "text-pink-500" : "text-yellow-600"}">${sender}</p>
                    <div class="text-sm text-gray-700 message-content">${message}</div>
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

        // Add to chat and scroll to bottom
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight;

        // Add reaction handlers
        addReactionHandlers(messageElement);

        console.log("✅ Added message to chat:", message_id);
    }

    function showTypingIndicator() {
        if (!typingIndicator) return;

        // Show the typing indicator
        typingIndicator.classList.remove("hidden");

        // Hide after a delay
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            typingIndicator.classList.add("hidden");
        }, 1500);
    }

    // ============ USER MANAGEMENT ============
    function updateUsersList(users) {
        console.log("👥 Updating users list:", users);

        if (!userList && !mobileUserList) {
            console.error("❌ User list elements not found");
            return;
        }

        // Clear existing lists
        if (userList) userList.innerHTML = "";
        if (mobileUserList) mobileUserList.innerHTML = "";

        if (!users || !Array.isArray(users) || users.length === 0) {
            console.log("ℹ️ No users to display");
            return;
        }

        // Add each user to the lists
        users.forEach(user => {
            if (userList) {
                const userItem = document.createElement("li");
                userItem.className = "flex items-center";
                userItem.innerHTML = `
                    <div class="user-avatar h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs">
                        ${user.charAt(0).toUpperCase()}
                    </div>
                    <span>${user}</span>
                `;
                userList.appendChild(userItem);
            }

            if (mobileUserList) {
                const mobileItem = document.createElement("span");
                mobileItem.className = "user-list-item";
                mobileItem.textContent = user;
                mobileUserList.appendChild(mobileItem);
            }
        });

        console.log("✅ Users list updated");
    }

    // ============ REACTIONS ============
    function addReactionHandlers(messageElement) {
        if (!messageElement) return;

        const messageId = messageElement.dataset.messageId;
        const reactionButtons = messageElement.querySelectorAll(".emoji-reaction");

        reactionButtons.forEach(button => {
            button.addEventListener("click", function() {
                const emoji = this.textContent;

                sendToSocket({
                    type: "reaction",
                    message_id: messageId,
                    reaction: emoji
                });
            });
        });
    }

    function updateMessageReaction(data) {
        const { message_id, reaction, count, users } = data;

        // Find the message element
        const messageElement = document.querySelector(`[data-message-id="${message_id}"]`);
        if (!messageElement) {
            console.error("❌ Message element not found for reaction:", message_id);
            return;
        }

        // Find or create the reaction container
        const reactionsContainer = messageElement.querySelector(".reactions-container");
        let reactionElement = reactionsContainer.querySelector(`[data-emoji="${reaction}"]`);

        if (count > 0) {
            // Create if it doesn't exist
            if (!reactionElement) {
                reactionElement = document.createElement("span");
                reactionElement.className = "bg-white rounded-full px-2 py-0.5 inline-flex items-center shadow-sm cursor-pointer hover:bg-yellow-50 transition-colors";
                reactionElement.dataset.emoji = reaction;
                reactionsContainer.appendChild(reactionElement);

                // Add click handler to toggle reaction
                reactionElement.addEventListener("click", function() {
                    sendToSocket({
                        type: "reaction",
                        message_id: message_id,
                        reaction: reaction
                    });
                });
            }

            // Update content
            reactionElement.innerHTML = `${reaction} <span class="reaction-count ml-1">${count}</span>`;
            reactionElement.title = users.join(", ");
        } else if (reactionElement) {
            // Remove if count is 0
            reactionElement.remove();
        }

        console.log("✅ Updated reaction:", reaction, "for message:", message_id);
    }

    // ============ WHITEBOARD ============
    function handleWhiteboardUpdate(data) {
        const canvas = document.getElementById("whiteboard-canvas");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (data.action === "draw") {
            const x = data.x * canvas.width;
            const y = data.y * canvas.height;

            ctx.lineWidth = data.size || 5;
            ctx.lineCap = "round";
            ctx.strokeStyle = data.color || "#000000";

            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else if (data.action === "clear") {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // ============ MEETUPS ============
    function updateMeetupsList(meetups) {
        const meetupsContainer = document.getElementById("upcoming-meetups");
        if (!meetupsContainer) return;

        // Clear existing content
        meetupsContainer.innerHTML = "";

        if (!meetups || meetups.length === 0) {
            // Show empty state
            meetupsContainer.innerHTML = `
                <p class="text-gray-400 text-xs italic">No upcoming meetups planned yet.</p>
                <button id="create-meetup-btn" class="btn w-full bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-xl transition text-sm inline-flex items-center justify-center mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Plan a Meetup
                </button>
            `;

            // Re-attach event listener
            const createButton = document.getElementById("create-meetup-btn");
            if (createButton) {
                createButton.addEventListener("click", showMeetupModal);
            }

            return;
        }

        // Sort meetups by date
        const sortedMeetups = [...meetups].sort((a, b) => {
            return new Date(a.datetime) - new Date(b.datetime);
        });

        // Show only upcoming meetups
        const upcomingMeetups = sortedMeetups.filter(meetup => {
            return new Date(meetup.datetime) > new Date();
        });

        // Add each meetup to the container
        upcomingMeetups.forEach(meetup => {
            const meetupDate = new Date(meetup.datetime);
            const isAttending = meetup.attendees.includes(username);

            const meetupElement = document.createElement("div");
            meetupElement.className = "p-3 rounded-lg bg-gradient-to-r from-pink-50 to-yellow-50 border border-pink-100 mb-2";
            meetupElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <h4 class="font-medium text-gray-800">${meetup.title}</h4>
                    <span class="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                        ${meetupDate.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}
                    </span>
                </div>
                <div class="mt-1 text-xs">
                    <div class="flex items-center text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ${meetupDate.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}
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

            meetupsContainer.appendChild(meetupElement);

            // Add click handler for attendance button
            const attendButton = meetupElement.querySelector(".attend-btn");
            if (attendButton) {
                attendButton.addEventListener("click", function() {
                    const meetupId = this.dataset.meetupId;
                    const action = isAttending ? "leave" : "join";

                    sendToSocket({
                        type: "meetup",
                        action: action,
                        meetup_id: meetupId
                    });
                });
            }
        });

        // Add "Create Meetup" button
        const createButton = document.createElement("button");
        createButton.id = "create-meetup-btn";
        createButton.className = "btn w-full bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-xl transition text-sm inline-flex items-center justify-center mt-3";
        createButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Plan a Meetup
        `;
        meetupsContainer.appendChild(createButton);

        // Add click handler
        createButton.addEventListener("click", showMeetupModal);

        console.log("✅ Updated meetups list");
    }

    function showMeetupModal() {
        const meetupModal = document.getElementById("meetup-modal");
        if (!meetupModal) return;

        // Set default date to tomorrow at noon
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);

        const dateInput = document.getElementById("meetup-datetime");
        if (dateInput) {
            dateInput.value = formatDateForInput(tomorrow);
        }

        // Show modal
        meetupModal.classList.remove("hidden");
        meetupModal.classList.add("flex");
    }

    function formatDateForInput(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // ============ FILE UPLOADS ============
    function initFileUploads() {
        const fileInput = document.getElementById("file-input");
        const previewContainer = document.getElementById("preview");
        const previewContent = document.getElementById("preview-content");
        const cancelButton = document.getElementById("cancel-preview");

        if (!fileInput || !previewContainer || !previewContent || !cancelButton) {
            console.log("❌ File upload elements not found");
            return;
        }

        let uploadedFiles = [];

        fileInput.addEventListener("change", function(event) {
            uploadedFiles = Array.from(event.target.files || []);

            if (uploadedFiles.length === 0) return;

            // Show preview container and clear previous content
            previewContainer.classList.remove("hidden");
            previewContent.innerHTML = "";

            // Create previews for each file
            uploadedFiles.forEach(file => {
                if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;

                const reader = new FileReader();
                reader.onload = function() {
                    const preview = document.createElement("div");
                    preview.className = "file-preview";

                    if (file.type.startsWith("image/")) {
                        preview.innerHTML = `<img src="${reader.result}" class="w-full rounded" />`;
                    } else if (file.type.startsWith("video/")) {
                        preview.innerHTML = `<video controls class="w-full rounded"><source src="${reader.result}" type="${file.type}"></video>`;
                    }

                    previewContent.appendChild(preview);
                };

                reader.readAsDataURL(file);
            });
        });

        cancelButton.addEventListener("click", function() {
            uploadedFiles = [];
            fileInput.value = "";
            previewContainer.classList.add("hidden");
        });

        // Handle form submission with file uploads
        messageForm.addEventListener("submit", function(event) {
            if (uploadedFiles.length > 0 && messageInput.value.trim() === "") {
                event.preventDefault();
                uploadFiles();
            }
        });

        async function uploadFiles() {
            if (uploadedFiles.length === 0) return;

            const progressContainer = document.getElementById("progress-container");
            const progressBar = document.getElementById("progress-bar");

            if (progressContainer && progressBar) {
                progressContainer.classList.remove("hidden");
                progressBar.style.width = "0%";
            }

            const formData = new FormData();
            uploadedFiles.forEach(file => {
                formData.append("media", file);
            });

            try {
                const response = await fetch("/api/upload_media/", {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const result = await response.json();

                if (progressBar) {
                    progressBar.style.width = "100%";
                }

                if (result.success && result.urls && result.urls.length > 0) {
                    // Send each uploaded file as a message
                    result.urls.forEach(url => {
                        const extension = url.split('.').pop().toLowerCase();
                        const isVideo = ['mp4', 'webm', 'mov'].includes(extension);

                        const html = isVideo
                            ? `<video controls class="max-w-xs rounded-lg"><source src="${url}" type="video/mp4"></video>`
                            : `<img src="${url}" class="max-w-xs rounded-lg" />`;

                        sendToSocket({
                            type: "chat",
                            message: html
                        });
                    });

                    console.log("✅ Files uploaded successfully");
                } else {
                    console.error("❌ Upload failed:", result);
                }

            } catch (error) {
                console.error("❌ Error uploading files:", error);
            } finally {
                // Reset UI
                uploadedFiles = [];
                fileInput.value = "";
                previewContainer.classList.add("hidden");

                if (progressContainer) {
                    progressContainer.classList.add("hidden");
                }
            }
        }
    }

    // ============ INITIALIZATION ============
    function initializeChatApp() {
        // Connect to WebSocket
        if (!connectWebSocket()) {
            console.error("❌ Failed to initialize WebSocket - chat features will not work");
            return;
        }

        // Initialize form
        initMessageForm();

        // Initialize typing indicator
        if (messageInput) {
            messageInput.addEventListener("input", function() {
                if (this.value.trim() !== "") {
                    sendToSocket({ type: "typing" });
                }
            });
        }

        // Initialize file uploads
        initFileUploads();

        // Initialize meetup form
        const meetupForm = document.getElementById("meetup-form");
        if (meetupForm) {
            meetupForm.addEventListener("submit", function(event) {
                event.preventDefault();

                const title = document.getElementById("meetup-title").value;
                const datetime = document.getElementById("meetup-datetime").value;
                const location = document.getElementById("meetup-location").value;
                const description = document.getElementById("meetup-description").value;

                if (!title || !datetime || !location) {
                    alert("Please fill in all required fields");
                    return;
                }

                sendToSocket({
                    type: "meetup",
                    action: "create",
                    meetup: {
                        title,
                        datetime,
                        location,
                        description,
                        created_by: username
                    }
                });

                // Hide modal
                const meetupModal = document.getElementById("meetup-modal");
                if (meetupModal) {
                    meetupModal.classList.add("hidden");
                    meetupModal.classList.remove("flex");
                }

                // Reset form
                meetupForm.reset();
            });
        }

        // Initialize cancel meetup button
        const cancelMeetupBtn = document.getElementById("cancel-meetup");
        if (cancelMeetupBtn) {
            cancelMeetupBtn.addEventListener("click", function() {
                const meetupModal = document.getElementById("meetup-modal");
                if (meetupModal) {
                    meetupModal.classList.add("hidden");
                    meetupModal.classList.remove("flex");
                }
            });
        }

        // Initialize whiteboard
        const whiteboardCanvas = document.getElementById("whiteboard-canvas");
        if (whiteboardCanvas) {
            initWhiteboard();
        }

        // Initialize media library
        const openMediaBtn = document.getElementById("open-media-library");
        if (openMediaBtn) {
            initMediaLibrary();
        }

        // Initialize mobile user list toggle
        const mobileUserListToggle = document.getElementById("mobile-user-list-toggle");
        const mobileUserList = document.getElementById("mobile-user-list");
        if (mobileUserListToggle && mobileUserList) {
            mobileUserListToggle.addEventListener("click", function() {
                mobileUserList.classList.toggle("hidden");
            });
        }

        // Scroll chat to bottom
        if (chatLog) {
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        console.log("✅ Chat application initialized successfully");
    }

    // ============ WHITEBOARD ============
    function initWhiteboard() {
        const canvas = document.getElementById("whiteboard-canvas");
        const ctx = canvas.getContext("2d");
        const openBtn = document.getElementById("open-whiteboard");
        const closeBtn = document.getElementById("close-whiteboard");
        const clearBtn = document.getElementById("clear-whiteboard");
        const modal = document.getElementById("whiteboard-modal");
        const colorPicker = document.getElementById("brush-color");
        const sizePicker = document.getElementById("brush-size");

        if (!canvas || !ctx || !openBtn || !closeBtn || !clearBtn || !modal) {
            console.error("❌ Whiteboard elements not found");
            return;
        }

        let isDrawing = false;

        // Resize canvas to fit container
        function resizeCanvas() {
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        }

        // Open whiteboard
        openBtn.addEventListener("click", function() {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
            setTimeout(resizeCanvas, 100);
        });

        // Close whiteboard
        closeBtn.addEventListener("click", function() {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        });

        // Clear whiteboard
        clearBtn.addEventListener("click", function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            sendToSocket({
                type: "whiteboard",
                action: "clear"
            });
        });

        // Mouse events
        canvas.addEventListener("mousedown", startDrawing);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("mouseup", stopDrawing);
        canvas.addEventListener("mouseout", stopDrawing);

        // Touch events
        canvas.addEventListener("touchstart", startDrawingTouch);
        canvas.addEventListener("touchmove", drawTouch);
        canvas.addEventListener("touchend", stopDrawing);

        // Window resize
        window.addEventListener("resize", resizeCanvas);

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

            const color = colorPicker.value;
            const size = sizePicker.value;

            ctx.lineWidth = size;
            ctx.lineCap = "round";
            ctx.strokeStyle = color;

            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);

            sendToSocket({
                type: "whiteboard",
                action: "draw",
                x: e.offsetX / canvas.width,
                y: e.offsetY / canvas.height,
                color: color,
                size: size
            });
        }

        function drawTouch(e) {
            if (!isDrawing) return;
            e.preventDefault();

            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const color = colorPicker.value;
            const size = sizePicker.value;

            ctx.lineWidth = size;
            ctx.lineCap = "round";
            ctx.strokeStyle = color;

            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);

            sendToSocket({
                type: "whiteboard",
                action: "draw",
                x: x / canvas.width,
                y: y / canvas.height,
                color: color,
                size: size
            });
        }

        function stopDrawing() {
            isDrawing = false;
            ctx.beginPath();
        }

        console.log("✅ Whiteboard initialized");
    }

    // ============ MEDIA LIBRARY ============
    function initMediaLibrary() {
        const openBtn = document.getElementById("open-media-library");
        const closeBtn = document.getElementById("close-media-library");
        const modal = document.getElementById("media-library-modal");
        const grid = document.getElementById("media-grid");
        const filterBtns = document.querySelectorAll(".media-filter-btn");
        const previewModal = document.getElementById("media-preview-modal");
        const previewContent = document.getElementById("media-preview-content");
        const closePreviewBtn = document.getElementById("close-media-preview");

        if (!openBtn || !modal || !grid) {
            console.error("❌ Media library elements not found");
            return;
        }

        // Media library storage
        let mediaItems = {
            images: [],
            videos: []
        };

        // Open media library
        openBtn.addEventListener("click", function() {
            collectMedia();
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        });

        // Close media library
        if (closeBtn) {
            closeBtn.addEventListener("click", function() {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
            });
        }

        // Close preview
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener("click", function() {
                previewModal.classList.add("hidden");
                previewModal.classList.remove("flex");
            });
        }

        // Filter buttons
        filterBtns.forEach(btn => {
            btn.addEventListener("click", function() {
                // Update active state
                filterBtns.forEach(b => {
                    b.classList.remove("bg-pink-500", "text-white");
                    b.classList.add("bg-gray-200", "text-gray-700");
                });
                this.classList.remove("bg-gray-200", "text-gray-700");
                this.classList.add("bg-pink-500", "text-white");

                // Apply filter
                renderMediaGrid(this.dataset.filter);
            });
        });

        // Collect media from chat messages
        function collectMedia() {
            mediaItems = {
                images: [],
                videos: []
            };

            // Collect images
            document.querySelectorAll(".message-content img").forEach(img => {
                if (img.src && !mediaItems.images.includes(img.src)) {
                    mediaItems.images.push(img.src);
                }
            });

            // Collect videos
            document.querySelectorAll(".message-content video source").forEach(source => {
                if (source.src && !mediaItems.videos.includes(source.src)) {
                    mediaItems.videos.push(source.src);
                }
            });

            console.log("✅ Collected media:", mediaItems.images.length, "images,", mediaItems.videos.length, "videos");

            // Show all by default
            renderMediaGrid("all");
        }

        // Render media grid
        function renderMediaGrid(filter) {
            if (!grid) return;

            grid.innerHTML = "";

            let filteredItems = [];

            if (filter === "all" || filter === "images") {
                mediaItems.images.forEach(src => {
                    filteredItems.push({ type: "image", src });
                });
            }

            if (filter === "all" || filter === "videos") {
                mediaItems.videos.forEach(src => {
                    filteredItems.push({ type: "video", src });
                });
            }

            if (filteredItems.length === 0) {
                grid.innerHTML = `
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
            filteredItems.forEach(item => {
                const mediaItem = document.createElement("div");
                mediaItem.className = "media-item rounded-lg overflow-hidden shadow-md hover:shadow-lg transition cursor-pointer bg-gray-100 aspect-square flex items-center justify-center";

                if (item.type === "image") {
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

                // Add click handler
                mediaItem.addEventListener("click", function() {
                    if (!previewModal || !previewContent) return;

                    previewContent.innerHTML = "";

                    if (item.type === "image") {
                        previewContent.innerHTML = `<img src="${item.src}" class="max-w-full max-h-[80vh] object-contain" />`;
                    } else {
                        previewContent.innerHTML = `
                            <video controls class="max-w-full max-h-[80vh] object-contain">
                                <source src="${item.src}">
                            </video>
                        `;
                    }

                    previewModal.classList.remove("hidden");
                    previewModal.classList.add("flex");
                });

                grid.appendChild(mediaItem);
            });
        }

        console.log("✅ Media library initialized");
    }

    // Start the chat application
    initializeChatApp();
});
