/* blog-admin.js - JavaScript for the blog administration dashboard */

document.addEventListener('DOMContentLoaded', () => {
    const socket = typeof io !== 'undefined' ? io() : null;
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
                const response = await fetch('/api/blogs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(blogData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Blog Published Successfully! It is now live on the website.');
                    blogForm.reset();
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
});
