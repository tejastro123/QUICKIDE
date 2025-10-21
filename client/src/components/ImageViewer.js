import React from 'react';
import './ImageViewer.css';

function ImageViewer({ title, imageUrl, placeholder }) {

  const handleSaveImage = () => {
    if (!imageUrl) return;

    // Create a temporary link
    const link = document.createElement('a');
    link.href = imageUrl;
    
    // Set a default filename
    const filename = title.toLowerCase().replace(/ /g, '_') + '.png';
    link.download = filename;
    
    // Programmatically click the link to trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="panel-content image-viewer">
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={title} />
          {/* Add the save button here */}
          <button className="save-image-btn" onClick={handleSaveImage}>
            Save Image
          </button>
        </>
      ) : (
        <p>{placeholder}</p>
      )}
    </div>
  );
}

export default ImageViewer;