const storageService = {
    async setEmail(email) {
        return chrome.storage.local.set({ user_email: email });
    },
    async getEmail() {
        const res = await chrome.storage.local.get('user_email');
        return res.user_email || null;
    },
    async clearEmail() {
        return chrome.storage.local.remove('user_email');
    },
    async getToken() {
        const email = await this.getEmail();
        return email ? btoa(email) : null; // Email в Base64
    }
};