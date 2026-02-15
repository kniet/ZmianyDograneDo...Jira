import {
    escapeHtml,
    setTinyMCEContent,
    attachTinyMCEListener,
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
});
