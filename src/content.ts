const attachedElements = new Set<Element>();
let currentTinyMCEBody: HTMLElement | null = null;

const attachTinyMCEListener = (iframe: HTMLIFrameElement) => {
    if (attachedElements.has(iframe)) return;
    attachedElements.add(iframe);

    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            return;
        }

        const body = iframeDoc.body;
        if (!body) return;

        currentTinyMCEBody = body;

    } catch (err) {
        console.error('Błąd dostępu do iframe:', err);
    }
};

const attachFixVersionListener = () => {
    const representation = document.querySelector(".representation ul.items");
    if (!representation || attachedElements.has(representation)) return;

    attachedElements.add(representation);

    const observer = new MutationObserver(() => {
        const versions = Array.from(
            representation.querySelectorAll(".value-text")
        ).map(el => el.textContent?.trim() || '');

        if (versions.length > 0) {
            const versionsText = `Zmiany dograne do: ${versions.join(', ')}`;
            setTinyMCEContent(versionsText);
        }
    });

    observer.observe(representation, {
        childList: true,
        subtree: true
    });
};

const setTinyMCEContent = (text: string) => {
    if (!currentTinyMCEBody) {
        return;
    }

    currentTinyMCEBody.innerHTML = `<p>${text}</p>`;
};

const observeForModalElements = () => {

    const observer = new MutationObserver(() => {

        const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[id^="mce_"][id$="_ifr"]');

        iframes.forEach(iframe => {
            if (!attachedElements.has(iframe)) {

                iframe.addEventListener('load', () => {
                    attachTinyMCEListener(iframe);
                });

                if (iframe.contentDocument?.readyState === 'complete') {
                    attachTinyMCEListener(iframe);
                }
            }
        });

        attachFixVersionListener();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    setTimeout(() => {
        const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[id^="mce_"][id$="_ifr"]');

        iframes.forEach(attachTinyMCEListener);

        attachFixVersionListener();
    }, 1000);
};

observeForModalElements();