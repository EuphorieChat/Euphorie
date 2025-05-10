
// Initialize the chat application when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
  // =============== CONFIGURATION & GLOBALS ===============
  const EuphorieChat = {
    // Core configuration
    config: {
      roomName: window.roomName,
      username: window.username,
      protocol: window.location.protocol === "https:" ? "wss" : "ws",
      reconnectAttempts: 0,
      maxReconnectAttempts: 10,
      reconnectDelay: 2000,
      typingTimeout: null,
      mediaLibrary: { images: [], videos: [] },
      uploadedFiles: [],
      isDrawing: false
    },

    // DOM Elements (populated in init function)
    elements: {},

    // WebSocket connection
    socket: null,

    // Initialize the application
    init: function() {
      this.cacheElements();
      this.connectWebSocket();
      this.initializeFeatures();
      this.setupEventListeners();

      // Auto-scroll chat on load
      if (this.elements.chatLog) {
        setTimeout(() => {
          this.elements.chatLog.scrollTo({ top: this.elements.chatLog.scrollHeight });
        }, 100);
      }
    },

    // Cache DOM elements for better performance
    cacheElements: function() {
      // Core chat elements
      this.elements.chatLog = document.getElementById("chat-log");
      this.elements.messageInput = document.getElementById("chat-message-input");
      this.elements.messageForm = document.getElementById("message-form");
      this.elements.typingIndicator = document.getElementById("typing-indicator");
      this.elements.jumpToBottomBtn = document.getElementById("jump-to-bottom");

      // File upload elements
      this.elements.fileInput = document.getElementById("file-input");
      this.elements.previewContainer = document.getElementById("preview");
      this.elements.previewContent = document.getElementById("preview-content");
      this.elements.progressBar = document.getElementById("progress-bar");
      this.elements.progressContainer = document.getElementById("progress-container");
      this.elements.cancelPreviewBtn = document.getElementById("cancel-preview");

      // Emoji panel elements
      this.elements.emojiButton = document.getElementById("emoji-button");
      this.elements.emojiPanel = document.getElementById("emoji-panel");

      // User interface elements
      this.elements.userProfileToggle = document.getElementById("user-profile-toggle");
      this.elements.profileMenu = document.getElementById("profile-menu");
      this.elements.header = document.querySelector(".app-header");
      this.elements.userList = document.getElementById("user-list");
      this.elements.mobileUserList = document.getElementById("mobile-user-list-content");
      this.elements.mobileUserListToggle = document.getElementById("mobile-menu-toggle");
      this.elements.mobileUserListContainer = document.getElementById("mobile-user-list");

      // Whiteboard elements
      this.elements.whiteboardCanvas = document.getElementById("whiteboard-canvas");
      this.elements.whiteboardBrushColor = document.getElementById("brush-color");
      this.elements.whiteboardBrushSize = document.getElementById("brush-size");
      this.elements.whiteboardContext = this.elements.whiteboardCanvas ? this.elements.whiteboardCanvas.getContext("2d") : null;

      // Media library elements
      this.elements.mediaGrid = document.getElementById("media-grid");
      this.elements.mediaFilterBtns = document.querySelectorAll(".media-filter-btn");

      // Notification toast
      this.elements.toast = document.getElementById("notification-toast");
      this.elements.toastMessage = document.getElementById("notification-message");

      // Bookmark button
      this.elements.bookmarkBtn = document.getElementById("bookmark-room");
    },

    // Setup global event listeners
    setupEventListeners: function() {
      // Form submission
      if (this.elements.messageForm) {
        this.elements.messageForm.addEventListener("submit", (event) => {
          event.preventDefault();
          if (this.config.username) {
            this.sendMessage();
          } else {
            this.showLoginPrompt();
          }
        });
      }

      // Typing indicator
      if (this.elements.messageInput) {
        this.elements.messageInput.addEventListener("input", () => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // Only send typing event if we haven't sent one recently
            clearTimeout(this.config.typingTimeout);

            this.socket.send(JSON.stringify({
              type: "typing",
              username: this.config.username
            }));

            // Set a timeout to prevent sending too many typing events
            this.config.typingTimeout = setTimeout(() => {}, 2000);
          }
        });
      }

      // Jump to bottom button
      if (this.elements.jumpToBottomBtn && this.elements.chatLog) {
        // Show/hide based on scroll position
        this.elements.chatLog.addEventListener("scroll", () => {
          const scrollBottom = this.elements.chatLog.scrollHeight -
                              this.elements.chatLog.scrollTop -
                              this.elements.chatLog.clientHeight;

          if (scrollBottom > 100) {
            this.elements.jumpToBottomBtn.classList.add("visible");
          } else {
            this.elements.jumpToBottomBtn.classList.remove("visible");
          }
        });

        // Jump to bottom on click
        this.elements.jumpToBottomBtn.addEventListener("click", () => {
          this.elements.chatLog.scrollTo({
            top: this.elements.chatLog.scrollHeight,
            behavior: "smooth"
          });
        });
      }

      // Add scroll effect to header
      if (this.elements.header) {
        window.addEventListener("scroll", () => {
          if (window.scrollY > 10) {
            this.elements.header.classList.add("scrolled");
          } else {
            this.elements.header.classList.remove("scrolled");
          }
        });
      }

      // Profile menu toggle
      if (this.elements.userProfileToggle && this.elements.profileMenu) {
        this.elements.userProfileToggle.addEventListener("click", (e) => {
          e.stopPropagation();
          this.elements.profileMenu.classList.toggle("open");

          // Position the menu properly
          const rect = this.elements.userProfileToggle.getBoundingClientRect();
          const menuRect = this.elements.profileMenu.getBoundingClientRect();

          // Ensure it stays within viewport
          if (rect.right - menuRect.width < 0) {
            this.elements.profileMenu.style.right = "auto";
            this.elements.profileMenu.style.left = "0";
          } else {
            this.elements.profileMenu.style.right = "0";
            this.elements.profileMenu.style.left = "auto";
          }
        });

        // Close menu when clicking elsewhere
        document.addEventListener("click", (e) => {
          if (!this.elements.userProfileToggle.contains(e.target) &&
              !this.elements.profileMenu.contains(e.target)) {
            this.elements.profileMenu.classList.remove("open");
          }
        });
      }

      // Mobile user list toggle
      if (this.elements.mobileUserListToggle && this.elements.mobileUserListContainer) {
        this.elements.mobileUserListToggle.addEventListener("click", () => {
          this.elements.mobileUserListContainer.classList.toggle("hidden");
        });
      }

      // Initialize existing message reaction listeners
      document.querySelectorAll(".message-bubble").forEach(this.addReactionListeners.bind(this));
    },

    // Initialize all features
    initializeFeatures: function() {
      this.initFileUpload();
      this.initEmojiPanel();
      this.initWhiteboard();
      this.initMediaLibrary();
      this.initModals();
      this.initAnnouncementHandlers();
      this.initializeBookmarkButton();
      this.initFriendsAndRecommendations();
      this.initMeetupPlanner();
      this.initProfilePictureSync();
      this.initReactionModal();
    },

    // =============== WEBSOCKET CONNECTIVITY ===============

    // Connect to WebSocket
    connectWebSocket: function() {
      const wsUrl = `${this.config.protocol}://${window.location.host}/ws/chat/${this.config.roomName}/`;

      try {
        const socket = new WebSocket(wsUrl);
        this.socket = socket;
        window.socket = socket; // For backward compatibility

        socket.addEventListener("open", () => {
          console.log(`WebSocket connected to room: ${this.config.roomName}`);
          this.config.reconnectAttempts = 0;

          // Request initial data
          socket.send(JSON.stringify({ type: 'users', action: 'list' }));

          if (this.config.username) {
            socket.send(JSON.stringify({ type: 'meetup', action: 'list' }));
            this.requestOnlineFriends();
            this.requestRoomRecommendations();
          }

          // Show reconnection notification if this wasn't the first attempt
          if (this.config.reconnectAttempts > 0) {
            this.showNotification("Reconnected to chat");
          }
        });

        socket.addEventListener("message", this.handleSocketMessage.bind(this));

        socket.addEventListener("error", () => {
          this.alertUserOfConnectionIssue();
        });

        socket.addEventListener("close", (event) => {
          if (event.code !== 1000 && this.config.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.config.reconnectAttempts++;
            const delay = this.config.reconnectDelay * Math.min(this.config.reconnectAttempts, 5);

            console.warn(`WebSocket connection closed. Reconnecting (${this.config.reconnectAttempts}/${this.config.maxReconnectAttempts}) in ${delay/1000}s...`);
            this.showNotification("Connection lost. Reconnecting...");

            setTimeout(() => {
              this.connectWebSocket();
            }, delay);
          } else if (this.config.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.showNotification("Could not reconnect. Please refresh the page.");
          }
        });

        return socket;
      } catch (e) {
        console.error("Failed to create WebSocket connection:", e);
        this.alertUserOfConnectionIssue();
        return null;
      }
    },

    // Handle incoming WebSocket messages
    handleSocketMessage: function(event) {
      try {
        const data = JSON.parse(event.data);
        const messageType = data.type || 'unknown';

        switch (messageType) {
          case "chat_message":
          case "chat":
            this.renderMessage(data);
            this.trackMediaInMessage(data.message);
            break;

          case "reaction":
            this.updateReaction(data);
            break;

          case "typing":
            this.showTyping(data.username);
            break;

          case "user_list":
          case "users":
            if (data.users && Array.isArray(data.users)) {
              this.updateUserList(data.users);
            }
            break;

          case "whiteboard":
            this.handleWhiteboardMessage(data);
            break;

          case "meetup":
          case "meetups":
            this.renderMeetups(data.meetups);
            break;

          case "announcement":
            this.handleAnnouncementMessage(data);
            break;

          case "friends":
            this.handleFriendsMessage(data);
            break;

          case "recommendations":
            this.handleRecommendationsMessage(data);
            break;

          case "profile_update":
            this.handleProfileUpdate(data.username, data.profile_data);
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
    },

    // Show a notification to the user about connection issues
    alertUserOfConnectionIssue: function() {
      this.showNotification("Connection issue. Attempting to reconnect...");
    },

    // =============== MESSAGE HANDLING ===============

    // Send a message to the chat
    sendMessage: function() {
      const msg = this.elements.messageInput.value.trim();

      // Check authentication
      if (!this.config.username) {
        this.showLoginPrompt();
        return;
      }

      // Send text message
      if (msg) {
        try {
          this.socket.send(JSON.stringify({
            type: "chat_message",
            message: msg
          }));
          this.elements.messageInput.value = "";
        } catch (error) {
          console.error("Error sending text message:", error);
          this.alertUserOfConnectionIssue();
        }
      }
      // Send file uploads
      else if (this.config.uploadedFiles.length > 0) {
        this.uploadFilesAndSend().catch(error => {
          console.error("Error in file upload process:", error);
        });
      }
    },

    // Show prompt for unauthenticated users
    showLoginPrompt: function() {
      if (document.querySelector('.guest-banner')) {
        const guestBanner = document.querySelector('.guest-banner');
        guestBanner.classList.add('highlight-banner');
        setTimeout(() => {
          guestBanner.classList.remove('highlight-banner');
        }, 2000);
      } else {
        this.showNotification("Please log in to send messages");
      }
    },

    // Render a message in the chat
    renderMessage: function(data) {
      const chatLog = this.elements.chatLog;
      if (!chatLog) return;

      const sender = data.username;
      const message = data.message;
      const messageId = data.message_id || Date.now().toString();

      const isSelf = sender === this.config.username;

      // Create message wrapper
      const wrapper = document.createElement("div");
      wrapper.className = `flex items-start gap-2 group`;
      wrapper.setAttribute('data-message-id', messageId);

      // Calculate avatar class
      const avatarClass = isSelf ? 'avatar-pink' : this.getRandomAvatarClass(sender);

      // Create message HTML content
      wrapper.innerHTML = `
        <div class="avatar ${avatarClass} h-8 w-8 flex-shrink-0 text-sm user-avatar">
          ${sender.slice(0, 1).toUpperCase()}
        </div>
        <div class="flex-1">
          <div class="message-bubble ${isSelf ? 'sent' : 'received'}">
            <div class="flex items-start justify-between">
              <a href="/dm/${sender}/" class="text-xs font-semibold mb-1 ${isSelf ? 'text-pink-500' : 'text-purple-600'} hover:underline username-link">
                ${sender}
              </a>
              <div class="ml-2 opacity-0 group-hover:opacity-100 sm:flex hidden">
                <div class="flex space-x-1">
                  <button class="emoji-reaction p-1 text-xs bg-white rounded-full shadow-sm hover:bg-pink-50" aria-label="React with heart">❤️</button>
                  <button class="emoji-reaction p-1 text-xs bg-white rounded-full shadow-sm hover:bg-pink-50" aria-label="React with thumbs up">👍</button>
                  <button class="emoji-reaction p-1 text-xs bg-white rounded-full shadow-sm hover:bg-pink-50" aria-label="React with laugh">😂</button>
                </div>
              </div>
            </div>
            <div class="text-sm text-gray-700 message-content">
              ${message}
            </div>
          </div>
          <div class="reactions-container"></div>
        </div>
      `;

      chatLog.appendChild(wrapper);

      // Scroll to the bottom to show the new message
      this.scrollToBottom();

      // Add reaction listeners
      this.addReactionListeners(wrapper);

      // Track media in this message
      this.trackMediaInMessage(message);

      // Load user profile picture
      if (this.userProfiles && this.userProfiles.loadUserProfile) {
        setTimeout(() => {
          this.userProfiles.loadUserProfile(sender);
        }, 100);
      }
    },

    // Add reaction listeners to a message
    addReactionListeners: function(messageElement) {
      const messageId = messageElement.dataset.messageId;
      if (!messageId) return;

      messageElement.querySelectorAll(".emoji-reaction").forEach(btn => {
        const emoji = btn.textContent;
        btn.addEventListener("click", () => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
              type: "reaction",
              message_id: messageId,
              reaction: emoji
            }));
          } else {
            console.error("Cannot send reaction: WebSocket not connected");
            this.alertUserOfConnectionIssue();
          }
        });
      });
    },

    // Update reaction on a message
    updateReaction: function(data) {
      const messageId = data.message_id;
      const reaction = data.reaction;
      const count = data.count;
      const users = data.users || [];

      const message = document.querySelector(`[data-message-id="${messageId}"]`);
      if (!message) return;

      const container = message.querySelector(".reactions-container");
      if (!container) return;

      let reactionElement = container.querySelector(`[data-emoji="${reaction}"]`);

      if (count <= 0) {
        // Remove the reaction if count is 0
        if (reactionElement) {
          reactionElement.remove();
        }
        return;
      }

      if (!reactionElement) {
        // Create new reaction element
        reactionElement = document.createElement("div");
        reactionElement.className = "reaction";
        reactionElement.setAttribute("data-emoji", reaction);
        reactionElement.innerHTML = `${reaction} <span class="reaction-count">${count}</span>`;

        // Add click handler to show who reacted
        reactionElement.addEventListener("click", () => {
          this.showReactionUsers(messageId, reaction, users);
        });

        container.appendChild(reactionElement);
      } else {
        // Update existing reaction count
        const countElement = reactionElement.querySelector(".reaction-count");
        if (countElement) {
          countElement.textContent = count;
        }

        // Update users tooltip
        if (users.length > 0) {
          reactionElement.title = users.join(", ");
        }
      }
    },

    // Show typing indicator
    showTyping: function(username) {
      if (!this.elements.typingIndicator) return;

      // Only show typing for other users
      if (username === this.config.username) return;

      const usernameElement = document.getElementById("typing-username");
      if (usernameElement) {
        usernameElement.textContent = `${username || 'Someone'} is typing...`;
      }

      this.elements.typingIndicator.classList.remove("hidden");

      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        this.elements.typingIndicator.classList.add("hidden");
      }, 3000);
    },

    // Update the user list
    updateUserList: function(users) {
      const userList = this.elements.userList;
      const mobileList = this.elements.mobileUserList;

      if (!userList && !mobileList) return;

      // Process desktop user list
      if (userList) {
        // Clear existing content
        userList.innerHTML = "";

        // Check if we have users to display
        if (!users || users.length === 0) {
          userList.innerHTML = `<li class="text-gray-400 text-xs italic py-2">No users currently in this room.</li>`;
        } else {
          // Ensure unique users
          const uniqueUsers = [...new Set(users)];

          // Create list items for each user
          uniqueUsers.forEach(user => {
            const isCurrentUser = user === this.config.username;

            // Get consistent avatar class
            const avatarClass = isCurrentUser ?
              'bg-pink-500' : this.getAvatarColorClass(user);

            // Create list item
            const li = document.createElement("li");
            li.className = "user-item flex items-center justify-between";

            if (isCurrentUser) {
              li.innerHTML = `
                <div class="flex items-center">
                  <div class="h-6 w-6 rounded-full ${avatarClass} text-white flex items-center justify-center text-xs mr-2 user-avatar">
                    ${user.slice(0, 1).toUpperCase()}
                  </div>
                  <span class="text-sm">${user}</span>
                </div>
              `;
            } else {
              li.innerHTML = `
                <div class="flex items-center">
                  <div class="h-6 w-6 rounded-full ${avatarClass} text-white flex items-center justify-center text-xs mr-2 user-avatar">
                    ${user.slice(0, 1).toUpperCase()}
                  </div>
                  <span class="text-sm">${user}</span>
                </div>
                <button data-username="${user}" class="friend-btn text-xs py-1 px-2 rounded-md bg-pink-100 text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Add Friend
                </button>
              `;
            }

            userList.appendChild(li);
          });

          // Add event listeners for add friend buttons
          userList.querySelectorAll('.friend-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const username = btn.dataset.username;
              this.sendFriendRequest(username);
              btn.textContent = 'Sent';
              btn.disabled = true;
              btn.classList.remove('hover:bg-pink-200');
              btn.classList.add('bg-gray-100', 'text-gray-500');
            });
          });
        }
      }

      // Process mobile user list
      if (mobileList) {
        // Clear existing content
        mobileList.innerHTML = "";

        if (!users || users.length === 0) {
          mobileList.innerHTML = `<span class="text-gray-400 text-xs italic">No users currently in this room.</span>`;
        } else {
          // Ensure unique users
          const uniqueUsers = [...new Set(users)];

          // Create list items for mobile view
          uniqueUsers.forEach(user => {
            const isCurrentUser = user === this.config.username;

            const span = document.createElement("span");
            span.className = "user-list-item px-2 py-1 bg-gray-100 rounded-full mr-1 mb-1 text-xs";

            if (isCurrentUser) {
              span.classList.add("bg-pink-100", "text-pink-600");
            }

            span.textContent = user;
            mobileList.appendChild(span);
          });
        }

        // Make sure mobile list container is visible
        const mobileUserList = document.getElementById("mobile-user-list");
        if (mobileUserList) {
          mobileUserList.classList.remove("hidden");
        }
      }

      // Load profile pictures
      if (this.userProfiles && this.userProfiles.loadAllProfiles) {
        setTimeout(() => {
          this.userProfiles.loadAllProfiles();
        }, 200);
      }
    },

    // Track media in messages for media library
    trackMediaInMessage: function(message) {
      try {
        if (!message) return;

        if (!this.config.mediaLibrary) {
          this.config.mediaLibrary = { images: [], videos: [] };
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = message;

        // Track images
        tempDiv.querySelectorAll('img').forEach(img => {
          if (img.src && !this.config.mediaLibrary.images.includes(img.src)) {
            this.config.mediaLibrary.images.push(img.src);
          }
        });

        // Track videos
        tempDiv.querySelectorAll('video source').forEach(source => {
          if (source.src && !this.config.mediaLibrary.videos.includes(source.src)) {
            this.config.mediaLibrary.videos.push(source.src);
          }
        });
      } catch (error) {
        console.error("Error tracking media in message:", error);
      }
    },

    // Show who reacted with a particular emoji
    showReactionUsers: function(messageId, emoji, users = []) {
      const reactionModal = document.getElementById('reaction-modal');
      const userList = document.getElementById('reaction-user-list');

      if (!reactionModal || !userList) return;

      userList.innerHTML = '';

      if (users.length === 0) {
        userList.innerHTML = `
          <li class="py-2 px-3">
            Loading users who reacted...
          </li>
        `;
      } else {
        users.forEach(name => {
          const li = document.createElement('li');
          li.className = 'flex items-center py-1';

          li.innerHTML = `
            <div class="h-6 w-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs user-avatar" data-username="${name}">
              ${name.charAt(0).toUpperCase()}
            </div>
            <span>${name}</span>
          `;

          userList.appendChild(li);

          // Load profile pictures
          if (this.userProfiles && this.userProfiles.loadUserProfile) {
            this.userProfiles.loadUserProfile(name);
          }
        });
      }

      reactionModal.classList.add('open');
    },

    // Helper function to scroll to bottom of chat
    scrollToBottom: function() {
      if (!this.elements.chatLog) return;

      this.elements.chatLog.scrollTop = this.elements.chatLog.scrollHeight;
    },

    // Get random avatar class based on username
    getRandomAvatarClass: function(username) {
      const avatarClasses = [
        'avatar-orange', 'avatar-blue', 'avatar-green',
        'avatar-purple', 'avatar-yellow', 'avatar-red', 'avatar-teal'
      ];

      // Use a hash of the username to ensure consistent colors
      let hash = 0;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
      }

      return avatarClasses[Math.abs(hash) % avatarClasses.length];
    },

    // Get consistent avatar color class based on username
    getAvatarColorClass: function(username) {
      const colors = [
        'bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500'
      ];

      // Simple hash function for username
      let hash = 0;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
      }

      return colors[Math.abs(hash) % colors.length];
    },

    // =============== FILE UPLOAD ===============

    // Initialize file upload functionality
    initFileUpload: function() {
      const fileInput = this.elements.fileInput;
      const previewContainer = this.elements.previewContainer;
      const previewContent = this.elements.previewContent;
      const cancelPreviewBtn = this.elements.cancelPreviewBtn;

      if (fileInput) {
        fileInput.addEventListener("change", (e) => {
          this.config.uploadedFiles = [...e.target.files];

          if (previewContainer) {
            previewContainer.classList.remove("hidden");
          }

          if (previewContent) {
            previewContent.innerHTML = "";

            this.config.uploadedFiles.forEach(file => {
              const reader = new FileReader();
              reader.onload = () => {
                const preview = document.createElement("div");
                preview.className = "preview-item";

                if (file.type.startsWith("image")) {
                  preview.innerHTML = `<img src="${reader.result}" alt="Image preview" />`;
                } else if (file.type.startsWith("video")) {
                  preview.innerHTML = `<video muted loop><source src="${reader.result}" type="${file.type}"></video>`;
                }

                previewContent.appendChild(preview);
              };
              reader.readAsDataURL(file);
            });
          }
        });
      }

      if (cancelPreviewBtn) {
        cancelPreviewBtn.addEventListener("click", () => {
          this.config.uploadedFiles = [];

          if (fileInput) {
            fileInput.value = "";
          }

          if (previewContainer) {
            previewContainer.classList.add("hidden");
          }
        });
      }
    },

    // Compress image before upload
    async compressImage(file) {
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
    },

    // Upload files and send in chat
    async uploadFilesAndSend() {
      if (this.config.uploadedFiles.length === 0) return;

      const formData = new FormData();
      const csrfToken = this.getCsrfToken();

      const progressContainer = this.elements.progressContainer;
      const progressBar = this.elements.progressBar;

      try {
        // Compress images before uploading
        for (const file of this.config.uploadedFiles) {
          try {
            if (file.type.startsWith('image/')) {
              const compressedFile = await this.compressImage(file);
              formData.append("media", compressedFile);
            } else {
              formData.append("media", file);
            }
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
          }
        }

        if (progressContainer) {
          progressContainer.classList.remove("hidden");
        }

        if (progressBar) {
          progressBar.style.width = "0%";
        }

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

        if (progressBar) {
          progressBar.style.width = "100%";
        }

        if (result.success && result.urls && result.urls.length > 0) {
          result.urls.forEach(url => {
            const html = url.match(/\.(mp4|webm)$/i)
              ? `<video controls class='max-w-xs rounded-lg'><source src="${url}"></video>`
              : `<img src="${url}" class='max-w-xs rounded-lg' />`;

            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              this.socket.send(JSON.stringify({
                type: "chat_message",
                message: html,
              }));

              // Add to media library
              if (url.match(/\.(mp4|webm)$/i)) {
                if (!this.config.mediaLibrary.videos.includes(url)) {
                  this.config.mediaLibrary.videos.push(url);
                }
              } else {
                if (!this.config.mediaLibrary.images.includes(url)) {
                  this.config.mediaLibrary.images.push(url);
                }
              }
            } else {
              console.error("WebSocket not connected. Cannot send media message.");
              this.alertUserOfConnectionIssue();
            }
          });
        } else {
          throw new Error("No media URLs returned from server");
        }
      } catch (error) {
        console.error("Error uploading files:", error);
        // Show upload error to user
        this.showNotification("Upload failed: " + (error.message || "Please try again."));
        throw error;
      } finally {
        // Reset UI
        const fileInput = this.elements.fileInput;
        const previewContainer = this.elements.previewContainer;

        if (fileInput) {
          fileInput.value = "";
        }

        this.config.uploadedFiles = [];

        if (previewContainer) {
          previewContainer.classList.add("hidden");
        }

        // Delay hiding progress
        setTimeout(() => {
          if (progressContainer) {
            progressContainer.classList.add("hidden");
          }
        }, 1000);
      }
    },

    // =============== EMOJI PANEL ===============

    // Initialize emoji panel
    initEmojiPanel: function() {
      const emojiButton = this.elements.emojiButton;
      const emojiPanel = this.elements.emojiPanel;

      if (emojiButton && emojiPanel) {
        emojiButton.addEventListener("click", () => {
          emojiPanel.classList.toggle("show");
        });

        document.addEventListener("click", e => {
          if (!emojiButton.contains(e.target) && !emojiPanel.contains(e.target)) {
            emojiPanel.classList.remove("show");
          }
        });

        document.querySelectorAll(".emoji-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            if (this.elements.messageInput) {
              this.elements.messageInput.value += btn.textContent;
              this.elements.messageInput.focus();
              emojiPanel.classList.remove("show");
            }
          });
        });
      }
    },

    // =============== REACTION MODAL ===============

    // Initialize reaction modal
    initReactionModal: function() {
      const reactionModal = document.getElementById("reaction-modal");
      const closeModalBtn = document.getElementById("close-reaction-modal");

      if (closeModalBtn && reactionModal) {
        closeModalBtn.addEventListener("click", () => {
          reactionModal.classList.remove("open");
        });
      }
    },

    // =============== WHITEBOARD ===============

    // Initialize whiteboard
    initWhiteboard: function() {
      const canvas = this.elements.whiteboardCanvas;
      const ctx = this.elements.whiteboardContext;

      if (!canvas || !ctx) return;

      const openWhiteboardBtn = document.getElementById('open-whiteboard');
      const closeWhiteboardBtn = document.getElementById('close-whiteboard');
      const whiteboardModal = document.getElementById('whiteboard-modal');
      const clearWhiteboardBtn = document.getElementById('clear-whiteboard');
      const brushColor = this.elements.whiteboardBrushColor;
      const brushSize = this.elements.whiteboardBrushSize;

      // Set canvas size
      const resizeCanvas = () => {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      };

      if (openWhiteboardBtn && whiteboardModal) {
        openWhiteboardBtn.addEventListener('click', () => {
          whiteboardModal.classList.remove('hidden');
          whiteboardModal.classList.add('flex');
          setTimeout(resizeCanvas, 100);
        });
      }

      if (closeWhiteboardBtn && whiteboardModal) {
        closeWhiteboardBtn.addEventListener('click', () => {
          whiteboardModal.classList.add('hidden');
          whiteboardModal.classList.remove('flex');
        });
      }

      // Canvas drawing setup
      let isDrawing = false;

      const startDrawing = (e) => {
        isDrawing = true;
        draw(e);
      };

      const startDrawingTouch = (e) => {
        isDrawing = true;
        drawTouch(e);
      };

      const draw = (e) => {
        if (!isDrawing) return;

        ctx.lineWidth = brushSize ? brushSize.value : 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = brushColor ? brushColor.value : '#000000';

        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);

        // Broadcast drawing data
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'whiteboard',
            action: 'draw',
            x: e.offsetX / canvas.width,
            y: e.offsetY / canvas.height,
            color: brushColor ? brushColor.value : '#000000',
            size: brushSize ? brushSize.value : 5
          }));
        }
      };

      const drawTouch = (e) => {
        if (!isDrawing) return;
        e.preventDefault();

        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        ctx.lineWidth = brushSize ? brushSize.value : 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = brushColor ? brushColor.value : '#000000';

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);

        // Broadcast drawing data
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'whiteboard',
            action: 'draw',
            x: x / canvas.width,
            y: y / canvas.height,
            color: brushColor ? brushColor.value : '#000000',
            size: brushSize ? brushSize.value : 5
          }));
        }
      };

      const stopDrawing = () => {
        isDrawing = false;
        ctx.beginPath();
      };

      // Canvas drawing events
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseout', stopDrawing);

      // Touch events
      canvas.addEventListener('touchstart', startDrawingTouch);
      canvas.addEventListener('touchmove', drawTouch);
      canvas.addEventListener('touchend', stopDrawing);

      // Clear whiteboard
      if (clearWhiteboardBtn) {
        clearWhiteboardBtn.addEventListener('click', () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Broadcast clear event
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
              type: 'whiteboard',
              action: 'clear'
            }));
          }
        });
      }

      // Window resize event
      window.addEventListener('resize', resizeCanvas);
    },

    // Handle whiteboard messages
    handleWhiteboardMessage: function(data) {
      const canvas = this.elements.whiteboardCanvas;
      const ctx = this.elements.whiteboardContext;

      if (!canvas || !ctx) return;

      if (data.action === 'draw') {
        const x = data.x * canvas.width;
        const y = data.y * canvas.height;

        ctx.lineWidth = data.size;
        ctx.lineCap = 'round';
        ctx.strokeStyle = data.color;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else if (data.action === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },

    // =============== MEDIA LIBRARY ===============

    // Initialize media library
    initMediaLibrary: function() {
      try {
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
          openMediaBtn.addEventListener('click', () => {
            this.showNotification("Media library functionality is not available.");
          });
          return;
        }

        // Initial scan for media in the DOM
        this.scanDOMForMedia();

        // Open media library button
        openMediaBtn.addEventListener('click', () => {
          // Scan again to make sure we have the latest media
          this.scanDOMForMedia();

          // Apply the "all" filter by default
          if (filterBtns && filterBtns.length > 0) {
            // First reset all filter buttons
            filterBtns.forEach(btn => {
              if (btn.dataset.filter === 'all') {
                btn.classList.remove('bg-gray-200', 'text-gray-700');
                btn.classList.add('bg-gradient-to-r', 'from-pink-500', 'to-purple-500', 'text-white');
              } else {
                btn.classList.remove('bg-gradient-to-r', 'from-pink-500', 'to-purple-500', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
              }
            });
          }

          // Render the media grid with all media
          this.renderMediaGrid('all');

          // Show the modal
          mediaModal.classList.remove('hidden');
          mediaModal.classList.add('flex');
        });

        // Close media library button
        if (closeMediaBtn) {
          closeMediaBtn.addEventListener('click', () => {
            mediaModal.classList.add('hidden');
            mediaModal.classList.remove('flex');
          });
        }

        // Close preview button
        if (closePreviewBtn && previewModal) {
          closePreviewBtn.addEventListener('click', () => {
            previewModal.classList.add('hidden');
            previewModal.classList.remove('flex');
          });
        }

        // Filter buttons
        if (filterBtns && filterBtns.length > 0) {
          filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              if (!btn.dataset.filter) return;

              // Update active state
              filterBtns.forEach(b => {
                b.classList.remove('bg-gradient-to-r', 'from-pink-500', 'to-purple-500', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
              });

              btn.classList.remove('bg-gray-200', 'text-gray-700');
              btn.classList.add('bg-gradient-to-r', 'from-pink-500', 'to-purple-500', 'text-white');

              // Apply filter
              this.renderMediaGrid(btn.dataset.filter);
            });
          });
        }
      } catch (error) {
        console.error("Error initializing media library:", error);
      }
    },

    // Scan DOM for media
    scanDOMForMedia: function() {
      try {
        // Find all images in message content
        const messageImages = document.querySelectorAll('.message-content img');
        messageImages.forEach(img => {
          if (img.src &&
              !img.src.includes('data:image') && // Skip inline data URLs
              !this.config.mediaLibrary.images.includes(img.src)) {
            this.config.mediaLibrary.images.push(img.src);
          }
        });

        // Find all videos in message content
        const messageVideos = document.querySelectorAll('.message-content video source');
        messageVideos.forEach(source => {
          if (source.src && !this.config.mediaLibrary.videos.includes(source.src)) {
            this.config.mediaLibrary.videos.push(source.src);
          }
        });
      } catch (error) {
        console.error("Error scanning DOM for media:", error);
      }
    },

    // Render media grid
    renderMediaGrid: function(filter) {
      try {
        const mediaGrid = document.getElementById('media-grid');
        if (!mediaGrid) return;

        // Clear the grid
        mediaGrid.innerHTML = '';

        // Collect media items based on filter
        let mediaItems = [];

        if (filter === 'all' || filter === 'images') {
          (this.config.mediaLibrary.images || []).forEach(src => {
            if (src) mediaItems.push({ type: 'image', src });
          });
        }

        if (filter === 'all' || filter === 'videos') {
          (this.config.mediaLibrary.videos || []).forEach(src => {
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
            mediaItem.addEventListener('click', () => {
              if (!previewModal || !previewContent) return;

              try {
                // Clear previous content
                previewContent.innerHTML = '';

                // Add appropriate content based on type
                if (item.type === 'image') {
                  previewContent.innerHTML = `<img src="${item.src}" class="max-w-full max-h-[80vh] object-contain" alt="Media preview" />`;
                } else {
                  previewContent.innerHTML = `
                    <video controls autoplay class="max-w-full max-h-[80vh] object-contain">
                      <source src="${item.src}">
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
    },

    // =============== MEETUP PLANNER ===============

    // Initialize meetup planner
    initMeetupPlanner: function() {
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

        const formattedDate = this.formatDateForInput(tomorrow);
        document.getElementById('meetup-datetime').value = formattedDate;

        meetupModal.classList.remove('hidden');
        meetupModal.classList.add('flex');
      });

      if (cancelMeetupBtn) {
        cancelMeetupBtn.addEventListener('click', () => {
          meetupModal.classList.add('hidden');
          meetupModal.classList.remove('flex');
        });
      }

      if (meetupForm) {
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
            created_by: this.config.username,
            attendees: [this.config.username]
          };

          // Send to WebSocket
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
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
            this.alertUserOfConnectionIssue();
          }
        });
      }
    },

    // Format date for input
    formatDateForInput: function(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    },

    // Render meetups
    renderMeetups: function(meetups) {
      const upcomingMeetupsList = document.getElementById('upcoming-meetups');
      if (!upcomingMeetupsList) return;

      // Clear existing content
      upcomingMeetupsList.innerHTML = '';

      if (!meetups || meetups.length === 0) {
        upcomingMeetupsList.innerHTML = `
          <p class="text-gray-400 text-xs italic">No upcoming meetups planned yet.</p>
          <button id="create-meetup-btn" class="btn btn-secondary w-full mt-3 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Plan a Meetup
          </button>
        `;

        // Re-attach event listener
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

        const isAttending = meetup.attendees.includes(this.config.username);

        const meetupEl = document.createElement('div');
        meetupEl.className = 'p-3 rounded-lg bg-gradient-to-r from-pink-50 to-yellow-50 border border-pink-100 mb-3';
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
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
              type: 'meetup',
              action: isAttending ? 'leave' : 'join',
              meetup_id: meetup.id
            }));
          } else {
            console.error("Cannot update meetup attendance: WebSocket not connected");
            this.alertUserOfConnectionIssue();
          }
        });
      });

      // Add the create button at the end
      const createBtn = document.createElement('button');
      createBtn.id = 'create-meetup-btn';
      createBtn.className = 'btn btn-secondary w-full mt-3 text-sm';
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
    },

    // =============== FRIENDS & RECOMMENDATIONS ===============

    // Initialize friends and recommendations
    initFriendsAndRecommendations: function() {
      // Request online friends
      this.requestOnlineFriends();

      // Request room recommendations
      this.requestRoomRecommendations();

      // Set up interval to refresh online friends every 30 seconds
      setInterval(() => this.requestOnlineFriends(), 30000);
    },

    // Request online friends from the server
    requestOnlineFriends: function() {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'friends',
          action: 'list_online'
        }));
      }
    },

    // Request room recommendations from the server
    requestRoomRecommendations: function() {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'recommendations',
          action: 'get',
          include_bookmarks: true
        }));
      } else {
        // Fallback to HTTP API if WebSocket isn't connected
        this.fallbackRequestRoomRecommendations();
      }
    },

    // HTTP fallback for room recommendations
    fallbackRequestRoomRecommendations: function() {
      fetch('/api/get_recommendations/')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            this.renderRoomRecommendations(data.rooms || [], data.bookmarked_rooms || []);
          }
        })
        .catch(error => {
          console.error("Error in fallback recommendations request:", error);
        });
    },

    // Handle friends messages from the server
    handleFriendsMessage: function(data) {
      if (data.action === 'online_list') {
        this.renderOnlineFriends(data.friends || []);
      }
    },

    // Handle recommendations messages from the server
    handleRecommendationsMessage: function(data) {
      if (data.action === 'list') {
        // Extract bookmarked rooms and regular recommendations
        const bookmarkedRooms = data.bookmarked_rooms || [];
        const recommendedRooms = data.rooms || [];

        // Render with both sets of data
        this.renderRoomRecommendations(recommendedRooms, bookmarkedRooms);
      }
    },

    // Render online friends list
    renderOnlineFriends: function(friends) {
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

      // Render each friend
      friends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors';

        // If the friend object doesn't have an avatar, use the first letter of the username
        const avatar = friend.avatar || friend.username.charAt(0).toUpperCase();

        friendItem.innerHTML = `
          <div class="user-avatar h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-white flex items-center justify-center mr-2 font-medium text-xs" data-username="${friend.username}">
            ${avatar}
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium">${friend.username}</p>
            <span class="flex items-center text-xs text-green-500">
              <span class="h-1.5 w-1.5 bg-green-500 rounded-full mr-1"></span>
              Online now
            </span>
          </div>
          <a href="/dm/${friend.username}/" class="text-gray-400 hover:text-pink-500 p-1.5 rounded-full hover:bg-pink-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </a>
        `;

        onlineFriendsList.appendChild(friendItem);

        // Load profile picture
        if (this.userProfiles && this.userProfiles.loadUserProfile) {
          this.userProfiles.loadUserProfile(friend.username);
        }
      });
    },

    // Render room recommendations
    renderRoomRecommendations: function(rooms, bookmarkedRooms = []) {
      const recommendedRoomsList = document.getElementById('recommended-rooms-list');
      if (!recommendedRoomsList) return;

      // Clear existing content
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
          this.renderRoomItem(room, recommendedRoomsList, true);
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
        this.renderRoomItem(room, recommendedRoomsList, false);
      });
    },

    // Helper function to render a single room item
    renderRoomItem: function(room, container, isBookmarked) {
      const roomItem = document.createElement('a');
      roomItem.href = `/chat/${room.name}/`;
      roomItem.className = 'block';

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
        <div class="room-card">
          <div class="flex items-center gap-2.5">
            <div class="room-icon bg-gradient-to-br ${room.is_protected ? 'from-yellow-400 to-orange-300' : 'from-pink-400 to-purple-400'} text-white font-semibold text-sm flex items-center justify-center flex-shrink-0">
              ${room.display_name ? room.display_name.charAt(0).toUpperCase() : room.name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-700 truncate flex items-center">
                ${room.display_name || room.name}${bookmarkIndicator}
              </div>
              <div class="text-xs text-gray-500 truncate flex items-center mt-0.5">
                ${room.category ? `<span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs mr-2">${room.category}</span>` : ''}
                <span class="flex items-center">
                  <span class="h-1.5 w-1.5 rounded-full mr-1 ${activityClass}"></span>
                  ${activityLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;

      container.appendChild(roomItem);
    },

    // =============== BOOKMARK FUNCTIONALITY ===============

    // Initialize bookmark button
    initializeBookmarkButton: function() {
      const bookmarkBtn = this.elements.bookmarkBtn;
      if (!bookmarkBtn) return;

      // Check if room is already bookmarked from localStorage
      const isBookmarked = localStorage.getItem(`bookmarked_${this.config.roomName}`) === 'true';

      // Update button appearance based on current state
      this.updateBookmarkButton(isBookmarked);

      // Add click event listener
      bookmarkBtn.addEventListener('click', () => {
        // Toggle bookmarked state
        const newState = localStorage.getItem(`bookmarked_${this.config.roomName}`) === 'true' ? false : true;

        // Get CSRF token
        const csrfToken = this.getCsrfToken();

        // Send bookmark request to server
        fetch('/api/toggle_bookmark_room/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
          },
          body: JSON.stringify({
            room_name: this.config.roomName,
            bookmarked: newState
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Store bookmark state in localStorage
            localStorage.setItem(`bookmarked_${this.config.roomName}`, newState);

            // Update button appearance
            this.updateBookmarkButton(newState);

            // Show notification
            this.showNotification(newState ? 'Room bookmarked!' : 'Room bookmark removed');

            // Update recommendations to reflect the new bookmark state
            this.requestRoomRecommendations();
          } else {
            this.showNotification('Failed to update bookmark: ' + (data.error || 'Unknown error'));
          }
        })
        .catch(error => {
          console.error('Error toggling room bookmark:', error);
          this.showNotification('An error occurred while updating bookmark');
        });
      });
    },

    // Update bookmark button appearance
    updateBookmarkButton: function(isBookmarked) {
      const bookmarkBtn = this.elements.bookmarkBtn;
      if (!bookmarkBtn) return;

      if (isBookmarked) {
        // Bookmarked state - filled icon
        bookmarkBtn.classList.add('text-pink-500');
        bookmarkBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        `;
        bookmarkBtn.setAttribute('data-tooltip', 'Remove bookmark');
      } else {
        // Not bookmarked state - outlined icon
        bookmarkBtn.classList.remove('text-pink-500');
        bookmarkBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        `;
        bookmarkBtn.setAttribute('data-tooltip', 'Bookmark room');
      }
    },

    // =============== PROFILE PICTURES ===============

    // Initialize profile picture synchronization
    initProfilePictureSync: function() {
      // Set up the userProfiles object
      this.userProfiles = {
        updateUserAvatars: this.updateUserAvatars.bind(this),
        loadUserProfile: this.loadUserProfile.bind(this),
        loadAllProfiles: this.loadAllProfiles.bind(this)
      };

      // Make it available globally for backward compatibility
      window.userProfiles = this.userProfiles;

      // Load profiles for all users in the room
      this.loadAllProfiles();

      // Set up periodic refresh
      setInterval(() => this.loadAllProfiles(), 60000); // Refresh every minute
    },

    // Handle profile updates
    handleProfileUpdate: function(username, profileData) {
      if (!username || !profileData) return;

      // Update localStorage cache
      localStorage.setItem(`profilePic_${username}`, JSON.stringify(profileData));
      localStorage.setItem(`profilePic_${username}_timestamp`, Date.now().toString());

      // Update avatars in the UI
      this.updateUserAvatars(username, profileData);
    },

    // Update user avatars in the UI
    updateUserAvatars: function(username, profileData) {
      // Find all avatar elements for this user
      const avatarSelector = `.user-avatar[data-username="${username}"]`;
      const avatars = document.querySelectorAll(avatarSelector);

      if (avatars.length === 0) {
        // If no direct matches, look for containers with username spans
        document.querySelectorAll('li, .user-list-item, .message-bubble').forEach(container => {
          const usernameEl = container.querySelector('span, p.text-xs, a.username-link');
          if (usernameEl && usernameEl.textContent.trim() === username) {
            const avatar = container.querySelector('.user-avatar, div.h-6.w-6.rounded-full');
            if (avatar) {
              this.updateAvatarElement(avatar, username, profileData);
            }
          }
        });
      } else {
        // Update direct matches
        avatars.forEach(avatar => {
          this.updateAvatarElement(avatar, username, profileData);
        });
      }
    },

    // Update an individual avatar element
    updateAvatarElement: function(element, username, profileData) {
      if (!element || !username) return;

      try {
        // Extract size classes
        const sizeClasses = element.className.split(' ').filter(cls =>
          cls.includes('h-') || cls.includes('w-') ||
          cls.includes('rounded') || cls.includes('mr-')
        ).join(' ');

        // Handle image type
        if (profileData.type === 'image' && profileData.data) {
          element.className = `${sizeClasses} user-avatar with-image`;
          element.style.backgroundImage = `url(${profileData.data})`;
          element.style.backgroundSize = 'cover';
          element.style.backgroundPosition = 'center';
          element.innerHTML = '';
          element.setAttribute('data-username', username);
        }
        // Handle gradient type
        else if (profileData.type === 'gradient' && profileData.gradient) {
          element.className = `${sizeClasses} user-avatar bg-gradient-to-br ${profileData.gradient} text-white flex items-center justify-center font-medium text-xs`;
          element.style.backgroundImage = '';
          element.innerHTML = username.charAt(0).toUpperCase();
          element.setAttribute('data-username', username);
        }
      } catch (error) {
        console.error("Error updating avatar element:", error);
      }
    },

    // Load profiles for all users in the room
    loadAllProfiles: function() {
      // Get all usernames from the user list
      const usernames = new Set();

      // From user list
      document.querySelectorAll('#user-list li, #mobile-user-list-content .user-list-item').forEach(li => {
        const usernameEl = li.querySelector('span');
        if (usernameEl) {
          const username = usernameEl.textContent.trim();
          if (username) {
            usernames.add(username);
          }
        }
      });

      // From messages
      document.querySelectorAll('.message-bubble').forEach(msg => {
        const usernameEl = msg.querySelector('a.username-link, p:first-child');
        if (usernameEl) {
          const username = usernameEl.textContent.trim();
          if (username) {
            usernames.add(username);
          }
        }
      });

      // Add current user
      if (this.config.username) {
        usernames.add(this.config.username);
      }

      // Load profiles for all usernames
      usernames.forEach(username => {
        this.loadUserProfile(username);
      });
    },

    // Load a single user's profile
    loadUserProfile: function(username) {
      // Check if we already have cached data that's recent
      const cachedData = localStorage.getItem(`profilePic_${username}`);
      const cacheTimestamp = localStorage.getItem(`profilePic_${username}_timestamp`);

      // If we have fresh cache (less than 5 minutes old), use it
      if (cachedData && cacheTimestamp) {
        const cacheDuration = Date.now() - parseInt(cacheTimestamp);
        if (cacheDuration < 300000) { // 5 minutes
          try {
            const profileData = JSON.parse(cachedData);
            this.updateUserAvatars(username, profileData);
            return;
          } catch (e) {
            // Cache parsing failed, continue to load from server
          }
        }
      }

      // Fetch from server
      fetch(`/api/profile/${username}/`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.success && data.profile_picture) {
            // Cache the data
            localStorage.setItem(`profilePic_${username}`, JSON.stringify(data.profile_picture));
            localStorage.setItem(`profilePic_${username}_timestamp`, Date.now().toString());

            // Update the UI
            this.updateUserAvatars(username, data.profile_picture);
          }
        })
        .catch(error => {
          console.error(`Error fetching profile for ${username}:`, error);
        });
    },

    // =============== MODAL MANAGEMENT ===============

    // Initialize modals
    initModals: function() {
      // Find all modals and add close button event listeners
      document.querySelectorAll('[id$="-modal"]').forEach(modal => {
        const closeBtn = modal.querySelector('[id^="close-"]');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
          });
        }
      });

      // Add open button event listeners for common modals

      // Media library
      const mediaLibraryBtn = document.getElementById('open-media-library');
      const mediaLibraryModal = document.getElementById('media-library-modal');
      if (mediaLibraryBtn && mediaLibraryModal) {
        mediaLibraryBtn.addEventListener('click', () => {
          mediaLibraryModal.classList.remove('hidden');
          mediaLibraryModal.classList.add('flex');
        });
      }

      // Whiteboard
      const whiteboardBtn = document.getElementById('open-whiteboard');
      const whiteboardModal = document.getElementById('whiteboard-modal');
      if (whiteboardBtn && whiteboardModal) {
        whiteboardBtn.addEventListener('click', () => {
          whiteboardModal.classList.remove('hidden');
          whiteboardModal.classList.add('flex');
        });
      }

      // Avatar change modal
      const changeAvatarBtn = document.getElementById('change-avatar-btn');
      const profilePicModal = document.getElementById('profile-pic-modal');
      if (changeAvatarBtn && profilePicModal) {
        changeAvatarBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const profileMenu = document.getElementById('profile-menu');
          if (profileMenu) profileMenu.classList.remove('open');
          profilePicModal.classList.remove('hidden');
          profilePicModal.classList.add('flex');
        });
      }

      // Avatar options
      document.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', function() {
          document.querySelectorAll('.avatar-option').forEach(o => {
            o.classList.remove('ring-2', 'ring-pink-500', 'ring-offset-2');
          });

          this.classList.add('ring-2', 'ring-pink-500', 'ring-offset-2');

          // Update the preview
          const gradient = this.getAttribute('data-gradient');
          const profilePreview = document.getElementById('profile-preview');
          if (profilePreview && gradient) {
            profilePreview.className = 'avatar h-24 w-24 text-xl profile-pic-container';
            profilePreview.classList.add('bg-gradient-to-br', ...gradient.split(' '));
          }
        });
      });
    },

    // =============== UTILITY FUNCTIONS ===============

    // Send a friend request
    sendFriendRequest: function(userId) {
      // Get CSRF token
      const csrfToken = this.getCsrfToken();

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
          this.showNotification('Friend request sent!');
        } else {
          console.error('Failed to send friend request:', data.error);
          this.showNotification('Failed to send friend request: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error sending friend request:', error);
        this.showNotification('Error sending friend request');
      });
    },

    // Show a notification
    showNotification: function(message) {
      // First check for the toast element
      const toast = this.elements.toast || document.getElementById('notification-toast');
      const toastMessage = this.elements.toastMessage || document.getElementById('notification-message');

      if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.classList.remove('hidden');

        // Auto-hide after 3 seconds
        setTimeout(() => {
          toast.classList.add('hidden');
        }, 3000);
      } else {
        // Fallback to alert if toast elements not found
        console.log("Notification:", message);
      }
    },

    // Get CSRF token for API requests
    getCsrfToken: function() {
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
  };

  // Initialize the chat application
  EuphorieChat.init();

  // Make EuphorieChat available globally for backward compatibility
  window.EuphorieChat = EuphorieChat;

  // Backward compatibility for original global functions
  window.addMessage = function(message, username, messageId) {
    EuphorieChat.renderMessage({
      message: message,
      username: username,
      message_id: messageId
    });
  };

  window.updateUserList = function(users) {
    EuphorieChat.updateUserList(users);
  };

  window.showTyping = function(username) {
    EuphorieChat.showTyping(username);
  };

  window.updateReaction = function(data) {
    EuphorieChat.updateReaction(data);
  };

  window.showNotification = function(message) {
    EuphorieChat.showNotification(message);
  };

  window.sendFriendRequest = function(userId) {
    EuphorieChat.sendFriendRequest(userId);
  };

  window.scrollToBottom = function() {
    EuphorieChat.scrollToBottom();
  };
});

