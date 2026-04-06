/* blog-admin.js - Blog Administration Dashboard with SEO, GEO & Edit Support */

document.addEventListener('DOMContentLoaded', () => {
    // Backend URL configuration
    const BACKEND_BASE = window.SOUNDABODE_BACKEND_URL || 'https://soundabodev2-server.onrender.com';
    const socket = typeof io !== 'undefined' ? io(BACKEND_BASE) : null;
    const loginPanel = document.getElementById('login-panel');
    const adminPanel = document.getElementById('admin-panel');
    const blogForm = document.getElementById('blog-form');
    const submitBtn = document.getElementById('submit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const loginBtn = document.getElementById('login-btn');
    const adminPassInput = document.getElementById('admin-pass');
    const editIdInput = document.getElementById('edit-id');

    // ── Character counters ──
    setupCharCount('metaTitle', 60);
    setupCharCount('metaDescription', 160);

    function setupCharCount(fieldId, limit) {
        const field = document.getElementById(fieldId);
        const counter = document.getElementById(`${fieldId}-count`);
        if (!field || !counter) return;

        function update() {
            const len = field.value.length;
            counter.textContent = `${len} / ${limit}`;
            counter.classList.remove('warn', 'danger');
            if (len > limit) counter.classList.add('danger');
            else if (len > limit * 0.85) counter.classList.add('warn');
        }
        field.addEventListener('input', update);
        update();
    }

    // ── Login ──
    function checkPass() {
        const pass = adminPassInput.value;
        if (pass === 'admin') {
            loginPanel.style.display = 'none';
            adminPanel.style.display = 'block';
            loadAdminBlogs();
        } else {
            alert('Invalid password! Hint: admin');
        }
    }

    if (loginBtn) loginBtn.addEventListener('click', checkPass);
    if (adminPassInput) {
        adminPassInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkPass();
        });
    }

    // ── Cancel Edit ──
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            resetForm();
        });
    }

    function resetForm() {
        blogForm.reset();
        editIdInput.value = '';
        submitBtn.innerText = 'Publish Blog Post';
        cancelEditBtn.style.display = 'none';
        document.getElementById('author').value = 'Soundabode';
        // Reset char counters
        ['metaTitle', 'metaDescription'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.dispatchEvent(new Event('input'));
        });
        // Scroll to top of form
        document.querySelector('.admin-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Publish / Update ──
    if (blogForm) {
        blogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const isEdit = !!editIdInput.value;

            const blogData = {
                heading: document.getElementById('heading').value,
                subheading: document.getElementById('subheading').value,
                content: document.getElementById('content').value,
                imageUrl: document.getElementById('imageUrl').value,
                category: document.getElementById('category').value,
                author: document.getElementById('author').value,
                metaTitle: document.getElementById('metaTitle').value,
                metaDescription: document.getElementById('metaDescription').value,
                metaImage: document.getElementById('metaImage').value,
                geoTarget: document.getElementById('geoTarget').value,
                password: document.getElementById('publish-pass').value
            };

            if (isEdit) {
                blogData.id = editIdInput.value;
            }

            submitBtn.innerText = isEdit ? 'Updating...' : 'Publishing...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${BACKEND_BASE}/api/blogs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(blogData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert(isEdit ? 'Blog Updated Successfully!' : 'Blog Published Successfully! It is now live on the website.');
                    resetForm();
                    loadAdminBlogs();
                } else {
                    alert(result.message || 'Failed to publish blog.');
                }
            } catch (err) {
                console.error(err);
                alert('Error connecting to server.');
            } finally {
                submitBtn.innerText = isEdit ? 'Update Blog Post' : 'Publish Blog Post';
                submitBtn.disabled = false;
            }
        });
    }

    // ── Edit Blog ──
    window.editBlog = function(blogJson) {
        try {
            const blog = JSON.parse(decodeURIComponent(blogJson));
            
            editIdInput.value = blog.id;
            document.getElementById('heading').value = blog.heading || '';
            document.getElementById('subheading').value = blog.subheading || '';
            document.getElementById('imageUrl').value = blog.imageUrl || '';
            document.getElementById('content').value = blog.content || '';
            document.getElementById('author').value = blog.author || 'Soundabode';
            document.getElementById('metaTitle').value = blog.metaTitle || '';
            document.getElementById('metaDescription').value = blog.metaDescription || '';
            document.getElementById('metaImage').value = blog.metaImage || '';

            // Set select values
            const categorySelect = document.getElementById('category');
            if (categorySelect) {
                const opt = [...categorySelect.options].find(o => o.value === blog.category);
                if (opt) opt.selected = true;
            }
            const geoSelect = document.getElementById('geoTarget');
            if (geoSelect) {
                const opt = [...geoSelect.options].find(o => o.value === (blog.geoTarget || ''));
                if (opt) opt.selected = true;
            }

            // Update char counters
            ['metaTitle', 'metaDescription'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.dispatchEvent(new Event('input'));
            });

            submitBtn.innerText = 'Update Blog Post';
            cancelEditBtn.style.display = 'block';

            document.querySelector('.admin-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            console.error('Edit parse error:', err);
            alert('Failed to load blog for editing.');
        }
    };

    // ── Delete Blog ──
    const blogList = document.getElementById('blog-list');

    window.deleteBlog = async function(id) {
        if (!confirm('Are you sure you want to delete this blog? This cannot be undone.')) return;
        
        const pass = document.getElementById('admin-pass').value || document.getElementById('publish-pass').value;
        if (!pass) {
            alert('Admin password required to delete. Please fill the Confirm Password field.');
            return;
        }

        try {
            const res = await fetch(`${BACKEND_BASE}/api/blogs/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Blog deleted successfully.');
                loadAdminBlogs();
                // If we were editing this blog, reset the form
                if (editIdInput.value === id) resetForm();
            } else {
                alert(data.message || 'Failed to delete blog.');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting blog.');
        }
    };

    // ── Load Blog List ──
    async function loadAdminBlogs() {
        if (!blogList) return;
        try {
            const res = await fetch(`${BACKEND_BASE}/api/blogs?t=${Date.now()}`);
            const blogs = await res.json();
            
            if (blogs.length === 0) {
                blogList.innerHTML = '<p style="color: var(--text-muted);">No blogs published yet.</p>';
                return;
            }

            blogList.innerHTML = blogs.map(blog => {
                const hasSeo = blog.metaTitle || blog.metaDescription;
                const hasGeo = blog.geoTarget;
                const encodedBlog = encodeURIComponent(JSON.stringify(blog));

                return `
                    <div class="admin-blog-item">
                        <div class="admin-blog-item-header">
                            <div class="admin-blog-item-info">
                                <h3>${escapeHtml(blog.heading)}</h3>
                                <div class="admin-blog-item-meta">
                                    <span>📅 ${blog.date}</span>
                                    <span style="color: var(--primary);">📁 ${escapeHtml(blog.category || 'General')}</span>
                                    <span>✍️ ${escapeHtml(blog.author || 'Soundabode')}</span>
                                    ${hasSeo ? '<span class="admin-tag admin-tag-seo">SEO ✓</span>' : ''}
                                    ${hasGeo ? `<span class="admin-tag admin-tag-geo">GEO: ${escapeHtml(blog.geoTarget)}</span>` : ''}
                                </div>
                            </div>
                            <div class="admin-blog-actions">
                                <button class="admin-btn-edit" onclick="editBlog('${encodedBlog}')">✏️ Edit</button>
                                <button class="admin-btn-danger" onclick="deleteBlog('${blog.id}')">🗑️ Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error(err);
            blogList.innerHTML = '<p style="color: #ff5555;">Failed to load blogs.</p>';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
});
