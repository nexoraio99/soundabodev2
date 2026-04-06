import os
import re

html_files = [
    './blog.html', './index.html', './about.html', './contact.html', './terms.html',
    './404.html', './courses.html', './enroll.html', './blog-admin.html', './privacy.html',
    './music-production-brochure.html', './dj-brochure.html',
    './courses/dj-training/advanced-dj-performance.html',
    './courses/dj-training/pro-dj-course.html',
    './courses/dj-training/basic-dj-course.html',
    './courses/music-production/beginner-course.html',
    './courses/music-production/mixing-mastering-course.html',
    './courses/music-production/audio-engineering-diploma.html',
    './courses/music-production/intermediate-course.html'
]

def update_paths(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Avoid updating paths that already start with http, https, or /
    # CSS: href="style/... -> href="/style/...
    content = re.sub(r'href="style/', 'href="/style/', content)
    # JS: src="script/... -> src="/script/...
    content = re.sub(r'src="script/', 'src="/script/', content)
    # Assets: src="Assets/... -> src="/Assets/...
    content = re.sub(r'src="Assets/', 'src="/Assets/', content)
    content = re.sub(r'href="Assets/', 'href="/Assets/', content)
    # Favicons: href="favicon.ico -> href="/favicon.ico
    content = re.sub(r'href="site\.webmanifest"', 'href="/site.webmanifest"', content)

    # Some files use data-src for lazy loading (e.g., intro videos)
    content = re.sub(r'data-src="Assets/', 'data-src="/Assets/', content)

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated {filepath}")

for f in html_files:
    if os.path.exists(f):
        update_paths(f)
