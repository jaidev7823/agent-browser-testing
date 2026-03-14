const { execSync } = require('child_process');

// TOGGLE THIS: true = see the browser, false = invisible (headless)
const DEBUG_MODE = true; 

const run = (cmd) => {
    // Pass the headed flag if DEBUG_MODE is on
    const headedFlag = DEBUG_MODE ? '--headed ' : '';
    try {
        return execSync(`agent-browser ${headedFlag}${cmd}`, { encoding: 'utf8' });
    } catch (err) {
        console.error(`❌ Command failed: ${cmd}`);
        console.error(err.stderr);
        return null;
    }
};

// Helper to find a ref ID based on a label (e.g., "Username")
const getRef = (snapshot, label) => {
    const lines = snapshot.split('\n');
    const match = lines.find(line => line.toLowerCase().includes(label.toLowerCase()));
    if (match) {
        const refMatch = match.match(/\[ref=(e\d+)\]/);
        return refMatch ? `@${refMatch[1]}` : null;
    }
    return null;
};

async function main() {
    console.log(`🚀 Starting browser (Mode: ${DEBUG_MODE ? 'Headed' : 'Headless'})...`);

    run("open https://github.com/login");

    // Get snapshot and dynamically find the correct IDs
    const snapshot = run("snapshot -i");
    
    const userRef = getRef(snapshot, "Username");
    const passRef = getRef(snapshot, "Password");
    const btnRef = getRef(snapshot, "Sign in");

    if (userRef && passRef) {
        console.log(`Found fields: User(${userRef}), Pass(${passRef})`);
        
        run(`fill ${userRef} "your-username"`);
        run(`fill ${passRef} "your-password"`);
        
        if (btnRef) {
            console.log("Clicking login...");
            run(`click ${btnRef}`);
        }
    } else {
        console.log("Could not find login fields in snapshot.");
    }

    run("wait 2000");
    run("screenshot result.png");
    console.log("✅ Done. Screenshot saved to result.png");

    // Keep it open for a bit if in debug mode so you can see it
    if (!DEBUG_MODE) run("close");
}

main().catch(console.error);
