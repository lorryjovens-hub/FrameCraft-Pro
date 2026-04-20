import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 确保ImageMagick已安装
function checkImageMagick() {
  try {
    execSync('magick --version');
    return true;
  } catch (error) {
    console.error('ImageMagick is not installed. Please install it first.');
    return false;
  }
}

// 生成图标函数
function generateIcons() {
  const svgPath = path.join('public', 'app-icon.svg');
  const iconsDir = path.join('src-tauri', 'icons');
  
  // 确保图标目录存在
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  // 生成各种尺寸的PNG图标
  const sizes = [
    { name: '32x32.png', width: 32, height: 32 },
    { name: '64x64.png', width: 64, height: 64 },
    { name: '128x128.png', width: 128, height: 128 },
    { name: '128x128@2x.png', width: 256, height: 256 },
    { name: 'icon.png', width: 512, height: 512 },
    { name: 'icon_macOS.png', width: 512, height: 512 },
    { name: 'icon_Windows.png', width: 512, height: 512 },
    { name: 'StoreLogo.png', width: 50, height: 50 },
    { name: 'Square30x30Logo.png', width: 30, height: 30 },
    { name: 'Square44x44Logo.png', width: 44, height: 44 },
    { name: 'Square71x71Logo.png', width: 71, height: 71 },
    { name: 'Square89x89Logo.png', width: 89, height: 89 },
    { name: 'Square107x107Logo.png', width: 107, height: 107 },
    { name: 'Square142x142Logo.png', width: 142, height: 142 },
    { name: 'Square150x150Logo.png', width: 150, height: 150 },
    { name: 'Square284x284Logo.png', width: 284, height: 284 },
    { name: 'Square310x310Logo.png', width: 310, height: 310 },
  ];
  
  console.log('Generating Tauri icons...');
  
  sizes.forEach(size => {
    const outputPath = path.join(iconsDir, size.name);
    try {
      execSync(`magick convert -size ${size.width}x${size.height} ${svgPath} ${outputPath}`);
      console.log(`Generated ${size.name}`);
    } catch (error) {
      console.error(`Failed to generate ${size.name}:`, error.message);
    }
  });
  
  // 生成ICO文件
  try {
    execSync(`magick convert ${svgPath} -define icon:auto-resize=16,32,48,64,128,256 ${path.join(iconsDir, 'icon.ico')}`);
    console.log('Generated icon.ico');
  } catch (error) {
    console.error('Failed to generate icon.ico:', error.message);
  }
  
  // 生成ICNS文件（macOS）
  try {
    // 先生成必要的PNG文件
    const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
    icnsSizes.forEach(size => {
      const outputPath = path.join(iconsDir, `icon_${size}x${size}.png`);
      execSync(`magick convert -size ${size}x${size} ${svgPath} ${outputPath}`);
    });
    
    // 注意：生成ICNS需要特殊工具，这里只是提示
    console.log('Please use iconutil or similar tool to generate icon.icns from the PNG files');
  } catch (error) {
    console.error('Failed to generate ICNS files:', error.message);
  }
  
  console.log('Icon generation completed!');
}

// 运行图标生成
if (checkImageMagick()) {
  generateIcons();
}
