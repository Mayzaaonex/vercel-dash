class Sidebar {
    static render(activePage = 'dashboard') {
        const sidebarHTML = `
            <button class="hamburger-btn" onclick="Sidebar.toggle()">
                <img src="https://cdn-icons-png.flaticon.com/512/7710/7710488.png" alt="menu" class="hamburger-icon">
            </button>
            <div class="sidebar-overlay" id="sidebar-overlay" onclick="Sidebar.close()"></div>

            <!-- Desktop Top Bar -->
            <nav class="topbar-desktop" id="topbar-desktop">
                <div class="topbar-brand">
                    <div class="brand-logo">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                            <path d="M13 3L4 14h8l-1 7 9-11h-8l1-7z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <a href="/" class="brand-text">DASHBOARD</a>
                </div>
                <div class="topbar-links">
                    <a href="/" class="topbar-link ${activePage === 'dashboard' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/1828/1828791.png" alt="dashboard" class="link-icon">
                        <span>Dashboard</span>
                    </a>
                    <a href="/maker/" class="topbar-link ${activePage === 'maker' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/2920/2920277.png" alt="maker" class="link-icon">
                        <span>Maker</span>
                    </a>
                    <a href="/downloader/" class="topbar-link ${activePage === 'downloader' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/2920/2920186.png" alt="downloader" class="link-icon">
                        <span>Downloader</span>
                    </a>
                    <a href="/ai/" class="topbar-link ${activePage === 'ai' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/11697/11697487.png" alt="ai" class="link-icon">
                        <span>AI</span>
                    </a>
                    <a href="/stalker/" class="topbar-link ${activePage === 'stalker' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/709/709699.png" alt="stalker" class="link-icon">
                        <span>Stalker</span>
                    </a>
                    <a href="/tools/" class="topbar-link ${activePage === 'tools' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/2920/2920244.png" alt="tools" class="link-icon">
                        <span>Tools</span>
                    </a>
                    <a href="/search/" class="topbar-link ${activePage === 'search' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/954/954591.png" alt="search" class="link-icon">
                        <span>Search</span>
                    </a>
                    <a href="/konvert/" class="topbar-link ${activePage === 'konvert' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/2920/2920247.png" alt="konvert" class="link-icon">
                        <span>Konvert</span>
                    </a>
                </div>
            </nav>

            <!-- Mobile Sidebar -->
            <aside class="sidebar w-56 flex flex-col py-6 px-4 shrink-0" id="sidebar">
                <div class="px-2 mb-8 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-gray-600 flex items-center justify-center">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                            <path d="M13 3L4 14h8l-1 7 9-11h-8l1-7z" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <a href="/" class="text-sm font-bold text-white no-underline">API-MAYZAA</a>
                </div>

                <nav class="flex flex-col gap-1 flex-1">
                    <div class="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-2">Main Menu</div>

                    <a href="/" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/1828/1828791.png" alt="dashboard" class="nav-icon">
                        Dashboard
                    </a>
                    <a href="/maker/" class="nav-link ${activePage === 'maker' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/2920/2920277.png" alt="maker" class="nav-icon">
                        Maker API
                    </a>
                    <a href="/downloader/" class="nav-link ${activePage === 'downloader' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/2920/2920186.png" alt="downloader" class="nav-icon">
                        Downloader
                    </a>
                    <a href="/ai/" class="nav-link ${activePage === 'ai' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/11697/11697487.png" alt="ai" class="nav-icon">
                        AI Chat
                    </a>
                    <a href="/stalker/" class="nav-link ${activePage === 'stalker' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/709/709699.png" alt="stalker" class="nav-icon">
                        Stalker
                    </a>
                    <a href="/tools/" class="nav-link ${activePage === 'tools' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/2920/2920244.png" alt="tools" class="nav-icon">
                        Tools
                    </a>
                    <a href="/search/" class="nav-link ${activePage === 'search' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/954/954591.png" alt="search" class="nav-icon">
                        Search
                    </a>
                    <a href="/konvert/" class="nav-link ${activePage === 'konvert' ? 'active' : ''}">
                        <img src="https://cdn-icons-png.flaticon.com/512/2920/2920247.png" alt="konvert" class="nav-icon">
                        Konvert
                    </a>
                </nav>

                <div class="text-[10px] text-gray-700 px-2">Copyright &copy; RianModss</div>
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