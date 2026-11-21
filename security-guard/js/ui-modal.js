/**
 * TruePass In-Website Dialog & Toast System
 * Replaces native browser alert() and confirm() with clean, beautifully designed in-website modals.
 */
(function (global) {
    'use strict';

    let modalBackdrop = null;
    let toastContainer = null;

    function ensureContainers() {
        if (!modalBackdrop) {
            modalBackdrop = document.createElement('div');
            modalBackdrop.id = 'truepass-custom-modal-backdrop';
            modalBackdrop.className = 'fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none';
            modalBackdrop.innerHTML = `
                <div id="truepass-custom-modal-panel" class="glass-surface border border-gray-800 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl transform scale-95 transition-all duration-200">
                    <div id="truepass-modal-icon-container" class="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"></div>
                    <h3 id="truepass-modal-title" class="text-xl font-black text-white mb-2">Title</h3>
                    <p id="truepass-modal-message" class="text-xs text-gray-300 leading-relaxed mb-4">Message</p>
                    <div id="truepass-modal-detail" class="hidden p-3 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-400 mb-6 text-left"></div>
                    <div id="truepass-modal-actions" class="flex items-center justify-center gap-3"></div>
                </div>
            `;
            document.body.appendChild(modalBackdrop);
        }

        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'truepass-toast-container';
            toastContainer.className = 'fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none';
            document.body.appendChild(toastContainer);
        }
    }

    /**
     * Show clean In-Website Alert Dialog
     */
    global.showAlert = function ({ title = 'Notice', message = '', type = 'info', buttonText = 'Got it', onDismiss = null }) {
        ensureContainers();

        const iconContainer = document.getElementById('truepass-modal-icon-container');
        const titleEl = document.getElementById('truepass-modal-title');
        const msgEl = document.getElementById('truepass-modal-message');
        const detailEl = document.getElementById('truepass-modal-detail');
        const actionsEl = document.getElementById('truepass-modal-actions');

        detailEl.classList.add('hidden');
        titleEl.textContent = title;
        msgEl.innerHTML = message.replace(/\n/g, '<br>');

        if (type === 'success') {
            iconContainer.className = 'w-14 h-14 rounded-full mx-auto mb-4 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center';
            iconContainer.innerHTML = '<svg class="w-6 h-6 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>';
        } else if (type === 'error') {
            iconContainer.className = 'w-14 h-14 rounded-full mx-auto mb-4 bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center';
            iconContainer.innerHTML = '<svg class="w-6 h-6 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
        } else if (type === 'warning') {
            iconContainer.className = 'w-14 h-14 rounded-full mx-auto mb-4 bg-amber-500/20 border-2 border-amber-500 text-amber-400 flex items-center justify-center';
            iconContainer.innerHTML = '<svg class="w-6 h-6 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>';
        } else {
            iconContainer.className = 'w-14 h-14 rounded-full mx-auto mb-4 bg-indigo-500/20 border-2 border-indigo-400 text-indigo-400 flex items-center justify-center';
            iconContainer.innerHTML = '<svg class="w-6 h-6 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>';
        }

        actionsEl.innerHTML = `
            <button id="truepass-modal-dismiss-btn" class="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all">
                ${buttonText}
            </button>
        `;

        modalBackdrop.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('truepass-custom-modal-panel').classList.remove('scale-95');

        return new Promise((resolve) => {
            const btn = document.getElementById('truepass-modal-dismiss-btn');
            btn.onclick = () => {
                modalBackdrop.classList.add('opacity-0', 'pointer-events-none');
                document.getElementById('truepass-custom-modal-panel').classList.add('scale-95');
                if (onDismiss) onDismiss();
                resolve(true);
            };
        });
    };

    /**
     * Show clean In-Website Confirm Dialog (replaces browser confirm())
     * Returns Promise<boolean>
     */
    global.showConfirm = function ({ title = 'Confirm Action', message = '', detail = '', confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = 'red' }) {
        ensureContainers();

        const iconContainer = document.getElementById('truepass-modal-icon-container');
        const titleEl = document.getElementById('truepass-modal-title');
        const msgEl = document.getElementById('truepass-modal-message');
        const detailEl = document.getElementById('truepass-modal-detail');
        const actionsEl = document.getElementById('truepass-modal-actions');

        titleEl.textContent = title;
        msgEl.innerHTML = message.replace(/\n/g, '<br>');

        if (detail) {
            detailEl.classList.remove('hidden');
            detailEl.innerHTML = detail.replace(/\n/g, '<br>');
        } else {
            detailEl.classList.add('hidden');
        }

        if (confirmColor === 'red') {
            iconContainer.className = 'w-14 h-14 rounded-full mx-auto mb-4 bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center';
            iconContainer.innerHTML = '<svg class="w-6 h-6 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>';
        } else {
            iconContainer.className = 'w-14 h-14 rounded-full mx-auto mb-4 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center';
            iconContainer.innerHTML = '<svg class="w-6 h-6 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg>';
        }

        const confirmBtnClass = confirmColor === 'red'
            ? 'flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all'
            : 'flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all';

        actionsEl.innerHTML = `
            <button id="truepass-modal-cancel-btn" class="flex-1 py-3 rounded-xl bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold text-xs transition-all">
                ${cancelText}
            </button>
            <button id="truepass-modal-confirm-btn" class="${confirmBtnClass}">
                ${confirmText}
            </button>
        `;

        modalBackdrop.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('truepass-custom-modal-panel').classList.remove('scale-95');

        return new Promise((resolve) => {
            const cancelBtn = document.getElementById('truepass-modal-cancel-btn');
            const confirmBtn = document.getElementById('truepass-modal-confirm-btn');

            cancelBtn.onclick = () => {
                modalBackdrop.classList.add('opacity-0', 'pointer-events-none');
                document.getElementById('truepass-custom-modal-panel').classList.add('scale-95');
                resolve(false);
            };

            confirmBtn.onclick = () => {
                modalBackdrop.classList.add('opacity-0', 'pointer-events-none');
                document.getElementById('truepass-custom-modal-panel').classList.add('scale-95');
                resolve(true);
            };
        });
    };

    /**
     * Show clean In-Website Toast
     */
    global.showToast = function (message, type = 'success', duration = 3500) {
        ensureContainers();

        const toast = document.createElement('div');
        toast.className = `p-3.5 rounded-2xl glass-surface border shadow-2xl flex items-center gap-3 text-xs pointer-events-auto transition-all duration-300 transform translate-y-4 opacity-0 ${
            type === 'success' ? 'border-emerald-500/50 text-emerald-300' : (type === 'error' ? 'border-red-500/50 text-red-300' : 'border-gray-700 text-gray-200')
        }`;

        toast.innerHTML = `
            <div class="w-6 h-6 rounded-full ${type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : (type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400')} flex items-center justify-center font-bold text-xs shrink-0">
                ${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}
            </div>
            <div class="flex-1 font-medium leading-tight">${message}</div>
        `;

        toastContainer.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    // Auto-override native alert so NO raw browser popups appear anywhere in the app
    if (typeof global.alert !== 'undefined') {
        global._nativeAlert = global.alert;
        global.alert = function (message) {
            global.showAlert({
                title: 'Notice',
                message: String(message),
                type: 'info'
            });
        };
    }

})(window);
