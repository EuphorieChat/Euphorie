// ====================== DEBUG WEBSOCKET CONNECTION ======================
// Add this immediately after your existing WebSocket setup to debug issues
function fixWebSocketConnection() {
  console.log("Fixing WebSocket connection issues...");

  // If socket already exists, close it to make a clean connection
  if (window.socket) {
    console.log("Closing existing socket connection");
    window.socket.close();
  }

  // Get the WebSocket URL based on current protocol (ws:// or wss://)
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${window.location.host}/ws/chat/${window.roomName}/`;

  console.log(`Connecting to WebSocket at: ${wsUrl}`);

  try {
    // Create new WebSocket connection with enhanced debug
    const socket = new WebSocket(wsUrl);

    // Enhanced connection opened event with detailed logging
    socket.addEventListener('open', function(event) {
      console.log('WebSocket connection established', event);
      showNotification('Connected to chat room');

      // Signal connection state to UI
      document.querySelectorAll('.btn-icon, .btn').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      });

      // Request the initial user list
      socket.send(JSON.stringify({
        type: 'users',
        action: 'list'
      }));

      // If user is authenticated, request other data
      if (window.username && window.username !== 'Guest') {
        // Request meetups
        socket.send(JSON.stringify({
          type: 'meetup',
          action: 'list'
        }));

        // Request room recommendations
        socket.send(JSON.stringify({
          type: 'recommendations',
          action: 'get',
          include_bookmarks: true
        }));
      }
    });

    // Enhanced message received event with detailed logging
    socket.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Enhanced error handling
    socket.addEventListener('error', function(event) {
      console.error('WebSocket error:', event);
      showNotification('Connection error. Please refresh the page.');

      // Signal connection state to UI
      document.querySelectorAll('.btn-icon, .btn').forEach(btn => {
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
      });
    });

    // Enhanced connection closed event
    socket.addEventListener('close', function(event) {
      console.warn(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      showNotification('Connection to chat room lost. Attempting to reconnect...');

      // Signal connection state to UI
      document.querySelectorAll('.btn-icon, .btn').forEach(btn => {
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
      });

      // Attempt to reconnect after delay
      setTimeout(fixWebSocketConnection, 3000);
    });

    // Make socket available globally
    window.socket = socket;
    return socket;
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    showNotification('Failed to connect to chat room. Please refresh the page.');
    return null;
  }
}

// ====================== FIX CHAT INPUT ======================
function fixChatInput() {
  console.log("Fixing chat input...");

  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('chat-message-input');
  const sendBtn = document.getElementById('send-btn');

  if (!messageForm || !messageInput) {
    console.error("Critical chat elements not found!");
    return;
  }

  // Remove existing event listeners by cloning and replacing
  const newMessageForm = messageForm.cloneNode(true);
  messageForm.parentNode.replaceChild(newMessageForm, messageForm);

  // Get new references
  const newMessageInput = document.getElementById('chat-message-input');
  const newSendBtn = document.getElementById('send-btn');

  // Add event listener to form
  newMessageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log("Form submitted, sending message...");
    sendMessageFixed();
  });

  // Add click handler to send button for redundancy
  if (newSendBtn) {
    newSendBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log("Send button clicked, sending message...");
      sendMessageFixed();
    });
  }

  // Add keyboard event for Enter key
  if (newMessageInput) {
    newMessageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        console.log("Enter key pressed, sending message...");
        sendMessageFixed();
      }
    });

    // Also add the typing notification
    newMessageInput.addEventListener('input', debounce(function() {
      if (window.socket && window.socket.readyState === WebSocket.OPEN && newMessageInput.value.trim()) {
        console.log("Sending typing notification...");
        window.socket.send(JSON.stringify({
          type: 'typing'
        }));
      }
    }, 500));
  }

  console.log("Chat input fixed and event listeners attached");
}

// Enhanced sendMessage function with better error handling
function sendMessageFixed() {
  const messageInput = document.getElementById('chat-message-input');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview');

  if (!messageInput) {
    console.error("Message input not found!");
    return;
  }

  const messageText = messageInput.value.trim();
  console.log(`Preparing to send message: "${messageText.substring(0, 30)}${messageText.length > 30 ? '...' : ''}"`);

  // Check if there are uploaded files
  if (window.uploadedFiles && window.uploadedFiles.length > 0) {
    console.log(`Uploading ${window.uploadedFiles.length} files...`);
    uploadFilesAndSend()
      .then(() => {
        console.log("Files uploaded successfully");
        // Reset file input and hide preview
        if (fileInput) fileInput.value = '';
        if (previewContainer) {
          previewContainer.classList.add('hidden');
          previewContainer.style.display = 'none';
        }
        window.uploadedFiles = [];
      })
      .catch(error => {
        console.error('Error uploading files:', error);
        showNotification('Error uploading files: ' + error.message);
      });
  } else if (messageText) {
    // Send text message via WebSocket
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      try {
        console.log("Sending message via WebSocket...");
        window.socket.send(JSON.stringify({
          type: 'chat_message',
          message: messageText
        }));

        // Clear input
        messageInput.value = '';
        console.log("Message sent successfully!");
      } catch (error) {
        console.error("Error sending message:", error);
        showNotification('Error sending message. Please try again.');
      }
    } else {
      console.error("WebSocket not open:", window.socket ? window.socket.readyState : 'No socket');
      showNotification('Connection issue. Please refresh the page.');
    }
  } else {
    console.log("No message to send");
  }

  // Focus back on input
  messageInput.focus();
}

// ====================== FIX WHITEBOARD ======================
function fixWhiteboard() {
  console.log("Fixing whiteboard functionality...");

  const canvas = document.getElementById('whiteboard-canvas');
  const openWhiteboardBtn = document.getElementById('open-whiteboard');
  const closeWhiteboardBtn = document.getElementById('close-whiteboard');
  const whiteboardModal = document.getElementById('whiteboard-modal');

  if (!canvas || !openWhiteboardBtn || !whiteboardModal) {
    console.warn('Whiteboard elements not found. Cannot fix whiteboard.');
    return;
  }

  // Get canvas context
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get canvas context');
    return;
  }

  console.log("Whiteboard elements found, setting up event handlers...");

  // Fix whiteboard modal display
  whiteboardModal.classList.add('hidden');
  whiteboardModal.style.display = 'none';

  // Remove existing handlers by cloning and replacing
  const newOpenBtn = openWhiteboardBtn.cloneNode(true);
  openWhiteboardBtn.parentNode.replaceChild(newOpenBtn, openWhiteboardBtn);

  // Set up drawing state
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentTool = 'brush';

  // Add open whiteboard button handler
  newOpenBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log("Opening whiteboard");

    // Show the modal
    whiteboardModal.classList.remove('hidden');
    whiteboardModal.classList.add('flex');
    whiteboardModal.style.display = 'flex';

    // Set a small timeout to ensure the modal is visible before resizing
    setTimeout(resizeCanvas, 100);
  });

  // Close whiteboard button
  if (closeWhiteboardBtn) {
    closeWhiteboardBtn.addEventListener('click', () => {
      whiteboardModal.classList.add('hidden');
      whiteboardModal.classList.remove('flex');
      whiteboardModal.style.display = 'none';
    });
  }

  // Set canvas size on resize
  function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Store current drawing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Set new canvas dimensions
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Restore drawing
    ctx.putImageData(imageData, 0, 0);

    console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
  }

  // Drawing functions with WebSocket broadcasting
  const startDrawing = (e) => {
    isDrawing = true;

    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;

    // For single dot
    drawDot(lastX, lastY);
  };

  const drawDot = (x, y) => {
    const brushColor = document.getElementById('brush-color')?.value || '#000000';
    const brushSize = parseInt(document.getElementById('brush-size')?.value || '5');

    if (currentTool === 'brush') {
      ctx.fillStyle = brushColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (currentTool === 'eraser') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, brushSize * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Broadcast dot
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      console.log("Broadcasting dot drawing...");
      window.socket.send(JSON.stringify({
        type: 'whiteboard',
        action: 'dot',
        x: x / canvas.width,
        y: y / canvas.height,
        color: currentTool === 'eraser' ? '#ffffff' : brushColor,
        size: currentTool === 'eraser' ? brushSize * 2 : brushSize
      }));
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const brushColor = document.getElementById('brush-color')?.value || '#000000';
    const brushSize = parseInt(document.getElementById('brush-size')?.value || '5');

    ctx.beginPath();

    if (currentTool === 'brush') {
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = brushColor;
    } else if (currentTool === 'eraser') {
      ctx.lineWidth = brushSize * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ffffff';
    }

    // Draw from last position to current position
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Save current position
    const fromX = lastX;
    const fromY = lastY;
    lastX = x;
    lastY = y;

    // Broadcast drawing data
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({
        type: 'whiteboard',
        action: 'draw',
        fromX: fromX / canvas.width,
        fromY: fromY / canvas.height,
        toX: x / canvas.width,
        toY: y / canvas.height,
        color: currentTool === 'eraser' ? '#ffffff' : brushColor,
        size: currentTool === 'eraser' ? brushSize * 2 : brushSize
      }));
    }
  };

  const stopDrawing = () => {
    isDrawing = false;
    ctx.beginPath(); // Reset path
  };

  // Add canvas drawing events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Tool buttons
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Get tool type
      const toolType = btn.dataset.tool;
      if (!toolType) return;

      // Remove active class from all buttons
      document.querySelectorAll('[data-tool]').forEach(b => {
        b.classList.remove('bg-pink-500', 'text-white');
        b.classList.add('bg-white', 'border', 'border-gray-200', 'hover:bg-gray-50');
      });

      // Add active class to clicked button
      btn.classList.remove('bg-white', 'border', 'border-gray-200', 'hover:bg-gray-50');
      btn.classList.add('bg-pink-500', 'text-white');

      // Set current tool
      currentTool = toolType;
      console.log(`Whiteboard tool changed to ${toolType}`);
    });
  });

  // Clear whiteboard
  const clearWhiteboardBtn = document.getElementById('clear-whiteboard');
  if (clearWhiteboardBtn) {
    clearWhiteboardBtn.addEventListener('click', () => {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Broadcast clear event
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(JSON.stringify({
          type: 'whiteboard',
          action: 'clear'
        }));
      }
    });
  }

  // Window resize event
  window.addEventListener('resize', resizeCanvas);

  // Fix whiteboard message handler
  window.handleWhiteboardMessage = function(data) {
    if (!canvas || !ctx) return;

    try {
      console.log(`Handling whiteboard message: ${data.action}`);

      if (data.action === 'draw' && data.fromX !== undefined) {
        const fromX = data.fromX * canvas.width;
        const fromY = data.fromY * canvas.height;
        const toX = data.toX * canvas.width;
        const toY = data.toY * canvas.height;

        ctx.beginPath();
        ctx.lineWidth = data.size || 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = data.color || '#000000';
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      } else if (data.action === 'dot' && data.x !== undefined) {
        const x = data.x * canvas.width;
        const y = data.y * canvas.height;

        ctx.beginPath();
        ctx.fillStyle = data.color || '#000000';
        ctx.arc(x, y, (data.size || 5) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (data.action === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      console.error('Error handling whiteboard message:', error);
    }
  };

  console.log("Whiteboard functionality fixed!");
}

// ====================== FIX MEDIA LIBRARY ======================
function fixMediaLibrary() {
  console.log("Fixing Media Library...");

  // Get DOM elements
  const openMediaBtn = document.getElementById('open-media-library');
  const closeMediaBtn = document.getElementById('close-media-library');
  const mediaModal = document.getElementById('media-library-modal');
  const mediaGrid = document.getElementById('media-grid');

  if (!openMediaBtn || !mediaModal || !mediaGrid) {
    console.warn('Media library elements not found. Cannot fix media library.');
    return;
  }

  console.log("Media Library elements found, setting up event handlers...");

  // Initialize media library data structure if not exists
  if (!window.mediaLibrary) {
    window.mediaLibrary = { images: [], videos: [] };
  }

  // Fix media modal display
  mediaModal.classList.add('hidden');
  mediaModal.style.display = 'none';

  // Scan for media in the DOM
  scanDOMForMedia();

  // Remove existing handlers by cloning and replacing
  const newOpenBtn = openMediaBtn.cloneNode(true);
  openMediaBtn.parentNode.replaceChild(newOpenBtn, openMediaBtn);

  // Open media library button with fixed handling
  newOpenBtn.addEventListener('click', () => {
    console.log("Opening media library...");

    // Scan again to make sure we have the latest media
    scanDOMForMedia();

    // Apply the "all" filter by default
    document.querySelectorAll('.media-filter-btn').forEach(btn => {
      if (btn.dataset.filter === 'all') {
        btn.classList.remove('bg-gray-200', 'text-gray-700');
        btn.classList.add('bg-gradient-to-r', 'from-pink-500', 'to-purple-500', 'text-white');
      } else {
        btn.classList.remove('bg-gradient-to-r', 'from-pink-500', 'to-purple-500', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
      }
    });

    // Show loading state in the grid
    mediaGrid.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-10">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
        <p class="text-gray-500">Loading media...</p>
      </div>
    `;

    // Fetch latest media from the server
    fetchRoomMedia();

    // Show modal
    mediaModal.classList.remove('hidden');
    mediaModal.classList.add('flex');
    mediaModal.style.display = 'flex';
  });

  // Close media library button
  if (closeMediaBtn) {
    closeMediaBtn.addEventListener('click', () => {
      mediaModal.classList.add('hidden');
      mediaModal.classList.remove('flex');
      mediaModal.style.display = 'none';
    });
  }

  // Filter buttons
  document.querySelectorAll('.media-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.dataset.filter) return;

      // Update active state
      document.querySelectorAll('.media-filter-btn').forEach(b => {
        b.classList.remove('bg-gradient-to-r', 'from-pink-500', 'to-purple-500', 'text-white');
        b.classList.add('bg-gray-200', 'text-gray-700');
      });

      btn.classList.remove('bg-gray-200', 'text-gray-700');
      btn.classList.add('bg-gradient-to-r', 'from-pink-500', 'to-purple-500', 'text-white');

      // Apply filter
      renderMediaGrid(btn.dataset.filter);
    });
  });

  // Enhanced fetchRoomMedia function
  window.fetchRoomMedia = function() {
    console.log(`Fetching media for room: ${window.roomName}`);

    fetch(`/api/room/${window.roomName}/media/`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Media API response:', data);

        if (data.success && data.media && Array.isArray(data.media)) {
          // Clear existing arrays before adding new items
          window.mediaLibrary.images = [];
          window.mediaLibrary.videos = [];

          data.media.forEach(mediaItem => {
            if (mediaItem.type === 'image' && !window.mediaLibrary.images.includes(mediaItem.url)) {
              window.mediaLibrary.images.push(mediaItem.url);
            } else if (mediaItem.type === 'video' && !window.mediaLibrary.videos.includes(mediaItem.url)) {
              window.mediaLibrary.videos.push(mediaItem.url);
            }
          });
        } else {
          console.warn('Invalid data format or empty media array from API, using DOM scan fallback');
        }

        // Always render after fetch completes
        const activeFilter = document.querySelector('.media-filter-btn.bg-gradient-to-r');
        renderMediaGrid(activeFilter ? activeFilter.dataset.filter : 'all');
      })
      .catch(error => {
        console.error('Error fetching room media:', error);
        // Continue with what we have locally
        renderMediaGrid('all');
      });
  };

  // Enhanced renderMediaGrid function
  window.renderMediaGrid = function(filter) {
    try {
      if (!mediaGrid) return;

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

      console.log(`Rendering ${mediaItems.length} media items for filter: ${filter}`);

      // Create media items
      mediaItems.forEach((item, index) => {
        if (!item.src) return; // Skip items with no source

        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item rounded-lg overflow-hidden shadow-md hover:shadow-lg transition cursor-pointer bg-gray-100 aspect-square flex items-center justify-center';

        try {
          if (item.type === 'image') {
            mediaItem.innerHTML = `<img src="${item.src}" class="object-cover w-full h-full" alt="Media item ${index}" loading="lazy" />`;
          } else {
            mediaItem.innerHTML = `
              <div class="relative w-full h-full">
                <video class="object-cover w-full h-full" preload="metadata">
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

          // Add media item to grid
          mediaGrid.appendChild(mediaItem);

          // Get references to modal elements
          const previewModal = document.getElementById('media-preview-modal');
          const previewContent = document.getElementById('media-preview-content');
          const closePreviewBtn = document.getElementById('close-media-preview');

          // Add preview functionality
          if (previewModal && previewContent) {
            mediaItem.addEventListener('click', () => {
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
              previewModal.style.display = 'flex';
            });

            // Close preview button
            if (closePreviewBtn) {
              closePreviewBtn.addEventListener('click', () => {
                previewModal.classList.add('hidden');
                previewModal.classList.remove('flex');
                previewModal.style.display = 'none';
              });
            }
          }

          // Add context menu for sharing
          mediaItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            // Find the media URL
            let mediaUrl;
            const img = mediaItem.querySelector('img');
            const video = mediaItem.querySelector('video source');

            if (img) {
              mediaUrl = img.src;
            } else if (video) {
              mediaUrl = video.src;
            }

            if (!mediaUrl) return;

            // Create context menu
            const menu = document.createElement('div');
            menu.className = 'absolute bg-white shadow-lg rounded-lg p-2 z-50';
            menu.style.left = `${e.pageX}px`;
            menu.style.top = `${e.pageY}px`;

            menu.innerHTML = `
              <button class="share-media-btn w-full text-left px-3 py-2 hover:bg-pink-50 rounded-md">
                Share in chat
              </button>
            `;

            document.body.appendChild(menu);

            // Handle share button click
            menu.querySelector('.share-media-btn').addEventListener('click', () => {
              if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                // Determine if it's an image or video
                let messageContent;
                if (img) {
                  messageContent = `<img src="${mediaUrl}" class="max-w-xs rounded-lg" />`;
                } else if (video) {
                  messageContent = `<video controls class="max-w-xs rounded-lg"><source src="${mediaUrl}"></video>`;
                }

                // Send via WebSocket
                window.socket.send(JSON.stringify({
                  type: 'chat_message',
                  message: messageContent
                }));

                // Close media library
                if (mediaModal) {
                  mediaModal.classList.add('hidden');
                  mediaModal.classList.remove('flex');
                  mediaModal.style.display = 'none';
                }

                // Remove context menu
                document.body.removeChild(menu);
              }
            });

            // Remove context menu when clicking elsewhere
            document.addEventListener('click', function removeMenu() {
              if (document.body.contains(menu)) {
                document.body.removeChild(menu);
              }
              document.removeEventListener('click', removeMenu);
            });
          });

        } catch (error) {
          console.error('Error creating media item:', error);
        }
      });
    } catch (error) {
      console.error('Error rendering media grid:', error);
    }
  };

  console.log("Media Library functionality fixed!");
}

// ====================== FIX MEETUP PLANNER ======================
function fixMeetupPlanner() {
  console.log("Fixing Meetup Planner...");

  // Get DOM elements
  const createMeetupBtn = document.getElementById('create-meetup-btn');
  const meetupModal = document.getElementById('meetup-modal');
  const cancelMeetupBtn = document.getElementById('cancel-meetup');
  const meetupForm = document.getElementById('meetup-form');

  if (!createMeetupBtn || !meetupModal) {
    console.warn('Meetup planner elements not found. Cannot fix meetup planner.');
    return;
  }

  console.log("Meetup Planner elements found, setting up event handlers...");

  // Fix meetup modal display
  meetupModal.classList.add('hidden');
  meetupModal.style.display = 'none';

  // Remove existing handlers by cloning and replacing
  const newCreateBtn = createMeetupBtn.cloneNode(true);
  createMeetupBtn.parentNode.replaceChild(newCreateBtn, createMeetupBtn);

  // Open meetup modal with fixed handling
  newCreateBtn.addEventListener('click', () => {
    console.log("Opening meetup modal...");

    // Set default date to tomorrow at noon
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    // Format for datetime-local input
    const meetupDatetimeInput = document.getElementById('meetup-datetime');
    if (meetupDatetimeInput) {
      meetupDatetimeInput.value = formatDateTimeForInput(tomorrow);
    }

    // Show modal
    meetupModal.classList.remove('hidden');
    meetupModal.classList.add('flex');
    meetupModal.style.display = 'flex';

    // Focus on title input
    const meetupTitleInput = document.getElementById('meetup-title');
    if (meetupTitleInput) {
      setTimeout(() => meetupTitleInput.focus(), 100);
    }
  });

  // Cancel button
  if (cancelMeetupBtn) {
    cancelMeetupBtn.addEventListener('click', () => {
      meetupModal.classList.add('hidden');
      meetupModal.classList.remove('flex');
      meetupModal.style.display = 'none';
    });
  }

  // Form submission
  if (meetupForm) {
    // Remove existing event listeners
    const newMeetupForm = meetupForm.cloneNode(true);
    meetupForm.parentNode.replaceChild(newMeetupForm, meetupForm);

    // Add new event listener
    newMeetupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      console.log("Meetup form submitted");

      // Get form data and validate
      const meetupTitleInput = document.getElementById('meetup-title');
      const meetupDatetimeInput = document.getElementById('meetup-datetime');
      const meetupLocationInput = document.getElementById('meetup-location');
      const meetupDescriptionInput = document.getElementById('meetup-description');

      const title = meetupTitleInput?.value.trim();
      const datetime = meetupDatetimeInput?.value;
      const location = meetupLocationInput?.value.trim();
      const description = meetupDescriptionInput?.value.trim();

      // Validate form
      if (!title || !datetime || !location) {
        showNotification('Please fill in all required fields');
        return;
      }

      // Parse datetime
      let parsedDatetime;
      try {
        parsedDatetime = new Date(datetime);
        if (isNaN(parsedDatetime.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        showNotification('Please enter a valid date and time');
        return;
      }

      // Check if date is in the future
      if (parsedDatetime < new Date()) {
        showNotification('Please select a future date and time');
        return;
      }

      // Create meetup object
      const meetup = {
        title,
        datetime: parsedDatetime.toISOString(),
        location,
        description
      };

      console.log("Sending meetup data:", meetup);

      // First show a loading indicator
      const submitBtn = newMeetupForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Creating...
      `;

      // Send to WebSocket
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(JSON.stringify({
          type: 'meetup',
          action: 'create',
          meetup: meetup
        }));

        // Set timeout to restore button and close modal
        setTimeout(() => {
          // Close modal
          meetupModal.classList.add('hidden');
          meetupModal.classList.remove('flex');
          meetupModal.style.display = 'none';

          // Reset form
          newMeetupForm.reset();

          // Restore button
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;

          showNotification('Meetup created successfully');
        }, 1000);
      } else {
        // Handle connection issue
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        showNotification('Connection issue. Please refresh the page.');
      }
    });
  }

  // Helper function to format date for datetime-local input
  function formatDateTimeForInput(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      // Default to tomorrow if date is invalid
      date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(12, 0, 0, 0);
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Fixed renderMeetups function
  window.renderMeetups = function(meetups) {
    console.log(`Rendering ${meetups?.length || 0} meetups`);

    // Find upcoming meetups section
    const upcomingMeetupsList = document.getElementById('upcoming-meetups');
    if (!upcomingMeetupsList) {
      console.warn('Upcoming meetups section not found');
      return;
    }

    // Clear existing content
    upcomingMeetupsList.innerHTML = '';

    // If no meetups, show empty state
    if (!meetups || meetups.length === 0) {
      upcomingMeetupsList.innerHTML = `
        <p class="text-gray-400 text-xs italic">No upcoming meetups planned yet.</p>
        <button id="create-meetup-empty-btn" class="btn btn-secondary w-full mt-3 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Plan a Meetup
        </button>
      `;

      // Attach event listener to the empty state button
      const emptyStateBtn = document.getElementById('create-meetup-empty-btn');
      if (emptyStateBtn) {
        emptyStateBtn.addEventListener('click', () => {
          const meetupModal = document.getElementById('meetup-modal');
          if (meetupModal) {
            meetupModal.classList.remove('hidden');
            meetupModal.classList.add('flex');
            meetupModal.style.display = 'flex';

            // Set default date to tomorrow at noon
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(12, 0, 0, 0);

            const datetimeInput = document.getElementById('meetup-datetime');
            if (datetimeInput) {
              datetimeInput.value = formatDateTimeForInput(tomorrow);
            }
          }
        });
      }

      return;
    }

    // Render each meetup
    meetups.forEach(meetup => {
      try {
        // Format date and time
        const { date: formattedDate, time: formattedTime } = formatDateForDisplay(meetup.datetime);

        // Check if current user is attending
        const isAttending = Array.isArray(meetup.attendees) && meetup.attendees.includes(window.username);

        // Create meetup element
        const meetupEl = document.createElement('div');
        meetupEl.className = 'p-3 rounded-lg bg-gradient-to-r from-pink-50 to-yellow-50 border border-pink-100 mb-3';
        meetupEl.innerHTML = `
          <div class="flex justify-between items-start">
            <h4 class="font-medium text-gray-800">${escapeHtml(meetup.title)}</h4>
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
              ${escapeHtml(meetup.location)}
            </div>
            ${meetup.description ? `
            <div class="mt-2 text-gray-600 rounded-md bg-white bg-opacity-50 p-2 text-xs">
              ${escapeHtml(meetup.description).replace(/\n/g, '<br>')}
            </div>
            ` : ''}
          </div>
          <div class="mt-2 flex justify-between items-center">
            <span class="text-xs text-gray-500">${Array.isArray(meetup.attendees) ? meetup.attendees.length : 0} attending</span>
            <button class="attend-btn text-xs px-2 py-1 rounded ${isAttending ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700 hover:bg-pink-50'}" data-meetup-id="${meetup.id}">
              ${isAttending ? 'Attending ✓' : 'Attend'}
            </button>
          </div>
        `;

        upcomingMeetupsList.appendChild(meetupEl);

        // Add event listener for attendance button
        const attendBtn = meetupEl.querySelector('.attend-btn');
        if (attendBtn) {
          attendBtn.addEventListener('click', () => {
            if (window.socket && window.socket.readyState === WebSocket.OPEN) {
              // Show loading state
              const originalText = attendBtn.textContent;
              attendBtn.disabled = true;
              attendBtn.textContent = isAttending ? 'Leaving...' : 'Joining...';

              console.log(`Sending meetup ${isAttending ? 'leave' : 'join'} request for meetup ${meetup.id}`);

              window.socket.send(JSON.stringify({
                type: 'meetup',
                action: isAttending ? 'leave' : 'join',
                meetup_id: meetup.id
              }));

              // Reset button after a delay if no response
              setTimeout(() => {
                if (attendBtn.disabled) {
                  attendBtn.disabled = false;
                  attendBtn.textContent = originalText;
                }
              }, 3000);
            } else {
              showNotification('Connection issue. Please refresh the page.');
            }
          });
        }
      } catch (error) {
        console.error('Error rendering meetup:', error);
      }
    });

    // Add the create button at the end
    const createBtn = document.createElement('button');
    createBtn.id = 'create-meetup-list-btn';
    createBtn.className = 'btn btn-secondary w-full mt-3 text-sm';
    createBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      Plan a Meetup
    `;

    upcomingMeetupsList.appendChild(createBtn);

    // Re-attach the event listener
    createBtn.addEventListener('click', () => {
      const meetupModal = document.getElementById('meetup-modal');
      if (meetupModal) {
        meetupModal.classList.remove('hidden');
        meetupModal.classList.add('flex');
        meetupModal.style.display = 'flex';

        // Set default date to tomorrow at noon
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);

        const datetimeInput = document.getElementById('meetup-datetime');
        if (datetimeInput) {
          datetimeInput.value = formatDateTimeForInput(tomorrow);
        }
      }
    });
  };

  // Format date for display
  function formatDateForDisplay(dateString) {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return { date: 'Invalid date', time: '' };
    }

    // Check if today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                   date.getMonth() === today.getMonth() &&
                   date.getFullYear() === today.getFullYear();

    // Check if tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = date.getDate() === tomorrow.getDate() &&
                      date.getMonth() === tomorrow.getMonth() &&
                      date.getFullYear() === tomorrow.getFullYear();

    let formattedDate;
    if (isToday) {
      formattedDate = 'Today';
    } else if (isTomorrow) {
      formattedDate = 'Tomorrow';
    } else {
      formattedDate = date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }

    // Format time
    const formattedTime = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });

    return { date: formattedDate, time: formattedTime };
  }

  // Helper function to escape HTML
  function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  console.log("Meetup Planner functionality fixed!");
}

// ====================== UTILITY FUNCTIONS ======================
// Helper function to scan DOM for media
function scanDOMForMedia() {
  try {
    // Make sure we have the media library structure
    if (!window.mediaLibrary) {
      window.mediaLibrary = { images: [], videos: [] };
    }

    console.log("Scanning DOM for media...");

    // Find all images in message content
    const messageImages = document.querySelectorAll('.message-content img');
    let imageCount = 0;
    messageImages.forEach(img => {
      if (img.src &&
          !img.src.includes('data:image') && // Skip inline data URLs
          !window.mediaLibrary.images.includes(img.src)) {
        window.mediaLibrary.images.push(img.src);
        imageCount++;
      }
    });

    // Find all videos in message content
    const messageVideos = document.querySelectorAll('.message-content video source');
    let videoCount = 0;
    messageVideos.forEach(source => {
      if (source.src && !window.mediaLibrary.videos.includes(source.src)) {
        window.mediaLibrary.videos.push(source.src);
        videoCount++;
      }
    });

    console.log(`Found ${imageCount} images and ${videoCount} videos in DOM`);
  } catch (error) {
    console.error('Error scanning DOM for media:', error);
  }
}

// ====================== INITIALIZE FIX FUNCTIONS ======================
// Execute all fixes
function initEuphorieFixedFeatures() {
  console.log("Initializing Euphorie fixed features...");

  // Make sure required global variables are set
  if (!window.roomName) {
    const roomNameMatch = window.location.pathname.match(/\/chat\/([^\/]+)/);
    if (roomNameMatch) {
      window.roomName = roomNameMatch[1];
      console.log(`Set window.roomName to ${window.roomName}`);
    }
  }

  // Fix WebSocket first
  fixWebSocketConnection();

  // Then fix features one by one
  fixChatInput();
  fixWhiteboard();
  fixMediaLibrary();
  fixMeetupPlanner();

  console.log("All Euphorie features fixed!");
}

// Initialize all fixes when document is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Delay initialization to ensure everything is loaded
  setTimeout(initEuphorieFixedFeatures, 1000);
});

// =============== HELPER FUNCTIONS (MOVED FROM ORIGINAL CODE) ===============
// Original debounce function from your code
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}
