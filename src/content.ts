export const attachedElements = new Set<Element>();
export let currentTinyMCEBody: HTMLElement | null = null;

export const escapeHtml = (text: string): string => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

export const setTinyMCEContent = (text: string) => {
    if (!currentTinyMCEBody) {
        return;
    }

    currentTinyMCEBody.innerHTML = `<p>${escapeHtml(text)}</p>`;
};

export const attachTinyMCEListener = (iframe: HTMLIFrameElement) => {
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

export const attachFixVersionListener = () => {
    const representation = document.querySelector(".representation ul.items");
    if (!representation || attachedElements.has(representation)) return;

    attachedElements.add(representation);

    const initialVersions = new Set(
        Array.from(representation.querySelectorAll(".value-text"))
            .map(el => el.textContent?.trim() || '')
    );

    const observer = new MutationObserver(() => {
        const currentVersions = Array.from(
            representation.querySelectorAll(".value-text")
        ).map(el => el.textContent?.trim() || '');

        const newVersions = currentVersions.filter(v => !initialVersions.has(v));

        if (newVersions.length > 0) {
            const versionsText = `Zmiany dograne do: ${newVersions.join(', ')}`;
            setTinyMCEContent(versionsText);
        }
    });

    observer.observe(representation, {
        childList: true,
        subtree: true
    });
};

export const observeForModalElements = () => {

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

export const resetState = () => {
    attachedElements.clear();
    currentTinyMCEBody = null;
};

// Auto-init only in browser context (not in tests)
declare const __JEST__: boolean | undefined;
if (typeof __JEST__ === 'undefined') {
    observeForModalElements();
}
