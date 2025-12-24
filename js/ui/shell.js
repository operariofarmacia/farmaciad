import { signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

export function createShell({ auth, mountId = "app", title, subtitle, roleLabel, userName, onLogout }) {
    const appContainer = document.getElementById(mountId);
    
    const template = `
    <div class="flex h-screen bg-gray-50 font-[Poppins]">
        <!-- Sidebar -->
        <aside class="w-64 bg-[#003366] text-white hidden md:flex flex-col shadow-xl">
            <div class="p-6 border-b border-[#06b6d4]/30">
                <h1 class="text-2xl font-bold tracking-wider">MediFlow<span class="text-[#06b6d4]">.sys</span></h1>
                <p class="text-xs text-gray-300 mt-1 uppercase tracking-widest">${roleLabel}</p>
            </div>
            
            <nav class="flex-1 p-4 space-y-2 overflow-y-auto" id="shell-nav">
                <!-- Menu Items injected here if needed, or static -->
                <div class="p-3 bg-white/5 rounded text-sm mb-4">
                    <p class="text-gray-400 text-xs mb-1">USUARIO</p>
                    <p class="font-medium truncate">${userName}</p>
                </div>
            </nav>

            <div class="p-4 border-t border-[#06b6d4]/30">
                <button id="shell-logout" class="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors text-sm">
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Header Mobile -->
            <header class="bg-white shadow-sm border-b border-gray-200 p-4 flex justify-between items-center md:hidden">
                <div class="font-bold text-[#003366]">MediFlow</div>
                <button id="mobile-menu-btn" class="text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            </header>

            <!-- Header Desktop (Title Bar) -->
            <header class="hidden md:flex bg-white shadow-sm border-b border-gray-200 px-8 py-4 justify-between items-center">
                <div>
                    <h2 class="text-xl font-bold text-gray-800">${title}</h2>
                    <p class="text-sm text-gray-500">${subtitle}</p>
                </div>
                <div class="flex items-center gap-4">
                    <div id="notif-bell" class="relative cursor-pointer text-gray-500 hover:text-[#06b6d4]">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        <span id="notif-badge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">0</span>
                    </div>
                </div>
            </header>

            <!-- Content Area -->
            <main class="flex-1 overflow-auto bg-gray-50 p-4 md:p-8" id="main-content">
                <!-- Page Content injected here -->
                <div class="flex justify-center mt-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366]"></div></div>
            </main>
        </div>
    </div>
    `;

    appContainer.innerHTML = template;

    document.getElementById('shell-logout').addEventListener('click', async () => {
        if(onLogout) onLogout();
        await signOut(auth);
        window.location.href = 'index.html';
    });
}
