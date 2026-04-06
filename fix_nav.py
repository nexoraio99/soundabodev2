import os
import re

def fix_html_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    modified = False

    # 1. Add blog link to nav-links if missing
    nav_links_pattern = r'(<div class="nav-links">[\s\S]*?)(<a href="(?:/)?contact\.html">.*?</a>)'
    if not re.search(r'blog\.html', content): # if no blog link
        pass # we'll do targeted inserts below

    # Better regex:
    # Desktop nav
    matches_desktop = re.findall(r'(<div class="nav-links">.*?)(<a [^>]*href="(/)?contact\.html"[^>]*>.*?</a\s*>)', content, re.DOTALL)
    for m in matches_desktop:
        if 'blog.html' not in m[0]:
            replacement = m[0] + '  <a href="/blog.html">Blog</a>\n      ' + m[1]
            content = content.replace(m[0] + m[1], replacement)
            modified = True

    # Mobile nav
    matches_mobile = re.findall(r'(<div class="nav-menu">.*?)(<a [^>]*href="(/)?contact\.html"[^>]*>.*?</a\s*>)', content, re.DOTALL)
    for m in matches_mobile:
        if 'blog.html' not in m[0]:
            replacement = m[0] + '  <a href="/blog.html">Blog</a>\n    ' + m[1]
            content = content.replace(m[0] + m[1], replacement)
            modified = True

    # 2. Fix the inline script for hamburger menu in courses inner pages
    if "getElementById('hamburger')" in content:
        content = content.replace("getElementById('hamburger')", "querySelector('.hamburger-menu')")
        modified = True
    if "getElementById('mobile-nav')" in content:
        content = content.replace("getElementById('mobile-nav')", "querySelector('.nav-menu')")
        modified = True

    if modified:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk('.'):
    for f in files:
        if f.endswith('.html'):
            fix_html_file(os.path.join(root, f))
