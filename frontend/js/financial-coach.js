/**
 * FinverseAI - Financial Coach Interactive Chat Assistant
 * Persistent chat with backend AI coach. History is stored in MongoDB.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadChatHistory();
  initChatEngine();
});

/**
 * Load persistent chat history from the backend
 */
async function loadChatHistory() {
  try {
    const json = await window.finverseAPI.getChatHistory();

    let user = null;
    try { user = JSON.parse(localStorage.getItem('finverse_user')); } catch (e) {}
    const firstName = user?.name ? user.name.split(' ')[0] : 'there';

    if (json.success && json.data && json.data.messages && json.data.messages.length > 0) {
      const messagesContainer = document.getElementById('chatMessagesContainer');
      if (!messagesContainer) return;

      // Remove the default welcome row when loading stored conversation history
      const welcomeRow = document.getElementById('coachWelcomeRow');
      if (welcomeRow) welcomeRow.remove();

      json.data.messages.forEach(msg => {
        const timeStr = new Date(msg.timestamp).toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit',
        });

        if (msg.role === 'user') {
          const userHtml = `
            <div class="chat-bubble-row user">
              <div class="message-avatar">
                <i class="fa-solid fa-user"></i>
              </div>
              <div>
                <div class="chat-bubble">${escapeHtml(msg.content)}</div>
                <div class="message-time">${timeStr}</div>
              </div>
            </div>
          `;
          messagesContainer.insertAdjacentHTML('beforeend', userHtml);
        } else if (msg.role === 'assistant') {
          const aiHtml = `
            <div class="chat-bubble-row ai">
              <div class="message-avatar">
                <i class="fa-solid fa-robot"></i>
              </div>
              <div>
                <div class="chat-bubble">${formatMarkdown(msg.content)}</div>
                <div class="message-time">${timeStr} • FinverseAI Coach</div>
              </div>
            </div>
          `;
          messagesContainer.insertAdjacentHTML('beforeend', aiHtml);
        }
      });

      scrollToBottom();
    } else {
      // Personalize initial welcome message with authenticated user's actual financial state
      if (window.finverseAPI) {
        try {
          const dashData = await window.finverseAPI.getDashboardData();
          const welcomeEl = document.getElementById('coachWelcomeMsg');
          const statusEl = document.getElementById('coachStatusSubtitle');
          if (dashData && (dashData.totalIncome > 0 || dashData.totalExpenses > 0)) {
            if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-circle text-success" style="font-size: 0.6rem;"></i> Connected to your personal finances (₹${Number(dashData.totalIncome || 0).toLocaleString('en-IN')} inflow)`;
            if (welcomeEl) {
              welcomeEl.innerHTML = `Hi ${escapeHtml(firstName)}! I'm here as your personal financial partner. I'm keeping an eye on your ₹${Number(dashData.totalIncome || 0).toLocaleString('en-IN')} inflow and ₹${Number(dashData.totalExpenses || 0).toLocaleString('en-IN')} outflow so far. Feel free to ask about purchases, small cutbacks, or next month's outlook!`;
            }
          } else {
            if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-circle text-success" style="font-size: 0.6rem;"></i> Connected to your account`;
            if (welcomeEl) {
              welcomeEl.innerHTML = `Hi ${escapeHtml(firstName)}! Your financial journey starts right here. Once you log your regular income or expenses, I'll help you understand your spending, plan for goals, and check what's comfortably affordable. How can I help you today?`;
            }
          }
        } catch (e) {
          // Keep default clean message
        }
      }
    }
  } catch (err) {
    console.warn('Could not load chat history:', err.message);
  }
}

function initChatEngine() {
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatMessageInput');
  const quickPromptPills = document.querySelectorAll('.coach-prompt-pill');

  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      sendUserMessage(message);
      chatInput.value = '';
    });
  }

  quickPromptPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const promptText = pill.getAttribute('data-prompt') || pill.textContent.trim();
      sendUserMessage(promptText);
    });
  });

  // Clear Chat Button
  const clearChatBtn = document.getElementById('clearChatBtn');
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async () => {
      if (!confirm('Clear all chat history? This cannot be undone.')) return;

      try {
        await window.finverseAPI._fetchAPI('/ai/chat-history', { method: 'DELETE' });

        const messagesContainer = document.getElementById('chatMessagesContainer');
        if (messagesContainer) {
          // Keep only the welcome message
          const welcomeRow = messagesContainer.querySelector('.chat-bubble-row');
          messagesContainer.innerHTML = '';
          if (welcomeRow) messagesContainer.appendChild(welcomeRow);
        }
        showToast('Chat history cleared', 'info');
      } catch (err) {
        showToast('Could not clear chat history', 'error');
      }
    });
  }
}

async function sendUserMessage(text) {
  const messagesContainer = document.getElementById('chatMessagesContainer');
  if (!messagesContainer) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Append User Bubble
  const userHtml = `
    <div class="chat-bubble-row user">
      <div class="message-avatar">
        <i class="fa-solid fa-user"></i>
      </div>
      <div>
        <div class="chat-bubble">
          ${escapeHtml(text)}
        </div>
        <div class="message-time">${timeStr}</div>
      </div>
    </div>
  `;
  messagesContainer.insertAdjacentHTML('beforeend', userHtml);
  scrollToBottom();

  // Render Typing Indicator
  const typingId = 'typingIndicator_' + Date.now();
  const typingHtml = `
    <div class="chat-bubble-row ai" id="${typingId}">
      <div class="message-avatar">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messagesContainer.insertAdjacentHTML('beforeend', typingHtml);
  scrollToBottom();

  // Disable input while waiting
  const chatInput = document.getElementById('chatMessageInput');
  const chatForm = document.getElementById('chatForm');
  if (chatInput) chatInput.disabled = true;

  try {
    const json = await window.finverseAPI._fetchAPI('/ai/coach', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });

    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    if (json.success && json.data) {
      const formattedReply = formatMarkdown(json.data.reply);
      const aiHtml = `
        <div class="chat-bubble-row ai">
          <div class="message-avatar">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div>
            <div class="chat-bubble">
              ${formattedReply}
            </div>
            <div class="message-time">${timeStr} • FinverseAI Coach</div>
          </div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', aiHtml);
    } else {
      const fallbackReply = json.data?.reply || json.message || "I encountered a momentary issue analyzing your financial records. Please try asking again.";
      const aiHtml = `
        <div class="chat-bubble-row ai">
          <div class="message-avatar">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div>
            <div class="chat-bubble" style="border-left: 3px solid var(--warning);">
              ${escapeHtml(fallbackReply)}
            </div>
            <div class="message-time">${timeStr} • FinverseAI Coach</div>
          </div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', aiHtml);
      showToast(json.message || 'Coach could not process request', 'error');
    }

    scrollToBottom();
  } catch (err) {
    console.error('Error in coach conversation:', err);
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    const aiHtml = `
      <div class="chat-bubble-row ai">
        <div class="message-avatar">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div>
          <div class="chat-bubble" style="border-left: 3px solid var(--danger);">
            I'm having trouble reaching the server right now. Please check your network and try again.
          </div>
          <div class="message-time">${timeStr} • FinverseAI Coach</div>
        </div>
      </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', aiHtml);
    showToast('Coach is temporarily unavailable. Please check your connection.', 'error');
  } finally {
    if (chatInput) chatInput.disabled = false;
    if (chatInput) chatInput.focus();
  }
}

function scrollToBottom() {
  const container = document.getElementById('chatMessagesContainer');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function formatMarkdown(text) {
  if (!text) return '';
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n• (.*?)/g, '<br>• $1');
  return formatted;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
