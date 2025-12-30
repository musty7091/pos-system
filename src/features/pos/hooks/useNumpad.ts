// src/features/pos/hooks/useNumpad.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePos } from '../context/PosContext';
import { toast } from 'sonner';

export function useNumpad() {
  const { findProductByBarcode, addToCart } = usePos();
  
  const [manualInput, setManualInput] = useState('');
  const [multiplier, setMultiplier] = useState(1);
  
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  // 1. Numpad Tuşlama Mantığı
  const handleNumpadPress = (value: string) => {
    if (value === 'C') {
        setManualInput('');
        setMultiplier(1);
    }
    else if (value === 'back') setManualInput(prev => prev.slice(0, -1));
    else setManualInput(prev => prev + value);
  };

  // 2. 'X' Tuşu Mantığı (Adet Çarpanı)
  const handleSetMultiplier = () => {
    if (!manualInput) return;
    const val = parseInt(manualInput);
    if (val > 0) {
      setMultiplier(val);
      setManualInput('');
    }
  };

  // 3. Barkod İşleme (Hem manuel hem scanner)
  const handleBarcodeSubmit = async (codeOverride?: string) => {
    const codeToSearch = codeOverride || manualInput;
    if (!codeToSearch) return;

    try {
      const result = await findProductByBarcode(codeToSearch);

      if (result) {
        // Çarpanı dikkate al: (Paneldeki Çarpan) x (Barkodun Kendi Çarpanı)
        // Örn: Panelde 5 var, koli barkodu (12'li) okundu => 5 * 12 = 60 adet
        const finalQty = multiplier * result.multiplier;
        
        addToCart(result.product, finalQty);
        
        // Başarılı işlem sonrası paneli temizle
        setManualInput('');
        setMultiplier(1);
        toast.success(`${result.product.name} eklendi (${finalQty} ad.)`);
      } else {
        toast.error('Barkod Bulunamadı!', {
          description: `Aranan kod: ${codeToSearch}`
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 4. Global Klavye Dinleyicisi (Scanner için)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input alanlarına yazı yazılıyorsa karışma
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentTime = Date.now();
      
      // 100ms kuralı: Scanner tuşları çok hızlı basar.
      if (currentTime - lastKeyTime.current > 100) {
        // Uzun süre geçtiyse buffer'ı temizle (Manuel giriş başlıyor olabilir)
        if (barcodeBuffer.current.length > 0 && barcodeBuffer.current.length < 3) {
           barcodeBuffer.current = '';
        }
      }
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        e.preventDefault();
        
        // Buffer doluysa (Scanner) onu kullan, yoksa manuel inputu kullan
        if (barcodeBuffer.current.length > 0) {
          handleBarcodeSubmit(barcodeBuffer.current);
          barcodeBuffer.current = ''; 
        } 
        else if (manualInput.length > 0) {
          handleBarcodeSubmit(manualInput);
        }
      } else if (e.key === 'Backspace') {
        // Hem buffer'dan hem ekrandan sil
        barcodeBuffer.current = barcodeBuffer.current.slice(0, -1);
        setManualInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        barcodeBuffer.current = '';
        setManualInput('');
        setMultiplier(1);
      } else if (e.key.length === 1 && e.key >= '0' && e.key <= '9') {
        barcodeBuffer.current += e.key;
        setManualInput(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualInput, multiplier, addToCart]); // Dependencies önemli

  return {
    manualInput,
    multiplier,
    handleNumpadPress,
    handleSetMultiplier,
    handleBarcodeSubmit
  };
}