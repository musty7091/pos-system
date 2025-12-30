const fs = require('fs');
const path = require('path');

// Projemizin "Modüler" Klasör Haritası
const folders = [
  // 1. Ortak Alanlar
  'src/lib',
  'src/types',
  'src/components/ui',
  'src/layouts',
  'src/hooks',
  
  // 2. Özellik Modülleri (Her biri ayrı bir dünya)
  'src/features/pos/components',
  'src/features/pos/hooks',
  'src/features/pos/services',
  
  'src/features/inventory/components',
  'src/features/inventory/hooks',
  'src/features/inventory/services',
  
  'src/features/finance/components',
  'src/features/finance/services',
  
  'src/features/customers/components',
  'src/features/customers/services',
  
  'src/features/reports/components'
];

console.log('📂 Klasör yapısı inşa ediliyor...');

folders.forEach(folder => {
  const dirPath = path.join(__dirname, folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Oluşturuldu: ${folder}`);
  } else {
    console.log(`ℹ️  Zaten var: ${folder}`);
  }
});

console.log('✨ İskelet başarıyla kuruldu!');