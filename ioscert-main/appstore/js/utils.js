// Utility functions
class AppUtils {
    // Kiểm tra cache có hợp lệ không
    static isCacheValid() {
        const timestamp = localStorage.getItem(CONFIG.CACHE_TIMESTAMP_KEY);
        if (!timestamp) return false;
        
        const now = Date.now();
        const cacheTime = parseInt(timestamp);
        return (now - cacheTime) < CONFIG.CACHE_DURATION;
    }

    // Lấy dữ liệu từ cache
    static getFromCache() {
        try {
            const cached = localStorage.getItem(CONFIG.CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            console.error('Lỗi khi đọc cache:', e);
            return null;
        }
    }

    // Lưu dữ liệu vào cache
    static saveToCache(data) {
        try {
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (e) {
            console.error('Lỗi khi lưu cache:', e);
        }
    }

    // Hiển thị skeleton loading
    static showSkeletonLoading(container, count = 6) {
        let skeletonHTML = '';
        for (let i = 0; i < count; i++) {
            skeletonHTML += `
                <div class="app-card skeleton-app-card">
                    <div class="skeleton skeleton-logo"></div>
                    <div class="app-content skeleton-content">
                        <div class="app-header">
                            <div class="app-info">
                                <div class="skeleton skeleton-title"></div>
                                <div class="app-tags skeleton-tags">
                                    <div class="skeleton skeleton-tag"></div>
                                    <div class="skeleton skeleton-tag"></div>
                                </div>
                                <div class="app-meta">
                                    <div class="skeleton skeleton-meta"></div>
                                </div>
                            </div>
                            <div class="app-actions">
                                <div class="skeleton download-btn" style="width: 70px; height: 28px; border-radius: 8px;"></div>
                            </div>
                        </div>
                        <div class="skeleton skeleton-description"></div>
                        <div class="skeleton skeleton-description short"></div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = skeletonHTML;
    }

    // Hiển thị loading
    static showLoading(container) {
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Đang tải ứng dụng...</p>
            </div>
        `;
    }

    // Hiển thị không có kết quả
    static showNoResults(container, message = 'Không tìm thấy ứng dụng nào.') {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>${message}</p>
            </div>
        `;
    }

    // Format date to DD/MM/YYYY
    static formatDate(dateString) {
        if (!dateString) return 'Chưa cập nhật';
        
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('vi-VN');
        } else {
            return dateString;
        }
    }

    // Tạo HTML cho tags
    static createTagsHTML(categories) {
        let categoriesArray = [];
        if (typeof categories === 'string') {
            categoriesArray = categories.split(',');
        } else if (Array.isArray(categories)) {
            categoriesArray = categories;
        }
        
        return categoriesArray.map(cat => 
            `<span class="app-tag">${CONFIG.CATEGORY_LABELS[cat] || cat}</span>`
        ).join('');
    }

    // HÀM MỚI: Tạo mô tả ngắn chỉ hiển thị 2 dòng đầu (đã xoá phần "Xem thêm")
    static createShortDescriptionHTML(description) {
        if (!description) {
            return '<div class="app-description-check">Mô tả ứng dụng...</div>';
        }

        const descriptionLines = description.split('\n').filter(line => line.trim());
        const shortDescriptionLines = descriptionLines.slice(0, 2); // Chỉ lấy 2 dòng đầu
        
        let descriptionHTML = '<div class="app-description-check">';
        shortDescriptionLines.forEach(line => {
            if (line.trim()) {
                descriptionHTML += `
                    <div class="description-item">
                        <div class="check-icon-container">
                            <i class="fas fa-check"></i>
                        </div>
                        <span class="description-text">${line.trim()}</span>
                    </div>
                `;
            }
        });
        
        descriptionHTML += '</div>';
        return descriptionHTML;
    }

    // HÀM MỚI: Tạo mô tả đầy đủ (cho trang chi tiết)
    static createFullDescriptionHTML(description) {
        if (!description) {
            return '<div class="app-description-check">Ứng dụng chưa có mô tả chi tiết.</div>';
        }

        const descriptionLines = description.split('\n').filter(line => line.trim());
        
        let descriptionHTML = '<div class="app-description-check">';
        descriptionLines.forEach(line => {
            if (line.trim()) {
                descriptionHTML += `
                    <div class="description-item">
                        <div class="check-icon-container">
                            <i class="fas fa-check"></i>
                        </div>
                        <span class="description-text">${line.trim()}</span>
                    </div>
                `;
            }
        });
        descriptionHTML += '</div>';
        return descriptionHTML;
    }
}
