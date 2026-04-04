const fs = require('fs');
const path = require('path');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const dir = path.join(__dirname, '..', 'apps', 'nextjs', 'public', 'icons');

sizes.forEach(size => {
  const rx = Math.round(size * 0.15);
  const fontSize = Math.round(size * 0.35);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#0f172a" rx="${rx}"/><text x="50%" y="55%" font-family="sans-serif" font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="middle">IM</text></svg>`;
  fs.writeFileSync(path.join(dir, `icon-${size}x${size}.svg`), svg);
  console.log(`Created icon-${size}x${size}.svg`);
});

console.log('SVG placeholder icons created. For production, convert to PNG.');
