const { execSync } = require('child_process');
const fs = require('fs');

// --- Configuration ---
const API_KEY = process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.trim() : null;
const MODEL = "openrouter/hunter-alpha";

// 1. Sanity Check
if (!API_KEY) {
    console.error("❌ KEY MISSING: The script can't see your API key.");
    process.exit(1);
} else {
    console.log(`🔑 Key found (starts with: ${API_KEY.substring(0, 10)}...)`);
}

async function askHunter(messages) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`, // Ensure no extra quotes here
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000", 
            "X-Title": "Jai Mishra Agent"
        },
        body: JSON.stringify({
            model: MODEL,
            messages: messages,
            // Hunter Alpha needs this to know it can use your agent-browser
            tools: [{
                type: "function",
                function: {
                    name: "browser_cmd",
                    description: "Execute agent-browser CLI commands",
                    parameters: {
                        type: "object",
                        properties: { cmd: { type: "string" } }
                    }
                }
            }]
        })
    });

    const data = await response.json();
    if (data.error) {
        console.error("🛑 OpenRouter Error:", data.error);
        process.exit(1);
    }
    return data;
}

// ... (rest of the main function from before)
const runBrowser = (cmd) => {
    const headedFlag = DEBUG_MODE ? '--headed ' : '';
    try {
        console.log(`\x1b[36m[Exec]\x1b[0m agent-browser ${cmd}`);
        const out = execSync(`agent-browser ${headedFlag}${cmd}`, { encoding: 'utf8' });
        return out || "Command executed successfully (no output).";
    } catch (err) {
        return `Error executing command: ${err.stderr || err.message}`;
    }
};

async function askHunter(messages) {
    try {
        // Ensure key is clean
        const cleanKey = API_KEY.trim();

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${cleanKey}`, // Must be exactly 'Bearer ' + key
                "Content-Type": "application/json",
                // REQUIRED for OpenRouter Alpha/Free models:
                "HTTP-Referer": "http://localhost:3000", 
                "X-Title": "Jai-Mishra-Agent",
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                // Hunter Alpha excels at tool calling, keep this in:
                tools: [{
                    type: "function",
                    function: {
                        name: "browser_cmd",
                        description: "Control the agent-browser CLI",
                        parameters: {
                            type: "object",
                            properties: {
                                cmd: { type: "string" }
                            },
                            required: ["cmd"]
                        }
                    }
                }],
                tool_choice: "auto"
            })
        });

        const data = await response.json();

        // If OpenRouter returns an error, log the WHOLE thing for debugging
        if (data.error) {
            console.log("\x1b[31m[OpenRouter Error Details]\x1b[0m");
            console.log(JSON.stringify(data.error, null, 2));
            process.exit(1);
        }

        return data;
    } catch (err) {
        console.error("Fetch failed:", err.message);
        process.exit(1);
    }
}

async function main() {
    if (!API_KEY) {
        console.error("❌ OPENROUTER_API_KEY is missing. Check your .env file.");
        process.exit(1);
    }

    const userPrompt = fs.readFileSync('prompt.txt', 'utf8');
    let messages = [
        { role: "system", content: "You are an AI browser automation agent. Use browser_cmd to fulfill the user's request. Always start by opening a URL." },
        { role: "user", content: userPrompt }
    ];

    console.log("🚀 Hunter Alpha is analyzing your prompt...");

    for (let i = 0; i < 15; i++) {
        const data = await askHunter(messages);
        
        // Safety check for the error you saw
        if (!data.choices || data.choices.length === 0) {
            console.log("Empty response from model. Full Raw Response:", JSON.stringify(data, null, 2));
            break;
        }

        const choice = data.choices[0].message;
        
        if (choice.content) console.log(`\x1b[33m[Hunter]\x1b[0m ${choice.content}`);

        if (choice.tool_calls) {
            messages.push(choice); // Add assistant's call to history
            
            for (const tool of choice.tool_calls) {
                const { cmd } = JSON.parse(tool.function.arguments);
                const result = runBrowser(cmd);
                
                messages.push({
                    role: "tool",
                    tool_call_id: tool.id,
                    content: result
                });
            }
        } else {
            console.log("✅ Task complete.");
            break;
        }
    }
}

main().catch(console.error);
