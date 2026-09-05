    const tabList = document.querySelector('#tabList');
    const addTabButton = document.querySelector('#addTabButton');
    const webviewContainer = document.querySelector('#webview-container');
    const indicator = document.querySelector('.indicator');
    const urlInput = document.querySelector('#urlInput');
    const loadUrlButton = document.querySelector('.loadUrlButton');
    const reloadButton = document.querySelector('#ReloadButton');


    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const historyDropdownBtn = document.getElementById('history-dropdown-btn');
    const historyPanel = document.getElementById('historyPanel');

    let tabs = [];
    let activeTabId = null;
    let sessionHistory = [];

    urlInput.addEventListener('input', () => {
        const active = getActiveTab();
        if (active) {
            active.webview.send('SEARCH_INPUT', { value: urlInput.value });
        }
    });

    function getActiveTab() {
        return tabs.find(t => t.id === activeTabId);
    }

    function faviconURL(pageUrl, size) {
        try {
            return `https://www.google.com/s2/favicons?domain=${new URL(pageUrl).hostname}&sz=${size || 20}`;
        } catch (e) {
            return '';
        }
    }


    function updateNavigationUI() {
        const active = getActiveTab();
        if (!active || !active.webview) {
            backBtn.disabled = true;
            forwardBtn.disabled = true;
            return;
        }

        try {
            backBtn.disabled = !active.webview.canGoBack();
            forwardBtn.disabled = !active.webview.canGoForward();
        } catch (e) {
            backBtn.disabled = true;
            forwardBtn.disabled = true;
        }
    }

    function createTab(initialUrl = './mainpage.html') {
    const id = 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const webview = document.createElement('webview');
    webview.setAttribute('id', `view-${id}`);
    webview.setAttribute('src', initialUrl);
    webview.setAttribute('preload', './preload.js');
    webview.setAttribute('plugins', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no');
    webviewContainer.appendChild(webview);

    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.id = id;
    tabElement.innerHTML = `
        <img src="" alt="" style="width: 16px; height: 16px; margin-right: 4px;">
        <span class="tab-title">New Tab</span>
        <span class="tab-close">×</span>
    `;
    tabList.appendChild(tabElement);

    webview.addEventListener('did-fail-load', (e) => {
            if (activeTabId === id) {
                console.log('FAIL LOAD:', e.errorCode, e.errorDescription, e.validatedURL);
            }
        });

        webview.addEventListener('media-started-playing', () => {
            console.log('MEDIA STARTED:', id, Date.now());
        });

        webview.addEventListener('media-paused', () => {
            console.log('MEDIA PAUSED:', id, Date.now());
        });


    webview.addEventListener('did-start-loading', () => {
        if (activeTabId === id) {
            indicator.innerText = 'loading...';
        }
    });

    webview.addEventListener('did-stop-loading', () => {
        if (activeTabId === id) {
            indicator.innerText = '';
            try {
                if (urlInput.value.startsWith('file://')) {
                    urlInput.value = '';
                } else {
                    urlInput.value = webview.getURL();
                }
            } catch (err) {}
            updateNavigationUI();
        }
    });

    function addToHistory(tabId, url, title) {
    if (!url || url.startsWith('file://') && url.endsWith('mainpage.html')) {
        return;
    }
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const last = sessionHistory[sessionHistory.length - 1];
    if (last && last.url === url && last.tabId === tabId) return;

    sessionHistory.push({
        tabId,
        url,
        title: title || url,
        timestamp: Date.now()
    });
}

    function updateLastHistoryTitle(tabId, title) {
        for (let i = sessionHistory.length - 1; i >= 0; i--) {
            if (sessionHistory[i].tabId === tabId) {
                sessionHistory[i].title = title || sessionHistory[i].url;
                return;
            }
        }
    }

    webview.addEventListener('did-navigate', (e) => {
        addToHistory(id, e.url, webview.getTitle());
        if (activeTabId === id) updateNavigationUI();
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
        addToHistory(id, e.url, webview.getTitle());
        if (activeTabId === id) updateNavigationUI();
    });

    webview.addEventListener('page-title-updated', e => {
        tabElement.querySelector('.tab-title').innerText = e.title || 'New Tab';
        try {
            tabElement.querySelector('img').src = faviconURL(webview.getURL());
        } catch (err) {}

        updateLastHistoryTitle(id, e.title);
    });

    webview.addEventListener('ipc-message', event => {
        const channel = event.channel;
        const data = event.args[0];

        if (channel === 'SEARCH_INPUT' && activeTabId === id) {
            urlInput.value = data.value;
        }

        if (channel === 'LOAD_URL') {
            if (activeTabId === id) {
                urlInput.value = data.url;
            }
            loadURLInTab(id, data.url);
        }
    });

    tabElement.addEventListener('click', e => {
        if (e.target.classList.contains('tab-close')) {
            return;
        }
        switchTab(id);
    });

    tabElement.querySelector('.tab-close').addEventListener('click', e => {
        e.stopPropagation();
        closeTab(id);
    });

    tabs.push({
        id,
        tabElement,
        webview
    });

    switchTab(id);
}

    function switchTab(id) {
        activeTabId = id;

        tabs.forEach(t => {
            if (t.id === id) {
                t.tabElement.classList.add('active');
                t.webview.classList.add('active');

                try {
                    urlInput.value = t.webview.getURL() || '';
                } catch (e) {
                    urlInput.value = t.webview.src || '';
                }

                indicator.innerText = t.webview.isLoading() ? 'loading...' : '';
            } else {
                t.tabElement.classList.remove('active');
                t.webview.classList.remove('active');
            }
        });

        updateNavigationUI();
        historyPanel.classList.remove('visible');
    }

    function closeTab(id) {
        const index = tabs.findIndex(t => t.id === id);

        if (index === -1) {
            return;
        }

        tabs[index].tabElement.remove();
        tabs[index].webview.remove();
        tabs.splice(index, 1);

        if (tabs.length === 0) {
            createTab();
        } else if (activeTabId === id) {
            const nextActiveIndex = index === 0 ? 0 : index - 1;
            switchTab(tabs[nextActiveIndex].id);
        }
    }

    function loadURLInTab(id, rawValue) {
        const targetTab = tabs.find(t => t.id === id);

        if (!targetTab) {
            return;
        }

        rawValue = rawValue.trim();

        if (!rawValue) {
            return;
        }

        if (URL.canParse(rawValue) && /^https?:/i.test(rawValue)) {
            targetTab.webview.src = rawValue;
        } else {
            targetTab.webview.src = `https://www.google.com/search?q=${encodeURIComponent(rawValue)}`;
        }
    }


    backBtn.addEventListener('click', () => {
        const active = getActiveTab();
        if (active && active.webview.canGoBack()) {
            active.webview.goBack();
        }
    });

    forwardBtn.addEventListener('click', () => {
        const active = getActiveTab();
        if (active && active.webview.canGoForward()) {
            active.webview.goForward();
        }
    });

    reloadButton.addEventListener('click', () => {
        const active = getActiveTab();
        if (active) {
            active.webview.reload();
        }
    });


    historyDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    historyPanel.innerHTML = '';
    const isVisible = historyPanel.classList.toggle('visible');

    if (isVisible) {
        const rect = historyDropdownBtn.getBoundingClientRect();

        Object.assign(historyPanel.style, {
            position: 'fixed',
            top: `${rect.bottom + 6}px`,
            left: `${rect.left}px`,
            zIndex: '1000',
            minWidth: '240px',
            maxWidth: '360px',
            maxHeight: '300px',
            overflowY: 'auto',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '6px',
            border: '1px solid #e0e0e0'
        });

        if (sessionHistory.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'No history yet';
            Object.assign(empty.style, {
                padding: '10px 12px',
                fontSize: '13px',
                color: '#888'
            });
            historyPanel.appendChild(empty);
        } else {
            // newest first
            [...sessionHistory].reverse().forEach(entry => {
                const item = document.createElement('div');
                item.className = 'history-item';

                Object.assign(item.style, {
                    padding: '8px 12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '13px'
                });

                const tabStillOpen = tabs.some(t => t.id === entry.tabId);
                item.textContent = `${entry.title} - ${entry.url}${tabStillOpen ? '' : ' (closed tab)'}`;

                item.addEventListener('mouseenter', () => item.style.background = '#f5f5f5');
                item.addEventListener('mouseleave', () => item.style.background = 'transparent');

                item.addEventListener('click', () => {
                    const targetTab = tabs.find(t => t.id === entry.tabId);
                    if (targetTab) {
                        switchTab(targetTab.id);
                        targetTab.webview.loadURL(entry.url);
                    } else {
                        createTab(entry.url);
                    }
                    historyPanel.classList.remove('visible');
                });

                historyPanel.appendChild(item);
            });
        }
    }
});


document.addEventListener('click', (e) => {
    if (!historyPanel.contains(e.target) && e.target !== historyDropdownBtn) {
        historyPanel.classList.remove('visible');
    }
});


    document.addEventListener('click', () => {
        historyPanel.classList.remove('visible');
    });

    loadUrlButton.addEventListener('click', () => {
        if (activeTabId) {
            loadURLInTab(activeTabId, urlInput.value);
        }
    });

    urlInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            loadUrlButton.click();
        }
    });

    addTabButton.addEventListener('click', () => {
        createTab();
    });

    document.addEventListener('keydown', event => {
        if (event.ctrlKey && event.key.toLowerCase() === 'm') {
            const active = getActiveTab();
            if (active) {
                active.webview.src = './mainpage.html';
            }
        }

        if (event.ctrlKey && event.key.toLowerCase() === 't') {
            event.preventDefault();
            createTab();
        }
    });

    document.querySelector(".bookmarkButton").addEventListener("click", () => {
        const bookmarkInput = document.getElementById("bookmarkInput");
        if (!bookmarkInput) return; // Guard clause if element doesn't exist
        
        const bookmarkName = bookmarkInput.value.trim();
        const activeTab = getActiveTab();

        if (activeTab && bookmarkName) {
            const bookmarkList = document.querySelector(".bookmarklist");
            const bookmarkItem = document.createElement("div");
            bookmarkItem.className = "bookmark-item";
            bookmarkItem.innerHTML = `
                <span class="bookmark-name">${bookmarkName}</span>
                <button class="bookmark-delete">×</button>
            `;

            bookmarkList.appendChild(bookmarkItem);

            bookmarkItem.querySelector(".bookmark-delete").addEventListener("click", () => {
                bookmarkItem.remove();
            });

            bookmarkItem.addEventListener("click", () => {
                loadURLInTab(activeTab.id, activeTab.webview.getURL());
            });

            bookmarkInput.value = "";
        }
    });


    document.querySelector(".bookmarkButton").addEventListener("click", (event) => {
        event.preventDefault();
        document.querySelector("#bookmarkForm").style.display = "block";
    });


    createTab('./mainpage.html');