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

def update_icons(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Update simple-icons CDN
    old_cdn = 'https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/'
    new_cdn = 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/'
    
    if old_cdn in content:
        content = content.replace(old_cdn, new_cdn)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated icons in {filepath}")

for f in html_files:
    if os.path.exists(f):
        update_icons(f)
