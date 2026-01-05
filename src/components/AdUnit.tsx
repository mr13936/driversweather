import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdUnitProps {
  slot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

export const AdUnit = ({ slot, format = 'auto', className = '' }: AdUnitProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const isAdPushed = useRef(false);

  useEffect(() => {
    if (adRef.current && !isAdPushed.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isAdPushed.current = true;
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }
  }, []);

  const getFormatStyles = () => {
    switch (format) {
      case 'horizontal':
        return { display: 'block', minHeight: '90px' };
      case 'vertical':
        return { display: 'block', minHeight: '250px' };
      case 'rectangle':
        return { display: 'block', width: '300px', height: '250px' };
      default:
        return { display: 'block' };
    }
  };

  return (
    <div ref={adRef} className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={getFormatStyles()}
        data-ad-client="ca-pub-7327632360531280"
        data-ad-slot={slot}
        data-ad-format={format === 'auto' ? 'auto' : undefined}
        data-full-width-responsive={format === 'auto' ? 'true' : undefined}
      />
    </div>
  );
};
