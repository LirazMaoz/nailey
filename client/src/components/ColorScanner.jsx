import React, { useRef, useState } from 'react';

// Map an RGB to a Hebrew color name (approximate)
function rgbToHebrewName(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  // Achromatic / grayscale
  if (delta < 25) {
    if (max < 50) return 'שחור';
    if (max < 130) return 'אפור כהה';
    if (max < 200) return 'אפור';
    return 'לבן';
  }

  // Compute hue
  let hue = 0;
  if (max === r) {
    hue = 60 * (((g - b) / delta) % 6);
  } else if (max === g) {
    hue = 60 * ((b - r) / delta + 2);
  } else {
    hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;

  const saturation = delta / max;
  const lightness = (max + min) / 2 / 255;

  // Low saturation = grayish
  if (saturation < 0.15) {
    if (lightness > 0.85) return 'לבן';
    if (lightness < 0.2) return 'שחור';
    return 'אפור';
  }

  // Browns / skin tones
  if (hue >= 10 && hue < 40 && saturation < 0.55 && lightness > 0.25 && lightness < 0.75) {
    return 'בז\'';
  }

  // Hue ranges
  if (hue < 15 || hue >= 345) return 'אדום';
  if (hue < 30) return 'אדום-כתום';
  if (hue < 50) return 'כתום';
  if (hue < 70) return 'צהוב-כתום';
  if (hue < 80) return 'צהוב';
  if (hue < 150) return 'ירוק';
  if (hue < 175) return 'טורקיז';
  if (hue < 200) return 'כחול-ים';
  if (hue < 250) return 'כחול';
  if (hue < 280) return 'כחול-סגול';
  if (hue < 310) return 'סגול';
  if (hue < 330) {
    // Pink zone: light = pink, dark = magenta
    if (lightness > 0.6) return 'ורוד';
    return 'מג\'נטה';
  }
  return 'ורוד';
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.round(x).toString(16).padStart(2, '0'))
      .join('')
  );
}

// Sample the center 20% region of the image on canvas and compute average RGB
function sampleDominantColor(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const regionW = Math.max(1, Math.floor(w * 0.2));
  const regionH = Math.max(1, Math.floor(h * 0.2));
  const startX = Math.floor((w - regionW) / 2);
  const startY = Math.floor((h - regionH) / 2);

  const imageData = ctx.getImageData(startX, startY, regionW, regionH);
  const data = imageData.data;

  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      count++;
    }
  }

  if (count === 0) return null;
  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  };
}

export default function ColorScanner({ onSave }) {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [scanned, setScanned] = useState(null); // { r, g, b, hex, hebrewName }
  const [imageSrc, setImageSrc] = useState(null);
  const [saveName, setSaveName] = useState('');
  const [saveNumber, setSaveNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedOk, setSavedOk] = useState(false);

  const processImage = (src) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const result = sampleDominantColor(canvas);
      if (result) {
        const hex = rgbToHex(result.r, result.g, result.b);
        const hebrewName = rgbToHebrewName(result.r, result.g, result.b);
        setScanned({ ...result, hex, hebrewName });
        setSaveName(hebrewName);
        setSavedOk(false);
        setSaveError('');
      }
    };
    img.src = src;
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target.result);
      processImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!scanned || !saveName || !saveNumber) {
      setSaveError('יש למלא שם ומספר צבע');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await onSave({ name: saveName, number: saveNumber, hex: scanned.hex });
      setSavedOk(true);
      setScanned(null);
      setImageSrc(null);
      setSaveName('');
      setSaveNumber('');
    } catch (err) {
      setSaveError(err.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold text-purple-deeper">סורק צבעים 📷</h3>
      <p className="text-sm text-gray-500">
        העלי תמונה של בקבוקון לק — המערכת תזהה את הצבע הדומיננטי ותמיר אותו לשם בעברית.
      </p>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 btn-outline text-sm py-2"
        >
          📁 העלאת תמונה
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 btn-outline text-sm py-2"
        >
          📸 צילום
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Image preview */}
      {imageSrc && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-purple-light">
          <img src={imageSrc} alt="preview" className="w-full max-h-48 object-cover" />
          {/* Center sample box indicator */}
          <div
            className="absolute border-2 border-white/80 rounded"
            style={{
              top: '40%',
              left: '40%',
              width: '20%',
              height: '20%',
              boxShadow: '0 0 0 2px rgba(0,0,0,0.4)',
            }}
          />
          <span className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
            אזור דגימה
          </span>
        </div>
      )}

      {/* Scanned result */}
      {scanned && (
        <div className="card border-2 border-purple-light flex flex-col gap-3 fade-in">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl shadow-md border-2 border-white flex-shrink-0"
              style={{ backgroundColor: scanned.hex }}
            />
            <div className="flex flex-col gap-1">
              <p className="font-bold text-purple-deeper text-lg">{scanned.hebrewName}</p>
              <p className="text-sm font-mono text-gray-600 dir-ltr" dir="ltr">{scanned.hex.toUpperCase()}</p>
              <p className="text-xs text-gray-500" dir="ltr">
                R: {scanned.r} &nbsp; G: {scanned.g} &nbsp; B: {scanned.b}
              </p>
            </div>
          </div>

          {/* Save form */}
          <div className="flex flex-col gap-2 border-t border-purple-light pt-3">
            <p className="text-sm font-semibold text-gray-700">שמירה לרשימת הצבעים:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="שם הצבע"
                className="input-field text-sm py-2 flex-1"
              />
              <input
                type="text"
                value={saveNumber}
                onChange={(e) => setSaveNumber(e.target.value)}
                placeholder="מספר (OPI-xxx)"
                className="input-field text-sm py-2 flex-1"
                dir="ltr"
              />
            </div>
            {/* Hex override */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">קוד צבע:</label>
              <input
                type="color"
                value={scanned.hex}
                onChange={(e) =>
                  setScanned((p) => ({
                    ...p,
                    hex: e.target.value,
                    hebrewName: p.hebrewName,
                  }))
                }
                className="w-10 h-8 rounded border border-gray-300 cursor-pointer p-0"
              />
              <span className="text-xs font-mono text-gray-600" dir="ltr">{scanned.hex}</span>
            </div>

            {saveError && (
              <p className="text-red-500 text-sm">{saveError}</p>
            )}
            {savedOk && (
              <p className="text-green-600 text-sm font-semibold">הצבע נשמר בהצלחה!</p>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="btn-primary text-sm py-2"
              disabled={saving}
            >
              {saving ? 'שומרת...' : '+ שמירה לרשימה'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
