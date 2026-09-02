export const attachedElements = new Set<Element>();
// Legacy TinyMCE iframe body. Kept as a defensive fallback — on this Jira
// instance the iframe under #mceu_* is actually `display: none` (dead markup)
// and the real "Wizualny" surface is the <rich-editor> custom element below,
// but other fields/versions may still rely on the classic iframe.
export let currentTinyMCEBody: HTMLElement | null = null;
// The visible "Wizualny" editing surface: a contenteditable custom element
// (<rich-editor id="mce_0">) that replaced the legacy TinyMCE iframe.
export let currentRichEditor: HTMLElement | null = null;
export let currentWikiTextarea: HTMLTextAreaElement | null = null;

export const escapeHtml = (text: string): string => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Scope element lookups to the open workflow-transition dialog so we never
// pick up a same-classed field belonging to the issue page behind it.
const getDialogScope = (): ParentNode => document.querySelector('.jira-dialog') || document;

export const setTinyMCEContent = (text: string) => {
    if (!currentTinyMCEBody && !currentRichEditor && !currentWikiTextarea) {
        return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    const html = `<p>${escapeHtml(text)}</p>`;

    if (currentTinyMCEBody) {
        currentTinyMCEBody.innerHTML = html;
        currentTinyMCEBody.dispatchEvent(new Event('input', { bubbles: true }));
        currentTinyMCEBody.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (currentRichEditor) {
        currentRichEditor.innerHTML = html;
        currentRichEditor.dispatchEvent(new Event('input', { bubbles: true }));
        currentRichEditor.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (currentWikiTextarea) {
        currentWikiTextarea.value = text;
        currentWikiTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        currentWikiTextarea.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (activeElement && activeElement !== document.body) {
        activeElement.focus();
    }
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

// The <rich-editor> custom element exists in the DOM as soon as the dialog
// opens (it's not lazily created like the legacy iframe was).
export const attachRichEditorListener = () => {
    const richEditor = getDialogScope().querySelector<HTMLElement>('rich-editor[id^="mce_"]');
    if (!richEditor || attachedElements.has(richEditor)) return;

    attachedElements.add(richEditor);
    currentRichEditor = richEditor;
};

// The "Tekst" (wiki markup) textarea exists in the DOM as soon as the dialog
// opens, independently of whether the TinyMCE iframe has been created yet —
// Jira only creates the iframe lazily, the first time "Wizualny" is opened.
export const attachWikiTextareaListener = () => {
    const textarea = getDialogScope().querySelector<HTMLTextAreaElement>('textarea.wiki-textfield');
    if (!textarea || attachedElements.has(textarea)) return;

    attachedElements.add(textarea);
    currentWikiTextarea = textarea;
};

export const attachFixVersionListener = () => {
    const representation = getDialogScope().querySelector(".representation ul.items");
    if (!representation || attachedElements.has(representation)) return;

    attachedElements.add(representation);

    // Versions present when the dialog opened. A baseline version is evicted
    // as soon as it's removed, so re-adding it later is treated as new again.
    const baseline = new Set(
        Array.from(representation.querySelectorAll(".value-text"))
            .map(el => el.textContent?.trim() || '')
    );

    const observer = new MutationObserver(() => {
        const currentVersions = Array.from(
            representation.querySelectorAll(".value-text")
        ).map(el => el.textContent?.trim() || '');

        const currentSet = new Set(currentVersions);
        baseline.forEach(v => {
            if (!currentSet.has(v)) baseline.delete(v);
        });

        const newVersions = currentVersions.filter(v => !baseline.has(v));

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

        attachRichEditorListener();
        attachWikiTextareaListener();
        attachFixVersionListener();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    setTimeout(() => {
        const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[id^="mce_"][id$="_ifr"]');

        iframes.forEach(attachTinyMCEListener);

        attachRichEditorListener();
        attachWikiTextareaListener();
        attachFixVersionListener();
    }, 1000);
};

export const resetState = () => {
    attachedElements.clear();
    currentTinyMCEBody = null;
    currentRichEditor = null;
    currentWikiTextarea = null;
};

// Auto-init only in browser context (not in tests)
declare const __JEST__: boolean | undefined;
if (typeof __JEST__ === 'undefined') {
    observeForModalElements();
}
