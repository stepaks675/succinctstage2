// ==UserScript==
// @name         Succinct Stage 2 Checker
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Extracts and sums your stage 2 odds and stars to calculate potential total stars according to math
// @author       You
// @match        https://testnet.succinct.xyz/prove/bids*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let totalSum = 0;
    let rowCount = 0;
    const visitedPages = new Set();

    // === Create floating UI panel ===
    function createOverlay() {
        const panel = document.createElement('div');
        panel.id = 'succinct-stats-panel';
        panel.style.position = 'fixed';
        panel.style.bottom = '20px';
        panel.style.right = '20px';
        panel.style.zIndex = '9999';
        panel.style.background = '#111';
        panel.style.color = '#fff';
        panel.style.padding = '12px 16px';
        panel.style.borderRadius = '10px';
        panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        panel.style.fontFamily = 'monospace';
        panel.style.fontSize = '14px';
        panel.style.lineHeight = '1.4em';
        panel.style.maxWidth = '300px';
        panel.style.opacity = '0.95';
        panel.innerHTML = 'Loading...';

        document.body.appendChild(panel);
    }

    function updateOverlay(page) {
        const panel = document.getElementById('succinct-stats-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div><strong>🌟 Expected Stars:</strong> ${totalSum.toFixed(4)}</div>
            <div><strong>📊 Bids Processed:</strong> ${rowCount}</div>
            <div><strong>📄 Last Page:</strong> ${page}</div>
        `;
    }

    function parseNumber(text) {
        const clean = text.replace(/[^\d.-]+/g, '');
        return parseFloat(clean);
    }

    function getCurrentPageParam() {
        const match = location.href.match(/[?&]page=(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
    }

    function extractTableData() {
        const page = getCurrentPageParam();
        if (visitedPages.has(page)) {
            console.log(`%cPage ${page} already processed. Skipping.`, 'color: gray; font-style: italic;');
            return true;
        }

        const tbodies = document.querySelectorAll('tbody');
        if (!tbodies.length) return false;

        let validDataFound = false;

        tbodies.forEach((tbody) => {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row, rowIndex) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                    const getTextFromTd = (td) => {
                        const p = td.querySelector('p');
                        return p ? p.innerText.trim() : td.innerText.trim();
                    };

                    const text2Raw = getTextFromTd(cells[1]);
                    const text3Raw = getTextFromTd(cells[2]);

                    const td2 = parseNumber(text2Raw);
                    const td3 = parseNumber(text3Raw) / 100;

                    if (!isNaN(td2) && !isNaN(td3)) {
                        const product = td2 * td3;
                        totalSum += product;
                        rowCount++;

                        console.log(`Row ${rowIndex + 1}: TD2 = ${td2}, TD3 = ${td3} → ${product.toFixed(4)}`);
                        validDataFound = true;
                    }
                }
            });
        });

        if (validDataFound) {
            visitedPages.add(page);
            console.log(`%c✔ Finished Page ${page}`, 'color: green; font-weight: bold;');
            console.log(`%c📊 Running Total: ${totalSum.toFixed(4)}`, 'font-size: 16px; font-weight: bold; color: blue;');
            updateOverlay(page);
        }

        return validDataFound;
    }

    function waitAndExtract() {
        let attempts = 0;
        const maxAttempts = 40;

        const intervalId = setInterval(() => {
            const success = extractTableData();
            attempts++;
            if (success || attempts >= maxAttempts) {
                clearInterval(intervalId);
                if (!success) {
                    console.warn('⚠️ Failed to extract table data after waiting.');
                }
            }
        }, 500);
    }

    function hookHistoryAndUrlChanges(callback) {
        let lastUrl = location.href;

        const observeUrl = () => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                callback();
            }
        };

        const pushState = history.pushState;
        history.pushState = function () {
            pushState.apply(this, arguments);
            observeUrl();
        };

        const replaceState = history.replaceState;
        history.replaceState = function () {
            replaceState.apply(this, arguments);
            observeUrl();
        };

        window.addEventListener('popstate', observeUrl);
        setInterval(observeUrl, 500);
    }

    // Initialize
    createOverlay();
    hookHistoryAndUrlChanges(() => {
        console.log('%c📄 Detected Page Change', 'color: orange; font-weight: bold;');
        waitAndExtract();
    });
    waitAndExtract();
})();
