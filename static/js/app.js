// Application State
let state = {
    updates: [],
    filteredUpdates: [],
    activeFilter: 'all',
    searchQuery: '',
    selectedUpdate: null,
    activeHashtags: new Set(['#BigQuery', '#GoogleCloud'])
};

// DOM Elements
const elements = {
    updatesGrid: document.getElementById('updates-grid'),
    skeletonLoader: document.getElementById('skeleton-loader'),
    emptyState: document.getElementById('empty-state'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    filterChips: document.getElementById('filter-chips'),
    statsSummary: document.getElementById('stats-summary'),
    visibleCount: document.getElementById('visible-count'),
    totalCount: document.getElementById('total-count'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    themeToggle: document.getElementById('theme-toggle'),
    cacheStatus: document.getElementById('cache-status'),
    liveIndicator: document.getElementById('live-indicator'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    previewBadge: document.getElementById('preview-badge'),
    previewDate: document.getElementById('preview-date'),
    previewTextContent: document.getElementById('preview-text-content'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    tweetCharCount: document.getElementById('tweet-char-count'),
    charWarning: document.getElementById('char-warning'),
    copyTweetBtn: document.getElementById('copy-tweet-btn'),
    copyIcon: document.getElementById('copy-icon'),
    copyBtnText: document.getElementById('copy-btn-text'),
    sendTweetBtn: document.getElementById('send-tweet-btn'),
    hashtagBtns: document.querySelectorAll('.hashtag-btn'),
    
    // Toasts
    toastContainer: document.getElementById('toast-container')
};

// Initialize the Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadUpdates();
    setupEventListeners();
});

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showToast(`Switched to ${newTheme} theme`, 'info');
}

// Fetch Release Notes
async function loadUpdates(forceRefresh = false) {
    showLoadingState(true);
    
    try {
        const url = forceRefresh ? '/api/updates?refresh=true' : '/api/updates';
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            state.updates = data.updates;
            
            // Set Cache Status Text
            if (data.source === 'live') {
                elements.cacheStatus.innerText = 'Live Feed (Updated)';
                showToast(`Fetched latest release notes from Google Cloud`, 'success');
            } else if (data.source === 'cache') {
                elements.cacheStatus.innerText = `Cached (${data.last_updated.split(' ')[1]})`;
            } else if (data.source === 'cache_fallback') {
                elements.cacheStatus.innerText = 'Offline Fallback';
                showToast(data.error, 'warning');
            }
            
            updateFiltersCounts();
            renderUpdates();
        } else {
            throw new Error(data.error || 'Failed to fetch updates');
        }
    } catch (error) {
        console.error('Error fetching updates:', error);
        showToast(error.message || 'Error loading release notes', 'error');
        elements.cacheStatus.innerText = 'Feed Error';
        showLoadingState(false);
        if (state.updates.length === 0) {
            elements.emptyState.style.display = 'flex';
        }
    }
}

// Show/Hide Loading Skeleton
function showLoadingState(isLoading) {
    if (isLoading) {
        elements.skeletonLoader.style.display = 'flex';
        elements.updatesGrid.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.refreshIcon.classList.add('spin');
        elements.refreshBtn.disabled = true;
    } else {
        elements.skeletonLoader.style.display = 'none';
        elements.updatesGrid.style.display = 'grid';
        elements.refreshIcon.classList.remove('spin');
        elements.refreshBtn.disabled = false;
    }
}

// Update filter chips count numbers
function updateFiltersCounts() {
    const counts = {
        all: state.updates.length,
        Feature: 0,
        Changed: 0,
        Deprecated: 0,
        Issue: 0
    };
    
    state.updates.forEach(up => {
        // Map types dynamically if they correspond to known categories
        let type = up.type;
        if (type.includes('Feature')) type = 'Feature';
        else if (type.includes('Change') || type.includes('Modify')) type = 'Changed';
        else if (type.includes('Deprecat')) type = 'Deprecated';
        else if (type.includes('Issue') || type.includes('Known Issue')) type = 'Issue';
        
        if (counts[type] !== undefined) {
            counts[type]++;
        } else {
            // Count generic updates under 'all' only, or we can handle others
        }
    });
    
    // Update labels in UI
    document.getElementById('count-all').innerText = counts.all;
    document.getElementById('count-feature').innerText = counts.Feature;
    document.getElementById('count-changed').innerText = counts.Changed;
    document.getElementById('count-deprecated').innerText = counts.Deprecated;
    document.getElementById('count-issue').innerText = counts.Issue;
}

// Render release note cards to the grid
function renderUpdates() {
    showLoadingState(false);
    elements.updatesGrid.innerHTML = '';
    
    // Filter logic
    state.filteredUpdates = state.updates.filter(update => {
        // Filter Type Match
        let typeMatch = true;
        if (state.activeFilter !== 'all') {
            let itemType = update.type;
            if (itemType.includes('Feature')) itemType = 'Feature';
            else if (itemType.includes('Change') || itemType.includes('Modify')) itemType = 'Changed';
            else if (itemType.includes('Deprecat')) itemType = 'Deprecated';
            else if (itemType.includes('Issue') || itemType.includes('Known Issue')) itemType = 'Issue';
            
            typeMatch = itemType === state.activeFilter;
        }
        
        // Search Term Match
        let searchMatch = true;
        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            const textMatch = update.description_text.toLowerCase().includes(query);
            const titleMatch = update.type.toLowerCase().includes(query);
            const dateMatch = update.date.toLowerCase().includes(query);
            searchMatch = textMatch || titleMatch || dateMatch;
        }
        
        return typeMatch && searchMatch;
    });
    
    // Render Stats
    elements.visibleCount.innerText = state.filteredUpdates.length;
    elements.totalCount.innerText = state.updates.length;
    
    if (state.filteredUpdates.length === 0) {
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    
    // Render items
    state.filteredUpdates.forEach(update => {
        const card = document.createElement('article');
        card.className = 'update-card';
        card.setAttribute('data-id', update.id);
        
        // Define badge class
        let badgeClass = 'badge-default';
        let cleanType = update.type;
        if (cleanType.includes('Feature')) {
            badgeClass = 'badge-feature';
            cleanType = 'Feature';
        } else if (cleanType.includes('Change') || cleanType.includes('Modify')) {
            badgeClass = 'badge-changed';
            cleanType = 'Changed';
        } else if (cleanType.includes('Deprecat')) {
            badgeClass = 'badge-deprecated';
            cleanType = 'Deprecated';
        } else if (cleanType.includes('Issue') || cleanType.includes('Known Issue')) {
            badgeClass = 'badge-issue';
            cleanType = 'Issue';
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-header-left">
                    <span class="badge ${badgeClass}">${cleanType}</span>
                </div>
                <div class="card-date">
                    <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                    <span>${update.date}</span>
                </div>
            </div>
            <div class="card-body">
                ${update.description_html}
            </div>
            <div class="card-actions">
                <button class="btn btn-tweet-share share-action-btn">
                    <i data-lucide="twitter" style="width: 14px; height: 14px;"></i>
                    <span>Select to Tweet</span>
                </button>
            </div>
        `;
        
        // Attach Event to Share Button
        card.querySelector('.share-action-btn').addEventListener('click', () => {
            openTweetModal(update);
        });
        
        elements.updatesGrid.appendChild(card);
    });
    
    // Refresh Icons
    lucide.createIcons();
}

// Setup App Event Listeners
function setupEventListeners() {
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
        loadUpdates(true);
    });
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Search Box Input
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (state.searchQuery.trim().length > 0) {
            elements.searchClear.style.display = 'flex';
        } else {
            elements.searchClear.style.display = 'none';
        }
        renderUpdates();
    });
    
    // Search Clear
    elements.searchClear.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.searchClear.style.display = 'none';
        renderUpdates();
    });
    
    // Filter Chip Clicks
    elements.filterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        
        // Toggle Active Class
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        state.activeFilter = chip.getAttribute('data-type');
        renderUpdates();
    });
    
    // Modal Event Listeners
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.tweetTextarea.addEventListener('input', updateCharCount);
    
    // Hashtag button click handlers
    elements.hashtagBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-id') || btn.innerText;
            toggleHashtagInTweet(tag, btn);
        });
    });
    
    // Copy Tweet Action
    elements.copyTweetBtn.addEventListener('click', copyTweetText);
    
    // Send Tweet Action
    elements.sendTweetBtn.addEventListener('click', sendTweetToX);
    
    // Close modal on click outside
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });
}

// Tweet Modal Operations
function openTweetModal(update) {
    state.selectedUpdate = update;
    
    // Clean type mapping
    let cleanType = update.type;
    if (cleanType.includes('Feature')) cleanType = 'Feature';
    else if (cleanType.includes('Change') || cleanType.includes('Modify')) cleanType = 'Changed';
    else if (cleanType.includes('Deprecat')) cleanType = 'Deprecated';
    else if (cleanType.includes('Issue') || cleanType.includes('Known Issue')) cleanType = 'Issue';
    
    // Set Badge Classes
    elements.previewBadge.className = 'badge';
    if (cleanType === 'Feature') elements.previewBadge.classList.add('badge-feature');
    else if (cleanType === 'Changed') elements.previewBadge.classList.add('badge-changed');
    else if (cleanType === 'Deprecated') elements.previewBadge.classList.add('badge-deprecated');
    else if (cleanType === 'Issue') elements.previewBadge.classList.add('badge-issue');
    else elements.previewBadge.classList.add('badge-default');
    
    elements.previewBadge.innerText = cleanType;
    elements.previewDate.innerText = update.date;
    elements.previewTextContent.innerText = update.description_text;
    
    // Preconstruct Tweet text
    buildDefaultTweet(cleanType, update.date, update.description_text);
    
    elements.tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Lock background scroll
    
    elements.tweetTextarea.focus();
}

function buildDefaultTweet(type, date, text) {
    // Standard template
    const prefix = `🚀 BigQuery ${type} (${date}):\n\n`;
    const suffix = `\n\n#GoogleCloud #BigQuery`;
    
    // Maximum space for description is 280 - prefix - suffix - extra buffer
    const limit = 280 - prefix.length - suffix.length - 5;
    
    let descriptionText = text;
    if (descriptionText.length > limit) {
        descriptionText = descriptionText.substring(0, limit - 3) + '...';
    }
    
    const defaultTweet = `${prefix}${descriptionText}${suffix}`;
    elements.tweetTextarea.value = defaultTweet;
    
    // Sync hashtag button active states
    state.activeHashtags = new Set(['#BigQuery', '#GoogleCloud', '#GCP', '#DataEngineering'].filter(tag => defaultTweet.includes(tag)));
    elements.hashtagBtns.forEach(btn => {
        const tag = btn.getAttribute('data-tag');
        if (state.activeHashtags.has(tag)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    updateCharCount();
}

function closeTweetModal() {
    elements.tweetModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore background scroll
    state.selectedUpdate = null;
}

function updateCharCount() {
    const text = elements.tweetTextarea.value;
    const len = text.length;
    elements.tweetCharCount.innerText = len;
    
    // Stylize character count based on limits
    if (len > 280) {
        elements.tweetCharCount.parentElement.className = 'char-count-wrapper danger';
        elements.charWarning.style.display = 'flex';
    } else if (len > 250) {
        elements.tweetCharCount.parentElement.className = 'char-count-wrapper warning';
        elements.charWarning.style.display = 'none';
    } else {
        elements.tweetCharCount.parentElement.className = 'char-count-wrapper';
        elements.charWarning.style.display = 'none';
    }
}

// Toggle Hashtag in Tweet textarea
function toggleHashtagInTweet(tag, buttonEl) {
    let text = elements.tweetTextarea.value;
    
    if (text.includes(tag)) {
        // Remove tag and clean double spaces/newlines
        text = text.replace(new RegExp(`\\s*${tag}`, 'g'), '');
        buttonEl.classList.remove('active');
        state.activeHashtags.delete(tag);
    } else {
        // Append tag
        text = text.trim() + ' ' + tag;
        buttonEl.classList.add('active');
        state.activeHashtags.add(tag);
    }
    
    elements.tweetTextarea.value = text;
    updateCharCount();
}

// Copy Tweet text to Clipboard
async function copyTweetText() {
    const text = elements.tweetTextarea.value;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Show success animation on button
        elements.copyIcon.setAttribute('data-lucide', 'check');
        elements.copyBtnText.innerText = 'Copied!';
        elements.copyTweetBtn.classList.add('btn-primary');
        elements.copyTweetBtn.classList.remove('btn-secondary');
        lucide.createIcons();
        
        showToast('Tweet text copied to clipboard!', 'success');
        
        // Restore button after delay
        setTimeout(() => {
            elements.copyIcon.setAttribute('data-lucide', 'copy');
            elements.copyBtnText.innerText = 'Copy Text';
            elements.copyTweetBtn.classList.remove('btn-primary');
            elements.copyTweetBtn.classList.add('btn-secondary');
            lucide.createIcons();
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy text. Please select and copy manually.', 'error');
    }
}

// Launch Twitter Web Intent
function sendTweetToX() {
    const text = elements.tweetTextarea.value;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    // Open in a new tab
    window.open(url, '_blank');
    
    closeTweetModal();
    showToast('Redirected to X (Twitter) composer!', 'success');
}

// Toast Notifications System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    else if (type === 'warning') iconName = 'alert-circle';
    else if (type === 'error') iconName = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Fade out and remove after delay
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}
