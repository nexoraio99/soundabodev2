// JS to dynamically place images with controlled gaps
function positionCollage() {
    const collage = document.querySelector('.image-collage');
    const images = collage.querySelectorAll('.img-wrapper');
    const collageWidth = collage.offsetWidth;
    const collageHeight = collage.offsetHeight;
    const margin = 20; // minimum gap between images
  
    let positions = [];
  
    images.forEach(img => {
      const imgWidth = img.offsetWidth;
      const imgHeight = img.offsetHeight;
  
      let left, top;
      let attempts = 0;
  
      do {
        left = Math.random() * (collageWidth - imgWidth);
        top = Math.random() * (collageHeight - imgHeight);
        attempts++;
      } while (
        positions.some(pos => 
          !(left + imgWidth + margin < pos.left || 
            left > pos.left + pos.width + margin || 
            top + imgHeight + margin < pos.top || 
            top > pos.top + pos.height + margin)
        ) && attempts < 50
      );
  
      positions.push({ left, top, width: imgWidth, height: imgHeight });
      img.style.left = `${left}px`;
      img.style.top = `${top}px`;
      img.style.animationDelay = `${Math.random() * 1}s`;
    });
  }
  
  // Run on load
  window.addEventListener('load', positionCollage);
  // Recalculate on resize
  window.addEventListener('resize', positionCollage);