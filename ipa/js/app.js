// Main application logic
class AppManager {
    constructor() {
        this.currentCategory = 'all';
        this.currentView = 'home';
        this.allApps = [];
        this.searchTerm = '';
        this.featuredApps = [];
        
        // AUTO REFRESH SYSTEM
        this.autoRefreshInterval = null;
        this.lastRefreshTime = null;
        
        this.initializeElements();
        this.bindEvents();
        this.init();
    }

    initializeElements() {
        this.appsGrid = document.getElementById('appsGrid');
        this.gamesGrid = document.getElementById('gamesGrid');
        this.gamesSection = document.getElementById('gamesSection');
        this.sectionTitle = document.getElementById('sectionTitle');
        this.searchInput = document.getElementById('searchInput');
        this.categoryCards = document.querySelectorAll('.category-card');
        this.navItems = document.querySelectorAll('.nav-item[data-view]');
        this.searchModal = document.getElementById('searchModal');
        this.searchModalInput = document.getElementById('searchModalInput');
        this.closeSearch = document.getElementById('closeSearch');
        this.searchResults = document.getElementById('searchResults');
        this.searchNavItem = document.getElementById('searchNavItem');
        this.featuredCarousel = document.getElementById('featuredCarousel');
        this.featuredLoading = document.getElementById('featuredLoading');
    }

    bindEvents() {
        // Search events
        this.searchInput?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase().trim();
            this.renderApps();
        });

        this.searchModalInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            this.searchApps(searchTerm);
        });

        // Category events
        this.categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.currentCategory = category;
                
                this.categoryCards.forEach(c => {
                    c.classList.toggle('active', c.dataset.category === category);
                });
                
                this.renderApps();
            });
        });

        // Navigation events
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                
                if (view === 'search') {
                    this.openSearchModal();
                    return;
                }
                
                this.navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                this.currentView = view;
                this.renderApps();
            });
        });

        // Modal events
        this.searchModal.addEventListener('click', (e) => {
            if (e.target === this.searchModal) {
                this.closeSearchModal();
            }
        });

        this.closeSearch.addEventListener('click', () => {
            this.closeSearchModal();
        });

        // Featured carousel events
        this.bindFeaturedCarouselEvents();
        
        // Auto refresh khi rời trang
        window.addEventListener('beforeunload', () => {
            this.stopAutoRefresh();
        });
    }

    bindFeaturedCarouselEvents() {
        const prevArrow = document.querySelector('.nav-arrow.prev');
        const nextArrow = document.querySelector('.nav-arrow.next');
        const dots = document.querySelectorAll('.carousel-dot');

        if (prevArrow) {
            prevArrow.addEventListener('click', () => {
                this.scrollFeaturedCarousel(-332); // 320px + gap 12px
            });
        }

        if (nextArrow) {
            nextArrow.addEventListener('click', () => {
                this.scrollFeaturedCarousel(332);
            });
        }

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.index);
                this.scrollFeaturedCarouselToIndex(index);
            });
        });
    }

    // ==================== AUTO REFRESH FUNCTIONS ====================
    
    startAutoRefresh(userEmail) {
        if (!userEmail) return;
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        this.performAutoRefresh(userEmail);
        
        this.autoRefreshInterval = setInterval(() => {
            this.performAutoRefresh(userEmail);
        }, 5000);
        
        console.log('🔄 Auto refresh started for index page');
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('🛑 Auto refresh stopped for index page');
        }
    }
    
    async performAutoRefresh(userEmail) {
        try {
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=autoRefreshUser&email=${encodeURIComponent(userEmail)}`);
            const result = await response.json();
            
            if (result.success && result.autoRefreshed) {
                const userData = result.data;
                localStorage.setItem('currentUser', JSON.stringify(userData));
                
                this.lastRefreshTime = new Date().toLocaleTimeString('vi-VN');
                console.log('✅ Index page auto refreshed at:', this.lastRefreshTime);
                
                this.checkAndUpdateVIPAccess(userData);
            }
        } catch (error) {
            console.error('❌ Auto refresh error:', error);
        }
    }
    
    checkAndUpdateVIPAccess(userData) {
        const oldUserStr = localStorage.getItem('currentUser_old') || '{}';
        const oldUser = JSON.parse(oldUserStr);
        
        if (oldUser.packageType !== userData.packageType) {
            console.log('🔍 User package changed from', oldUser.packageType, 'to', userData.packageType);
            
            if (userData.packageType === 'free' && oldUser.packageType !== 'free') {
                this.fetchFreshData();
            }
        }
        
        localStorage.setItem('currentUser_old', JSON.stringify(userData));
    }
    
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    }

    init() {
        this.loadAppsFromSheets();
        
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.email) {
            this.startAutoRefresh(currentUser.email);
        }
    }

    async loadAppsFromSheets() {
        try {
            AppUtils.showSkeletonLoading(this.appsGrid);
            
            if (AppUtils.isCacheValid()) {
                const cachedApps = AppUtils.getFromCache();
                if (cachedApps && cachedApps.length > 0) {
                    console.log('✅ Đang tải từ cache...');
                    this.allApps = cachedApps;
                    this.renderApps();
                    this.loadFeaturedApps();
                    this.fetchFreshData();
                    return;
                }
            }
            
            await this.fetchFreshData();
            
        } catch (error) {
            console.error('Lỗi khi tải ứng dụng:', error);
            const cachedApps = AppUtils.getFromCache();
            if (cachedApps && cachedApps.length > 0) {
                this.allApps = cachedApps;
                this.renderApps();
                this.loadFeaturedApps();
            } else {
                this.appsGrid.innerHTML = '<div class="loading"><p>Lỗi khi tải ứng dụng. Vui lòng thử lại sau.</p></div>';
            }
        }
    }

    async fetchFreshData() {
        try {
            console.log('🔄 Đang tải dữ liệu mới từ server...');
            const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getApps&t=${Date.now()}`);
            const result = await response.json();
            
            if (result.success) {
                this.allApps = result.data.map(app => {
                    if (!app.categories) {
                        app.categories = 'other';
                    }
                    
                    if (app.categories.includes('photo')) {
                        app.categories = app.categories.replace('photo', 'photo');
                    }
                    
                    return app;
                });
                
                AppUtils.saveToCache(this.allApps);
                this.renderApps();
                this.loadFeaturedApps();
                console.log('✅ Dữ liệu mới đã được tải và cache');
                console.log('📊 Cấu trúc dữ liệu app đầu tiên:', this.allApps[0]);
            } else {
                throw new Error('Không thể tải dữ liệu');
            }
        } catch (error) {
            console.error('Lỗi khi fetch dữ liệu mới:', error);
        }
    }

    openSearchModal() {
        this.searchModal.style.display = 'block';
        setTimeout(() => {
            this.searchModalInput.focus();
        }, 100);
    }

    closeSearchModal() {
        this.searchModal.style.display = 'none';
        this.searchModalInput.value = '';
        this.searchResults.innerHTML = '';
    }

    searchApps(searchTerm) {
        if (!searchTerm.trim()) {
            this.searchResults.innerHTML = '<div class="no-results"><p>Nhập từ khóa để tìm kiếm</p></div>';
            return;
        }

        // TÌM KIẾM CHÍNH XÁC TỪ ĐẦU TÊN ỨNG DỤNG
        const filteredApps = this.allApps.filter(app => {
            const appName = app.name.toLowerCase();
            const searchTermLower = searchTerm.toLowerCase();
            
            // Chỉ tìm kiếm ứng dụng có tên BẮT ĐẦU bằng từ khóa tìm kiếm
            return appName.startsWith(searchTermLower);
        });

        if (filteredApps.length === 0) {
            this.searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Không tìm thấy ứng dụng nào bắt đầu bằng "${searchTerm}"</p>
                </div>
            `;
        } else {
            this.displayApps(filteredApps, this.searchResults);
        }
    }

    renderApps() {
        let filteredApps = this.filterApps();
        this.updateSectionTitle();
        this.displayApps(filteredApps, this.appsGrid);
        
        if (this.currentView === 'home' && this.currentCategory === 'all' && !this.searchTerm) {
            this.gamesSection.style.display = 'block';
            const games = this.allApps.filter(app => 
                app.categories && app.categories.includes('game')
            );
            this.displayApps(games, this.gamesGrid);
        } else {
            this.gamesSection.style.display = 'none';
            this.gamesGrid.innerHTML = '';
        }
    }

    filterApps() {
        let filteredApps = this.allApps;
        
        switch(this.currentView) {
            case 'today':
                const today = new Date().toLocaleDateString('vi-VN');
                filteredApps = this.allApps.filter(app => {
                    if (!app.updatedate) return false;
                    const appDate = new Date(app.updatedate).toLocaleDateString('vi-VN');
                    return appDate === today;
                });
                break;
            case 'games':
                filteredApps = this.allApps.filter(app => 
                    app.categories && app.categories.includes('game')
                );
                break;
            case 'home':
            default:
                if (this.currentCategory !== 'all') {
                    filteredApps = this.allApps.filter(app => 
                        app.categories && app.categories.includes(this.currentCategory)
                    );
                }
                break;
        }
        
        // TÌM KIẾM CHÍNH XÁC TỪ ĐẦU TÊN ỨNG DỤNG
        if (this.searchTerm) {
            filteredApps = filteredApps.filter(app => {
                const appName = app.name.toLowerCase();
                const searchTermLower = this.searchTerm.toLowerCase();
                
                // Chỉ tìm kiếm ứng dụng có tên BẮT ĐẦU bằng từ khóa tìm kiếm
                return appName.startsWith(searchTermLower);
            });
        }
        
        filteredApps.sort((a, b) => {
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            return idB - idA;
        });
        
        return filteredApps;
    }

    updateSectionTitle() {
        let title = 'Ứng dụng mới';
        
        if (this.searchTerm) {
            title = `Kết quả tìm kiếm: "${this.searchTerm}"`;
        } else if (this.currentView === 'today') {
            title = 'Ứng dụng hôm nay';
        } else if (this.currentView === 'games') {
            title = 'Trò chơi';
        } else if (this.currentCategory !== 'all') {
            title = CONFIG.CATEGORY_LABELS[this.currentCategory] || this.currentCategory;
        }
        
        this.sectionTitle.textContent = title;
    }

    displayApps(apps, container) {
        container.innerHTML = '';
        
        if (apps.length === 0) {
            let message = 'Không có ứng dụng nào.';
            
            if (this.searchTerm) {
                message = `Không tìm thấy ứng dụng nào bắt đầu bằng "${this.searchTerm}"`;
            } else if (this.currentView === 'today') {
                const today = new Date().toLocaleDateString('vi-VN');
                message = `Không có ứng dụng nào được đăng vào ${today}`;
            }
            
            AppUtils.showNoResults(container, message);
            return;
        }
        
        apps.forEach(app => {
            const appCard = this.createAppCard(app);
            container.appendChild(appCard);
        });
    }

    createAppCard(app) {
        const appCard = document.createElement('div');
        appCard.className = 'app-card';
        
        const tagsHTML = AppUtils.createTagsHTML(app.categories);
        const formattedDate = AppUtils.formatDate(app.updatedate);
        const descriptionHTML = AppUtils.createShortDescriptionHTML(app.description);
        
        appCard.innerHTML = `
            <!-- ẢNH ứng dụng có thể click -->
            <img src="${app.image}" alt="${app.name}" class="app-logo" 
                 loading="lazy"
                 onclick="window.open('app-detail.html?id=${app.id}', '_self')"
                 onerror="this.src='https://via.placeholder.com/70/2563eb/FFFFFF?text=App'">
            <div class="app-content">
                <div class="app-header">
                    <div class="app-info">
                        <!-- TÊN ứng dụng có thể click -->
                        <div class="app-name" onclick="window.open('app-detail.html?id=${app.id}', '_self')">
                            ${app.name}
                        </div>
                        <div class="app-tags">${tagsHTML}</div>
                        <div class="app-meta">
                            <div class="app-meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${formattedDate}</span>
                            </div>
                        </div>
                    </div>
                    <div class="app-actions">
                        <!-- Nút "NHẬN" với CSS mới (chỉ có chữ NHẬN) -->
                        <button class="index-download-btn" onclick="window.open('app-detail.html?id=${app.id}', '_self')">
                            NHẬN
                        </button>
                    </div>
                </div>
                ${descriptionHTML}
            </div>
        `;
        
        return appCard;
    }

    // ===== FEATURED APPS LOGIC =====

    loadFeaturedApps() {
        if (this.allApps.length === 0) return;
        
        // Get 20 newest apps (sort by id descending)
        const newestApps = [...this.allApps]
            .sort((a, b) => {
                const idA = parseInt(a.id) || 0;
                const idB = parseInt(b.id) || 0;
                return idB - idA;
            })
            .slice(0, 20);
        
        // Get 5 random apps from the 20 newest
        this.featuredApps = this.getRandomApps(newestApps, 5);
        
        this.displayFeaturedApps();
        this.initFeaturedCarousel();
    }

    getRandomApps(apps, count) {
        const shuffled = [...apps].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    getBadgeType(index) {
        const badgeTypes = ['premium', 'hot', 'new', 'trending', 'vip'];
        const badgeLabels = ['PREMIUM', 'HOT', 'NEW', 'TRENDING', 'VIP'];
        return {
            type: badgeTypes[index % badgeTypes.length],
            label: badgeLabels[index % badgeLabels.length]
        };
    }

    getRandomRating() {
        // Random rating từ 4.0 đến 5.0
        const ratings = [4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0];
        return ratings[Math.floor(Math.random() * ratings.length)];
    }

    createFeaturedCard(app, index) {
        const card = document.createElement('div');
        card.className = 'featured-card';
        
        // Get badge type based on index
        const badge = this.getBadgeType(index);
        
        // Get first line of description
        const firstLineDescription = app.description ? 
            app.description.split('\n')[0] || app.description : 
            'Mô tả ứng dụng...';
        
        // Get random rating
        const rating = this.getRandomRating();
        
        card.innerHTML = `
            <!-- Background Image -->
            <img src="https://i.imgur.com/PwYQMpr.gif" alt="Background" class="featured-background">
            
            <!-- Gradient Overlay -->
            <div class="featured-overlay"></div>
            
            <!-- Badge -->
            <div class="featured-badge badge-${badge.type}">
                ${badge.label}
            </div>
            
            <!-- Content -->
            <div class="featured-content">
                <!-- Logo -->
                <div class="featured-logo-container">
                    <img src="${app.image || 'https://via.placeholder.com/46/2563eb/FFFFFF?text=App'}" 
                         alt="${app.name}" 
                         class="featured-logo"
                         onerror="this.src='https://via.placeholder.com/46/2563eb/FFFFFF?text=App'">
                </div>
                
                <!-- Text Content -->
                <div class="featured-text-content">
                    <div class="featured-name">${app.name}</div>
                    <div class="featured-description">${firstLineDescription}</div>
                    <div class="featured-rating">
                        <i class="fas fa-star"></i>
                        <span>${rating}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add click event for the whole card
        card.addEventListener('click', (e) => {
            window.open(`app-detail.html?id=${app.id}`, '_self');
        });
        
        return card;
    }

    displayFeaturedApps() {
        if (this.featuredApps.length === 0) return;
        
        this.featuredLoading.style.display = 'none';
        
        this.featuredApps.forEach((app, index) => {
            const card = this.createFeaturedCard(app, index);
            this.featuredCarousel.appendChild(card);
        });
    }

    initFeaturedCarousel() {
        const container = this.featuredCarousel;
        const dots = document.querySelectorAll('.carousel-dot');
        const prevArrow = document.querySelector('.nav-arrow.prev');
        const nextArrow = document.querySelector('.nav-arrow.next');
        
        if (!container || this.featuredApps.length === 0) return;
        
        // Update arrows visibility
        const updateArrows = () => {
            const scrollLeft = container.scrollLeft;
            const maxScroll = container.scrollWidth - container.clientWidth;
            
            if (prevArrow) {
                prevArrow.style.display = scrollLeft > 0 ? 'flex' : 'none';
            }
            if (nextArrow) {
                nextArrow.style.display = scrollLeft < maxScroll - 10 ? 'flex' : 'none';
            }
        };
        
        // Update dots based on scroll position
        const updateDots = () => {
            const scrollLeft = container.scrollLeft;
            const cardWidth = 320 + 12; // card width + gap
            const currentIndex = Math.min(Math.round(scrollLeft / cardWidth), dots.length - 1);
            
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentIndex);
            });
        };
        
        // Scroll to specific index
        const scrollToIndex = (index) => {
            const cardWidth = 320 + 12;
            container.scrollTo({
                left: index * cardWidth,
                behavior: 'smooth'
            });
        };
        
        // Add event listeners
        container.addEventListener('scroll', () => {
            updateArrows();
            updateDots();
        });
        
        // Dot click events
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.index);
                scrollToIndex(index);
            });
        });
        
        // Initial update
        updateArrows();
        
        // Auto rotate every 5 seconds
        this.startAutoRotate();
    }

    scrollFeaturedCarousel(amount) {
        const container = this.featuredCarousel;
        if (container) {
            container.scrollBy({
                left: amount,
                behavior: 'smooth'
            });
        }
    }

    scrollFeaturedCarouselToIndex(index) {
        const container = this.featuredCarousel;
        if (container) {
            const cardWidth = 320 + 12;
            container.scrollTo({
                left: index * cardWidth,
                behavior: 'smooth'
            });
        }
    }

    startAutoRotate() {
        // Auto rotate every 5 seconds
        setInterval(() => {
            const dots = document.querySelectorAll('.carousel-dot');
            const activeIndex = Array.from(dots).findIndex(dot => dot.classList.contains('active'));
            const nextIndex = (activeIndex + 1) % dots.length;
            
            if (dots[nextIndex]) {
                dots[nextIndex].click();
            }
        }, 5000);
    }
}

// Khởi tạo ứng dụng khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    window.appManager = new AppManager();
});