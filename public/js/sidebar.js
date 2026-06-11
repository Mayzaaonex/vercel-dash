class Sidebar {
    static render(activePage = 'dashboard') {
        const sidebarHTML = `
            <button class="hamburger-btn" onclick="Sidebar.toggle()">☰</button>
            <div class="sidebar-overlay" id="sidebar-overlay" onclick="Sidebar.close()"></div>
            
            <aside class="sidebar w-56 flex flex-col py-6 px-4 shrink-0" id="sidebar">
                <div class="px-2 mb-8 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                            <path d="M13 3L4 14h8l-1 7 9-11h-8l1-7z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <a href="/" class="text-sm font-bold text-white no-underline" onclick="Sidebar.close()">DASHBOARD</a>
                </div>

                <nav class="flex flex-col gap-1 flex-1">
                    <div class="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Main Menu</div>
                    
                    <a href="/" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}" onclick="Sidebar.close()">
                        <span>📊</span> Dashboard
                    </a>
                    <a href="/maker/" class="nav-link ${activePage === 'maker' ? 'active' : ''}" onclick="Sidebar.close()">
                        <span>⚙️</span> Maker API
                    </a>
                    <a href="/downloader/" class="nav-link ${activePage === 'downloader' ? 'active' : ''}" onclick="Sidebar.close()">
                        <span>⬇️</span> Downloader
                    </a>
                </nav>

                <div class="text-[10px] text-slate-700 px-2"></div>
            </aside>
        `;

        document.getElementById('sidebar-container').innerHTML = sidebarHTML;
    }

    static toggle() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    }

    static close() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }
}