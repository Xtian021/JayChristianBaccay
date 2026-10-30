
/* =========================================================
   CHATBOT API CONFIGURATION
   Local: localhost
   Online: Render Node.js Web Service
   ========================================================= */

const CHAT_API =
    ["localhost", "127.0.0.1"].includes(location.hostname)
        ? "http://localhost:3000/chat"
           : "https://jaychristian-chatbot.onrender.com/chat";

const CHAT_TIMEOUT = 135000;

document.addEventListener("DOMContentLoaded", () => {
    const launcher = document.getElementById("chatbot-launcher");
    const panel = document.getElementById("chatbot-panel");
    const closeButton = document.getElementById("chatbot-close");
    const form = document.getElementById("chatbot-form");
    const input = document.getElementById("chatbot-input");
    const messages = document.getElementById("chatbot-messages");
    const sendButton = document.getElementById("chatbot-send");
    const suggestions = document.querySelector(".chatbot-suggestions");

    if (
        !launcher ||
        !panel ||
        !closeButton ||
        !form ||
        !input ||
        !messages ||
        !sendButton
    ) {
        console.error("Chatbot HTML elements are missing.");
        return;
    }

    const history = [];
    let isThinking = false;

    // Escape HTML to prevent HTML injection.
    function escapeHTML(text) {
        return String(text ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    // Allow only HTTP and HTTPS URLs.
    function isSafeURL(url) {
        try {
            const parsed = new URL(url);

            return (
                parsed.protocol === "http:" ||
                parsed.protocol === "https:"
            );
        } catch {
            return false;
        }
    }

    // Format inline Markdown safely.
    function inlineMarkdown(text) {
        let safe = escapeHTML(text);
        const placeholders = [];

        function savePlaceholder(html) {
            const token = `CHATPLACEHOLDER${placeholders.length}END`;
            placeholders.push(html);
            return token;
        }

        // Inline code.
        safe = safe.replace(/`([^`\n]+)`/g, (match, code) => {
            return savePlaceholder(`<code>${code}</code>`);
        });

        // Markdown links.
        safe = safe.replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
            (match, label, url) => {
                if (!isSafeURL(url)) return label;

                return savePlaceholder(
                    `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
                );
            }
        );

        // Bold.
        safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        safe = safe.replace(/__(.+?)__/g, "<strong>$1</strong>");

        // Italic.
        safe = safe.replace(
            /(^|[^\*])\*([^\*\n]+)\*(?!\*)/g,
            "$1<em>$2</em>"
        );

        safe = safe.replace(
            /(^|[^_])_([^_\n]+)_(?!_)/g,
            "$1<em>$2</em>"
        );

        // Strikethrough.
        safe = safe.replace(/~~(.+?)~~/g, "<del>$1</del>");

        // Plain URLs.
        safe = safe.replace(
            /(^|[\s(])(https?:\/\/[^\s<]+)/gi,
            (match, prefix, url) => {
                const trailingMatch = url.match(/[.,!?;:]+$/);
                const trailing = trailingMatch
                    ? trailingMatch[0]
                    : "";

                const cleanURL = trailing
                    ? url.slice(0, -trailing.length)
                    : url;

                if (!isSafeURL(cleanURL)) return match;

                return `${prefix}<a href="${cleanURL}" target="_blank" rel="noopener noreferrer">${cleanURL}</a>${trailing}`;
            }
        );

        // Restore protected code and links.
        safe = safe.replace(
            /CHATPLACEHOLDER(\d+)END/g,
            (match, index) => placeholders[Number(index)] || ""
        );

        return safe;
    }

    // Format complete messages.
    function formatMessage(text) {
        const lines = String(text ?? "")
            .replace(/\r\n?/g, "\n")
            .split("\n");

        const output = [];
        let inList = false;
        let listType = "";

        function closeList() {
            if (!inList) return;

            output.push(listType === "ol" ? "</ol>" : "</ul>");

            inList = false;
            listType = "";
        }

        for (const line of lines) {
            const unordered = line.match(/^\s*[-*•]\s+(.+)$/);
            const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);

            if (unordered || ordered) {
                const type = unordered ? "ul" : "ol";

                if (!inList || listType !== type) {
                    closeList();

                    output.push(type === "ol" ? "<ol>" : "<ul>");

                    inList = true;
                    listType = type;
                }

                output.push(
                    `<li>${inlineMarkdown((unordered || ordered)[1])}</li>`
                );

                continue;
            }

            closeList();

            if (!line.trim()) {
                output.push('<div class="chat-line-break"></div>');
                continue;
            }

            const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);

            if (heading) {
                const level = heading[1].length;

                output.push(
                    `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`
                );

                continue;
            }

            output.push(`<div>${inlineMarkdown(line)}</div>`);
        }

        closeList();

        return output.join("");
    }

    // Add a message to the chat.
    function addMessage(text, sender) {
        const element = document.createElement("div");

        element.className = `chat-message ${sender}`;

        if (sender === "bot") {
            element.innerHTML = formatMessage(text);
        } else {
            element.textContent = String(text ?? "");
        }

        messages.appendChild(element);
        messages.scrollTop = messages.scrollHeight;

        return element;
    }

    // Open chatbot.
    function openChat() {
        panel.hidden = false;
        launcher.setAttribute("aria-expanded", "true");
        input.focus();
    }

    // Close chatbot.
    function closeChat() {
        panel.hidden = true;
        launcher.setAttribute("aria-expanded", "false");
        launcher.focus();
    }

    launcher.addEventListener("click", openChat);
    closeButton.addEventListener("click", closeChat);

    // Enter to send; Shift + Enter for a new line.
    input.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            if (typeof form.requestSubmit === "function") {
                form.requestSubmit();
            } else {
                sendButton.click();
            }
        }
    });

    // Suggested questions.
    if (suggestions) {
        suggestions.addEventListener("click", event => {
            const button = event.target.closest("button[data-question]");

            if (!button || isThinking) return;

            const question = button.dataset.question?.trim();

            if (!question) return;

            input.value = question;

            if (typeof form.requestSubmit === "function") {
                form.requestSubmit();
            } else {
                sendButton.click();
            }
        });
    }

    // =====================================================
    // SEND MESSAGE TO NODE.JS BACKEND
    // =====================================================

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const userMessage = input.value.trim();

        if (!userMessage || isThinking) return;

        isThinking = true;

        addMessage(userMessage, "user");

        input.value = "";
        input.disabled = true;
        sendButton.disabled = true;

        const loadingMessage = addMessage("Thinking...", "bot");

        loadingMessage.classList.add("chat-thinking");
        loadingMessage.setAttribute("aria-live", "polite");

        let dots = 0;

        const thinkingAnimation = window.setInterval(() => {
            dots = (dots + 1) % 4;
            loadingMessage.textContent = "Thinking" + ".".repeat(dots);
        }, 400);

        const controller = new AbortController();

        const timeoutId = window.setTimeout(() => {
            controller.abort();
        }, CHAT_TIMEOUT);

        try {
            console.log("Chatbot API:", CHAT_API);
            console.log("Portfolio origin:", location.origin);

            const response = await fetch(CHAT_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    message: userMessage,
                    history: history.slice(-10)
                }),
                signal: controller.signal
            });

            const responseText = await response.text();

            let data = {};

            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(
                    `Invalid server response. HTTP ${response.status}.`
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.message ||
                    `Server returned HTTP ${response.status}.`
                );
            }

            if (
                typeof data.answer !== "string" ||
                !data.answer.trim()
            ) {
                throw new Error(
                    data.error || "The AI returned an empty answer."
                );
            }

            loadingMessage.classList.remove("chat-thinking");
            loadingMessage.innerHTML = formatMessage(data.answer);

            // Save successful exchanges only.
            history.push(
                {
                    role: "user",
                    text: userMessage
                },
                {
                    role: "model",
                    text: data.answer
                }
            );

            // Keep recent context.
            if (history.length > 20) {
                history.splice(0, history.length - 20);
            }

            console.log("Chatbot response received successfully.");

        } catch (error) {
            console.error("Chatbot error:", error);

            loadingMessage.classList.remove("chat-thinking");

            if (error.name === "AbortError") {
                loadingMessage.textContent =
                    "Matagal ang response ng server 😅 Lumampas sa 135 seconds. Subukan ulit mamaya.";

            } else if (error instanceof TypeError) {
                loadingMessage.textContent =
                    "Hindi ako makakonekta sa chatbot server 😅 Pakisuri ang backend connection o CORS settings.";

            } else {
                loadingMessage.textContent =
                    `May naging problema sa chatbot: ${error.message}`;
            }

        } finally {
            window.clearInterval(thinkingAnimation);
            window.clearTimeout(timeoutId);

            isThinking = false;

            input.disabled = false;
            sendButton.disabled = false;

            messages.scrollTop = messages.scrollHeight;
            input.focus();
        }
    });
});
