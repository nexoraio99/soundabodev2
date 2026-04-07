import os
import re

# Domain and URL preferences
PRIMARY_DOMAIN = "https://soundabode.com"

html_files = []
for root, _, files in os.walk('.'):
    # Exclude non-human directories
    if any(x in root for x in ['node_modules', '.git', '.antigravity']):
        continue
    for f in files:
        if f.endswith('.html'):
            html_files.append(os.path.join(root, f))

def safe_optimize(filepath):
    print(f"Applying safe optimizations to {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Standardize domain (Remove www. if present)
    content = content.replace("https://www.soundabode.com", PRIMARY_DOMAIN)
    content = content.replace("http://www.soundabode.com", PRIMARY_DOMAIN)
    content = content.replace("http://soundabode.com", PRIMARY_DOMAIN)
    
    # 2. Fix metadata (OG URL, Canonical, JSON-LD) - Use Clean URLs
    # This prevents bots/scrapers from hitting redirects
    content = re.sub(r'(<link rel="canonical" href="https://soundabode\.com/[^"]*?)\.html(")', r'\1\2', content)
    content = re.sub(r'(<meta property="og:url" content="https://soundabode\.com/[^"]*?)\.html(")', r'\1\2', content, flags=re.IGNORECASE)
    content = re.sub(r'("url":\s*"https://soundabode\.com/[^"]*?)\.html(")', r'\1\2', content)
    content = re.sub(r'("@id":\s*"https://soundabode\.com/[^"]*?)\.html(#|")', r'\1\2', content)

    # 3. Fix Internal Links - Use Clean URLs
    # href="/index.html" -> href="/"
    content = re.sub(r'href="/index\.html"', 'href="/"', content)
    # href="/path/about.html" -> href="/path/about"
    content = re.sub(r'href="/([^"]*?)\.html"', r'href="/\1"', content)
    # href="about.html" (relative) - handle carefully
    # Don't replace if it's external or has protocols
    # content = re.sub(r'href="(?![a-z]+:)([^"]*?)\.html"', r'href="\1"', content)

    # 4. PERFORMANCE: Defer render-blocking icon fonts (uicons)
    # These are very heavy (~150kb+ each) and block the first paint.
    icon_regex = r'<link rel="stylesheet"\s+href="https://cdn-uicons\.flaticon\.com/.*?uicons-.*?\.css">'
    matches = re.finditer(icon_regex, content)
    
    found_any = False
    new_icons_block = ""
    for match in matches:
        found_any = True
        link_tag = match.group(0)
        # Convert to async load pattern
        async_tag = link_tag.replace('rel="stylesheet"', 'rel="preload" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"')
        new_icons_block += async_tag + "\n"
        content = content.replace(link_tag, "") # Remove from head
        
    if found_any:
        # Move to end of body or just before the closing </body> tag
        if "</body>" in content:
            content = content.replace("</body>", f"<!-- Async Icon Fonts -->\n{new_icons_block}</body>")
        else:
            content += f"\n<!-- Async Icon Fonts -->\n{new_icons_block}"

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Optimized {filepath}")
    else:
        print(f"ℹ️ No changes needed for {filepath}")

for f in html_files:
    safe_optimize(f)
