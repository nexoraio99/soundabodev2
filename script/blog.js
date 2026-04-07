/*  BLOG FRONTEND CONTROLLER  */

document.addEventListener('DOMContentLoaded', () => {
    // Backend configuration
    const BACKEND_BASE = window.SOUNDABODE_BACKEND_URL || 'https://soundabodev2-server.onrender.com';
    const socket = typeof io !== 'undefined' ? io(BACKEND_BASE) : null;
    const blogFeed = document.getElementById('main-blog-feed');
    const featuredFeed = document.getElementById('featured-posts');
    const latestSidebarFeed = document.getElementById('latest-sidebar-posts');
    const blogSearch = document.getElementById('blog-search');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    // Modal elements
    const blogModal = document.getElementById('blog-modal');
    const modalBody = document.getElementById('modal-article-body');
    const modalClose = blogModal.querySelector('.modal-close');
    const modalBackdrop = blogModal.querySelector('.modal-backdrop');

    let allBlogs = [];
    let displayedCount = 6;
    let filteredBlogs = [];

    //  FETCH BLOGS 
    async function fetchBlogs() {
        try {
            const res = await fetch(`${BACKEND_BASE}/api/blogs?t=${Date.now()}`);
            const blogs = await res.json();
            allBlogs = blogs;
            filteredBlogs = [...allBlogs];
            renderAll();
        } catch (err) {
            console.error('Failed to fetch blogs:', err);
            blogFeed.innerHTML = '<p class="error-text">Oops! Failed to connect to our pulse. Try again later.</p>';
        }
    }

    //  RENDER LOGIC 
    function renderAll() {
        // Clear containers
        blogFeed.innerHTML = '';
        featuredFeed.innerHTML = '';
        latestSidebarFeed.innerHTML = '';

        // 1. Sidebar - Featured (Ranked by SEO content or random top 3)
        const featured = allBlogs.filter(b => b.metaTitle).slice(0, 3);
        if (featured.length === 0) featured.push(...allBlogs.slice(0, 3));
        featured.forEach(blog => {
            featuredFeed.innerHTML += createMiniHTML(blog);
        });

        // 2. Sidebar - Latest (Top 3)
        const latest = allBlogs.slice(0, 3);
        latest.forEach(blog => {
            latestSidebarFeed.innerHTML += createMiniHTML(blog);
        });

        // 3. Main Feed
        const toDisplay = filteredBlogs.slice(0, displayedCount);
        if (toDisplay.length === 0) {
            blogFeed.innerHTML = '<div class="empty-state">No matching articles found.</div>';
        } else {
            toDisplay.forEach(blog => {
                blogFeed.innerHTML += createBlogHTML(blog);
            });
        }

        // Handle Load More visibility
        if (displayedCount >= filteredBlogs.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
    }

    function createBlogHTML(blog) {
        const placeholder = 'https://res.cloudinary.com/di5bqvkma/image/upload/v1731233576/dj-performance-training.jpg';
        const img = blog.imageUrl || placeholder;
        
        return `
            <article class="article-card" onclick="openBlog('${blog.id}')">
                <div class="card-image-wrap">
                    <img src="${img}" alt="${blog.heading}" loading="lazy">
                    <span class="card-badge">${blog.category || 'General'}</span>
                </div>
                <div class="card-overlay-content">
                    <h3 class="card-title">${blog.heading}</h3>
                    <p class="card-excerpt">${blog.subheading || ''}</p>
                </div>
            </article>
        `;
    }

    function createMiniHTML(blog) {
        const placeholder = 'https://res.cloudinary.com/di5bqvkma/image/upload/v1731233576/dj-performance-training.jpg';
        const img = blog.imageUrl || placeholder;
        return `
            <article class="mini-list-item" onclick="openBlog('${blog.id}')">
                <img src="${img}" class="mini-thumb" alt="${blog.heading}" loading="lazy">
                <div class="mini-content">
                    <span class="mini-date">${blog.date}</span>
                    <h4 class="mini-title">${blog.heading}</h4>
                </div>
            </article>
        `;
    }

    //  SEARCH LOGIC 
    if (blogSearch) {
        blogSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filteredBlogs = allBlogs.filter(blog => 
                blog.heading.toLowerCase().includes(query) || 
                (blog.subheading && blog.subheading.toLowerCase().includes(query)) ||
                (blog.content && blog.content.toLowerCase().includes(query))
            );
            displayedCount = 6;
            renderAll();
        });
    }

    //  LOAD MORE 
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            displayedCount += 6;
            renderAll();
        });
    }

    //  FULL BLOG MODAL LOGIC 
    window.openBlog = function(id) {
        const blog = allBlogs.find(b => b.id === id);
        if (!blog) return;

        const placeholder = 'https://res.cloudinary.com/di5bqvkma/image/upload/v1731233576/dj-performance-training.jpg';
        const img = blog.imageUrl || placeholder;

        // Populate modal
        modalBody.innerHTML = `
            <header class="modal-header">
                <span class="card-badge">${blog.category || 'General'}</span>
                <h1 class="modal-title">${blog.heading}</h1>
                <div class="modal-meta">
                    <span class="author">By ${blog.author || 'Soundabode'}</span>
                    <span class="dot">·</span>
                    <span class="date">${blog.date}</span>
                </div>
            </header>
            <div class="modal-hero-img">
                <img src="${img}" alt="${blog.heading}">
            </div>
            <div class="modal-text-content">
                ${blog.content.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}
            </div>
        `;

        // SEO update (if possible)
        if (blog.metaTitle) document.title = blog.metaTitle;

        // Show modal
        blogModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock scroll
    };

    function closeModal() {
        blogModal.classList.remove('active');
        document.body.style.overflow = ''; // Unlock scroll
        document.title = 'Discover Our Latest News | Soundabode Academy Blog';
    }

    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    
    // ── NEWSLETTER ──
    const subscribeBtn = document.querySelector('.btn-subscribe');
    const subscribeInput = document.querySelector('.subscribe-card input[type="email"]');
    if (subscribeBtn && subscribeInput) {
        subscribeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = subscribeInput.value.trim();
            if(!email) return alert('Please enter your email.');
            // Mock success
            subscribeBtn.textContent = 'Subscribed ✓';
            subscribeBtn.disabled = true;
            subscribeInput.value = '';
            setTimeout(() => {
                subscribeBtn.textContent = 'Subscribe';
                subscribeBtn.disabled = false;
            }, 3000);
        });
    }

    // Initial fetch
    fetchBlogs();

    // Live socket updates
    if (socket) {
        socket.on('blogUpdate', (blog) => {
            const index = allBlogs.findIndex(b => b.id === blog.id);
            if(index > -1) allBlogs[index] = blog;
            else allBlogs.unshift(blog);
            renderAll();
        });

        socket.on('blogDeleted', (id) => {
            allBlogs = allBlogs.filter(b => b.id !== id);
            renderAll();
        });
    }
});
