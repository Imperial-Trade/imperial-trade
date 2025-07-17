import React from 'react';

interface AdvancedTradingJournalProps {
  onBackToBasic: () => void;
}

export default function AdvancedTradingJournal({ onBackToBasic }: AdvancedTradingJournalProps) {
  return (
    <div 
      id="app" 
      className="h-screen antialiased relative overflow-hidden"
      style={{
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#121212',
        color: '#e5e7eb'
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
        .year-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
        .mini-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
        .lds-dual-ring { display: inline-block; width: 80px; height: 80px; }
        .lds-dual-ring:after {
            content: " "; display: block; width: 64px; height: 64px; margin: 8px;
            border-radius: 50%; border: 6px solid #fff;
            border-color: #22c55e transparent #22c55e transparent;
            animation: lds-dual-ring 1.2s linear infinite;
        }
        @keyframes lds-dual-ring { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .btn-group > button.active, .filter-btn.active, .month-btn.active, .stats-tab-btn.active { background-color: #22c55e; color: #ffffff; font-weight: 600; }
        #calendar-view-wrapper, #journal-day-view {
            transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            position: absolute; width: 100%; height: 100%; top: 0; left: 0;
            backface-visibility: hidden;
        }
        #journal-day-view { transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        #app.journal-active #calendar-view-wrapper { opacity: 0; pointer-events: none; }
        #journal-day-view { opacity: 0; pointer-events: none; transform: scale(0.95); }
        #app.journal-active #journal-day-view { opacity: 1; pointer-events: auto; transform: scale(1); }
        #stats-container { transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
        #stats-container.stats-hidden { width: 0 !important; padding: 0; margin: 0; opacity: 0; }
        .stats-content { display: none; }
        .stats-content.active { display: block; }
      `}} />

      <div dangerouslySetInnerHTML={{__html: `
        <!-- Calendar & Dashboard Wrapper -->
        <div id="calendar-view-wrapper" class="flex flex-col items-center justify-center p-4 h-full">
            <div class="w-full max-w-5xl bg-neutral-900 p-4 md:p-6 rounded-lg shadow-2xl flex flex-col h-full md:h-auto max-h-full overflow-y-auto">
                <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                        <h2 class="text-2xl font-bold text-white">Trading Journal</h2>
                        <button id="toggle-stats-btn" title="Show/Hide Stats" class="p-2 rounded-full hover:bg-neutral-700 transition-colors">
                            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        </button>
                    </div>
                    <p id="user-id-display" class="font-mono text-xs text-gray-500 hidden md:block"></p>
                </div>
                <div id="dashboard-metrics-container" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"></div>
                
                <div class="flex flex-col md:flex-row gap-6 mb-6">
                    <div id="performance-graph-container" class="flex-grow bg-neutral-800 p-4 rounded-lg"></div>
                    <div id="stats-container" class="bg-neutral-800 p-4 rounded-lg w-full md:w-72 flex flex-col">
                        <div id="stats-toggle-group" class="flex items-center bg-neutral-700 rounded-lg p-1 space-x-1 mb-4">
                           <button data-tab="most-traded" class="stats-tab-btn active flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-neutral-600">Most Traded</button>
                           <button data-tab="ai-analytics" class="stats-tab-btn flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-neutral-600">AI Analytics</button>
                        </div>
                        <div id="most-traded-content" class="stats-content active">
                            <h4 class="font-bold mb-2 text-center text-neutral-400 text-sm">Most Traded Assets</h4>
                            <div id="most-traded-chart" class="relative w-32 h-32 mx-auto my-4"></div>
                            <div id="most-traded-legend" class="space-y-1"></div>
                        </div>
                        <div id="ai-analytics-content" class="stats-content">
                             <h4 class="font-bold mb-2 text-center text-neutral-400 text-sm">AI Coach Insights</h4>
                             <ul id="ai-insights-list" class="space-y-3 text-sm text-neutral-300 p-2"></ul>
                        </div>
                    </div>
                </div>
                
                <div id="calendar-container" class="bg-neutral-900 rounded-lg flex flex-col mb-6 p-4">
                    <div class="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
                        <div id="time-filter-group" class="flex items-center bg-neutral-800 rounded-lg p-1 space-x-1">
                            <button data-filter="daily" class="filter-btn active px-3 py-1.5 text-sm font-semibold rounded-md transition-colors hover:bg-neutral-700">Today</button>
                            <button data-filter="weekly" class="filter-btn px-3 py-1.5 text-sm font-semibold rounded-md transition-colors hover:bg-neutral-700">Week</button>
                            <button data-filter="monthly" class="filter-btn px-3 py-1.5 text-sm font-semibold rounded-md transition-colors hover:bg-neutral-700">Month</button>
                            <button data-filter="yearly" class="filter-btn px-3 py-1.5 text-sm font-semibold rounded-md transition-colors hover:bg-neutral-700">Year</button>
                            <button data-filter="all" class="filter-btn px-3 py-1.5 text-sm font-semibold rounded-md transition-colors hover:bg-neutral-700">All</button>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button id="prev-btn" class="p-2 rounded-full hover:bg-neutral-700 transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg></button>
                            <button id="month-year-btn" class="text-lg font-semibold hover:bg-neutral-700 px-3 py-1 rounded-md transition-colors"></button>
                            <button id="next-btn" class="p-2 rounded-full hover:bg-neutral-700 transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg></button>
                        </div>
                    </div>
                    <div id="calendar-header" class="grid grid-cols-7 gap-2 text-center text-xs text-gray-400 mb-2"><div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div></div>
                    <div id="calendar-grid" class="gap-2"></div>
                </div>
                
                <div id="trade-log-container">
                    <div class="flex justify-between items-center mb-4">
                        <h3 id="trade-log-title" class="text-xl font-bold text-white">Trade Log</h3>
                        <div id="log-pagination-controls" class="flex items-center space-x-2 text-sm">
                            <!-- Pagination will be injected here -->
                        </div>
                    </div>
                    <div class="bg-neutral-800 rounded-lg overflow-hidden">
                         <table class="w-full text-left">
                            <thead class="bg-neutral-700/50">
                                <tr>
                                    <th class="p-3 text-sm font-semibold text-neutral-300">Asset</th>
                                    <th class="p-3 text-sm font-semibold text-neutral-300">Date</th>
                                    <th class="p-3 text-sm font-semibold text-neutral-300 hidden md:table-cell">Details</th>
                                    <th class="p-3 text-sm font-semibold text-neutral-300 text-right">P/L ($)</th>
                                </tr>
                            </thead>
                            <tbody id="trade-log-body">
                                <!-- Trade log rows injected by JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Journal Day View (List of Trades) -->
        <div id="journal-day-view" class="p-4 md:p-8 overflow-y-auto h-full">
            <div class="max-w-4xl mx-auto">
                <div class="flex items-center justify-between mb-6">
                     <div class="flex items-center">
                         <button id="back-to-calendar-from-journal" class="p-2 rounded-full hover:bg-neutral-700 transition-colors mr-4"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg></button>
                         <h3 id="selected-date-display" class="text-2xl font-bold"></h3>
                     </div>
                    <button id="add-new-trade-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Add New Trade</button>
                </div>
                <div id="trades-list" class="space-y-4"></div>
            </div>
        </div>
        
        <!-- Trade Entry/Edit Modal -->
        <div id="trade-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-40 p-4">
            <div id="trade-modal-content" class="bg-neutral-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto p-6 space-y-6">
                 <div class="flex justify-between items-start">
                     <h3 id="trade-modal-title" class="text-2xl font-bold">Log Trade</h3>
                     <button id="cancel-trade-btn" class="p-2 rounded-full hover:bg-neutral-700 transition-colors -mt-2 -mr-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                 </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="trade-asset" class="block text-sm font-medium text-gray-300 mb-2">Asset / Pair</label>
                        <div class="relative">
                            <input type="text" id="trade-asset" placeholder="e.g., SPX500, XAU/USD, BTC/USDT" class="w-full bg-neutral-800 border-neutral-700 rounded-md p-3 text-white focus:ring-2 focus:ring-green-500 transition" autocomplete="off">
                            <div id="asset-suggestions" class="hidden absolute z-10 w-full bg-neutral-800 border border-neutral-700 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto"></div>
                        </div>
                    </div>
                    <div><label for="trade-pnl" class="block text-sm font-medium text-gray-300 mb-2">Profit / Loss ($)</label><input type="number" id="trade-pnl" placeholder="e.g., 150.50" class="w-full bg-neutral-800 border-neutral-700 rounded-md p-3 text-white focus:ring-2 focus:ring-green-500 transition"></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-medium text-gray-300 mb-2">Direction</label><div id="direction-group" class="btn-group flex space-x-2"><button data-value="Long" class="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded-md transition-colors">Long</button><button data-value="Short" class="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded-md transition-colors">Short</button></div></div>
                    <div><label class="block text-sm font-medium text-gray-300 mb-2">Outcome</label><div id="outcome-group" class="btn-group flex space-x-2"><button data-value="Win" class="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded-md transition-colors">Win</button><button data-value="Loss" class="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded-md transition-colors">Loss</button><button data-value="Breakeven" class="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded-md transition-colors">BE</button></div></div>
                </div>
                                 
                <div class="p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                    <h3 class="font-semibold text-green-300 mb-3">AI Coach Data Points</h3>
                    <p class="text-sm text-neutral-400 mb-4">Help the AI learn your habits by providing more context.</p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label for="trade-strategy" class="block text-sm font-medium text-gray-300 mb-2">Strategy / Setup</label>
                            <select id="trade-strategy" class="w-full bg-neutral-800 border-neutral-700 rounded-md p-3 text-white focus:ring-2 focus:ring-green-500 transition">
                                <option>Breakout</option><option>Reversal</option><option>Trend Following</option><option>Scalp</option><option>Range</option><option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label for="trade-emotion" class="block text-sm font-medium text-gray-300 mb-2">Mindset / Emotion</label>
                            <select id="trade-emotion" class="w-full bg-neutral-800 border-neutral-700 rounded-md p-3 text-white focus:ring-2 focus:ring-green-500 transition">
                                <option>Disciplined</option><option>Confident</option><option>Anxious</option><option>Greedy</option><option>FOMO</option><option>Hesitant</option><option>Fatigued</option>
                            </select>
                        </div>
                        <div>
                            <label for="trade-session" class="block text-sm font-medium text-gray-300 mb-2">Trading Session</label>
                            <select id="trade-session" class="w-full bg-neutral-800 border-neutral-700 rounded-md p-3 text-white focus:ring-2 focus:ring-green-500 transition">
                                <option>Asian</option><option>London</option><option>New York</option><option>Overlap</option>
                            </select>
                        </div>
                    </div>
                </div>
                 
                <div><label for="trade-notes" class="block text-sm font-medium text-gray-300 mb-2">Trade Notes & Analysis</label><textarea id="trade-notes" rows="6" class="w-full bg-neutral-800 border-neutral-700 rounded-md p-3 text-white focus:ring-2 focus:ring-green-500 transition"></textarea></div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Trade Chart Screenshot</label>
                    <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-700 border-dashed rounded-md">
                        <div id="image-upload-zone" class="space-y-1 text-center"><svg class="mx-auto h-12 w-12 text-neutral-500" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg><div class="flex text-sm text-gray-400"><label for="image-input" class="relative cursor-pointer bg-neutral-900 rounded-md font-medium text-green-400 hover:text-green-300 focus-within:outline-none"><span>Upload a file</span><input id="image-input" name="image-input" type="file" class="sr-only" accept="image/*"></label><p class="pl-1">or drag and drop</p></div><p class="text-xs text-neutral-500">PNG, JPG, GIF</p></div>
                        <div id="image-preview-container" class="hidden w-full"><img id="image-preview" src="" alt="Image Preview" class="max-h-64 mx-auto rounded-md"/><button id="remove-image" class="mt-2 mx-auto block text-sm text-red-500 hover:text-red-400">Remove Image</button></div>
                    </div>
                </div>
                <div class="flex items-center justify-end space-x-4 pt-4">
                    <button id="save-trade-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-md transition-colors disabled:opacity-50" disabled>Save Trade</button>
                </div>
            </div>
        </div>
        
        <!-- Date Picker Modal -->
        <div id="date-picker-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div class="bg-neutral-900 rounded-lg shadow-2xl w-full max-w-sm p-6 space-y-4">
                <h3 class="text-xl font-bold text-center text-white">Select Date</h3>
                <div class="flex items-center justify-center space-x-4">
                    <button id="prev-year-btn" class="p-2 rounded-full hover:bg-neutral-700 transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg></button>
                    <input type="number" id="year-input" class="w-24 text-center bg-neutral-800 border-neutral-700 rounded-md p-2 text-white font-bold text-lg focus:ring-2 focus:ring-green-500">
                    <button id="next-year-btn" class="p-2 rounded-full hover:bg-neutral-700 transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg></button>
                </div>
                <div id="month-grid" class="grid grid-cols-4 gap-2"></div>
                <div class="flex justify-end space-x-4 pt-2">
                    <button id="cancel-date-picker" class="text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button id="go-to-date-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Go</button>
                </div>
            </div>
        </div>
        
        <div id="loading-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"><div class="text-center"><div class="lds-dual-ring"></div><p id="loading-text" class="text-white text-lg mt-4">Loading...</p></div></div>
        <div id="notification-modal" class="hidden fixed top-5 right-5 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full"><p id="notification-text"></p></div>
        
        <script type="module">
            import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
            import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
            import { getFirestore, doc, setDoc, addDoc, onSnapshot, collection, query, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
            
            // --- CONFIG & STATE ---
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "YOUR_API_KEY", authDomain: "YOUR_AUTH_DOMAIN", projectId: "YOUR_PROJECT_ID" };
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'ai-trading-journal-pro';
            let app, auth, db, userId = null, currentDate = new Date(), selectedDate = null, journalEntries = new Map(), currentTradeId = null;
            let currentImageBase64 = null, currentDirection = null, currentOutcome = null, currentFilter = 'monthly';
            let tradesPerPage = 10, currentPage = 1;
                     
            // --- UI ELEMENTS ---
            const el = (id) => document.getElementById(id);
            const appEl = el('app'), calendarGrid = el('calendar-grid'), monthYearBtn = el('month-year-btn'), prevBtn = el('prev-btn'), nextBtn = el('next-btn');
            const backToCalendarFromJournalBtn = el('back-to-calendar-from-journal'), selectedDateDisplay = el('selected-date-display');
            const tradeAssetEl = el('trade-asset'), tradePnlEl = el('trade-pnl'), directionGroup = el('direction-group'), outcomeGroup = el('outcome-group');
            const tradeStrategyEl = el('trade-strategy'), tradeEmotionEl = el('trade-emotion'), tradeSessionEl = el('trade-session');
            const assetSuggestionsEl = el('asset-suggestions');
            const tradeNotesEl = el('trade-notes'), imageInput = el('image-input'), imageUploadZone = el('image-upload-zone'), imagePreviewContainer = el('image-preview-container');
            const imagePreview = el('image-preview'), removeImageBtn = el('remove-image');
            const loadingModal = el('loading-modal'), loadingText = el('loading-text'), userIdDisplay = el('user-id-display'), notificationModal = el('notification-modal'), notificationText = el('notification-text');
            const dashboardMetricsContainer = el('dashboard-metrics-container'), performanceGraphContainer = el('performance-graph-container');
            const journalDayView = el('journal-day-view'), tradesList = el('trades-list'), addNewTradeBtn = el('add-new-trade-btn');
            const tradeModal = el('trade-modal'), tradeModalTitle = el('trade-modal-title'), saveTradeBtn = el('save-trade-btn'), cancelTradeBtn = el('cancel-trade-btn');
            const timeFilterGroup = el('time-filter-group'), calendarHeader = el('calendar-header');
            const datePickerModal = el('date-picker-modal'), yearInput = el('year-input'), monthGrid = el('month-grid');
            const prevYearBtn = el('prev-year-btn'), nextYearBtn = el('next-year-btn'), cancelDatePicker = el('cancel-date-picker'), goToDateBtn = el('go-to-date-btn');
            const toggleStatsBtn = el('toggle-stats-btn'), statsContainer = el('stats-container');
            const mostTradedChartEl = el('most-traded-chart'), mostTradedLegendEl = el('most-traded-legend');
            const statsToggleGroup = el('stats-toggle-group');
            const mostTradedContent = el('most-traded-content');
            const aiAnalyticsContent = el('ai-analytics-content');
            const aiInsightsList = el('ai-insights-list');
            const tradeLogContainer = el('trade-log-container');
            const tradeLogTitle = el('trade-log-title');
            const tradeLogBody = el('trade-log-body');
            const logPaginationControls = el('log-pagination-controls');
            
            // --- FIREBASE & AUTH ---
            async function initializeFirebase() {
                try {
                    app = initializeApp(firebaseConfig);
                    db = getFirestore(app);
                    auth = getAuth(app);
                    onAuthStateChanged(auth, async (user) => {
                        if (user) {
                            userId = user.uid;
                            userIdDisplay.textContent = \`UID: \${userId.substring(0, 12)}...\`;
                            userIdDisplay.classList.remove('hidden');
                            await setupJournalListener();
                        } else {
                            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                                await signInWithCustomToken(auth, __initial_auth_token);
                            } else {
                                await signInAnonymously(auth);
                            }
                        }
                    });
                } catch (error) {
                     console.error("Firebase init failed:", error);
                     showNotification("DB connection failed.", "error");
                 }
            }
            
            function setupJournalListener() {
                if (!userId) return;
                const q = query(collection(db, \`artifacts/\${appId}/users/\${userId}/allTrades\`));
                onSnapshot(q, (snapshot) => {
                    journalEntries.clear();
                    snapshot.forEach((doc) => {
                        const trade = doc.data();
                        const date = trade.date;
                        if (!journalEntries.has(date)) journalEntries.set(date, []);
                        journalEntries.get(date).push({ id: doc.id, ...trade });
                    });
                    updateView();
                    if (selectedDate) renderTradesForDay(selectedDate);
                }, (error) => {
                     console.error("Snapshot error:", error);
                     showNotification("Real-time sync failed.", "error");
                 });
            }
                     
            // --- VIEW & FILTER LOGIC ---
            function updateView() {
                const filteredTrades = getFilteredTrades();
                renderDashboardMetrics(filteredTrades);
                renderCalendar();
                renderTradeLog(filteredTrades, getLogTitle());
            }
            
            function getFilteredTrades() {
                const allTrades = [...journalEntries.values()].flat().sort((a,b) => new Date(a.date) - new Date(b.date));
                const now = new Date();
                let start, end = new Date(now);
                end.setHours(23, 59, 59, 999);
                 
                switch(currentFilter) {
                    case 'weekly':
                        start = new Date(now);
                        start.setDate(now.getDate() - now.getDay());
                        start.setHours(0,0,0,0);
                        return allTrades.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
                    case 'monthly':
                        start = new Date(now.getFullYear(), now.getMonth(), 1);
                        return allTrades.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
                    case 'yearly':
                         start = new Date(now.getFullYear(), 0, 1);
                         return allTrades.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
                    case 'all':
                        return allTrades;
                    case 'daily':
                    default:
                        const todayStr = now.toISOString().split('T')[0];
                        return [...journalEntries.get(todayStr) || []].sort((a,b) => new Date(b.date) - new Date(a.date));
                }
            }
                     
            function getLogTitle() {
                 switch(currentFilter) {
                    case 'daily': return \`Today's Trades\`;
                    case 'weekly': return \`This Week's Trade Log\`;
                    case 'monthly': return \`This Month's Trade Log\`;
                    case 'yearly': return \`This Year's Trade Log\`;
                    case 'all': return \`All Trades Log\`;
                    default: return 'Trade Log';
                }
            }
            
            function createTradeCardHTML(trade) {
                const pnl = parseFloat(trade.pnl) || 0;
                let pnlColor, pnlBg;
                 
                if (trade.outcome === 'Loss') { pnlColor = 'text-red-400'; pnlBg = 'bg-red-500/20'; }
                 else if (trade.outcome === 'Win') { pnlColor = 'text-green-400'; pnlBg = 'bg-green-500/20'; }
                 else { pnlColor = 'text-neutral-400'; pnlBg = 'bg-neutral-700/20'; }
                             
                const directionHTML = trade.direction ? \`<span class="text-xs font-semibold \${trade.direction === 'Long' ? 'text-green-400' : 'text-red-400'}">\${trade.direction}</span>\` : '';
                const strategyHTML = trade.strategy ? \`<span class="text-xs font-semibold text-purple-400">\${trade.strategy}</span>\` : '';
                const emotionHTML = trade.emotion ? \`<span class="text-xs font-semibold text-blue-400">\${trade.emotion}</span>\` : '';
                const sessionHTML = trade.session ? \`<span class="text-xs font-semibold text-yellow-400">\${trade.session}</span>\` : '';
                 
                const notesHTML = trade.notes ? \`<div class="mt-3"><div class="flex items-center text-sm font-semibold text-neutral-300 mb-1"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>My Insights</div><p class="text-sm text-neutral-400 pl-6">\${trade.notes.replace(/\\n/g, '<br>')}</p></div>\` : '';
                const summaryHTML = trade.aiSummary ? \`<div class="mt-3"><div class="flex items-center text-sm font-semibold text-green-400 mb-1"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 16.663c.527-.527.928-1.162 1.255-1.854M14.337 16.663c-.527-.527-.928-1.162-1.255-1.854M12 21a9 9 0 100-18 9 9 0 000 18z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14a2 2 0 100-4 2 2 0 000 4z"></path></svg>AI Coach Feedback</div><p class="text-sm text-neutral-300 pl-6">\${trade.aiSummary.replace(/\\n/g, '<br>')}</p></div>\` : '';
                const imageHTML = trade.imageUrl ? \`<div class="mt-3"><button class="toggle-chart-btn text-sm font-semibold text-green-400 hover:text-green-300 focus:outline-none flex items-center"><svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"></path><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>Show Chart</button><div class="chart-image-container hidden mt-2"></div></div>\` : '';
                 
                return \`
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="text-lg font-bold">\${trade.asset || 'Untitled Trade'}</div>
                            <div class="flex items-center space-x-2 text-xs text-neutral-400 flex-wrap">
                                <span>\${new Date(trade.date + 'T00:00:00').toLocaleDateString()}</span>
                                \${directionHTML}
                                \${strategyHTML}
                                \${emotionHTML}
                                \${sessionHTML}
                            </div>
                        </div>
                        <div class="text-lg font-semibold px-3 py-1 rounded-md \${pnlBg} \${pnlColor}">$\${pnl.toFixed(2)}</div>
                    </div>
                    \${notesHTML}
                    \${summaryHTML}
                    \${imageHTML}
                \`;
            }
            
            function addTradeCardEventListeners(tradeCard, trade) {
                tradeCard.addEventListener('click', () => openTradeModal(trade));
                const toggleBtn = tradeCard.querySelector('.toggle-chart-btn');
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const container = tradeCard.querySelector('.chart-image-container');
                        const btnEl = e.currentTarget;
                        if (container.classList.contains('hidden')) {
                            container.innerHTML = \`<img src="\${trade.imageUrl}" class="rounded-lg max-w-full object-cover cursor-pointer" onclick="event.stopPropagation(); window.open('\${trade.imageUrl}');\">\`;
                            container.classList.remove('hidden');
                            btnEl.innerHTML = \`<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> Hide Chart\`;
                        } else {
                            container.innerHTML = '';
                            container.classList.add('hidden');
                            btnEl.innerHTML = \`<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"></path><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> Show Chart\`;
                        }
                    });
                }
            }
                     
            function renderTradeLog(trades, title) {
                tradeLogTitle.textContent = title;
                tradeLogBody.innerHTML = '';
                if (trades.length === 0) {
                    tradeLogBody.innerHTML = \`<tr><td colspan="4" class="text-center p-8 text-neutral-500">No trades found for this period.</td></tr>\`;
                    return;
                }
                trades.forEach(trade => {
                    const pnl = parseFloat(trade.pnl) || 0;
                    const pnlColor = trade.outcome === 'Win' ? 'text-green-400' : trade.outcome === 'Loss' ? 'text-red-400' : 'text-neutral-400';
                    const detailsHTML = [trade.direction, trade.strategy, trade.emotion, trade.session].filter(Boolean).join(' / ');
                     
                    const row = document.createElement('tr');
                    row.className = 'border-b border-neutral-700/50 hover:bg-neutral-800/50 cursor-pointer';
                    row.innerHTML = \`
                        <td class="p-3 font-semibold">\${trade.asset}</td>
                        <td class="p-3 text-neutral-400">\${trade.date}</td>
                        <td class="p-3 text-neutral-400 text-sm hidden md:table-cell">\${detailsHTML}</td>
                        <td class="p-3 font-semibold text-right \${pnlColor}">$\${pnl.toFixed(2)}</td>
                    \`;
                    row.addEventListener('click', () => openTradeModal(trade));
                    tradeLogBody.appendChild(row);
                });
            }
            
            // --- CALENDAR LOGIC ---
            function renderCalendar() {
                calendarGrid.innerHTML = '';
                calendarGrid.className = 'gap-2'; // Reset classes
                calendarHeader.style.display = 'grid';
                             
                switch(currentFilter) {
                    case 'daily':
                        calendarGrid.innerHTML = \`<div class="col-span-7 text-center text-neutral-500 p-8">Showing Today's trades below. Select another filter to see a calendar view.</div>\`;
                        calendarHeader.style.display = 'none';
                        monthYearBtn.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        break;
                    case 'weekly':
                        calendarGrid.classList.add('calendar-grid');
                        renderWeekView(currentDate);
                        break;
                    case 'monthly':
                        calendarGrid.classList.add('calendar-grid');
                        renderMonthView(currentDate);
                        break;
                    case 'yearly':
                        calendarGrid.classList.add('year-grid');
                        calendarHeader.style.display = 'none';
                        renderYearView(currentDate);
                        break;
                    case 'all':
                        calendarGrid.innerHTML = \`<div class="col-span-7 text-center text-neutral-500 p-8">Showing all trades below. Select a different filter to see a calendar view.</div>\`;
                        calendarHeader.style.display = 'none';
                        monthYearBtn.textContent = "All Time";
                        break;
                }
            }
            
            function renderMonthView(date) {
                const year = date.getFullYear(), month = date.getMonth();
                monthYearBtn.textContent = \`\${date.toLocaleString('default', { month: 'long' })} \${year}\`;
                const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
                for (let i = 0; i < firstDay; i++) calendarGrid.appendChild(Object.assign(document.createElement('div'), { className: 'bg-neutral-800/50 rounded-lg' }));
                for (let day = 1; day <= daysInMonth; day++) {
                    const dayDate = new Date(year, month, day);
                    const dayEl = createDayElement(dayDate, day);
                    calendarGrid.appendChild(dayEl);
                }
            }
            
            function renderWeekView(date) {
                const year = date.getFullYear(), month = date.getMonth(), day = date.getDate();
                const startOfWeek = new Date(year, month, day - date.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                monthYearBtn.textContent = \`\${startOfWeek.toLocaleDateString()} - \${endOfWeek.toLocaleDateString()}\`;
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(startOfWeek);
                    dayDate.setDate(startOfWeek.getDate() + i);
                    const dayEl = createDayElement(dayDate, dayDate.getDate());
                    calendarGrid.appendChild(dayEl);
                }
            }
            
            function renderYearView(date) {
                monthYearBtn.textContent = date.getFullYear();
                for (let month = 0; month < 12; month++) {
                    const monthContainer = document.createElement('div');
                    monthContainer.className = 'p-2 bg-neutral-800 rounded-lg cursor-pointer hover:ring-2 hover:ring-green-500 transition-all';
                    monthContainer.addEventListener('click', () => {
                        currentDate = new Date(date.getFullYear(), month, 1);
                        currentFilter = 'monthly';
                        timeFilterGroup.querySelector('.active')?.classList.remove('active');
                        timeFilterGroup.querySelector('button[data-filter="monthly"]').classList.add('active');
                        updateView();
                    });
                                     
                    const monthName = new Date(date.getFullYear(), month).toLocaleString('default', { month: 'long' });
                    monthContainer.innerHTML = \`<h4 class="font-bold text-center text-sm mb-2">\${monthName}</h4>\`;
                                     
                    const miniGrid = document.createElement('div');
                    miniGrid.className = 'mini-calendar-grid gap-1';
                                     
                    const firstDay = new Date(date.getFullYear(), month, 1).getDay();
                    const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
                    for (let i = 0; i < firstDay; i++) miniGrid.appendChild(document.createElement('div'));
                                     
                    for (let day = 1; day <= daysInMonth; day++) {
                        const dayDate = new Date(date.getFullYear(), month, day);
                        const dateStr = dayDate.toISOString().split('T')[0];
                        const dayEl = document.createElement('div');
                        dayEl.className = 'text-xs text-center rounded-sm';
                        dayEl.textContent = day;
                        if (journalEntries.has(dateStr)) {
                             dayEl.classList.add('bg-green-500/50', 'text-white');
                        } else {
                            dayEl.classList.add('text-neutral-500');
                        }
                        miniGrid.appendChild(dayEl);
                    }
                    monthContainer.appendChild(miniGrid);
                    calendarGrid.appendChild(monthContainer);
                }
            }
            
            function createDayElement(date, dayNumber) {
                const dateStr = date.toISOString().split('T')[0];
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day relative flex flex-col p-2 min-h-[6rem] rounded-lg transition-all duration-200 bg-neutral-800';
                             
                const today = new Date(); today.setHours(0,0,0,0);
                const isDisabled = date > today;
                 
                if (!isDisabled) {
                    dayEl.classList.add('cursor-pointer', 'hover:ring-2', 'hover:ring-green-500');
                    dayEl.addEventListener('click', (e) => handleDateClick(dateStr, e.currentTarget));
                } else {
                    dayEl.classList.add('opacity-50', 'cursor-not-allowed');
                }
                 
                let dayNumberClass = 'text-sm text-neutral-400';
                if (date.toDateString() === today.toDateString()) {
                    dayNumberClass = 'font-bold text-base bg-green-500 rounded-full w-6 h-6 flex items-center justify-center text-white';
                }
                let contentHTML = \`<span class="\${dayNumberClass}">\${dayNumber}</span>\`;
                if (journalEntries.has(dateStr)) {
                    const dayTrades = journalEntries.get(dateStr);
                    const totalPnl = dayTrades.reduce((sum, trade) => sum + (parseFloat(trade.pnl) || 0), 0);
                    let pnlTextClass = '';
                    if (totalPnl > 0) { dayEl.classList.add('bg-green-500/30'); dayEl.classList.remove('bg-neutral-800'); pnlTextClass = 'text-green-400'; }
                     else if (totalPnl < 0) { dayEl.classList.add('bg-red-500/30'); dayEl.classList.remove('bg-neutral-800'); pnlTextClass = 'text-red-400'; }
                     else { pnlTextClass = 'text-neutral-400'; }
                    contentHTML = \`<span class="\${dayNumberClass}">\${dayNumber}</span><div class="mt-auto text-center text-xs font-bold \${pnlTextClass}">$\${totalPnl.toFixed(0)}</div>\`;
                }
                dayEl.innerHTML = contentHTML;
                return dayEl;
            }
            
            function handleDateClick(dateStr, targetElement) {
                selectedDate = dateStr;
                renderTradesForDay(dateStr);
                const rect = targetElement.getBoundingClientRect();
                journalDayView.style.transformOrigin = \`\${rect.left + rect.width / 2}px \${rect.top + rect.height / 2}px\`;
                requestAnimationFrame(() => { appEl.classList.add('journal-active'); });
            }
            
            function handleBackToCalendar() {
                appEl.classList.remove('journal-active');
                selectedDate = null;
            }
            
            // --- DASHBOARD METRICS & GRAPH ---
            function renderDashboardMetrics(trades) {
                let totalPnl = 0, wins = 0, losses = 0, totalWinsPnl = 0, totalLossesPnl = 0;
                let equityData = [{pnl: 0, date: null}];
                if (trades && trades.length > 0) {
                    let cumulativePnl = 0;
                    trades.forEach(trade => {
                        const pnl = parseFloat(trade.pnl) || 0;
                        cumulativePnl += pnl;
                        equityData.push({pnl: cumulativePnl, date: trade.date});
                        if (trade.outcome === 'Win') { wins++; totalWinsPnl += pnl; }
                        if (trade.outcome === 'Loss') { losses++; totalLossesPnl += Math.abs(pnl); }
                    });
                    totalPnl = cumulativePnl;
                } else {
                    equityData = [{pnl: 0, date: null}, {pnl: 0, date: null}];
                 }
                const winRate = (wins + losses > 0) ? (wins / (wins + losses) * 100).toFixed(1) : '0.0';
                const profitFactor = (totalLossesPnl > 0) ? (totalWinsPnl / totalLossesPnl).toFixed(2) : 'N/A';
                const totalTradesCount = trades ? trades.length : 0;
                dashboardMetricsContainer.innerHTML = \`
                    <div class="bg-neutral-800 p-4 rounded-lg"><div class="text-sm text-neutral-400">Total P/L</div><div class="text-2xl font-bold \${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}">$\${totalPnl.toFixed(2)}</div></div>
                    <div class="bg-neutral-800 p-4 rounded-lg"><div class="text-sm text-neutral-400">Win Rate</div><div class="text-2xl font-bold">\${winRate}%</div></div>
                    <div class="bg-neutral-800 p-4 rounded-lg"><div class="text-sm text-neutral-400">Profit Factor</div><div class="text-2xl font-bold">\${profitFactor}</div></div>
                    <div class="bg-neutral-800 p-4 rounded-lg"><div class="text-sm text-neutral-400">Total Trades</div><div class="text-2xl font-bold">\${totalTradesCount}</div></div>
                \`;
                performanceGraphContainer.innerHTML = \`<h4 class="font-bold mb-2 text-center text-neutral-400 text-sm">Equity Curve</h4><div id="equity-chart" class="h-40">\${createEquityCurveChart(equityData)}</div>\`;
                renderMostTradedChart(trades);
                renderAIAnalytics(trades);
            }
                     
            function createEquityCurveChart(data) {
                const width = 500, height = 160, margin = {top: 10, right: 10, bottom: 20, left: 40};
                const chartWidth = width - margin.left - margin.right;
                const chartHeight = height - margin.top - margin.bottom;
                const pnlValues = data.map(d => d.pnl);
                const maxVal = Math.max(...pnlValues, 0);
                const minVal = Math.min(...pnlValues, 0);
                const yRange = maxVal - minVal;
                const x = (i) => margin.left + (i / (data.length - 1 || 1)) * chartWidth;
                const y = (val) => margin.top + chartHeight - ((val - minVal) / (yRange || 1)) * chartHeight;
                const points = data.map((d, i) => \`\${x(i)},\${y(d.pnl)}\`).join(' ');
                const zeroLineY = y(0);
                const lastPnl = data[data.length - 1].pnl;
                const pathColor = lastPnl >= 0 ? "#22c55e" : "#ef4444";
                const areaPoints = \`\${margin.left},\${height - margin.bottom} \${points} \${x(data.length - 1)},\${height - margin.bottom}\`;
                const startLabel = data.length > 1 ? "Start" : "";
                const endLabel = data.length > 1 ? "Current" : "";
                return \`<svg viewBox="0 0 \${width} \${height}" class="w-full h-full"><text x="\${margin.left - 5}" y="\${margin.top + 4}" text-anchor="end" class="text-xs fill-neutral-400">$\${maxVal.toFixed(0)}</text><text x="\${margin.left - 5}" y="\${height - margin.bottom + 4}" text-anchor="end" class="text-xs fill-neutral-400">$\${minVal.toFixed(0)}</text><text x="\${margin.left}" y="\${height - 5}" class="text-xs fill-neutral-400">\${startLabel}</text><text x="\${width - margin.right}" y="\${height - 5}" text-anchor="end" class="text-xs fill-neutral-400">\${endLabel}</text><line x1="\${margin.left}" y1="\${margin.top}" x2="\${margin.left}" y2="\${height - margin.bottom}" stroke="#404040" stroke-width="1"/><line x1="\${margin.left}" y1="\${height - margin.bottom}" x2="\${width - margin.right}" y2="\${height - margin.bottom}" stroke="#404040" stroke-width="1"/><line x1="\${margin.left}" y1="\${zeroLineY}" x2="\${width - margin.right}" y2="\${zeroLineY}" stroke="#404040" stroke-width="1" stroke-dasharray="2"/><defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="\${pathColor}" stop-opacity="0.4"/><stop offset="100%" stop-color="\${pathColor}" stop-opacity="0"/></linearGradient></defs><polyline fill="none" stroke="\${pathColor}" stroke-width="2" points="\${points}"/><polygon fill="url(#areaGradient)" points="\${areaPoints}" /></svg>\`;
            }
            
            function renderMostTradedChart(trades) {
                mostTradedChartEl.innerHTML = ''; mostTradedLegendEl.innerHTML = '';
                if (!trades || trades.length === 0) { mostTradedLegendEl.innerHTML = '<p class="text-center text-sm text-neutral-500">No trades to analyze.</p>'; return; }
                const assetCounts = new Map();
                trades.forEach(trade => { const asset = trade.asset || 'Unknown'; assetCounts.set(asset, (assetCounts.get(asset) || 0) + 1); });
                const sortedAssets = [...assetCounts.entries()].sort((a, b) => b[1] - a[1]);
                const topAssets = sortedAssets.slice(0, 4);
                let othersCount = sortedAssets.slice(4).reduce((sum, entry) => sum + entry[1], 0);
                let chartData = topAssets.map(asset => ({ name: asset[0], count: asset[1] }));
                if (othersCount > 0) { chartData.push({ name: 'Others', count: othersCount }); }
                const totalTrades = trades.length;
                const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#6b7280'];
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute('viewBox', '0 0 36 36'); svg.setAttribute('class', 'w-full h-full');
                let accumulatedPercent = 0;
                chartData.forEach((data, index) => {
                    const percentage = (data.count / totalTrades) * 100;
                    const circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                    circle.setAttribute('class', 'fill-none'); circle.setAttribute('stroke', colors[index % colors.length]);
                    circle.setAttribute('stroke-width', '4'); circle.setAttribute('stroke-dasharray', \`\${percentage} \${100 - percentage}\`);
                    circle.setAttribute('stroke-dashoffset', 25 - accumulatedPercent);
                    circle.setAttribute('cx', '18'); circle.setAttribute('cy', '18');
                    circle.setAttribute('r', '15.9155');
                    svg.appendChild(circle);
                    accumulatedPercent += percentage;
                    const legendItem = document.createElement('div');
                    legendItem.className = 'flex items-center justify-between text-sm';
                    legendItem.innerHTML = \`<div class="flex items-center"><span class="w-3 h-3 rounded-full mr-2" style="background-color: \${colors[index % colors.length]}"></span><span class="text-neutral-300">\${data.name}</span></div><span class="font-semibold text-neutral-400">\${percentage.toFixed(0)}%</span>\`;
                    mostTradedLegendEl.appendChild(legendItem);
                });
                mostTradedChartEl.appendChild(svg);
            }
                     
            function renderAIAnalytics(trades) {
                if (!aiInsightsList) return;
                if (!trades || trades.length === 0) {
                    aiInsightsList.innerHTML = \`<li class="text-center text-sm text-neutral-500">No trades to analyze.</li>\`;
                    return;
                }
                             
                const mostProfitable = trades.filter(t => t.pnl > 0).sort((a,b) => b.pnl - a.pnl)[0];
                const biggestLoss = trades.filter(t => t.pnl < 0).sort((a,b) => a.pnl - b.pnl)[0];
                const strategyData = trades.reduce((acc, trade) => {
                    const strategy = trade.strategy || 'Other';
                    if (!acc[strategy]) acc[strategy] = { pnl: 0, count: 0 };
                    acc[strategy].pnl += trade.pnl || 0;
                    acc[strategy].count++;
                    return acc;
                }, {});
                const bestStrategy = Object.entries(strategyData).sort((a,b) => b[1].pnl - a[1].pnl)[0];
                 
                let insightsHTML = '';
                if (mostProfitable) insightsHTML += \`<li class="flex items-start"><span class="text-green-400 mr-3 mt-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg></span><span>Best Trade: <b>\${mostProfitable.asset}</b>, netting <b>$\${mostProfitable.pnl.toFixed(2)}</b>.</span></li>\`;
                if (biggestLoss) insightsHTML += \`<li class="flex items-start"><span class="text-red-400 mr-3 mt-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17l5-5m0 0l-5-5m5 5H6"></path></svg></span><span>Biggest Loss: <b>\${biggestLoss.asset}</b> for <b>$\${biggestLoss.pnl.toFixed(2)}</b>.</span></li>\`;
                if (bestStrategy) insightsHTML += \`<li class="flex items-start"><span class="text-blue-400 mr-3 mt-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></span><span>Top Strategy: <b>\${bestStrategy[0]}</b> with a P/L of <b>$\${bestStrategy[1].pnl.toFixed(2)}</b>.</span></li>\`;
                aiInsightsList.innerHTML = insightsHTML;
            }
            
            // --- MULTI-TRADE DAY VIEW ---
            function renderTradesForDay(dateStr) {
                const dateObj = new Date(dateStr + 'T00:00:00');
                selectedDateDisplay.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const dayTrades = journalEntries.get(dateStr) || [];
                tradesList.innerHTML = '';
                if (dayTrades.length === 0) {
                    tradesList.innerHTML = \`<div class="text-center text-neutral-500 p-8">No trades logged for this day.</div>\`;
                } else {
                    dayTrades.sort((a,b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)).forEach(trade => {
                        const tradeCard = document.createElement('div');
                        tradeCard.className = 'bg-neutral-800 p-4 rounded-lg cursor-pointer hover:bg-neutral-700 transition-colors';
                        tradeCard.innerHTML = createTradeCardHTML(trade);
                        addTradeCardEventListeners(tradeCard, trade);
                        tradesList.appendChild(tradeCard);
                    });
                }
            }
            
            // --- TRADE MODAL LOGIC ---
            function openTradeModal(trade = null) {
                resetTradeForm();
                if (trade) {
                    currentTradeId = trade.id; selectedDate = trade.date;
                    tradeModalTitle.textContent = "Edit Trade";
                    tradeAssetEl.value = trade.asset || ''; tradePnlEl.value = Math.abs(parseFloat(trade.pnl) || 0);
                    tradeNotesEl.value = trade.notes || '';
                    if (trade.direction) { currentDirection = trade.direction; updateButtonGroup(directionGroup, currentDirection); }
                    if (trade.outcome) { currentOutcome = trade.outcome; updateButtonGroup(outcomeGroup, currentOutcome); }
                    if (trade.strategy) { tradeStrategyEl.value = trade.strategy; }
                    if (trade.emotion) { tradeEmotionEl.value = trade.emotion; }
                    if (trade.session) { tradeSessionEl.value = trade.session; }
                    if (trade.imageUrl) { currentImageBase64 = trade.imageUrl; showImagePreview(trade.imageUrl); }
                } else {
                    currentTradeId = null; tradeModalTitle.textContent = "Log New Trade";
                }
                tradeModal.classList.remove('hidden');
                updateButtonStates();
            }
            
            function closeTradeModal() {
                tradeModal.classList.add('hidden'); currentTradeId = null; clearAndHideSuggestions();
            }
            
            function resetTradeForm() {
                [tradeAssetEl, tradePnlEl, tradeNotesEl, imageInput, tradeStrategyEl, tradeEmotionEl, tradeSessionEl].forEach(el => el.value = '');
                currentDirection = null; currentOutcome = null; currentImageBase64 = null;
                updateButtonGroup(directionGroup, null); updateButtonGroup(outcomeGroup, null);
                resetImageInput(); clearAndHideSuggestions();
            }
            
            async function saveTrade() {
                if (!selectedDate || !userId) return;
                let pnlValue = parseFloat(tradePnlEl.value) || 0;
                if (currentOutcome === 'Loss') { pnlValue = -Math.abs(pnlValue); }
                 
                const tradeData = {
                    date: selectedDate, asset: tradeAssetEl.value, pnl: pnlValue,
                    direction: currentDirection, outcome: currentOutcome, notes: tradeNotesEl.value,
                    strategy: tradeStrategyEl.value, emotion: tradeEmotionEl.value, session: tradeSessionEl.value,
                    imageUrl: currentImageBase64, lastUpdated: new Date().toISOString()
                };
                 
                showLoading(currentTradeId ? "Updating trade..." : "Saving trade...");
                try {
                    const collectionRef = collection(db, \`artifacts/\${appId}/users/\${userId}/allTrades\`);
                    let tradeId = currentTradeId; let isNewTrade = false;
                    if (tradeId) {
                        const existingTrade = [...journalEntries.values()].flat().find(t => t.id === tradeId);
                        tradeData.aiSummary = existingTrade.aiSummary || null;
                        await setDoc(doc(collectionRef, tradeId), tradeData, { merge: true });
                    } else {
                        const newDocRef = await addDoc(collectionRef, tradeData);
                        tradeId = newDocRef.id; isNewTrade = true;
                    }
                    showNotification("Trade saved successfully!", "success");
                    closeTradeModal();
                    if(isNewTrade || tradeData.notes || tradeData.imageUrl) {
                        getAISummaryForTrade({ ...tradeData, id: tradeId });
                    }
                } catch (error) { console.error("Save error:", error); showNotification("Failed to save trade.", "error"); }
                finally { hideLoading(); }
            }
            
            // --- ASSET SUGGESTION LOGIC ---
            const FOREX_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD', 'EUR/CAD', 'EUR/NZD', 'GBP/JPY', 'GBP/CHF', 'GBP/AUD', 'GBP/CAD', 'GBP/NZD', 'AUD/JPY', 'AUD/CAD', 'AUD/CHF', 'AUD/NZD', 'CAD/JPY', 'CAD/CHF', 'CHF/JPY', 'NZD/JPY', 'NZD/CHF', 'NZD/CAD'];
            const COMMODITIES = ['XAU/USD', 'XAG/USD', 'WTI/USD', 'BRENT/USD'];
            const INDICES = ['SPX500', 'US30', 'NAS100', 'UK100', 'DAX30', 'JP225'];
            let debounceTimer;
            const debounce = (func, delay) => (...args) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => func.apply(this, args), delay); };
            
            const getAssetSuggestions = async (query) => {
                const normalizedQuery = query.toUpperCase().trim();
                if (!normalizedQuery) { clearAndHideSuggestions(); return; }
                const forexSuggestions = FOREX_PAIRS.filter(pair => pair.includes(normalizedQuery));
                const commoditySuggestions = COMMODITIES.filter(c => c.includes(normalizedQuery));
                const indexSuggestions = INDICES.filter(i => i.includes(normalizedQuery));
                let cryptoSuggestions = [];
                try {
                    const response = await fetch(\`https://api.coingecko.com/api/v3/search?query=\${encodeURIComponent(query)}\`);
                    if (response.ok) {
                        const data = await response.json();
                        cryptoSuggestions = (data.coins || []).map(coin => \`\${coin.symbol.toUpperCase()}/USDT\`);
                    }
                } catch (error) { console.warn("Could not fetch crypto suggestions:", error); }
                const combined = [...indexSuggestions, ...forexSuggestions, ...commoditySuggestions, ...cryptoSuggestions];
                renderSuggestions([...new Set(combined)]);
            };
                     
            const renderSuggestions = (suggestions) => {
                if (!suggestions || suggestions.length === 0) { clearAndHideSuggestions(); return; }
                assetSuggestionsEl.innerHTML = '';
                suggestions.slice(0, 10).forEach(asset => {
                    const item = document.createElement('div');
                    item.className = 'p-3 hover:bg-neutral-700 cursor-pointer text-white text-sm';
                    item.textContent = asset;
                    assetSuggestionsEl.appendChild(item);
                });
                assetSuggestionsEl.classList.remove('hidden');
            };
            
            const clearAndHideSuggestions = () => { assetSuggestionsEl.innerHTML = ''; assetSuggestionsEl.classList.add('hidden'); };
            
            // --- IMAGE & AI LOGIC ---
            async function getAISummaryForTrade(trade) {
                if (!trade.notes && !trade.imageUrl) return;
                let details = \`Asset: \${trade.asset||'N/A'}, Outcome: \${trade.outcome||'N/A'}, P/L: $\${trade.pnl||'N/A'}, Strategy: \${trade.strategy||'N/A'}, Emotion: \${trade.emotion||'N/A'}, Session: \${trade.session||'N/A'}\`;
                const prompt = \`You are an expert trading coach. Based on the provided trade data, user notes, and chart image, provide a concise, insightful "AI Coach Feedback" summary. This summary should be a few sentences long and highlight the most crucial aspect of the trade, such as a strength or a key area for improvement. Your feedback will be displayed directly in the trade log. DATA: \${details} USER NOTES: \${trade.notes || 'No notes provided.'}\`;
                try {
                    const parts = [{ text: prompt }];
                    if (trade.imageUrl) { parts.push({ inlineData: { mimeType: trade.imageUrl.match(/:(.*?);/)[1], data: trade.imageUrl.split(',')[1] } }); }
                    const payload = { contents: [{ role: "user", parts }] };
                    const apiKey = "";
                    const apiUrl = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${apiKey}\`;
                    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!response.ok) throw new Error(\`API error \${response.status}\`);
                    const result = await response.json();
                    if (result.candidates?.length > 0 && result.candidates[0].content?.parts?.length > 0) {
                        const summary = result.candidates[0].content.parts[0].text.trim();
                        const tradeDocRef = doc(db, \`artifacts/\${appId}/users/\${userId}/allTrades\`, trade.id);
                        await setDoc(tradeDocRef, { aiSummary: summary }, { merge: true });
                    } else { console.warn("AI summary response was empty or malformed.", result); }
                } catch (error) { console.error("AI summary generation failed:", error); }
            }
                     
            function handleImageUpload(event) {
                const file = event.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => { currentImageBase64 = e.target.result; showImagePreview(currentImageBase64); updateButtonStates(); };
                reader.readAsDataURL(file);
            }
            function showImagePreview(base64) { imagePreview.src = base64; imageUploadZone.classList.add('hidden'); imagePreviewContainer.classList.remove('hidden'); }
            function resetImageInput() { currentImageBase64 = null; imageInput.value = ''; imagePreview.src = ''; imageUploadZone.classList.remove('hidden'); imagePreviewContainer.classList.add('hidden'); updateButtonStates(); }
                     
            // --- UI UTILITIES ---
            function updateButtonStates() { const hasContent = tradeNotesEl.value.trim() || currentImageBase64 || tradeAssetEl.value.trim() || tradePnlEl.value.trim(); saveTradeBtn.disabled = !hasContent; }
            function updateButtonGroup(groupEl, val) { groupEl.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.value === val)); }
            function showLoading(text="Loading...") { loadingText.textContent = text; loadingModal.classList.remove('hidden'); }
            function hideLoading() { loadingModal.classList.add('hidden'); }
            function showNotification(text, type='success') {
                notificationText.textContent = text;
                notificationModal.className = \`fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform \${type === 'error' ? 'bg-red-600' : 'bg-green-600'}\`;
                notificationModal.classList.remove('hidden');
                requestAnimationFrame(() => { notificationModal.style.transform = 'translateX(0)'; });
                setTimeout(() => { notificationModal.style.transform = 'translateX(calc(100% + 1.25rem))'; setTimeout(() => notificationModal.classList.add('hidden'), 300); }, 3000);
            }
            
            // --- EVENT LISTENERS ---
            prevBtn.addEventListener('click', () => {
                if (currentFilter === 'weekly') currentDate.setDate(currentDate.getDate() - 7);
                else if (currentFilter === 'monthly') currentDate.setMonth(currentDate.getMonth() - 1);
                else if (currentFilter === 'yearly') currentDate.setFullYear(currentDate.getFullYear() - 1);
                updateView();
            });
            nextBtn.addEventListener('click', () => {
                if (currentFilter === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                else if (currentFilter === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);
                else if (currentFilter === 'yearly') currentDate.setFullYear(currentDate.getFullYear() + 1);
                updateView();
            });
            
            backToCalendarFromJournalBtn.addEventListener('click', handleBackToCalendar);
            addNewTradeBtn.addEventListener('click', () => openTradeModal(null));
            cancelTradeBtn.addEventListener('click', closeTradeModal);
            saveTradeBtn.addEventListener('click', saveTrade);
            imageInput.addEventListener('change', handleImageUpload);
            removeImageBtn.addEventListener('click', resetImageInput);
            timeFilterGroup.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-btn')) {
                    currentFilter = e.target.dataset.filter;
                    timeFilterGroup.querySelector('.active')?.classList.remove('active');
                    e.target.classList.add('active');
                    currentDate = new Date(); // Reset to today's date context when filter changes
                    updateView();
                }
            });
            toggleStatsBtn.addEventListener('click', () => statsContainer.classList.toggle('stats-hidden'));
            let selectedMonthIndex = null;
            monthYearBtn.addEventListener('click', () => {
                yearInput.value = currentDate.getFullYear(); monthGrid.innerHTML = '';
                selectedMonthIndex = currentDate.getMonth();
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                monthNames.forEach((name, index) => {
                    const monthBtn = document.createElement('button'); monthBtn.textContent = name;
                    monthBtn.dataset.month = index; monthBtn.className = 'month-btn p-3 rounded-md hover:bg-neutral-700 transition-colors';
                    if (index === selectedMonthIndex) monthBtn.classList.add('active');
                    monthGrid.appendChild(monthBtn);
                });
                datePickerModal.classList.remove('hidden');
            });
            monthGrid.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    monthGrid.querySelector('.active')?.classList.remove('active');
                    e.target.classList.add('active');
                    selectedMonthIndex = parseInt(e.target.dataset.month);
                }
            });
            prevYearBtn.addEventListener('click', () => yearInput.value--);
            nextYearBtn.addEventListener('click', () => yearInput.value++);
            cancelDatePicker.addEventListener('click', () => datePickerModal.classList.add('hidden'));
            goToDateBtn.addEventListener('click', () => {
                const newYear = parseInt(yearInput.value);
                if (selectedMonthIndex !== null && !isNaN(newYear)) {
                    currentDate = new Date(newYear, selectedMonthIndex, 1);
                    updateView();
                    datePickerModal.classList.add('hidden');
                }
            });
            [tradeNotesEl, tradePnlEl].forEach(el => el.addEventListener('input', updateButtonStates));
            directionGroup.addEventListener('click', (e) => { if(e.target.tagName==='BUTTON'){ currentDirection=e.target.dataset.value; updateButtonGroup(directionGroup, currentDirection); }});
            outcomeGroup.addEventListener('click', (e) => { if(e.target.tagName==='BUTTON'){ currentOutcome=e.target.dataset.value; updateButtonGroup(outcomeGroup, currentOutcome); }});
            const dropZone = document.querySelector('.border-dashed');
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-green-400'); });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-green-400'));
            dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('border-green-400'); if (e.dataTransfer.files.length) { imageInput.files = e.dataTransfer.files; handleImageUpload({ target: imageInput }); } });
            tradeAssetEl.addEventListener('input', debounce(() => getAssetSuggestions(tradeAssetEl.value), 300));
            tradeAssetEl.addEventListener('focus', () => getAssetSuggestions(tradeAssetEl.value));
            tradeAssetEl.addEventListener('blur', () => { setTimeout(clearAndHideSuggestions, 150); });
            assetSuggestionsEl.addEventListener('mousedown', (e) => {
                if (e.target && e.target.textContent) {
                    tradeAssetEl.value = e.target.textContent;
                    clearAndHideSuggestions();
                    updateButtonStates();
                }
            });
                     
            statsToggleGroup.addEventListener('click', (e) => {
                if (e.target.classList.contains('stats-tab-btn')) {
                    const tab = e.target.dataset.tab;
                    statsToggleGroup.querySelector('.active')?.classList.remove('active');
                    e.target.classList.add('active');
                                     
                    mostTradedContent.classList.toggle('active', tab === 'most-traded');
                    aiAnalyticsContent.classList.toggle('active', tab === 'ai-analytics');
                }
            });
            
            // --- INITIALIZATION ---
            window.onload = () => { initializeFirebase().then(updateView); currentDate = new Date(); };
        </script>
      `}} />

      <div className="absolute top-4 right-4">
        <button 
          onClick={onBackToBasic}
          className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Back to Basic
        </button>
      </div>
    </div>
  );
}
