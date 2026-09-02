import {
    escapeHtml,
    setTinyMCEContent,
    attachTinyMCEListener,
    attachRichEditorListener,
    attachWikiTextareaListener,
    attachFixVersionListener,
    attachedElements,
    resetState,
} from '../content';

// We need to access currentTinyMCEBody — import the module to manipulate it
import * as content from '../content';

beforeEach(() => {
    resetState();
    document.body.innerHTML = '';
});

describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
    });

    it('escapes ampersands', () => {
        expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('escapes single quotes', () => {
        expect(escapeHtml("it's")).toBe('it&#039;s');
    });

    it('returns plain text unchanged', () => {
        expect(escapeHtml('Zmiany dograne do: 1.2.3')).toBe('Zmiany dograne do: 1.2.3');
    });
});

describe('setTinyMCEContent', () => {
    it('does nothing when currentTinyMCEBody is null', () => {
        // currentTinyMCEBody is null after resetState
        expect(() => setTinyMCEContent('test')).not.toThrow();
    });

    it('sets innerHTML with escaped content when body is available', () => {
        const fakeBody = document.createElement('div');
        // Set currentTinyMCEBody via module
        (content as any).currentTinyMCEBody = fakeBody;

        setTinyMCEContent('Zmiany dograne do: 1.0.0');
        expect(fakeBody.innerHTML).toBe('<p>Zmiany dograne do: 1.0.0</p>');
    });

    it('restores focus to previously active element', () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;

        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        expect(document.activeElement).toBe(input);

        setTinyMCEContent('Zmiany dograne do: 1.0.0');

        expect(document.activeElement).toBe(input);
    });

    it('dispatches input and change events so TinyMCE registers the change', () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;

        const events: string[] = [];
        fakeBody.addEventListener('input', () => events.push('input'));
        fakeBody.addEventListener('change', () => events.push('change'));

        setTinyMCEContent('Zmiany dograne do: 1.0.0');

        expect(events).toEqual(['input', 'change']);
    });

    it('escapes HTML in version names to prevent XSS', () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;

        setTinyMCEContent('Zmiany dograne do: <img src=x onerror=alert(1)>');
        expect(fakeBody.innerHTML).toBe(
            '<p>Zmiany dograne do: &lt;img src=x onerror=alert(1)&gt;</p>'
        );
        // Verify no actual img element was created
        expect(fakeBody.querySelector('img')).toBeNull();
    });

    it('also updates the wiki-markup textarea used by the "Tekst" view', () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;

        const textarea = document.createElement('textarea');
        (content as any).currentWikiTextarea = textarea;

        const events: string[] = [];
        textarea.addEventListener('input', () => events.push('input'));
        textarea.addEventListener('change', () => events.push('change'));

        setTinyMCEContent('Zmiany dograne do: 1.0.0');

        expect(textarea.value).toBe('Zmiany dograne do: 1.0.0');
        expect(events).toEqual(['input', 'change']);
    });

    it('does not touch the wiki textarea when none is known', () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;
        (content as any).currentWikiTextarea = null;

        expect(() => setTinyMCEContent('Zmiany dograne do: 1.0.0')).not.toThrow();
    });

    it('updates the <rich-editor> custom element (the actual visible "Wizualny" surface)', () => {
        const richEditor = document.createElement('rich-editor');
        (content as any).currentRichEditor = richEditor;

        const events: string[] = [];
        richEditor.addEventListener('input', () => events.push('input'));
        richEditor.addEventListener('change', () => events.push('change'));

        setTinyMCEContent('Zmiany dograne do: 1.0.0');

        expect(richEditor.innerHTML).toBe('<p>Zmiany dograne do: 1.0.0</p>');
        expect(events).toEqual(['input', 'change']);
    });

    it('works when only the rich editor is known (no legacy iframe, no wiki textarea)', () => {
        const richEditor = document.createElement('rich-editor');
        (content as any).currentRichEditor = richEditor;
        (content as any).currentTinyMCEBody = null;
        (content as any).currentWikiTextarea = null;

        setTinyMCEContent('Zmiany dograne do: 1.0.0');

        expect(richEditor.innerHTML).toBe('<p>Zmiany dograne do: 1.0.0</p>');
    });
});

describe('attachRichEditorListener', () => {
    it('finds the rich-editor custom element scoped to the open dialog', () => {
        const dialog = document.createElement('div');
        dialog.className = 'jira-dialog';
        const richEditor = document.createElement('rich-editor');
        richEditor.id = 'mce_0';
        dialog.appendChild(richEditor);
        document.body.appendChild(dialog);

        attachRichEditorListener();

        expect((content as any).currentRichEditor).toBe(richEditor);
    });

    it('ignores a same-tagged element outside the open dialog', () => {
        const dialog = document.createElement('div');
        dialog.className = 'jira-dialog';
        document.body.appendChild(dialog);

        // Simulates a rich-editor belonging to the issue page behind the modal
        const backgroundRichEditor = document.createElement('rich-editor');
        backgroundRichEditor.id = 'mce_1';
        document.body.appendChild(backgroundRichEditor);

        attachRichEditorListener();

        expect((content as any).currentRichEditor).toBeNull();
    });

    it('does nothing when no rich-editor exists', () => {
        expect(() => attachRichEditorListener()).not.toThrow();
        expect((content as any).currentRichEditor).toBeNull();
    });
});

describe('attachTinyMCEListener', () => {
    it('sets currentTinyMCEBody from iframe contentDocument', () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);

        // jsdom provides contentDocument for same-origin iframes
        const iframeBody = iframe.contentDocument!.body;

        attachTinyMCEListener(iframe);
        expect((content as any).currentTinyMCEBody).toBe(iframeBody);
    });

    it('adds iframe to attachedElements', () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);

        attachTinyMCEListener(iframe);
        expect(attachedElements.has(iframe)).toBe(true);
    });

    it('skips already attached iframes', () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);

        attachTinyMCEListener(iframe);

        // Set a different body to detect if it gets overwritten
        const marker = document.createElement('div');
        (content as any).currentTinyMCEBody = marker;

        attachTinyMCEListener(iframe);
        // Should still be the marker, not overwritten
        expect((content as any).currentTinyMCEBody).toBe(marker);
    });

});

describe('attachWikiTextareaListener', () => {
    it('finds the wiki-markup textarea even when no TinyMCE iframe exists yet', () => {
        // Simulates the dialog opening directly in "Tekst" view: TinyMCE
        // (and its iframe) hasn't been lazily created yet.
        const textarea = document.createElement('textarea');
        textarea.className = 'wiki-textfield';
        textarea.id = 'comment';
        document.body.appendChild(textarea);

        attachWikiTextareaListener();

        expect((content as any).currentWikiTextarea).toBe(textarea);
    });

    it('does nothing when no wiki textarea exists on the page', () => {
        expect(() => attachWikiTextareaListener()).not.toThrow();
        expect((content as any).currentWikiTextarea).toBeNull();
    });

    it('does not re-process an already attached textarea', () => {
        const textarea = document.createElement('textarea');
        textarea.className = 'wiki-textfield';
        document.body.appendChild(textarea);

        attachWikiTextareaListener();
        const marker = document.createElement('textarea');
        (content as any).currentWikiTextarea = marker;

        attachWikiTextareaListener();
        expect((content as any).currentWikiTextarea).toBe(marker);
    });
});

describe('attachFixVersionListener', () => {
    const setupDom = (versions: string[]) => {
        const representation = document.createElement('div');
        representation.className = 'representation';
        const ul = document.createElement('ul');
        ul.className = 'items';

        versions.forEach(v => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.className = 'value-text';
            span.textContent = v;
            li.appendChild(span);
            ul.appendChild(li);
        });

        representation.appendChild(ul);
        document.body.appendChild(representation);
        return { representation, ul };
    };

    it('does nothing when .representation ul.items is not in DOM', () => {
        expect(() => attachFixVersionListener()).not.toThrow();
    });

    it('records initial versions and does not trigger on them', () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;

        setupDom(['1.0.0', '2.0.0']);

        attachFixVersionListener();

        // No content should be set yet (no mutation happened)
        expect(fakeBody.innerHTML).toBe('');
    });

    it('does not attach twice to the same representation', () => {
        setupDom(['1.0.0']);

        attachFixVersionListener();
        const sizeBefore = attachedElements.size;

        attachFixVersionListener();
        expect(attachedElements.size).toBe(sizeBefore);
    });

    it('detects new versions added after initial attachment', async () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;

        const { ul } = setupDom(['1.0.0']);

        attachFixVersionListener();

        // Simulate adding a new version
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'value-text';
        span.textContent = '2.0.0';
        li.appendChild(span);
        ul.appendChild(li);

        // MutationObserver is async — wait for microtask
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(fakeBody.innerHTML).toBe('<p>Zmiany dograne do: 2.0.0</p>');
    });

    it('filters out existing versions and only reports new ones', async () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;

        const { ul } = setupDom(['1.0.0', '2.0.0']);

        attachFixVersionListener();

        // Add version 3.0.0
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'value-text';
        span.textContent = '3.0.0';
        li.appendChild(span);
        ul.appendChild(li);

        await new Promise(resolve => setTimeout(resolve, 0));

        // Should only contain the new version
        expect(fakeBody.innerHTML).toBe('<p>Zmiany dograne do: 3.0.0</p>');
    });

    it('re-triggers when a version already present at attach time is removed and re-added', async () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;

        // "Trunk" is already selected when the dialog opens
        const { ul } = setupDom(['Trunk']);

        attachFixVersionListener();

        // Remove Trunk
        ul.removeChild(ul.firstElementChild!);
        await new Promise(resolve => setTimeout(resolve, 0));

        // Comment should not have been touched by the removal
        expect(fakeBody.innerHTML).toBe('');

        // Re-add Trunk
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'value-text';
        span.textContent = 'Trunk';
        li.appendChild(span);
        ul.appendChild(li);

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(fakeBody.innerHTML).toBe('<p>Zmiany dograne do: Trunk</p>');
    });

    it('accumulates multiple separately-added versions in one comma-separated comment', async () => {
        const fakeBody = document.createElement('div');
        (content as any).currentTinyMCEBody = fakeBody;

        const { ul } = setupDom([]);

        attachFixVersionListener();

        const addVersion = async (v: string) => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.className = 'value-text';
            span.textContent = v;
            li.appendChild(span);
            ul.appendChild(li);
            await new Promise(resolve => setTimeout(resolve, 0));
        };

        await addVersion('1.0.0');
        expect(fakeBody.innerHTML).toBe('<p>Zmiany dograne do: 1.0.0</p>');

        await addVersion('2.0.0');
        expect(fakeBody.innerHTML).toBe('<p>Zmiany dograne do: 1.0.0, 2.0.0</p>');

        await addVersion('3.0.0');
        expect(fakeBody.innerHTML).toBe('<p>Zmiany dograne do: 1.0.0, 2.0.0, 3.0.0</p>');
    });
});
