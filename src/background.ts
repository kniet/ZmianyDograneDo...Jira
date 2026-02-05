chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "comboValue") {
        console.log("Otrzymano w background:", msg.value);
        sendResponse({ status: "ok" });
    }
    return true; // potrzebne, jeśli sendResponse jest async
});