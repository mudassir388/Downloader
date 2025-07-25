// Global state
let allResources = [];
let filteredResources = [];
let currentPage = 1;
const resourcesPerPage = 12;
let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'newest';
let currentView = 'grid';

// DOM elements
const searchInput = document.getElementById('search-input');
const categoryButtons = document.querySelectorAll('.filter-btn');
const viewButtons = document.querySelectorAll('.view-btn');
const sortSelect = document.getElementById('sort-select');
const resourcesGrid = document.getElementById('resources-grid');
const featuredResourcesGrid = document.getElementById('featured-resources');
const loadMoreBtn = document.getElementById('load-more-btn');
const loading = document.getElementById('loading');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadResources();
    await loadStatistics();
    setupEventListeners();
    setupSmoothScrolling();
    updateHeroStats();
});

// Load resources from API
async function loadResources() {
    showLoading();
    try {
        const response = await fetch('/api/resources');
        if (!response.ok) throw new Error('Failed to load resources');
        
        allResources = await response.json();
        filteredResources = [...allResources];
        
        renderFeaturedResources();
        renderResources();
        
    } catch (error) {
        console.error('Error loading resources:', error);
        showError('Failed to load resources. Please try again.');
    } finally {
        hideLoading();
    }
}

// Load statistics from API
async function loadStatistics() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Failed to load statistics');
        
        const stats = await response.json();
        updateStatistics(stats);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Category filters
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => handleCategoryFilter(btn));
    });
    
    // View toggle
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => handleViewToggle(btn));
    });
    
    // Sort functionality
    sortSelect.addEventListener('change', handleSort);
    
    // Load more functionality
    loadMoreBtn.addEventListener('click', loadMoreResources);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href');
            scrollToSection(target.substring(1));
        });
    });
    
    // Mobile navigation toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
}

// Handle search functionality
function handleSearch(e) {
    currentSearch = e.target.value.toLowerCase();
    currentPage = 1;
    filterAndRenderResources();
}

// Handle category filtering
function handleCategoryFilter(clickedBtn) {
    // Update button states
    categoryButtons.forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');
    
    currentCategory = clickedBtn.dataset.category;
    currentPage = 1;
    filterAndRenderResources();
}

// Handle view toggle
function handleViewToggle(clickedBtn) {
    // Update button states
    viewButtons.forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');
    
    currentView = clickedBtn.dataset.view;
    resourcesGrid.className = `resources-grid ${currentView === 'list' ? 'list-view' : ''}`;
}

// Handle sorting
function handleSort(e) {
    currentSort = e.target.value;
    currentPage = 1;
    filterAndRenderResources();
}

// Filter and render resources based on current state
function filterAndRenderResources() {
    // Filter by category
    let filtered = currentCategory === 'all' 
        ? [...allResources] 
        : allResources.filter(resource => resource.category === currentCategory);
    
    // Filter by search term
    if (currentSearch) {
        filtered = filtered.filter(resource => 
            resource.title.toLowerCase().includes(currentSearch) ||
            resource.description.toLowerCase().includes(currentSearch) ||
            resource.tags.some(tag => tag.toLowerCase().includes(currentSearch)) ||
            (resource.authors && resource.authors.some(author => 
                author.toLowerCase().includes(currentSearch)
            ))
        );
    }
    
    // Sort resources
    filtered = sortResources(filtered, currentSort);
    
    filteredResources = filtered;
    renderResources();
}

// Sort resources based on criteria
function sortResources(resources, sortBy) {
    switch (sortBy) {
        case 'newest':
            return resources.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        case 'oldest':
            return resources.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
        case 'citations':
            return resources.sort((a, b) => (b.citations || 0) - (a.citations || 0));
        case 'stars':
            return resources.sort((a, b) => (b.githubStars || 0) - (a.githubStars || 0));
        case 'title':
            return resources.sort((a, b) => a.title.localeCompare(b.title));
        default:
            return resources;
    }
}

// Render featured resources
function renderFeaturedResources() {
    const featured = allResources.filter(resource => resource.featured);
    featuredResourcesGrid.innerHTML = featured.map(resource => 
        createResourceCard(resource, true)
    ).join('');
}

// Render resources with pagination
function renderResources() {
    const startIndex = 0;
    const endIndex = currentPage * resourcesPerPage;
    const resourcesToShow = filteredResources.slice(startIndex, endIndex);
    
    if (currentPage === 1) {
        resourcesGrid.innerHTML = '';
    }
    
    resourcesGrid.innerHTML = resourcesToShow.map(resource => 
        createResourceCard(resource)
    ).join('');
    
    // Show/hide load more button
    if (endIndex >= filteredResources.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
}

// Load more resources
function loadMoreResources() {
    currentPage++;
    const startIndex = (currentPage - 1) * resourcesPerPage;
    const endIndex = currentPage * resourcesPerPage;
    const resourcesToShow = filteredResources.slice(startIndex, endIndex);
    
    const newCards = resourcesToShow.map(resource => 
        createResourceCard(resource)
    ).join('');
    
    resourcesGrid.innerHTML += newCards;
    
    // Hide load more button if no more resources
    if (endIndex >= filteredResources.length) {
        loadMoreBtn.style.display = 'none';
    }
}

// Create resource card HTML
function createResourceCard(resource, isFeatured = false) {
    const iconClass = getIconClass(resource.category);
    const year = resource.year ? `${resource.year}` : 'N/A';
    const authors = resource.authors ? resource.authors.slice(0, 3).join(', ') : 'Unknown';
    const citations = resource.citations ? formatNumber(resource.citations) : '';
    const stars = resource.githubStars ? formatNumber(resource.githubStars) : '';
    
    return `
        <div class="resource-card ${isFeatured ? 'featured' : ''}">
            <div class="resource-header">
                <div class="resource-icon ${resource.category}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="resource-info">
                    <h3 class="resource-title">${resource.title}</h3>
                    ${resource.authors ? `<p class="resource-authors">by ${authors}${resource.authors.length > 3 ? ' et al.' : ''}</p>` : ''}
                </div>
            </div>
            <p class="resource-description">${resource.description}</p>
            <div class="resource-meta">
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>${year}</span>
                </div>
                ${citations ? `
                    <div class="meta-item">
                        <i class="fas fa-quote-right"></i>
                        <span>${citations} citations</span>
                    </div>
                ` : ''}
                ${stars ? `
                    <div class="meta-item">
                        <i class="fas fa-star"></i>
                        <span>${stars} stars</span>
                    </div>
                ` : ''}
            </div>
            <div class="resource-tags">
                ${resource.tags.slice(0, 4).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="resource-actions">
                <a href="${resource.url}" target="_blank" rel="noopener noreferrer" class="action-btn">
                    <i class="fas fa-external-link-alt"></i>
                    View
                </a>
                <button class="action-btn" onclick="shareResource('${resource.title}', '${resource.url}')">
                    <i class="fas fa-share"></i>
                    Share
                </button>
                <button class="action-btn" onclick="bookmarkResource(${resource.id})">
                    <i class="fas fa-bookmark"></i>
                    Save
                </button>
            </div>
        </div>
    `;
}

// Get icon class for category
function getIconClass(category) {
    const iconMap = {
        'papers': 'fas fa-file-alt',
        'frameworks': 'fas fa-code',
        'datasets': 'fas fa-database',
        'tools': 'fas fa-tools'
    };
    return iconMap[category] || 'fas fa-cube';
}

// Update statistics display
function updateStatistics(stats) {
    document.getElementById('papers-count').textContent = stats.categoryCounts.papers || 0;
    document.getElementById('frameworks-count').textContent = stats.categoryCounts.frameworks || 0;
    document.getElementById('datasets-count').textContent = stats.categoryCounts.datasets || 0;
    document.getElementById('tools-count').textContent = stats.categoryCounts.tools || 0;
}

// Update hero statistics
function updateHeroStats() {
    if (allResources.length > 0) {
        document.getElementById('total-resources').textContent = allResources.length;
        const categories = [...new Set(allResources.map(r => r.category))];
        document.getElementById('total-categories').textContent = categories.length;
        
        const recentCount = allResources.filter(r => {
            const addedDate = new Date(r.dateAdded);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return addedDate > thirtyDaysAgo;
        }).length;
        document.getElementById('recently-added').textContent = recentCount;
    }
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    loading.classList.add('show');
}

function hideLoading() {
    loading.classList.remove('show');
}

function showError(message) {
    // Simple error display - could be enhanced with a proper toast system
    console.error(message);
    alert(message);
}

// Setup smooth scrolling
function setupSmoothScrolling() {
    // Update active nav link based on scroll position
    window.addEventListener('scroll', () => {
        const sections = ['home', 'explore', 'stats', 'about'];
        let currentSection = 'home';
        
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                const rect = element.getBoundingClientRect();
                if (rect.top <= 100 && rect.bottom >= 100) {
                    currentSection = section;
                }
            }
        });
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    });
}

// Scroll to section function
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        const navHeight = document.querySelector('.navbar').offsetHeight;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navHeight;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

// Share resource function
function shareResource(title, url) {
    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        }).catch(console.error);
    } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('Resource URL copied to clipboard!');
        }).catch(() => {
            alert(`Share this resource: ${url}`);
        });
    }
}

// Bookmark resource function
function bookmarkResource(resourceId) {
    // Simple bookmark functionality - could be enhanced with local storage or user accounts
    const bookmarks = JSON.parse(localStorage.getItem('awesomeDLBookmarks') || '[]');
    
    if (bookmarks.includes(resourceId)) {
        // Remove bookmark
        const index = bookmarks.indexOf(resourceId);
        bookmarks.splice(index, 1);
        alert('Resource removed from bookmarks!');
    } else {
        // Add bookmark
        bookmarks.push(resourceId);
        alert('Resource bookmarked!');
    }
    
    localStorage.setItem('awesomeDLBookmarks', JSON.stringify(bookmarks));
}

// Filter by category function (for footer links)
function filterByCategory(category) {
    // Update active filter button
    categoryButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    currentCategory = category;
    currentPage = 1;
    filterAndRenderResources();
    
    // Scroll to explore section
    scrollToSection('explore');
}

// Open GitHub function
function openGitHub() {
    window.open('https://github.com', '_blank');
}

// Export functions for global access
window.scrollToSection = scrollToSection;
window.filterByCategory = filterByCategory;
window.shareResource = shareResource;
window.bookmarkResource = bookmarkResource;
window.openGitHub = openGitHub;