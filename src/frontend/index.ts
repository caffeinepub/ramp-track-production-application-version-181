const imageData = ctx.getImageData(0, 0, width, height);
const result = readerRef.current.decodeFromImageData(imageData);
