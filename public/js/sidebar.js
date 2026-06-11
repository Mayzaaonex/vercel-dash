class Sidebar {
    static render(activePage = 'dashboard') {
        const sidebarHTML = `
            <aside class="sidebar w-56 flex flex-col py-6 px-4 shrink-0" id="sidebar">
                <div class="px-2 mb-8 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                            <path d="M13 3L4 14h8l-1 7 9-11h-8l1-7z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <a href="/" class="text-sm font-bold text-white no-underline">MAYZAA</a>
                </div>

                <nav class="flex flex-col gap-1 flex-1">
                    <div class="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Main Menu</div>
                    <a href="/" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
                        <span>📊</span> Dashboard
                    </a>
                    <a href="/maker/" class="nav-link ${activePage === 'maker' ? 'active' : ''}">
                        <span>⚙️</span> Maker
                    </a>
                    <a href="/downloader/" class="nav-link ${activePage === 'downloader' ? 'active' : ''}">
                        <span>⬇️</span> Downloader
                    </a>
                    <a href="/ai/" class="nav-link ${activePage === 'ai' ? 'active' : ''}">
                        <span>🤖</span> AI
                    </a>
                    <a href="/stalker/" class="nav-link ${activePage === 'stalker' ? 'active' : ''}">
                        <span>👁️</span> Stalker
                    </a>
                    <a href="/tools/" class="nav-link ${activePage === 'tools' ? 'active' : ''}">
                        <span>🔧</span> Tools
                    </a>
                </nav>

                <div class="text-[10px] text-slate-700 px-2">Copyright © RianModss</div>
            </aside>
        `;
        document.getElementById('sidebar-container').innerHTML = sidebarHTML;
    }
}