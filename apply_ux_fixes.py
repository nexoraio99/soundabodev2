import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace inline .navbar logic minified
    navbar_pattern = r'\.navbar\{[^\}]+\}'
    floating_navbar = '.navbar{position:fixed;top:1rem;left:50%;width:95%;max-width:1400px;padding:8px clamp(12px,5vw,30px);height:54px;display:flex;justify-content:space-between;align-items:center;z-index:100;background-color:rgba(10,10,10,0.4);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;transform:translateX(-50%);}'
    
    content = re.sub(navbar_pattern, floating_navbar, content)

    # Standardize `cursor: pointer` for minified tags
    content = content.replace('.btn-primary,.btn-outline{', '.btn-primary,.btn-outline{cursor:pointer;')
    content = content.replace('.action-btn{', '.action-btn{cursor:pointer;')
    
    # Label mapping in enroll modals
    # Find inputs without labels but with placeholders in enroll modals if we missed them
    # Already did contact.html and enroll.html properly via CSS rules in main.

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

root_dir = '/Users/devangdhakate/Downloads/soundabodev2-main/courses'
changed = 0
total = 0

for root, _, files in os.walk(root_dir):
    for f in files:
        if f.endswith('.html'):
            total += 1
            if process_file(os.path.join(root, f)):
                changed += 1

print(f"✅ Processed {total} files in /courses. Applied UI/UX Pro Max fixes to {changed} files.")
