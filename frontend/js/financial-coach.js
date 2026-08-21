/**
 * FinverseAI - Financial Coach Interactive Chat Assistant
 * Simulates intelligent, context-aware AI conversation analyzing user's financial dataset.
 */

document.addEventListener('DOMContentLoaded', () => {
  initChatEngine();
});

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

  try {
    const response = await window.finverseAPI.getCoachResponse(text);
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    const formattedReply = formatMarkdown(response.reply);
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
    scrollToBottom();

  } catch (err) {
    console.error('Error in coach conversation:', err);
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    showToast('Coach is temporarily unavailable', 'error');
  }
}

function scrollToBottom() {
  const container = document.getElementById('chatMessagesContainer');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function formatMarkdown(text) {
  // Simple markdown parser for bold, bullet points, and newlines
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
