const canvas = document.getElementById('signature-pad');
  const ctx = canvas.getContext('2d');

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  let drawing = false;
  let lastX = 0;
  let lastY = 0;

  function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return [
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top
      ];
    } else {
      return [
        e.clientX - rect.left,
        e.clientY - rect.top
      ];
    }
  }

  function startDrawing(e) {
    e.preventDefault();
    drawing = true;
    [lastX, lastY] = getXY(e);
  }
  function stopDrawing(e) {
    e.preventDefault();
    drawing = false;
  }
  function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const [x, y] = getXY(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  }

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('touchstart', startDrawing);

  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('touchmove', draw);

  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);

  document.getElementById('clear-btn').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  // Fungsi cari bounding box gambar di canvas
  function getSignatureBounds(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let minX = width, minY = height, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        if (alpha > 10) { // threshold: piksel tak transparan
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return null;
    return {minX, minY, maxX, maxY};
  }

  // Crop canvas sesuai bounding box dan buat canvas baru
  function cropCanvas(originalCanvas, bounds) {
    const cropWidth = bounds.maxX - bounds.minX + 10; // tambahkan margin 5px kanan kiri
    const cropHeight = bounds.maxY - bounds.minY + 10; // margin atas bawah

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const croppedCtx = croppedCanvas.getContext('2d');

    // background transparan
    croppedCtx.clearRect(0, 0, cropWidth, cropHeight);
    // gambar crop dari original
    croppedCtx.drawImage(
      originalCanvas,
      bounds.minX - 5, bounds.minY - 5, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );

    return croppedCanvas;
  }

  function downloadPNG() {
    const bounds = getSignatureBounds(ctx, canvas.width, canvas.height);
    if (!bounds) {
      alert("Tanda tangan kosong.");
      return;
    }
    const croppedCanvas = cropCanvas(canvas, bounds);
    croppedCanvas.toBlob(blob => {
      saveAs(blob, "tanda_tangan.png");
    }, 'image/png');
  }

  function downloadJPG() {
    const bounds = getSignatureBounds(ctx, canvas.width, canvas.height);
    if (!bounds) {
      alert("Tanda tangan kosong.");
      return;
    }
    const croppedCanvas = cropCanvas(canvas, bounds);

    // Buat canvas putih background untuk JPG
    const jpgCanvas = document.createElement('canvas');
    jpgCanvas.width = croppedCanvas.width;
    jpgCanvas.height = croppedCanvas.height;
    const jctx = jpgCanvas.getContext('2d');
    jctx.fillStyle = '#fff';
    jctx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
    jctx.drawImage(croppedCanvas, 0, 0);

    jpgCanvas.toBlob(blob => {
      saveAs(blob, "tanda_tangan.jpg");
    }, 'image/jpeg', 1);
  }

  function downloadPDF() {
    const bounds = getSignatureBounds(ctx, canvas.width, canvas.height);
    if (!bounds) {
      alert("Tanda tangan kosong.");
      return;
    }
    const croppedCanvas = cropCanvas(canvas, bounds);

    // Buat canvas square (besar sisi = max width/height)
    const maxSide = Math.max(croppedCanvas.width, croppedCanvas.height);
    const squareCanvas = document.createElement('canvas');
    squareCanvas.width = maxSide;
    squareCanvas.height = maxSide;
    const sqCtx = squareCanvas.getContext('2d');
    sqCtx.clearRect(0, 0, maxSide, maxSide);

    // gambar tanda tangan di tengah square
    const dx = (maxSide - croppedCanvas.width) / 2;
    const dy = (maxSide - croppedCanvas.height) / 2;
    sqCtx.drawImage(croppedCanvas, dx, dy);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      unit: 'pt',
      format: [maxSide, maxSide],
      compress: true,
    });
    const dataUrl = squareCanvas.toDataURL('image/png');
    pdf.addImage(dataUrl, 'PNG', 0, 0, maxSide, maxSide);
    pdf.save('tanda_tangan.pdf');
  }

  document.getElementById('save-btn').addEventListener('click', () => {
    const format = document.getElementById('format-select').value;
    switch(format) {
      case 'png': downloadPNG(); break;
      case 'jpg': downloadJPG(); break;
      case 'pdf': downloadPDF(); break;
      default:
        alert("Format tidak dikenali.");
    }
  });