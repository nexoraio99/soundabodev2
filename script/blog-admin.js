/* blog-admin.js - JavaScript for the blog administration dashboard */

document.addEventListener('DOMContentLoaded', () => {
    // Backend URL configuration
    const BACKEND_BASE = window.SOUNDABODE_BACKEND_URL || 'https://soundabodev2-server.onrender.com';
    const socket = typeof io !== 'undefined' ? io(BACKEND_BASE) : null;
    const loginPanel = document.getElementById('login-panel');
    const adminPanel = document.getElementById('admin-panel');
    const blogForm = document.getElementById('blog-form');
    const submitBtn = document.getElementById('submit-btn');
    const loginBtn = document.getElementById('login-btn');
    const adminPassInput = document.getElementById('admin-pass');

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

    if (loginBtn) {
        loginBtn.addEventListener('click', checkPass);
    }

    if (adminPassInput) {
        adminPassInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkPass();
        });
    }

    if (blogForm) {
        blogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const blogData = {
                heading: document.getElementById('heading').value,
                subheading: document.getElementById('subheading').value,
                content: document.getElementById('content').value,
                imageUrl: document.getElementById('imageUrl').value,
                category: document.getElementById('category').value,
                author: document.getElementById('author').value,
                password: document.getElementById('publish-pass').value
            };

            submitBtn.innerText = 'Publishing...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${BACKEND_BASE}/api/blogs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(blogData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Blog Published Successfully! It is now live on the website.');
                    blogForm.reset();
                    loadAdminBlogs();
                } else {
                    alert(result.message || 'Failed to publish blog.');
                }
            } catch (err) {
                console.error(err);
                alert('Error connecting to server.');
            } finally {
                submitBtn.innerText = 'Publish Blog Post';
                submitBtn.disabled = false;
            }
        });
    }

    const blogList = document.getElementById('blog-list');
    
    window.deleteBlog = async function(id) {
        if (!confirm('Are you sure you want to delete this blog?')) return;
        
        // Grab password from the login field
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
            } else {
                alert(data.message || 'Failed to delete blog.');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting blog.');
        }
    };

    async function loadAdminBlogs() {
        if (!blogList) return;
        try {
            const res = await fetch(`${BACKEND_BASE}/api/blogs?t=${Date.now()}`);
            const blogs = await res.json();
            
            if (blogs.length === 0) {
                blogList.innerHTML = '<p style="color: var(--text-muted);">No blogs published yet.</p>';
                return;
            }

            blogList.innerHTML = blogs.map(blog => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 15px; border: 1px solid var(--border-color); border-radius: 12px;">
                    <div style="flex: 1; padding-right: 15px;">
                        <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">${blog.heading}</h3>
                        <p style="margin: 5px 0 0; font-size: 0.85rem; color: var(--text-muted);">${blog.date} | <span style="color: var(--primary);">${blog.category}</span></p>
                    </div>
                    <button onclick="deleteBlog('${blog.id}')" style="background: rgba(255, 50, 50, 0.2); color: #ff5555; border: 1px solid rgba(255, 50, 50, 0.5); padding: 8px 15px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; flex-shrink: 0;">Delete</button>
                </div>
            `).join('');
        } catch (err) {
            console.error(err);
            blogList.innerHTML = '<p style="color: #ff5555;">Failed to load blogs.</p>';
        }
    }
});
