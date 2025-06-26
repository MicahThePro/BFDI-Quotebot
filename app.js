/**
 * BFDI QuoteBot – app.js (Pro Edition)
 * Author: Micah Scott Nordlund
 * Description: Loads quotes, queries GPT-4o-mini to pick a quote,
 * and displays the quote with character attribution.
 * Fully robust with error handling and normalized matching.
 */

// ==== DOM SELECTORS ====
const input = document.getElementById("userInput");
const button = document.getElementById("submitBtn");
const responseBox = document.getElementById("responseBox");

let quoteList = [];

/**
 * Load the quotes.json file asynchronously.
 * On success, stores the quotes in global quoteList.
 * On failure, logs error and updates UI.
 */
async function loadQuotes() {
  try {
    const res = await fetch("quotes.json");
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

    quoteList = await res.json();
    console.log(`✅ Loaded ${quoteList.length} quotes.`);
  } catch (err) {
    console.error("❌ Failed to load quotes.json:", err);
    responseBox.textContent = "Error loading quotes. Please refresh and try again.";
  }
}

/**
 * Display the selected quote object (with character) in the UI.
 * @param {{quote: string, character: string}} quoteObj 
 */
function displayQuote(quoteObj) {
  responseBox.innerHTML = `
    <p class="quote-text">"${quoteObj.quote}"</p>
    <p class="quote-character">- ${quoteObj.character}</p>
  `;
}

/**
 * Call OpenAI GPT-4o-mini with system prompt and user input,
 * forcing GPT to pick EXACTLY one quote from the loaded quote list.
 * Matches GPT response against loaded quotes to find full object.
 * @param {string} userInput
 * @returns {Promise<{quote: string, character: string}>}
 */
async function getBFDIQuote(userInput) {
  if (!quoteList.length) throw new Error("Quotes list is empty.");

  const quoteTexts = quoteList.map(q => q.quote);

  // Construct strict system prompt
  const systemPrompt = `
You are BFDI QuoteBot. Your ONLY job is to respond with ONE quote from the list below.
Rules:
- DO NOT generate your own quote.
- DO NOT add explanations or formatting.
- JUST return the quote exactly as it appears.
- Output ONLY the quote. No extra symbols.

Allowed Quotes:
${quoteTexts.map(q => `- ${q}`).join("\n")}

Now, based on the mood or vibe of this user message, return ONE matching quote:
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_OPENAI_API_KEY" // <<< Replace with your actual key
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ],
        temperature: 0.7,
        max_tokens: 100
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.choices || !data.choices.length) {
      throw new Error("No choices returned from GPT");
    }

    // Extract and normalize GPT response
    let aiQuote = data.choices[0].message.content.trim();
    aiQuote = aiQuote.replace(/^["']|["']$/g, "").trim().toLowerCase();

    // Find matching quote object (case-insensitive)
    const matched = quoteList.find(q => q.quote.trim().toLowerCase() === aiQuote);

    if (!matched) {
      console.warn(`GPT responded with unmatched quote: "${aiQuote}". Falling back.`);
      return { quote: "GELATIN!!", character: "Gelatin" };
    }

    return matched;

  } catch (err) {
    console.error("❌ GPT fetch or parse error:", err);
    throw err;
  }
}

// ==== HANDLE USER INTERACTION ====
button.addEventListener("click", async () => {
  const userMessage = input.value.trim();
  if (!userMessage) return;

  responseBox.textContent = "Thinking like Lollipop… 🍬";
  button.disabled = true;

  try {
    const quoteObj = await getBFDIQuote(userMessage);
    displayQuote(quoteObj);
  } catch {
    responseBox.textContent = "Error choosing a quote. Try again!";
  } finally {
    button.disabled = false;
  }
});

// ==== INIT ====
window.addEventListener("load", loadQuotes);