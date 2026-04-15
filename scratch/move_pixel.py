import os
import re

PIXEL_CODE = """  <!-- Meta Pixel Code -->
  <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '976314001636856');
    fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=976314001636856&ev=PageView&noscript=1"
  /></noscript>
  <!-- End Meta Pixel Code -->"""

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove existing Meta Pixel code if any (including user's manual moves)
    content = re.sub(r'\s*<!-- Meta Pixel Code -->.*?<!-- End Meta Pixel Code -->', '', content, flags=re.DOTALL)
    
    # Insert after charset or open head
    if '<meta charset="UTF-8"' in content:
        content = re.sub(r'(<meta charset="UTF-8"[^>]*>)', f'\\1\n{PIXEL_CODE}', content, count=1)
    else:
        content = re.sub(r'(<head[^>]*>)', f'\\1\n{PIXEL_CODE}', content, count=1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# List of all files to process
files = [
    'index.html', 'about.html', 'blog.html', 'contact.html', 'courses.html',
    'terms.html', '404.html', 'enroll.html', 'privacy.html',
    'courses/dj-training/advanced-dj-performance.html',
    'courses/dj-training/pro-dj-course.html',
    'courses/dj-training/basic-dj-course.html',
    'courses/music-production/beginner-course.html',
    'courses/music-production/mixing-mastering-course.html',
    'courses/music-production/audio-engineering-diploma.html',
    'courses/music-production/intermediate-course.html',
    'music-production-brochure.html', 'dj-brochure.html', 'blog-admin.html'
]

for f in files:
    if os.path.exists(f):
        print(f"Processing {f}...")
        process_file(f)
    else:
        print(f"File not found: {f}")
