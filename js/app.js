// Main application logic
class AppManager {
    constructor() {
        this.currentCategory = 'all';
        this.currentView = 'home';
        this.allApps = [];
        this.searchTerm = '';
        this.featuredApps = [];
        this.currentSlideIndex = 0;
        this.autoSlideInterval = null;
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.touchStartX = 0;
        
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
        this.carouselContainer = document.querySelector('.carousel-container');
        this.carouselDots = document.querySelectorAll('.carousel-dot');
        this.prevArrow = document.querySelector('.nav-arrow.prev');
        this.nextArrow = document.querySelector('.nav-arrow.next');
    }

    bindEvents() {
        // Search events
        this.searchInput.addEventListener('input', (e) => {
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
    }

    bindFeaturedCarouselEvents() {
        if (this.prevArrow) {
            this.prevArrow.addEventListener('click', () => {
                this.slideToPrevious();
            });
        }

        if (this.nextArrow) {
            this.nextArrow.addEventListener('click', () => {
                this.slideToNext();
            });
        }

        this.carouselDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.index);
                this.slideToIndex(index);
            });
        });

        // Touch/swipe events for mobile
        this.setupTouchEvents();
        
        // Mouse drag events
        this.setupDragEvents();
    }

    setupTouchEvents() {
        if (!this.carouselContainer) return;
        
        this.carouselContainer.addEventListener('touchstart', (e) => {
            if (this.isScrolling) return;
            
            this.touchStartX = e.touches[0].clientX;
            this.stopAutoSlide();
        }, { passive: true });

        this.carouselContainer.addEventListener('touchend', (e) => {
            if (!this.touchStartX) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const diffX = this.touchStartX - touchEndX;
            
            // Swipe threshold
            if (Math.abs(diffX) > 40) {
                if (diffX > 0) {
                    this.slideToNext();
                } else {
                    this.slideToPrevious();
                }
            }
            
            this.touchStartX = 0;
            this.startAutoSlide();
        }, { passive: true });
    }

    setupDragEvents() {
        if (!this.carouselContainer) return;
        
        let isDragging = false;
        let startX = 0;
        let scrollLeft = 0;

        this.carouselContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.carouselContainer.style.cursor = 'grabbing';
            startX = e.pageX - this.carouselContainer.offsetLeft;
            scrollLeft = this.carouselContainer.scrollLeft;
            this.stopAutoSlide();
        });

        this.carouselContainer.addEventListener('mouseleave', () => {
            isDragging = false;
            this.carouselContainer.style.cursor = 'grab';
        });

        this.carouselContainer.addEventListener('mouseup', () => {
            isDragging = false;
            this.carouselContainer.style.cursor = 'grab';
            this.startAutoSlide();
        });

        this.carouselContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const x = e.pageX - this.carouselContainer.offsetLeft;
            const walk = (x - startX) * 1.5;
            this.carouselContainer.scrollLeft = scrollLeft - walk;
        });
    }

    init() {
        this.loadAppsFromSheets();
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

        const filteredApps = this.allApps.filter(app => 
            app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (filteredApps.length === 0) {
            this.searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Không tìm thấy ứng dụng nào với từ khóa "${searchTerm}"</p>
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
        
        if (this.searchTerm) {
            filteredApps = filteredApps.filter(app => 
                app.name.toLowerCase().includes(this.searchTerm) ||
                (app.description && app.description.toLowerCase().includes(this.searchTerm))
            );
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
                message = `Không tìm thấy ứng dụng nào với từ khóa "${this.searchTerm}"`;
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
            <img src="${app.image}" alt="${app.name}" class="app-logo" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/70/2563eb/FFFFFF?text=App'">
            <div class="app-content">
                <div class="app-header">
                    <div class="app-info">
                        <div class="app-name">${app.name}</div>
                        <div class="app-tags">${tagsHTML}</div>
                        <div class="app-meta">
                            <div class="app-meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${formattedDate}</span>
                            </div>
                        </div>
                    </div>
                    <div class="app-actions">
                        <button class="download-btn" onclick="window.location.href='app-detail.html?id=${app.id}'">
                            <i class="fas fa-download"></i>
                            Tải về
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
        this.startAutoSlide();
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

    createFeaturedCard(app, index) {
        const card = document.createElement('div');
        card.className = 'featured-card';
        
        // Get badge type based on index
        const badge = this.getBadgeType(index);
        
        // Get first line of description
        const firstLineDescription = app.description ? 
            app.description.split('\n')[0] || app.description : 
            'Mô tả ứng dụng...';
        
        // Format date
        const formattedDate = AppUtils.formatDate(app.updatedate);
        
        // Get category label
        const categories = typeof app.categories === 'string' ? 
            app.categories.split(',') : 
            (app.categories || []);
        const mainCategory = categories[0] || 'other';
        
        card.innerHTML = `
            <div class="featured-badge badge-${badge.type}">
                ${badge.label}
            </div>
            <img src="${app.image || 'https://via.placeholder.com/160x90/2563eb/FFFFFF?text=App'}" 
                 alt="${app.name}" 
                 class="featured-image"
                 onerror="this.src='https://via.placeholder.com/160x90/2563eb/FFFFFF?text=App'">
            <div class="featured-content">
                <div class="featured-header">
                    <img src="${app.image || 'https://via.placeholder.com/44/2563eb/FFFFFF?text=App'}" 
                         alt="${app.name}" 
                         class="featured-app-icon"
                         onerror="this.src='https://via.placeholder.com/44/2563eb/FFFFFF?text=App'">
                    <div class="featured-info">
                        <div class="featured-name">${app.name}</div>
                        <div class="featured-category">${CONFIG.CATEGORY_LABELS[mainCategory] || mainCategory}</div>
                    </div>
                </div>
                <div class="featured-description">
                    ${firstLineDescription}
                </div>
                <div class="featured-meta">
                    <div class="featured-date">
                        <i class="fas fa-calendar-alt"></i>
                        ${formattedDate}
                    </div>
                    <button class="featured-action" onclick="window.open('app-detail.html?id=${app.id}', '_self')">
                        <i class="fas fa-eye"></i>
                        Chi tiết
                    </button>
                </div>
            </div>
        `;
        
        // Add click event for the whole card
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.featured-action')) {
                window.open(`app-detail.html?id=${app.id}`, '_self');
            }
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
        if (!this.carouselContainer || this.featuredApps.length === 0) return;
        
        // Update arrows visibility
        const updateArrows = () => {
            if (!this.prevArrow || !this.nextArrow) return;
            
            const scrollLeft = this.carouselContainer.scrollLeft;
            const maxScroll = this.carouselContainer.scrollWidth - this.carouselContainer.clientWidth;
            
            this.prevArrow.style.display = scrollLeft > 0 ? 'flex' : 'none';
            this.nextArrow.style.display = scrollLeft < maxScroll - 10 ? 'flex' : 'none';
        };
        
        // Update dots based on scroll position
        const updateDots = () => {
            if (this.isScrolling) return;
            
            const scrollLeft = this.carouselContainer.scrollLeft;
            const cardWidth = 160 + 12; // card width + gap
            this.currentSlideIndex = Math.min(Math.round(scrollLeft / cardWidth), 4);
            
            this.carouselDots.forEach((dot, index) => {
                dot.classList.toggle('active', index === this.currentSlideIndex);
            });
        };
        
        // Debounced scroll event for smooth updates
        this.carouselContainer.addEventListener('scroll', () => {
            updateArrows();
            
            // Debounce dot updates during smooth scroll
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                updateDots();
                this.isScrolling = false;
            }, 100);
        });
        
        // Initial update
        updateArrows();
        updateDots();
        
        // Set initial cursor
        this.carouselContainer.style.cursor = 'grab';
    }

    // ===== SMOOTH SLIDE METHODS =====

    slideToIndex(index) {
        if (this.isScrolling || index < 0 || index > 4) return;
        
        this.isScrolling = true;
        this.stopAutoSlide();
        
        const cardWidth = 160 + 12;
        const targetScroll = index * cardWidth;
        
        // Smooth scroll với requestAnimationFrame cho mượt nhất
        const startScroll = this.carouselContainer.scrollLeft;
        const distance = targetScroll - startScroll;
        const duration = 400; // ms
        let startTime = null;
        
        const animateScroll = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            // Easing function for smooth acceleration/deceleration
            const ease = progress < 0.5 
                ? 2 * progress * progress 
                : -1 + (4 - 2 * progress) * progress;
            
            this.carouselContainer.scrollLeft = startScroll + (distance * ease);
            
            if (timeElapsed < duration) {
                requestAnimationFrame(animateScroll);
            } else {
                this.isScrolling = false;
                this.currentSlideIndex = index;
                
                // Update dots
                this.carouselDots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
                
                this.startAutoSlide();
            }
        };
        
        requestAnimationFrame(animateScroll);
    }

    slideToNext() {
        const nextIndex = (this.currentSlideIndex + 1) % 5;
        this.slideToIndex(nextIndex);
    }

    slideToPrevious() {
        const prevIndex = this.currentSlideIndex === 0 ? 4 : this.currentSlideIndex - 1;
        this.slideToIndex(prevIndex);
    }

    startAutoSlide() {
        // Clear any existing interval
        this.stopAutoSlide();
        
        // Don't auto slide if user is interacting
        if (this.isScrolling) return;
        
        // Auto slide every 5 seconds
        this.autoSlideInterval = setInterval(() => {
            if (!this.isScrolling && document.visibilityState === 'visible') {
                this.slideToNext();
            }
        }, 5000);
    }

    stopAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
    }
}

// Khởi tạo ứng dụng khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    window.appManager = new AppManager();
});
